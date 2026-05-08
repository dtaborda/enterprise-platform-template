// Email port interface for invitation delivery
// Implement this interface to swap email adapters per environment

export interface InvitationEmailParams {
  to: string;
  inviterName: string;
  tenantName: string;
  acceptUrl: string;
  role: string;
  expiresAt: Date;
}

export interface InvitationEmailPort {
  send(params: InvitationEmailParams): Promise<{ success: boolean; error?: string }>;
}
