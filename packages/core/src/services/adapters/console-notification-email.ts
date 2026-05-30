// Console adapter for notification emails (development use)
// Logs notification email details to stdout — no external HTTP calls made

import type {
  NotificationEmailParams,
  NotificationEmailPort,
} from "../ports/notification-email-port";

export class ConsoleNotificationEmailAdapter implements NotificationEmailPort {
  async sendNotificationEmail(
    params: NotificationEmailParams,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.info("[ConsoleNotificationEmailAdapter] Notification email:");
      console.info(`  To:      ${params.to}`);
      console.info(`  Subject: ${params.subject}`);
      console.info(`  Title:   ${params.title}`);
      console.info(`  Body:    ${params.body}`);
      if (params.ctaUrl) {
        console.info(`  CTA URL: ${params.ctaUrl}`);
      }
      if (params.ctaLabel) {
        console.info(`  CTA Label: ${params.ctaLabel}`);
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: message };
    }
  }
}
