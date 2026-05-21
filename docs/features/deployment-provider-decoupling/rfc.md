---
title: "Deployment provider decoupling RFC"
description: "Configuration-based approach to make the Enterprise Platform Template deployable to Docker/self-hosted, AWS, and Cloudflare without changing application source code."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Deployment provider decoupling RFC

## Purpose

Define an implementation-ready technical approach for making the Enterprise Platform Template deployable to multiple hosting providers through configuration and environment variable changes only — never through application source code changes.

## Scope

- Included: `DEPLOY_TARGET` environment variable convention, `next.config.ts` conditional configuration, production `Dockerfile` for the monorepo, `docker-compose.yml` for local dev and self-hosted production, `.dockerignore`, custom `sharp`-based image loader for Docker/self-hosted, GitHub Actions workflow for Docker build + push to GHCR, environment variable documentation per provider, middleware compatibility audit and notes.
- Excluded: AWS CDK / Pulumi / Terraform infrastructure-as-code, Cloudflare Pages/Workers full adapter (`@cloudflare/next-on-pages` — follow-up), Kubernetes Helm charts, multi-region routing or edge caching strategies, Supabase self-hosting inside Docker Compose, automated provider detection at runtime, cost comparison guides.

---

## Summary

The template is currently Vercel-first by configuration. `vercel.json` is the build entry point, `next.config.ts` uses Vercel's default image CDN, and environment documentation covers only the Vercel dashboard workflow. Adopters who want Docker/self-hosted deployment must write a Dockerfile from scratch, figure out `output: "standalone"`, replicate image optimization, and build their own CI pipeline.

The fix is configuration-level, not code-level: introduce a `DEPLOY_TARGET` environment variable, add `output: "standalone"` conditionally in `next.config.ts`, ship a production-grade `Dockerfile` and `docker-compose.yml`, add a `sharp`-based image loader activated for non-Vercel targets, and provide a GitHub Actions workflow for GHCR. All of this is layered on top of the existing Vercel path with zero regressions.

## Technical objectives

- Adopters can deploy to Docker/self-hosted by running `docker compose up` with a populated `.env` file — no custom build infrastructure required.
- Vercel remains the default and reference target with no regressions — no new required env vars for Vercel adopters, `vercel.json` unchanged.
- All target-specific configuration lives in `vercel.json`, `Dockerfile`, `docker-compose.yml`, and `next.config.ts` conditionals — never in feature source files.
- Image optimization works out of the box for Docker/self-hosted via server-side `sharp` processing, without Vercel's CDN.
- Docker image size stays under 500 MB using Next.js standalone output.
- The container runs as a non-root user.

---

## Deployment target abstraction

### `DEPLOY_TARGET` env var

`DEPLOY_TARGET` is a build-time environment variable that controls target-specific configuration in `next.config.ts`. It is always set explicitly — there is no auto-detection.

| Value | Meaning | Who sets it |
|-------|---------|-------------|
| `vercel` | Vercel deployment (default) | Vercel auto-injects; or set explicitly in `vercel.json` |
| `docker` | Docker-based local dev or self-hosted production | Adopter sets in `.env` / `docker-compose.yml` |
| `self-hosted` | VPS / systemd / AWS ECS / Fargate | Adopter sets in environment file or task definition |
| `cloudflare` | Cloudflare Pages (stub — follow-up) | Adopter sets in `wrangler.toml` |

**Default behavior**: when `DEPLOY_TARGET` is unset, the config behaves identically to `DEPLOY_TARGET=vercel`. Existing Vercel adopters do not need to set anything.

**Build-time vs. runtime**: `DEPLOY_TARGET` must be available at `next build` time (baked into the build output). It is NOT a runtime environment variable. In Docker, it is passed as a build argument (`ARG DEPLOY_TARGET`). In Vercel, it can be set in the dashboard under "Build environment variables" if explicit control is desired.

**`turbo.json` `globalEnv` addition**: `DEPLOY_TARGET` must be added to `turbo.json` `globalEnv` so Turborepo invalidates the build cache when the target changes.

```json
// turbo.json — add DEPLOY_TARGET to globalEnv
{
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_APP_ENV",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_SENTRY_DSN",
    "DEPLOY_TARGET"
  ]
}
```

### `next.config.ts` conditional configuration

The existing `ui/next.config.ts` is modified to read `DEPLOY_TARGET` and apply target-specific settings. The Sentry wrapper (`withSentryConfig`) remains unchanged and wraps the final config object.

```typescript
// ui/next.config.ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const deployTarget = process.env["DEPLOY_TARGET"] ?? "vercel";

const isDockerOrSelfHosted =
  deployTarget === "docker" || deployTarget === "self-hosted";

const isCloudflare = deployTarget === "cloudflare";

const baseConfig: NextConfig = {
  transpilePackages: [
    "@enterprise/ui",
    "@enterprise/core",
    "@enterprise/contracts",
    "@enterprise/db",
  ],

  // Standalone output: required for Docker multi-stage builds.
  // Vercel ignores this field and uses its own pipeline.
  ...(isDockerOrSelfHosted && { output: "standalone" }),

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

    // Docker/self-hosted: use custom sharp-based server-side loader.
    // Vercel: default CDN loader (loaderFile omitted, unoptimized: false).
    // Cloudflare: disable optimization entirely (follow-up to add custom loader).
    ...(isDockerOrSelfHosted && {
      loader: "custom" as const,
      loaderFile: "./lib/image-loader.ts",
    }),
    ...(isCloudflare && { unoptimized: true }),
  },
};

export default withSentryConfig(baseConfig, {
  org: process.env["SENTRY_ORG"],
  project: process.env["SENTRY_PROJECT"],
  authToken: process.env["SENTRY_AUTH_TOKEN"],
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  silent: true,
  disableLogger: true,
  reactComponentAnnotation: { enabled: true },
});
```

