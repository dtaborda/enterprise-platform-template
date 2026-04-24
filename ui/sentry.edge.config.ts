import * as Sentry from "@sentry/nextjs";
import { beforeSendFilter, getSentryEnvironment } from "./lib/sentry";

Sentry.init({
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"],
  environment: getSentryEnvironment(),
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.3,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend: beforeSendFilter,
  debug: process.env["SENTRY_DEBUG"] === "true",
});
