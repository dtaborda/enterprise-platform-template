import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@enterprise/ui",
    "@enterprise/core",
    "@enterprise/contracts",
    "@enterprise/db",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Local Supabase dev
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env["SENTRY_ORG"],
  project: process.env["SENTRY_PROJECT"],
  authToken: process.env["SENTRY_AUTH_TOKEN"],
  // Proxy Sentry requests through the app to avoid ad blockers
  tunnelRoute: "/monitoring",
  // Upload source maps from dynamic chunks
  widenClientFileUpload: true,
  // Delete source maps after upload (don't expose to browser)
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Never fail the build if auth token is absent (local dev)
  silent: true,
  // Tree-shake Sentry logger from production
  disableLogger: true,
  // Annotate React component names for better error grouping
  reactComponentAnnotation: { enabled: true },
});