**Config matrix**:

| Setting | `vercel` (default) | `docker` / `self-hosted` | `cloudflare` (stub) |
|---------|-------------------|--------------------------|---------------------|
| `output` | (unset — Vercel default) | `"standalone"` | (unset — follow-up) |
| `images.loader` | `"default"` (Vercel CDN) | `"custom"` + `loaderFile` | (omitted) |
| `images.unoptimized` | `false` | `false` (custom loader active) | `true` |

---

## Docker support

### Dockerfile

Location: `Dockerfile` at the **monorepo root**.

The build context must include all workspace packages (`packages/core`, `packages/db`, `packages/ui`, `packages/contracts`) because the Next.js app imports them. A root-level Dockerfile with pnpm workspace install is the correct pattern for this monorepo.

The Dockerfile uses three stages:
1. **`deps`** — install all workspace dependencies with `pnpm install --frozen-lockfile`.
2. **`builder`** — copy source, set `DEPLOY_TARGET=docker`, run `pnpm build` (Turborepo build).
3. **`runner`** — copy only the standalone output, run as non-root user. No `node_modules` duplication.

```dockerfile
# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Platform — Production Dockerfile
# Target: @enterprise/web (Next.js App Router, standalone output)
# ─────────────────────────────────────────────────────────────────────────────
# Build:
#   docker build \
#     --build-arg DEPLOY_TARGET=docker \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
#     --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.com \
#     --build-arg NEXT_PUBLIC_APP_NAME="My App" \
#     --build-arg NEXT_PUBLIC_APP_ENV=production \
#     --build-arg NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0 \
#     --build-arg SENTRY_AUTH_TOKEN=sntrys_... \
#     --build-arg SENTRY_ORG=your-org \
#     --build-arg SENTRY_PROJECT=your-project \
#     -t ghcr.io/your-org/enterprise-platform:latest .
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20
ARG PNPM_VERSION=9.15.0

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy workspace manifests and lockfile first for layer caching.
# Changes to source files will not bust the dependency install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY ui/package.json ./ui/

# Install all workspace dependencies (including devDependencies needed for build).
# Use --frozen-lockfile to ensure reproducible installs.
RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy installed node_modules from deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/ui/node_modules ./ui/node_modules

# Copy all source files.
COPY . .

# ─── Build-time environment variables ────────────────────────────────────────
# NEXT_PUBLIC_* variables are baked into the client bundle at build time.
# They CANNOT be overridden at container runtime without rebuilding.
# Pass them as --build-arg when building the image.
# See: docs/developer-guide/environment-guide.mdx — Docker section.
# ─────────────────────────────────────────────────────────────────────────────

# Deployment target — MUST be docker or self-hosted to produce standalone output.
ARG DEPLOY_TARGET=docker
ENV DEPLOY_TARGET=${DEPLOY_TARGET}

# Supabase public vars (baked into client bundle).
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}

ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# App configuration (baked into client bundle).
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

ARG NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}

# Sentry DSN (baked into client bundle — safe to expose, it is a public key).
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# Sentry source map upload (build-time only — NOT needed at runtime).
# Omit SENTRY_AUTH_TOKEN to skip source map upload (withSentryConfig is silent: true).
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}

ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

# Disable Next.js telemetry during CI builds.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the entire monorepo. Turborepo builds packages in dependency order.
RUN pnpm build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner

# Install sharp's native dependencies (Alpine needs libc compatibility via libc6-compat).
# sharp is used by the custom image loader (ui/lib/image-loader.ts).
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and group for security.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output.
# The standalone directory is self-contained: it includes only the files needed
# to run the server. node_modules are NOT duplicated (tree-shaken by Next.js).
COPY --from=builder --chown=nextjs:nodejs /app/ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/ui/.next/static ./ui/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/ui/public ./ui/public

# Install sharp for the custom image loader.
# sharp must be installed in the runner stage (native binary, architecture-specific).
# It is installed as a production dependency, not copied from the builder.
RUN npm install --global --ignore-scripts false sharp@^0.33.0 && \
    chown -R nextjs:nodejs /usr/local/lib/node_modules/sharp

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output includes a Node.js server at server.js.
# Next.js standalone places the app server at the monorepo-aware path.
CMD ["node", "ui/server.js"]
```

### `docker-compose.yml`

Location: `docker-compose.yml` at the monorepo root.

This Compose file covers two use cases:
- **Local dev** (profile `dev`): builds from source, mounts `.env.local`, exposes port 3000.
- **Self-hosted production** (default profile): pulls the pre-built image from GHCR, reads from `.env.docker`, applies restart policy.

> **Warning**: The self-hosted production profile is a starting point. For production traffic, place a reverse proxy (nginx, Caddy) in front of the container to handle TLS termination, compression, and static asset serving. Do NOT expose the Next.js server directly to the internet.

