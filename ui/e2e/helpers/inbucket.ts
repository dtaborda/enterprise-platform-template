// Default matches the inbucket port in supabase/config.toml (55334).
const DEFAULT_INBUCKET_BASE_URL = process.env["INBUCKET_URL"] ?? "http://localhost:55334";

const INBUCKET_POLLING = {
  // 35 s gives Supabase Auth enough time to send the email in CI
  // (local SMTP delivery via Inbucket/Mailpit can lag under load, especially
  // during the cold-start window right after `supabase start`).
  DEFAULT_TIMEOUT_MS: 35_000,
  DEFAULT_POLL_INTERVAL_MS: 500,
} as const;

function getE2EAppUrl(): string {
  return (
    process.env["E2E_APP_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000"
  );
}

export interface InbucketOptions {
  baseUrl?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface InbucketMailboxMessage {
  mailbox: string;
  id: string;
  from: string;
  subject: string;
  date: string;
  size: number;
}

export interface InbucketMessage {
  mailbox: string;
  id: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  body: {
    text?: string;
    html?: string;
  };
}

interface MailpitAddress {
  Name?: string;
  Address?: string;
}

interface MailpitListMessage {
  ID: string;
  Subject?: string;
  Created?: string;
  Size?: number;
  From?: MailpitAddress;
  To?: MailpitAddress[];
}

interface MailpitListResponse {
  messages?: MailpitListMessage[];
}

interface MailpitDetailResponse {
  ID: string;
  Subject?: string;
  Date?: string;
  Size?: number;
  From?: MailpitAddress;
  To?: MailpitAddress[];
  Text?: string;
  HTML?: string;
}

/**
 * Clears all messages for the given email address.
 *
 * Tries the Inbucket bulk-DELETE endpoint first. When that returns 404
 * (Mailpit does not expose the Inbucket mailbox endpoint), falls back to
 * per-message DELETE via the Mailpit `/api/v1/message/{id}` endpoint.
 */
export async function clearMailbox(email: string, options?: InbucketOptions): Promise<void> {
  const { baseUrl } = resolveOptions(options);
  const mailboxName = encodeURIComponent(getMailboxName(email));
  const url = `${baseUrl}/api/v1/mailbox/${mailboxName}`;

  const response = await fetch(url, {
    method: "DELETE",
  });

  if (response.status === 404) {
    // Mailpit API does not expose Inbucket's bulk mailbox-delete endpoint.
    // Fall back to deleting each message individually.
    await clearMailboxSafely(email, options);
    return;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to clear Inbucket mailbox for ${email}. HTTP ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Best-effort mailbox clear: fetches message IDs and deletes each one via
 * the Mailpit `/api/v1/message/{id}` DELETE endpoint.
 * Swallows per-message errors so a single failure does not abort the clear.
 */
export async function clearMailboxSafely(email: string, options?: InbucketOptions): Promise<void> {
  const { baseUrl } = resolveOptions(options);
  let messages: InbucketMailboxMessage[];

  try {
    messages = await getMailboxMessages(email, options);
  } catch {
    // If we cannot even list messages, there is nothing to delete.
    return;
  }

  for (const message of messages) {
    try {
      const deleteResponse = await fetch(`${baseUrl}/api/v1/message/${message.id}`, {
        method: "DELETE",
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.warn(
          `[inbucket] Failed to delete message ${message.id} for ${email}: HTTP ${deleteResponse.status}`,
        );
      }
    } catch {
      // Best-effort: keep going if one message delete fails.
    }
  }
}

function resolveOptions(options?: InbucketOptions) {
  return {
    baseUrl: options?.baseUrl ?? DEFAULT_INBUCKET_BASE_URL,
    timeoutMs: options?.timeoutMs ?? INBUCKET_POLLING.DEFAULT_TIMEOUT_MS,
    pollIntervalMs: options?.pollIntervalMs ?? INBUCKET_POLLING.DEFAULT_POLL_INTERVAL_MS,
  };
}

function getMailboxName(email: string): string {
  const localPart = email.split("@")[0];

  if (!localPart) {
    throw new Error(`Invalid email for Inbucket mailbox lookup: "${email}"`);
  }

  return localPart;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getMessageTimestamp(message: InbucketMailboxMessage): number {
  const timestamp = Date.parse(message.date);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export async function getMailboxMessages(
  email: string,
  options?: InbucketOptions,
): Promise<InbucketMailboxMessage[]> {
  const { baseUrl } = resolveOptions(options);
  const mailboxName = encodeURIComponent(getMailboxName(email));
  const url = `${baseUrl}/api/v1/mailbox/${mailboxName}`;

  const response = await fetch(url);

  if (response.status === 404) {
    const mailpitResponse = await fetch(`${baseUrl}/api/v1/messages`);

    if (!mailpitResponse.ok) {
      return [];
    }

    const payload = (await mailpitResponse.json()) as MailpitListResponse;
    const messages = payload.messages ?? [];

    return messages
      .filter((message) =>
        (message.To ?? []).some(
          (recipient) => recipient.Address?.toLowerCase() === email.toLowerCase(),
        ),
      )
      .map((message) => ({
        mailbox: getMailboxName(email),
        id: message.ID,
        from: message.From?.Address ?? "",
        subject: message.Subject ?? "",
        date: message.Created ?? "",
        size: message.Size ?? 0,
      }));
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Inbucket mailbox for ${email}. HTTP ${response.status} ${response.statusText}`,
    );
  }

  const messages = (await response.json()) as InbucketMailboxMessage[];
  return messages;
}

export async function getLatestEmail(
  email: string,
  options?: InbucketOptions,
): Promise<InbucketMessage> {
  const { baseUrl, timeoutMs, pollIntervalMs } = resolveOptions(options);
  const startedAt = Date.now();
  const mailboxName = getMailboxName(email);

  while (Date.now() - startedAt <= timeoutMs) {
    const messages = await getMailboxMessages(email, options);

    if (messages.length > 0) {
      const newestMessage = [...messages].sort(
        (left, right) => getMessageTimestamp(right) - getMessageTimestamp(left),
      )[0];

      if (!newestMessage?.id) {
        throw new Error(
          `Inbucket returned mailbox data without message id for ${email}. Cannot resolve latest email.`,
        );
      }

      const detailUrl = `${baseUrl}/api/v1/mailbox/${encodeURIComponent(mailboxName)}/${newestMessage.id}`;
      const detailResponse = await fetch(detailUrl);

      if (detailResponse.status === 404) {
        const mailpitDetailResponse = await fetch(`${baseUrl}/api/v1/message/${newestMessage.id}`);

        if (!mailpitDetailResponse.ok) {
          throw new Error(
            `Failed to fetch Inbucket/Mailpit message ${newestMessage.id} for ${email}. HTTP ${mailpitDetailResponse.status} ${mailpitDetailResponse.statusText}`,
          );
        }

        const detailPayload = (await mailpitDetailResponse.json()) as MailpitDetailResponse;

        return {
          mailbox: mailboxName,
          id: detailPayload.ID,
          subject: detailPayload.Subject ?? "",
          from: detailPayload.From?.Address ?? "",
          to: (detailPayload.To ?? [])
            .map((recipient) => recipient.Address)
            .filter((address): address is string => Boolean(address)),
          date: detailPayload.Date ?? "",
          body: {
            text: detailPayload.Text,
            html: detailPayload.HTML,
          },
        };
      }

      if (!detailResponse.ok) {
        throw new Error(
          `Failed to fetch Inbucket message ${newestMessage.id} for ${email}. HTTP ${detailResponse.status} ${detailResponse.statusText}`,
        );
      }

      return (await detailResponse.json()) as InbucketMessage;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for Inbucket email for ${email} after ${timeoutMs}ms (poll every ${pollIntervalMs}ms).`,
  );
}

export function extractFirstUrlFromEmail(message: InbucketMessage): string {
  const searchableContent = `${message.body.text ?? ""}\n${message.body.html ?? ""}`;
  const urlMatch = searchableContent.match(/https?:\/\/[^\s"'<>]+/i);

  if (!urlMatch?.[0]) {
    throw new Error(
      `Could not find a URL in Inbucket email content for message ${message.id} (${message.subject}).`,
    );
  }

  return urlMatch[0].replace(/[).,;]+$/, "");
}

export async function getPasswordResetLink(
  email: string,
  options?: InbucketOptions,
): Promise<string> {
  const latestEmail = await getLatestEmail(email, options);
  const rawLink = extractFirstUrlFromEmail(latestEmail);

  let parsedLink: URL;

  try {
    parsedLink = new URL(rawLink);
  } catch {
    return rawLink;
  }

  const isRecoveryVerifyLink =
    parsedLink.pathname.startsWith("/auth/v1/verify") &&
    parsedLink.searchParams.get("type") === "recovery";

  if (!isRecoveryVerifyLink) {
    return rawLink;
  }

  const configuredRedirect = parsedLink.searchParams.get("redirect_to") ?? "";

  if (configuredRedirect.includes("/auth/callback")) {
    return rawLink;
  }

  const callbackUrl = new URL("/auth/callback", getE2EAppUrl());
  callbackUrl.searchParams.set("next", "/reset-password");
  parsedLink.searchParams.set("redirect_to", callbackUrl.toString());

  return parsedLink.toString();
}
