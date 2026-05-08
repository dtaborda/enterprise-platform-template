// Console adapter for invitation emails (development use)
// Logs invitation details to stdout — no external HTTP calls made

import type { InvitationEmailParams, InvitationEmailPort } from "../ports/invitation-email-port";

export class ConsoleInvitationEmailAdapter implements InvitationEmailPort {
  async send(params: InvitationEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("[ConsoleInvitationEmailAdapter] Invitation email:");
      console.log(`  To:        ${params.to}`);
      console.log(`  Tenant:    ${params.tenantName}`);
      console.log(`  Role:      ${params.role}`);
      console.log(`  Inviter:   ${params.inviterName}`);
      console.log(`  Accept URL: ${params.acceptUrl}`);
      console.log(`  Expires:   ${params.expiresAt.toISOString()}`);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }
}