```yaml
# docker-compose.yml
# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Platform — Docker Compose
# ─────────────────────────────────────────────────────────────────────────────
#
# USAGE:
#
#   Self-hosted production (pull pre-built image from GHCR):
#     cp .env.example .env.docker
#     # Fill .env.docker with production values
#     docker compose up -d
#
#   Local dev (build from source):
#     cp .env.example .env.local
#     # Fill .env.local with local Supabase values
#     docker compose --profile dev up
#
# NOTE: No Supabase containers are included. This template uses Supabase Cloud.
# For local Supabase, run `supabase start` separately via the Supabase CLI.
# ─────────────────────────────────────────────────────────────────────────────

services:
  # ── Production / self-hosted (default profile) ─────────────────────────────
  web:
    image: ghcr.io/${GITHUB_REPOSITORY:-your-org/enterprise-platform}:${IMAGE_TAG:-latest}
    ports:
      - "${APP_PORT:-3000}:3000"
    env_file:
      - .env.docker
    environment:
      # Override NODE_ENV explicitly — the image sets this at build time,
      # but allow runtime override for debugging.
      NODE_ENV: production
    restart: unless-stopped
    # Runtime-injectable environment variables (NOT NEXT_PUBLIC_ — those are baked at build time).
    # Add any server-side-only variables here that should NOT be in the image.
    # Example: SUPABASE_SERVICE_ROLE_KEY can be injected at runtime.

  # ── Local dev (build from source) ─────────────────────────────────────────
  web-dev:
    profiles: [dev]
    build:
      context: .
      dockerfile: Dockerfile
      args:
        # NEXT_PUBLIC_* vars must be passed as build args — they are baked
        # into the client bundle by next build. They cannot be set at runtime.
        DEPLOY_TARGET: docker
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
        NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-My Enterprise App}
        NEXT_PUBLIC_APP_ENV: ${NEXT_PUBLIC_APP_ENV:-development}
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    restart: "no"
```

### `.dockerignore`

Location: `.dockerignore` at the monorepo root.

```dockerignore
# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Platform — .dockerignore
# Excludes files that should NOT be sent to the Docker build context.
# Smaller context = faster builds and no accidental secret leakage.
# ─────────────────────────────────────────────────────────────────────────────

# Git
.git
.gitignore

# Environment files — NEVER include secrets in the build context.
# NEXT_PUBLIC_* vars are passed as --build-arg, not copied from disk.
.env
.env.*
!.env.example

# Node modules — reinstalled inside the builder stage via pnpm install.
node_modules
**/node_modules

# Next.js build artifacts — rebuilt inside the builder stage.
**/.next
**/dist

# Test artifacts
coverage
playwright-report
test-results

# IDE and editor files
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Turbo cache
.turbo

# Supabase local dev files (not needed in production image)
supabase/.branches
supabase/.temp

# Documentation (not needed in the runtime image)
docs

# Skills and agent tooling
skills
.agents
.claude
.opencode
.engram
.atl
.codex
.gemini

# Scripts (not needed in the runtime image)
scripts

# Playwright config and E2E tests
playwright.config.ts
ui/e2e

# Vitest config and unit tests
vitest.config.ts
**/*.test.ts
**/*.spec.ts
```

---

## Image optimization per provider

Next.js `<Image />` optimization routes through different layers depending on the hosting target. The strategy is:

1. **Vercel (default)**: Vercel's CDN handles optimization automatically. No loader configuration needed. The image is served from Vercel's global edge network with automatic format negotiation (WebP/AVIF).
2. **Docker / self-hosted**: A custom `sharp`-based loader runs optimization through the Next.js server process itself. No external CDN dependency.
3. **Cloudflare (follow-up)**: `unoptimized: true` in MVP (no image processing at all). Full Cloudflare Images loader is a follow-up.

### Vercel (default)

No configuration changes. When `DEPLOY_TARGET` is unset or `vercel`, `next.config.ts` does not set `loader` or `loaderFile`. Vercel's image optimization CDN is active by default.

```typescript
// next.config.ts — Vercel path (no changes from current config)
images: {
  remotePatterns: [/* ... */],
  // loader: "default" is implicit — Vercel CDN handles optimization
}
```

### Docker / self-hosted (`sharp`)

When `DEPLOY_TARGET=docker` or `self-hosted`, a custom loader file at `ui/lib/image-loader.ts` is activated. This loader constructs the `/_next/image` URL, which is handled by the Next.js built-in image optimization route using `sharp` for server-side processing.

The `sharp` package is installed in the Docker runner stage and is available as a peer dependency for adopters running locally without Docker.

```typescript
// ui/lib/image-loader.ts
// Custom image loader for Docker/self-hosted deployments.
// Delegates to Next.js built-in /_next/image route, which uses sharp
// for server-side image processing. No Vercel CDN dependency.
//
// Performance note: Image optimization runs on the server CPU,
// not a CDN. For high-traffic production deployments, consider:
//   - Adding a CDN (Cloudflare, CloudFront) in front of the Next.js server
//   - Using a dedicated image CDN (Cloudflare Images, imgix)
//   - Replacing this file with a CDN-specific loader without changing app code

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
  });
  return `/_next/image?${params.toString()}`;
}
```

**sharp installation for local dev (without Docker)**:

```bash
# Install sharp as a dev dependency for local non-Docker development
# when DEPLOY_TARGET=docker is set in .env.local
pnpm add --filter @enterprise/web --save-optional sharp
```

**sharp in Docker**: The `Dockerfile` installs `sharp` globally in the runner stage. The native binary is compiled for `linux/amd64` in CI. Multi-platform builds (`linux/amd64,linux/arm64`) are supported via the GitHub Actions workflow's `platforms` matrix.

### Cloudflare (follow-up)

MVP ships `unoptimized: true` as a stub when `DEPLOY_TARGET=cloudflare`. This disables image optimization entirely — `<Image />` components render the original `src` URL without resizing or format conversion. A full Cloudflare Images loader is planned as a follow-up once `@cloudflare/next-on-pages` compatibility with this template's Server Actions is verified.

```typescript
// next.config.ts — Cloudflare stub (MVP)
...(isCloudflare && { unoptimized: true }),
```

---

## CI/CD workflows

### Existing: Vercel CI (no changes)

The existing `.github/workflows/ci.yml` runs quality checks (typecheck, lint, test, build) on every pull request and push to `main`. Vercel deployment is triggered separately by the Vercel GitHub integration — not by this workflow. No changes are needed here.

The only addition to `ci.yml` is a lint step to catch accidental Vercel-specific imports in middleware:

