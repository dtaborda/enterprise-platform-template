// Resend adapter for notification emails (production use)
// Credentials are injected by createNotificationEmailAdapter() — this adapter
// reads no environment variables so it stays pure and testable.

import type {
  NotificationEmailParams,
  NotificationEmailPort,
} from "../ports/notification-email-port";

export class ResendNotificationEmailAdapter implements NotificationEmailPort {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendNotificationEmail(
    params: NotificationEmailParams,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: buildNotificationEmailHtml(params),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `Resend API error ${response.status}: ${body}` };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }
}

function buildNotificationEmailHtml(params: NotificationEmailParams): string {
  const ctaSection = params.ctaUrl
    ? `
    <p style="margin: 24px 0;">
      <a href="${params.ctaUrl}"
         style="background: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        ${params.ctaLabel ?? "View Details"}
      </a>
    </p>`
    : "";

  return `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h2>${params.title}</h2>
    <p>${params.body}</p>
    ${ctaSection}
    <p style="color: #64748b; font-size: 14px;">
      You are receiving this notification because you have notifications enabled for this category.
      You can manage your notification preferences in your account settings.
    </p>
  </body>
</html>
  `.trim();
}
