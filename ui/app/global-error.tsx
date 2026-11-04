"use client";

import { Button } from "@enterprise/ui/components/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

/**
 * Global error boundary — the last line of defence.
 *
 * This is the ONLY boundary that catches errors thrown by the root layout
 * (`app/layout.tsx`). When it fires, the root layout is replaced entirely, so
 * this component MUST render its own `<html>` and `<body>` tags and import the
 * global stylesheet itself.
 *
 * The error is forwarded to Sentry. It is deliberately NOT rendered to the
 * user: `error.message` and `error.digest` can leak internals.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred and has been reported to our team. You can try again, or
              reload the page if the problem persists.
            </p>
          </div>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