```yaml
# Addition to the existing quality job in .github/workflows/ci.yml
- name: Audit middleware for Vercel-specific APIs
  run: |
    if grep -rE "waitUntil|@vercel/edge|EdgeConfig" ui/middleware.ts; then
      echo "ERROR: middleware.ts contains Vercel-specific runtime APIs."
      echo "These must be guarded with DEPLOY_TARGET conditionals or extracted."
      exit 1
    fi
    echo "Middleware audit passed."
```

### New: Docker build + push to GHCR

Location: `.github/workflows/deploy-docker.yml`

This workflow builds the Docker image, tags it with the Git SHA and `latest`, and pushes to GitHub Container Registry (GHCR). It is triggered manually by default (`workflow_dispatch`) so it does not interfere with Vercel adopters who have not configured Docker secrets.

**To activate automatic triggers**, uncomment the `push` trigger block and configure the required secrets in GitHub repository settings.

```yaml
# .github/workflows/deploy-docker.yml
# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Platform — Docker Build and Push to GHCR
# ─────────────────────────────────────────────────────────────────────────────
#
# REQUIRED GITHUB SECRETS (set in repository Settings → Secrets → Actions):
#
#   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL (e.g. https://xxx.supabase.co)
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  — Supabase anonymous key (public, baked at build time)
#   NEXT_PUBLIC_APP_URL            — Full app URL (e.g. https://yourdomain.com)
#   NEXT_PUBLIC_APP_NAME           — App display name (e.g. "My Enterprise App")
#   NEXT_PUBLIC_APP_ENV            — Environment name (e.g. production)
#   NEXT_PUBLIC_SENTRY_DSN         — Sentry DSN (public, baked at build time) — optional
#   SENTRY_AUTH_TOKEN              — Sentry auth token for source map upload — optional
#   SENTRY_ORG                     — Sentry organization slug — optional
#   SENTRY_PROJECT                 — Sentry project slug — optional
#
# GITHUB_TOKEN is auto-provided by GitHub Actions — no configuration needed for GHCR push.
#
# OPTIONAL DEPLOY SECRETS (uncomment the deploy step you want to use):
#
#   DEPLOY_WEBHOOK_URL             — Webhook URL to trigger a deploy on your server
#   DEPLOY_SSH_HOST                — SSH host of your server
#   DEPLOY_SSH_USER                — SSH user (e.g. deploy)
#   DEPLOY_SSH_KEY                 — SSH private key (PEM format)
# ─────────────────────────────────────────────────────────────────────────────

name: Docker Build and Push

on:
  # Manual trigger — safe default. Uncomment `push` below to enable automatic builds.
  workflow_dispatch:
    inputs:
      deploy:
        description: "Trigger deploy after push (requires deploy secrets)"
        required: false
        default: "false"
        type: choice
        options: ["false", "webhook", "ssh"]

  # Uncomment to enable automatic builds on push to main:
  # push:
  #   branches: [main]
  #   paths:
  #     - "ui/**"
  #     - "packages/**"
  #     - "Dockerfile"
  #     - "pnpm-lock.yaml"

concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  packages: write   # Required to push to GHCR

jobs:
  build-and-push:
    name: Build Docker Image and Push to GHCR
    runs-on: ubuntu-latest

    steps:
      - name: Harden runner
        uses: step-security/harden-runner@a5ad31d6a139d249332a2605b85202e8c0b78450 # v2
        with:
          egress-policy: audit

      - name: Checkout
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4

      # Set up QEMU for multi-platform builds (linux/amd64 + linux/arm64).
      # Required for sharp's native binary compilation across architectures.
      - name: Set up QEMU
        uses: docker/setup-qemu-action@29109295f81e9208d7d6a71c5c4b7a9bd00ab7e9 # v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@b5730b7e2fa08f01c7a58f8f4f43fb25d3c43ed1 # v3
        with:
          # Use the docker-container driver for multi-platform support and cache export.
          driver-opts: image=moby/buildkit:latest

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@74a5d142397b4f367a81961eba4e8cd7edddf772 # v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          # GITHUB_TOKEN is auto-provided — no secret configuration needed for GHCR.
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@902fa8ec7d6ecbea8a63a2c28c8a69d8a45e85db # v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            # Tag with the full Git SHA (e.g. sha-a1b2c3d)
            type=sha,prefix=sha-,format=short
            # Tag as `latest` on pushes to main (or manual dispatch from main)
            type=raw,value=latest,enable=${{ github.ref == format('refs/heads/{0}', 'main') }}
            # Tag with the branch name for non-main branches
            type=ref,event=branch

      - name: Build and push Docker image
        uses: docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83 # v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          # Build for both amd64 (standard servers, CI) and arm64 (Apple Silicon, AWS Graviton).
          # sharp's native binary is compiled per-architecture in the runner stage.
          platforms: linux/amd64,linux/arm64
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # Use GitHub Actions cache to speed up subsequent builds.
          # Cache is stored in the GHCR registry alongside the image.
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:cache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:cache,mode=max
          build-args: |
            DEPLOY_TARGET=docker
            NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
            NEXT_PUBLIC_APP_URL=${{ secrets.NEXT_PUBLIC_APP_URL }}
            NEXT_PUBLIC_APP_NAME=${{ secrets.NEXT_PUBLIC_APP_NAME }}
            NEXT_PUBLIC_APP_ENV=${{ secrets.NEXT_PUBLIC_APP_ENV }}
            NEXT_PUBLIC_SENTRY_DSN=${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
            SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }}
            SENTRY_ORG=${{ secrets.SENTRY_ORG }}
            SENTRY_PROJECT=${{ secrets.SENTRY_PROJECT }}

      # ── Deploy step: choose ONE of the options below ────────────────────────
      # Uncomment the deploy step that matches your deployment method.
      # Each requires the corresponding secrets configured in GitHub repository settings.

      # Option A: Webhook deploy
      # Sends a POST request to your server's deploy webhook.
      # Your server pulls the new image and restarts the container.
      # ─────────────────────────────────────────────────────────────────────────
      # - name: Deploy via webhook
      #   if: ${{ github.event.inputs.deploy == 'webhook' || github.event_name == 'push' }}
      #   run: |
      #     curl --fail --silent --show-error \
      #       -X POST \
      #       -H "Content-Type: application/json" \
      #       -H "Authorization: Bearer ${{ secrets.DEPLOY_WEBHOOK_SECRET }}" \
      #       -d '{"image": "ghcr.io/${{ github.repository }}:${{ steps.meta.outputs.version }}"}' \
      #       "${{ secrets.DEPLOY_WEBHOOK_URL }}"

      # Option B: SSH deploy
      # SSH into your server, pull the new image, and restart the container.
      # ─────────────────────────────────────────────────────────────────────────
      # - name: Deploy via SSH
      #   if: ${{ github.event.inputs.deploy == 'ssh' || github.event_name == 'push' }}
      #   uses: appleboy/ssh-action@7bf3f3bdacef2eee8e7d7631b2b1d5ad7e66d1b8 # v1
      #   with:
      #     host: ${{ secrets.DEPLOY_SSH_HOST }}
      #     username: ${{ secrets.DEPLOY_SSH_USER }}
      #     key: ${{ secrets.DEPLOY_SSH_KEY }}
      #     script: |
      #       echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      #       docker pull ghcr.io/${{ github.repository }}:latest
      #       docker compose -f /opt/enterprise-platform/docker-compose.yml up -d
      #       docker image prune -f

      # Option C: AWS ECS service update
      # Updates the ECS service to use the newly pushed image.
      # NEXT_PUBLIC_* vars are baked in the image; runtime vars come from Secrets Manager.
      # ─────────────────────────────────────────────────────────────────────────
      # - name: Deploy to AWS ECS
      #   if: ${{ github.event.inputs.deploy == 'webhook' || github.event_name == 'push' }}
      #   run: |
      #     aws ecs update-service \
      #       --cluster ${{ secrets.AWS_ECS_CLUSTER }} \
      #       --service ${{ secrets.AWS_ECS_SERVICE }} \
      #       --force-new-deployment \
      #       --region ${{ secrets.AWS_REGION }}
      #   env:
      #     AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      #     AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # ── Optional: verify image size ─────────────────────────────────────────────
  verify-image-size:
    name: Verify Docker Image Size
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@74a5d142397b4f367a81961eba4e8cd7edddf772 # v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Pull image and check size
        run: |
          docker pull ghcr.io/${{ github.repository }}:latest
          SIZE_MB=$(docker image inspect ghcr.io/${{ github.repository }}:latest \
            --format='{{.Size}}' | awk '{printf "%.0f", $1/1024/1024}')
          echo "Image size: ${SIZE_MB} MB"
          if [ "$SIZE_MB" -gt 500 ]; then
            echo "ERROR: Docker image exceeds 500 MB limit (${SIZE_MB} MB)."
            echo "Review the Dockerfile stages and ensure standalone output is active."
            exit 1
          fi
          echo "Image size check passed: ${SIZE_MB} MB < 500 MB"
```

