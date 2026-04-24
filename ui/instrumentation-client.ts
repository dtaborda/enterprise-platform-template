import * as Sentry from "@sentry/nextjs";
import { beforeSendFilter, getSentryEnvironment } from "./lib/sentry";

Sentry.init({
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"],
  environment: getSentryEnvironment(),
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.3,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend: beforeSendFilter,
  debug: process.env["SENTRY_DEBUG"] === "true",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
