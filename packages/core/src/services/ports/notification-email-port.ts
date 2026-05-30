// Email port interface for notification delivery
// Implement this interface to swap email adapters per environment

export interface NotificationEmailParams {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export interface NotificationEmailPort {
  sendNotificationEmail(
    params: NotificationEmailParams,
  ): Promise<{ success: boolean; error?: string }>;
}