---

## Environment variable documentation per provider

### Variable reference

All variables from `vercel.json` and `.env.example` translated across providers:

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (build-time) | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (build-time) | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (runtime) | Yes | Never expose to browser |
| `NEXT_PUBLIC_APP_URL` | Public (build-time) | Yes | Full application URL |
| `NEXT_PUBLIC_APP_NAME` | Public (build-time) | Yes | App display name |
| `NEXT_PUBLIC_APP_ENV` | Public (build-time) | Yes | `development` / `production` |
| `DATABASE_URL` | Secret (build-time for migrations) | No | Drizzle Kit only; not used at runtime |
| `RESEND_API_KEY` | Secret (runtime) | No | Email sending |
| `EMAIL_FROM` | Config (runtime) | No | Sender address |
| `NEXT_PUBLIC_SENTRY_DSN` | Public (build-time) | No | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Secret (build-time) | No | Source map upload only |
| `SENTRY_ORG` | Config (build-time) | No | Source map upload only |
| `SENTRY_PROJECT` | Config (build-time) | No | Source map upload only |
| `DEPLOY_TARGET` | Config (build-time) | No | Default: `vercel` |

**`NEXT_PUBLIC_` variables are build-time constants** — they are inlined into the JavaScript bundle by `next build`. They CANNOT be changed at container runtime without rebuilding the image. This is a Next.js constraint, not a template choice. See the Dockerfile `ARG` / `ENV` pattern for how to pass them at build time.

### Vercel

Environment variables are set in the Vercel dashboard under **Settings → Environment Variables** and optionally referenced in `vercel.json` via secret aliases (e.g., `@supabase-url`).

`NEXT_PUBLIC_` variables set in the Vercel dashboard are automatically available at both build time and runtime on Vercel (Vercel re-injects them into the build environment). No `DEPLOY_TARGET` is needed — Vercel is the default.

```json
// vercel.json — current configuration (no changes required)
{
  "$schema": "https://openapi.vercel.com/vercel.json",
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
    "NEXT_PUBLIC_APP_URL": "@app-url",
    "NEXT_PUBLIC_APP_NAME": "@app-name",
    "NEXT_PUBLIC_APP_ENV": "@app-env"
  }
}
```

### Docker / self-hosted

`.env.docker.example` (new file at monorepo root):

