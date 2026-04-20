# Sentry Observability Setup

## Quick Start

1. Go to [sentry.io](https://sentry.io) and create a project
2. Note the DSN URL
3. Install the Sentry SDK

## Installation

```bash
pnpm add @sentry/nextjs
```

## Environment Variables

```bash
# Public (safe to expose)
NEXT_PUBLIC_SENTRY_DSN=https://[DSN]

# Private (server-side only)
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

## Basic Configuration (next.config.js)

```javascript
const nextConfig = {
  // Your existing config
};

const withSentry = require("@sentry/nextjs")({
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});

module.exports = withSentry(nextConfig);
```

## Usage in Code

```typescript
import * as Sentry from "@sentry/nextjs";

export async function GET(request) {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

## Custom Tags

Add contextual tags:

```typescript
Sentry.setTag("tenant_id", tenantId);
Sentry.setTag("user_role", userRole);
Sentry.setContext("request", { url, method });
```

## Source Maps

Vercel automatically uploads source maps if:
- `SENTRY_AUTH_TOKEN` is set in Vercel project
- `SENTRY_ORG` and `SENTRY_PROJECT` are configured

## Performance Monitoring

Enable tracing:

```javascript
// In your Sentry initialization
Sentry.init({
  tracesSampleRate: 1.0, // 100% in dev, lower in prod
});
```