// Resend adapter for invitation emails (production use)
// Requires RESEND_API_KEY env var and RESEND_FROM_EMAIL env var

import type { InvitationEmailParams, InvitationEmailPort } from "../ports/invitation-email-port";

export class ResendInvitationEmailAdapter implements InvitationEmailPort {
  private readonly apiKey: string;
  private readonly fromEmail: string;

  constructor(apiKey?: string, fromEmail?: string) {
    this.apiKey = apiKey ?? process.env["RESEND_API_KEY"] ?? "";
    this.fromEmail = fromEmail ?? process.env["RESEND_FROM_EMAIL"] ?? "noreply@example.com";
  }

  async send(params: InvitationEmailParams): Promise<{ success: boolean; error?: string }> {
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
          subject: `You've been invited to join ${params.tenantName}`,
          html: buildInvitationEmailHtml(params),
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

function buildInvitationEmailHtml(params: InvitationEmailParams): string {
  const expiresAt = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h2>You've been invited to join ${params.tenantName}</h2>
    <p>${params.inviterName} has invited you to join <strong>${params.tenantName}</strong> as a <strong>${params.role}</strong>.</p>
    <p>
      <a href="${params.acceptUrl}"
         style="background: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color: #64748b; font-size: 14px;">This invitation expires on ${expiresAt}.</p>
    <p style="color: #64748b; font-size: 14px;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  </body>
</html>
  `.trim();
}