```bash
# ─────────────────────────────────────────────────────────────────────────────
# Enterprise Platform — Docker / Self-Hosted Environment
# ─────────────────────────────────────────────────────────────────────────────
# Copy to .env.docker and fill in your values.
# NEVER commit .env.docker to version control.
#
# IMPORTANT: NEXT_PUBLIC_* variables are baked into the Docker image at build
# time. They CANNOT be changed at runtime without rebuilding the image.
# Pass them as Docker build arguments (--build-arg) when building.
# ─────────────────────────────────────────────────────────────────────────────

# ── Deployment target ─────────────────────────────────────────────────────────
# Must match the value used when building the Docker image.
# Values: docker | self-hosted
DEPLOY_TARGET=docker

# ── Supabase ──────────────────────────────────────────────────────────────────
# Public — baked into the client bundle at build time (passed as --build-arg).
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Public — baked into the client bundle at build time (passed as --build-arg).
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# SECRET — server-side only. Injected at container runtime (NOT a build arg).
# NEVER prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ── App configuration ─────────────────────────────────────────────────────────
# Baked into the client bundle at build time (passed as --build-arg).
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=My Enterprise App
NEXT_PUBLIC_APP_ENV=production

# ── Email ─────────────────────────────────────────────────────────────────────
# Server-side only. Injected at container runtime.
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# ── Sentry (optional) ─────────────────────────────────────────────────────────
# DSN is public — baked into the client bundle at build time.
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0

# Auth token and org/project are build-time only (source map upload).
# Set as GitHub Actions secrets, NOT here.
# SENTRY_AUTH_TOKEN=sntrys_...
# SENTRY_ORG=your-org
# SENTRY_PROJECT=your-project
```

How Docker Compose reads these variables at runtime:

```yaml
# docker-compose.yml — env_file usage
services:
  web:
    env_file:
      - .env.docker
```

Variables that are NOT `NEXT_PUBLIC_` (e.g., `SUPABASE_SERVICE_ROLE_KEY`) can be injected at runtime via `env_file` without rebuilding the image — the server process reads them when the container starts.

### AWS ECS / Fargate

`DEPLOY_TARGET=self-hosted` is set in the ECS task definition environment block. `NEXT_PUBLIC_*` variables must be baked into the image at build time via GitHub Actions build arguments. Runtime secrets (e.g., `SUPABASE_SERVICE_ROLE_KEY`) are stored in AWS Secrets Manager and referenced in the task definition `secrets` block.

```json
// ECS Task Definition — representative snippet
{
  "family": "enterprise-platform",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "ghcr.io/your-org/enterprise-platform:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "DEPLOY_TARGET", "value": "self-hosted" },
        { "name": "NEXT_PUBLIC_APP_ENV", "value": "production" }
        // NOTE: NEXT_PUBLIC_* are baked into the image at build time.
        // Setting them here has NO effect — Next.js reads them at build, not runtime.
        // They must be passed as Docker --build-arg in the GitHub Actions workflow.
      ],
      "secrets": [
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:enterprise-platform/supabase-service-role-key"
        },
        {
          "name": "RESEND_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:enterprise-platform/resend-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/enterprise-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Cloudflare Pages (stub — follow-up)

MVP documents the variable injection pattern but ships no full adapter. `NEXT_PUBLIC_*` variables are set in `wrangler.toml` under `[vars]`. Sensitive variables use `wrangler secret put`.

```toml
# wrangler.toml — stub for documentation
name = "enterprise-platform"
compatibility_date = "2024-01-01"

[vars]
NEXT_PUBLIC_APP_ENV = "production"
# NOTE: Full Cloudflare Pages adapter is a follow-up.
# The current template uses features (Server Actions, Route Handlers)
# that require @cloudflare/next-on-pages compatibility verification.
```

```bash
# Sensitive variables — set via CLI (not stored in wrangler.toml)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put RESEND_API_KEY
```

---

## Middleware compatibility

### Current state

`ui/middleware.ts` handles:
1. Supabase session refresh via `updateSession` from `@enterprise/core/supabase/middleware`.
2. Authentication guard — redirects unauthenticated users to `/sign-in`.
3. Role-based redirect — routes users to their role home after login.

### Vercel-specific API audit

The middleware was audited for Vercel-specific runtime APIs. Findings:

| API | Present | Vercel-specific? | Status |
|-----|---------|-----------------|--------|
| `waitUntil` | No | Yes | Safe |
| `@vercel/edge` | No | Yes | Safe |
| `EdgeConfig` | No | Yes | Safe |
| `next-action` header check | Yes | No | Safe — standard Next.js header |
| `NextRequest` / `NextResponse` | Yes | No | Safe — Next.js core API |
| `supabase.auth.getUser()` | Yes | No | Safe — runs in Node.js runtime |

**Result**: The middleware contains no Vercel-specific runtime APIs. It runs correctly in the Node.js runtime used by Docker/self-hosted deployments.

### Edge Runtime vs. Node.js runtime

The `config.matcher` in `ui/middleware.ts` does not specify a `runtime` field. Next.js defaults middleware to the Edge Runtime for performance when deployed on Vercel. When deployed on Docker/self-hosted (Node.js runtime), the middleware runs in the Node.js runtime, which is fully compatible.

The Supabase session refresh (`updateSession`) from `@enterprise/core/supabase/middleware` uses `@supabase/ssr` — a library that is compatible with both Edge and Node.js runtimes.

**No changes to `ui/middleware.ts` are required** for Docker/self-hosted compatibility.

### CI guard

A lint step in `.github/workflows/ci.yml` checks for Vercel-specific imports in middleware to prevent future regressions:

```bash
# Fails the build if Vercel-specific APIs are introduced
grep -rE "waitUntil|@vercel/edge|EdgeConfig" ui/middleware.ts
```

---

## Testing strategy

### Unit tests

Location: `packages/core/src/__tests__/deploy-config.test.ts` (new)
Location: `ui/__tests__/next-config.test.ts` (new)

| Test | What it verifies |
|------|-----------------|
| `DEPLOY_TARGET=vercel` → no `output` field | `next.config.ts` logic does not set `output: "standalone"` for Vercel |
| `DEPLOY_TARGET=docker` → `output: "standalone"` | Config sets standalone output for Docker target |
| `DEPLOY_TARGET=self-hosted` → `output: "standalone"` | Config sets standalone output for self-hosted target |
| `DEPLOY_TARGET=cloudflare` → `unoptimized: true` | Config sets `images.unoptimized` for Cloudflare stub |
| `DEPLOY_TARGET` unset → Vercel behavior | Unset behaves identically to `vercel` |
| `DEPLOY_TARGET=docker` → `loader: "custom"` set | Custom loader is activated for Docker target |
| `DEPLOY_TARGET=vercel` → no `loaderFile` | Vercel target does not set a custom `loaderFile` |
| Image loader returns correct `/_next/image` URL | `ui/lib/image-loader.ts` produces correct URL with `url`, `w`, `q` params |
| Image loader uses default quality 75 | Quality defaults to 75 when not provided |

### E2E tests against Docker-built image

Location: `ui/e2e/docker/docker-build.spec.ts` (new)

These tests run against the Docker-built image in CI. The workflow spins up the container and runs Playwright against `http://localhost:3000`.

| Test | Tag | Flow |
|------|-----|------|
| Application starts and serves login page | `@critical` | `GET /` → redirect to `/sign-in` → 200 |
| Authentication flow works in Docker build | `@critical` | Login with E2E credentials → reach `/dashboard` |
| Supabase connection succeeds | `@critical` | Login succeeds → session persists across navigation |
| Middleware redirects unauthenticated user | `@critical` | `GET /dashboard` without session → redirect to `/sign-in` |
| Protected routes render correctly | `@critical` | All nav links in `/dashboard` load without error |
| `<Image />` renders via custom sharp loader | | Upload image via Supabase Storage → `<Image />` renders without 500 error |
| Session refresh persists across page loads | | Navigate multiple pages → session stays valid |

CI workflow addition to run E2E against Docker:

```yaml
# Addition to .github/workflows/deploy-docker.yml or a separate ci-docker.yml
  e2e-docker:
    name: E2E Tests Against Docker Image
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Checkout
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4

      - name: Log in to GHCR
        uses: docker/login-action@74a5d142397b4f367a81961eba4e8cd7edddf772 # v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Start application container
        run: |
          docker run -d \
            --name enterprise-platform-e2e \
            -p 3000:3000 \
            --env SUPABASE_SERVICE_ROLE_KEY="${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            --env RESEND_API_KEY="${{ secrets.RESEND_API_KEY }}" \
            ghcr.io/${{ github.repository }}:latest
          # Wait for the server to be ready
          timeout 60 bash -c 'until curl -sf http://localhost:3000; do sleep 2; done'

      - name: Setup pnpm
        uses: pnpm/action-setup@f40ffcd9367d9f12939873eb1018b921a783ffaa # v4

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests against Docker image
        run: pnpm e2e --project=chromium ui/e2e/docker/
        env:
          BASE_URL: http://localhost:3000
          E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}

      - name: Stop container
        if: always()
        run: docker stop enterprise-platform-e2e && docker rm enterprise-platform-e2e
```

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Provider detection | Explicit `DEPLOY_TARGET` env var | Auto-detection at runtime | Vercel sets `VERCEL=1` but Docker has no equivalent; explicit is unambiguous and deliberate |
| Default when `DEPLOY_TARGET` is unset | `vercel` behavior | Error or neutral default | Zero regression for existing Vercel adopters; safe fallback |
| `output: "standalone"` | Gated on `docker` / `self-hosted` | Always-on | Always-on adds an unused `.next/standalone` artifact to Vercel builds; conditional is correct |
| Image optimization for Docker | Custom `sharp` server-side loader | `unoptimized: true` | `unoptimized: true` degrades performance; `sharp` keeps optimization at server cost vs. CDN cost |
| Dockerfile location | Monorepo root | `ui/Dockerfile` | Build context must include all workspace packages; root-level Dockerfile with pnpm workspace install is the correct pattern |
| Supabase in Docker Compose | Excluded | Include Supabase containers | Template uses Supabase Cloud; local dev uses `supabase start` from the CLI; adding Supabase containers adds migrations, volumes, and seed complexity that is out of scope |
| Container registry | GHCR (default) | Docker Hub / adopter-defined | GHCR uses `GITHUB_TOKEN` — no extra credentials; Docker Hub rate-limits and requires a secret |
| Docker workflow trigger | `workflow_dispatch` (manual) | Automatic on push to main | Most adopters will not configure Docker secrets on first fork; manual trigger prevents accidental runs |
| `NEXT_PUBLIC_*` at build vs. runtime | Build-time (Next.js constraint) | Runtime injection | This is a Next.js architectural constraint; the deliverable is clear documentation and a Dockerfile `ARG` pattern |
| Cloudflare adapter in MVP | Follow-up stub only | Full adapter | `@cloudflare/next-on-pages` has significant compatibility gaps with App Router Server Actions; shipping a broken adapter is worse than shipping a documented stub |
| Multi-platform Docker build | `linux/amd64,linux/arm64` | `linux/amd64` only | `sharp` native binaries are architecture-specific; building both prevents issues on AWS Graviton and Apple Silicon |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `NEXT_PUBLIC_*` variables baked at build break image reuse across environments | High — adopters expect one image for staging and production | Document clearly in Dockerfile and environment guide; provide build-arg pattern; note implication explicitly |
| `sharp` native binary architecture mismatch | High — image optimization fails silently or crashes | Multi-platform Docker builds in CI (`--platform linux/amd64,linux/arm64`); document `--platform` flag |
| Middleware introduces Vercel-specific APIs in the future | High — silent breakage for Docker/self-hosted users | CI grep check added to `ci.yml`; middleware audit documented in `non-vercel-notes.md` |
| Standalone build omits files needed by a workspace package | Medium — runtime `MODULE_NOT_FOUND` errors | Full build with `DEPLOY_TARGET=docker` in CI before release; known omission patterns documented |
| Adopters set `DEPLOY_TARGET=docker` but do not rebuild the image | Medium — build configuration does not apply | Dockerfile `ARG DEPLOY_TARGET` makes this explicit; document in environment guide |
| Docker Compose used in production without reverse proxy | Medium — no TLS; direct port 3000 exposure | Warning comment in `docker-compose.yml`; note in `docs/deployment/docker.md` |
| `vercel.json` secrets pattern misleads adopters into thinking secrets are runtime-injected for Docker | Low — configuration confusion | Comment in `vercel.json` pointing to environment guide; provider-specific sections in docs |
| Docker image exceeds 500 MB limit | Low — adoption barrier | `verify-image-size` job in GitHub Actions workflow fails the build if exceeded |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | `DEPLOY_TARGET` added to `turbo.json` `globalEnv`; `next.config.ts` conditional logic (`output`, `images.loader`) | None |
| 2 | `ui/lib/image-loader.ts` (custom `sharp`-based loader); `sharp` optional peer dependency documented | Phase 1 |
| 3 | `Dockerfile` at monorepo root (multi-stage: `deps`, `builder`, `runner`); `.dockerignore` | Phase 1 |
| 4 | `docker-compose.yml` (default + `dev` profile); `.env.docker.example` | Phase 3 |
| 5 | `.github/workflows/deploy-docker.yml` (build, tag, push to GHCR; multi-platform; image size check) | Phases 3–4 |
| 6 | Middleware audit; CI grep guard added to `ci.yml`; `docs/deployment/non-vercel-notes.md` | Phase 1 |
| 7 | `docs/developer-guide/environment-guide.mdx` updated (Docker, AWS ECS, Cloudflare sections); `docs/deployment/docker.md` step-by-step guide | Phases 3–4 |
| 8 | Unit tests for `next.config.ts` conditional logic and `image-loader.ts` | Phases 1–2 |
| 9 | E2E tests against Docker-built image in CI (`ui/e2e/docker/docker-build.spec.ts`) | Phases 3–5 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Explicit `DEPLOY_TARGET` vs. auto-detection | Explicit `DEPLOY_TARGET` | Auto-detection is fragile; `VERCEL=1` is set by Vercel but Docker has no equivalent signal; explicit opt-in is clear |
| Default target when `DEPLOY_TARGET` is unset | `vercel` (Vercel behavior) | Unset = no change for existing adopters; zero regressions |
| `output: "standalone"` gated or always-on | Gated on `docker` / `self-hosted` | Vercel benefits from its own pipeline; always-on adds unused `.next/standalone` to Vercel builds |
| Image optimization outside Vercel: `unoptimized: true` or custom loader | Custom `sharp`-based server-side loader | `unoptimized: true` disables optimization entirely; `sharp` keeps it at server CPU cost vs. Vercel CDN |
| Dockerfile at monorepo root or `ui/` workspace | Monorepo root | Build context must include all workspace packages; root Dockerfile with pnpm workspace install is correct |
| Supabase containers in Docker Compose | Excluded | Template uses Supabase Cloud; Supabase containers add migration and seed complexity out of scope for MVP |
| Docker workflow trigger | `workflow_dispatch` (manual) | Prevents accidental runs on fork without configured secrets |
| Container registry | GHCR (default) | `GITHUB_TOKEN` — no extra credentials; Docker Hub requires a secret and rate-limits |
| Cloudflare adapter in MVP | Follow-up stub only | `@cloudflare/next-on-pages` compatibility with App Router Server Actions is unverified; broken adapter is worse than documented stub |
| `NEXT_PUBLIC_*` build-time vs. runtime | Document clearly; `ARG` pattern in Dockerfile | Next.js architectural constraint; key deliverable is clear documentation |

---

## File inventory

### New files

| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage production build targeting `@enterprise/web` standalone output |
| `.dockerignore` | Docker build context exclusions |
| `docker-compose.yml` | Self-hosted production and local dev Compose configuration |
| `.env.docker.example` | Docker/self-hosted environment variable template with comments |
| `ui/lib/image-loader.ts` | Custom `sharp`-based image loader for non-Vercel targets |
| `.github/workflows/deploy-docker.yml` | GitHub Actions workflow for Docker build, GHCR push, and optional deploy |
| `docs/deployment/docker.md` | Step-by-step guide: copy env → fill values → `docker compose up` |
| `docs/deployment/non-vercel-notes.md` | Middleware compatibility audit; notes on Edge Runtime vs. Node.js runtime |
| `ui/e2e/docker/docker-build.spec.ts` | E2E tests run against Docker-built image |
| `packages/core/src/__tests__/deploy-config.test.ts` | Unit tests for config conditional logic |

### Modified files

| File | Change |
|------|--------|
| `ui/next.config.ts` | Add `DEPLOY_TARGET` conditional logic for `output`, `images.loader`, `images.unoptimized` |
| `turbo.json` | Add `DEPLOY_TARGET` to `globalEnv` for build cache invalidation |
| `.github/workflows/ci.yml` | Add middleware audit grep step to catch Vercel-specific API regressions |
| `docs/developer-guide/environment-guide.mdx` | Add Docker, AWS ECS, and Cloudflare provider sections |

---

*Last updated: 2026-05-11*
