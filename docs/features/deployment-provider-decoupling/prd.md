---
title: "Deployment provider decoupling PRD"
description: "Makes the Enterprise Platform Template deployable to different hosting providers (Vercel, Docker/self-hosted, AWS, Cloudflare) without requiring changes in the application layer."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Deployment provider decoupling PRD

## Purpose

Define implementation-ready requirements for making the Enterprise Platform Template provider-agnostic at the deployment layer. Today the template ships Vercel-first by default; adopters who want to deploy to Docker, AWS, or Cloudflare must reverse-engineer the deployment coupling themselves. This PRD establishes a configuration-based approach — not a code-level abstraction — so that switching deployment targets requires only config and environment changes, never application code changes.

## Scope

- Included: Next.js standalone build output for Docker/self-hosted, Dockerfile and docker-compose for local dev and production self-hosting, `next.config.ts` conditional configuration driven by a `DEPLOY_TARGET` environment variable, image optimization strategy per provider, GitHub Actions workflow templates for Vercel (existing) and Docker/self-hosted (new), environment variable documentation per provider, middleware compatibility notes for non-Vercel runtimes.
- Excluded: AWS CDK or Pulumi infrastructure-as-code modules (follow-up), Cloudflare Pages/Workers adapter (follow-up), Kubernetes Helm charts (follow-up), multi-region routing or edge caching strategies per provider, Supabase hosting decoupling (separate feature), cost optimization guidance per provider, automated provider detection at runtime.

---

## Problem

The Enterprise Platform Template is currently Vercel-first: `vercel.json` defines the build pipeline, `next.config.ts` is optimized for Vercel's image CDN and Edge Runtime, and environment variable documentation only describes the Vercel dashboard workflow. When an adopter wants to deploy to AWS ECS, a VPS, or a container platform, they must:

1. Discover that Next.js requires `output: "standalone"` for Docker — this is not obvious from the template.
2. Write a Dockerfile from scratch without guidance on monorepo workspace resolution.
3. Figure out how to replicate Vercel's image optimization layer (missing outside Vercel).
4. Translate `vercel.json` secrets into provider-specific environment injection patterns.
5. Recreate a CI/CD pipeline that the template does not provide for non-Vercel targets.

Each adopter solves the same set of problems in isolation. The cost is high, the results are inconsistent, and the template's value proposition — "start with a solid foundation, not a blank slate" — breaks down at the deployment boundary.

The Vercel coupling in this template is primarily configuration-level (lighter than the Supabase coupling), which means the fix is also configuration-level: add the right defaults, ship a Dockerfile, and document the env patterns per provider. No application code changes are required.

## Users and stakeholders

| Role | Need |
|------|------|
| Template adopter (Docker/self-hosted) | Run `docker compose up` and have a working application without reverse-engineering Next.js standalone builds |
| Template adopter (AWS) | A CI/CD template and build output they can wire to ECS, Fargate, or App Runner without starting from scratch |
| Template adopter (Cloudflare) | Clarity on what works and what does not in the Cloudflare Pages environment |
| Template adopter (Vercel) | Zero regression — Vercel must remain the default and fully supported target |
| Platform engineering | A `DEPLOY_TARGET` convention that keeps target-specific config isolated so it does not pollute application code |

## Goals

- Enable adopters to deploy to Docker/self-hosted environments by running a single `docker compose up` command with a populated `.env` file.
- Keep Vercel as the default and reference deployment target with no regressions.
- Isolate all deployment-target-specific configuration in `vercel.json`, `Dockerfile`, `docker-compose.yml`, and `next.config.ts` conditionals — never in application source files.
- Document environment variable patterns for each supported provider so adopters can configure secrets correctly without guesswork.
- Ship GitHub Actions workflow templates for Docker/self-hosted (build, push to registry, deploy) alongside the existing Vercel-managed CI.

---

## MVP scope

### Core capabilities

**1. Next.js standalone build output**

Add `output: "standalone"` to `next.config.ts` when `DEPLOY_TARGET` is set to `docker` or `self-hosted`. Standalone output bundles only the code needed to run the server (no `node_modules` duplication), making Docker images dramatically smaller. Vercel ignores this field and continues to use its own build pipeline.

**2. Dockerfile for the `ui` workspace**

Provide a production-ready multi-stage `Dockerfile` at the monorepo root targeting the `@enterprise/web` Next.js application. Stages: `deps` (install with pnpm), `builder` (compile with turbo), `runner` (copy standalone output, minimal image). The runner stage uses `node:20-alpine`, sets `NODE_ENV=production`, and runs as a non-root user.

**3. docker-compose.yml for local dev and self-hosted**

Provide a `docker-compose.yml` that starts the Next.js application container. Local dev profile: mounts `.env.local`, exposes port 3000. Production/self-hosted profile: reads from a `.env.production` file, configures restart policy. No Supabase containers are included — the template uses Supabase Cloud or the adopter's own Supabase instance.

**4. `next.config.ts` conditional configuration**

Introduce a `DEPLOY_TARGET` environment variable with values `vercel` (default), `docker`, `self-hosted`, and `cloudflare` (stub only in MVP). The `next.config.ts` file reads this variable and applies target-specific settings:

| Setting | `vercel` | `docker` / `self-hosted` | `cloudflare` (stub) |
|---------|----------|--------------------------|---------------------|
| `output` | (unset — Vercel default) | `"standalone"` | (follow-up) |
| `images.loader` | `"default"` (Vercel CDN) | `"custom"` with `loaderFile` | (follow-up) |
| `images.unoptimized` | `false` | `false` (custom loader active) | `true` (stub) |
| `experimental.serverActions` | (default) | (default) | (default) |

**5. Image optimization strategy per provider**

Next.js `<Image />` optimization is handled natively by Vercel's CDN. Outside Vercel, a custom image loader is required. MVP ships a `sharp`-based custom loader file at `ui/lib/image-loader.ts` that proxies optimization through the Next.js server itself (no external CDN dependency). This loader is activated automatically when `DEPLOY_TARGET=docker` or `self-hosted`. Adopters who want a CDN (Cloudflare Images, imgix, AWS CloudFront + Lambda@Edge) can swap the loader file.

**6. GitHub Actions workflow for Docker/self-hosted**

Add `.github/workflows/deploy-docker.yml`: builds the Docker image, tags with the Git SHA and `latest`, pushes to GitHub Container Registry (GHCR), and triggers a deploy webhook or SSH command to the target host. The workflow is disabled by default (uses `workflow_dispatch` trigger) so it does not interfere with adopters using Vercel. Environment secrets are documented in comments inside the workflow file.

**7. Environment variable documentation per provider**

Extend `docs/developer-guide/environment-guide.mdx` with a provider-specific section documenting how to inject environment variables for each target:

- Vercel: dashboard + `vercel.json` secrets reference (already documented, link only)
- Docker: `.env` file mounted at runtime or `--env-file` flag; `docker-compose.yml` `env_file` directive
- Self-hosted (VPS/systemd): environment file at `/etc/enterprise-platform/env`, loaded by systemd unit
- AWS: ECS task definition `environment` and `secrets` blocks referencing AWS Secrets Manager
- Cloudflare Pages: `wrangler.toml` `[vars]` + `wrangler secret put` for sensitive values

**8. Middleware compatibility**

Verify and document that `ui/middleware.ts` (Supabase session refresh) runs correctly in Node.js runtime (Docker/self-hosted). The middleware must not use Vercel-specific APIs (`waitUntil`, Edge Config). If any Vercel-specific imports are found, they must be guarded with `DEPLOY_TARGET` conditionals or extracted behind an adapter.

### Out of scope (MVP)

- AWS CDK, Pulumi, or Terraform infrastructure-as-code for AWS deployment.
- Cloudflare Workers/Pages full adapter (needs `@cloudflare/next-on-pages` — complex, follow-up).
- Kubernetes manifests or Helm charts.
- Multi-region deployment strategies and edge caching per provider.
- Automated rollback and blue/green deployment pipelines.
- Cost estimation or provider comparison guides.
- Supabase self-hosting inside Docker Compose (adopters use Supabase Cloud or their own Supabase instance).
- Automated provider detection — `DEPLOY_TARGET` is always set explicitly by the adopter.

---

## User stories and acceptance criteria (from the template ADOPTER perspective)

### US-1: Adopter deploys to Docker/self-hosted with docker compose up

**As** a template adopter who wants to self-host, **I want** to run `docker compose up` with a populated `.env` file so I can have a running application without writing build infrastructure from scratch.

Acceptance criteria:
1. The repository includes a `Dockerfile` at the monorepo root that builds the Next.js application using the standalone output mode.
2. The repository includes a `docker-compose.yml` that references the built image and accepts environment variables from an `.env` file.
3. Running `docker compose up` with a valid `.env` file starts the application on port 3000 and serves the application correctly.
4. The built Docker image is smaller than 500 MB (standalone output removes unused `node_modules`).
5. The container runs as a non-root user.
6. The `README` or `docs/deployment/docker.md` includes the exact steps: copy `.env.example` → fill values → `docker compose up`.

### US-2: Adopter uses Vercel with no regressions

**As** a template adopter deploying to Vercel, **I want** the default behavior to be unchanged so that the new Docker support does not break my existing Vercel deployment.

Acceptance criteria:
1. When `DEPLOY_TARGET` is unset or set to `vercel`, `next.config.ts` does not add `output: "standalone"`.
2. Image optimization uses Vercel's default CDN loader (no custom `loaderFile`).
3. `vercel.json` remains unchanged and the Vercel deployment continues to work via `pnpm build`.
4. The `ci.yml` GitHub Actions workflow is unaffected by new Docker workflow files.
5. No new required environment variables are added for Vercel adopters.

### US-3: Adopter configures environment variables for Docker deployment

**As** a template adopter deploying to Docker/self-hosted, **I want** clear documentation on which environment variables to set and how to inject them so I do not have to reverse-engineer the `vercel.json` secrets configuration.

Acceptance criteria:
1. `docs/developer-guide/environment-guide.mdx` includes a "Docker / self-hosted" section listing all required environment variables with their expected values for production.
2. The section explains how to use `.env` files with Docker Compose (`env_file` directive).
3. The section notes that `DEPLOY_TARGET=docker` must be set so `next.config.ts` applies the correct build configuration.
4. A `.env.docker.example` file is provided in the repository with placeholder values and descriptive comments for every required variable.
5. The documentation warns about variables that must NOT be `NEXT_PUBLIC_` for security in self-hosted environments (e.g., service role keys).

### US-4: Adopter uses GitHub Actions to build and push a Docker image

**As** a template adopter with a self-hosted server, **I want** a GitHub Actions workflow that builds and pushes my Docker image to a registry so I can automate deployment without writing the workflow from scratch.

Acceptance criteria:
1. `.github/workflows/deploy-docker.yml` exists and is triggered by `workflow_dispatch` (manual) by default.
2. The workflow builds the Docker image using the monorepo `Dockerfile`.
3. The workflow tags the image with the Git SHA and `latest`.
4. The workflow pushes the image to GitHub Container Registry (GHCR) using `GITHUB_TOKEN` (no extra credentials required for GHCR).
5. The workflow includes commented-out steps and documentation for: triggering a deploy webhook, SSH-based pull-and-restart, and AWS ECS service update.
6. The workflow file includes inline comments explaining every secret that must be added to GitHub repository secrets.

### US-5: Adopter understands image optimization behavior outside Vercel

**As** a template adopter deploying to Docker/self-hosted, **I want** image optimization to work out of the box so that `<Image />` components do not throw errors or degrade performance unexpectedly.

Acceptance criteria:
1. When `DEPLOY_TARGET=docker` or `self-hosted`, `next.config.ts` activates the custom `sharp`-based image loader at `ui/lib/image-loader.ts`.
2. `<Image />` components render correctly and optimize images through the Next.js server's own optimization pipeline.
3. The documentation explains the difference between Vercel's CDN-based optimization and the server-side `sharp` optimization, and notes the performance tradeoff (CPU on server vs. Vercel CDN).
4. The documentation notes that adopters can replace `ui/lib/image-loader.ts` with a CDN-specific loader (Cloudflare Images, imgix) without changing any application code.
5. The `sharp` package is listed as an optional peer dependency with installation instructions for the Docker image.

### US-6: Adopter understands middleware compatibility

**As** a template adopter deploying outside Vercel, **I want** to know whether the middleware layer works in a Node.js runtime so that authentication session management does not break silently.

Acceptance criteria:
1. `docs/deployment/non-vercel-notes.md` documents which Next.js middleware features are used and whether they are Vercel-specific.
2. The Supabase session refresh middleware (`ui/middleware.ts`) is verified to run in Node.js runtime (not requiring Edge Runtime).
3. If any Vercel-specific runtime APIs are found in middleware, they are extracted behind a `DEPLOY_TARGET` conditional with a documented fallback.
4. The E2E test suite passes when run against a Docker-built image, confirming middleware behaves correctly.

### US-7: Adopter understands how to configure environment variables for AWS

**As** a template adopter deploying to AWS ECS or Fargate, **I want** documentation on how to inject environment variables through ECS task definitions and Secrets Manager so I do not have to translate Vercel patterns manually.

Acceptance criteria:
1. `docs/developer-guide/environment-guide.mdx` includes an "AWS ECS / Fargate" section.
2. The section shows a representative ECS task definition snippet with `environment` (public vars) and `secrets` (sensitive vars from Secrets Manager) blocks for all required variables.
3. The section notes that `DEPLOY_TARGET=self-hosted` should be set in the ECS task definition environment so the standalone build configuration is applied.
4. The section references the AWS Secrets Manager ARN pattern for each secret variable.
5. The section notes that `NEXT_PUBLIC_` variables must be set at build time (baked into the image), not at runtime — and explains how to handle this with build arguments in the Dockerfile.

---

## Success metrics

- Docker deployment adoption: at least 30% of new adopters (based on template usage telemetry, if available) successfully run the Docker path within their first week without opening a support issue.
- Zero regressions on Vercel: the `ci.yml` pipeline continues to pass on all pull requests with no changes required from Vercel adopters.
- Docker image size under 500 MB for the standalone Next.js build.
- Time-to-first-deploy for a Docker adopter: under 30 minutes following the documentation, measured by internal dogfooding before release.
- Documentation completeness: all environment variables listed in `vercel.json` have corresponding entries in the Docker and AWS sections of the environment guide.

## Risks

| Risk | Mitigation |
|------|------------|
| `NEXT_PUBLIC_` variables baked at build time break Docker image reuse across environments | Document clearly that `NEXT_PUBLIC_` vars are embedded at build time; provide a build-arg pattern in the Dockerfile and note the implication for adopters who want a single image across staging and production |
| `sharp` native binary is architecture-dependent (arm64 vs amd64) | Use multi-platform Docker builds (`--platform linux/amd64,linux/arm64`) in the GitHub Actions workflow; document the `--platform` flag |
| Middleware inadvertently uses Vercel Edge Runtime APIs | Audit middleware before MVP ships; add a CI check (`grep -r "waitUntil\|@vercel/edge"`) to catch regressions |
| Standalone build output omits files needed by a workspace package | Test the full build in CI with `DEPLOY_TARGET=docker` before release; list known omission patterns in the docs |
| Adopters set `DEPLOY_TARGET=docker` but forget to rebuild the image | Document that `DEPLOY_TARGET` affects the build output, not just runtime behavior; the Dockerfile's `ARG DEPLOY_TARGET` makes this explicit |
| `vercel.json` secrets pattern misleads adopters into thinking secrets are injected at runtime | Add a comment in `vercel.json` clarifying that secrets are Vercel-specific and pointing to the provider-agnostic env guide |
| Docker Compose file used in production without hardening | Add a comment in `docker-compose.yml` warning that the production profile is a starting point and recommends a reverse proxy (nginx/Caddy) in front of the container |

---

## Traceability

### Audit events

(N/A for this feature — no user-facing mutations. Deployment is an infrastructure concern with no audit trail in the application database.)

### Sentry

Configuration considerations per provider:

- **Vercel**: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set in the Vercel dashboard as environment variables. Source maps are uploaded during `vercel build` automatically via `withSentryConfig`. No changes needed.
- **Docker / self-hosted**: The same Sentry environment variables must be injected at build time (not runtime) because `withSentryConfig` uploads source maps during `next build`. In the Dockerfile, these are accepted as `ARG` build arguments and passed to `next build`. If source map upload is not desired (e.g., no Sentry subscription), `SENTRY_AUTH_TOKEN` can be omitted — `withSentryConfig` is configured with `silent: true` and does not fail the build.
- **AWS ECS**: Source map upload happens in the CI build step before the image is pushed. Secrets Manager is not required for Sentry build-time args — they should be CI secrets (GitHub Actions secrets), not runtime secrets in the task definition.
- **Runtime DSN**: `NEXT_PUBLIC_SENTRY_DSN` is a build-time public variable baked into the client bundle. It must be set as a Docker `--build-arg` when building for any non-Vercel target.

### Seed data

(N/A — this feature adds no database schema changes and requires no seed data.)

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| Run `docker compose up` with valid `.env` file | Adopter (local shell) | Application starts on port 3000; login page loads; Supabase connection succeeds |
| Authenticate via the login page on Docker build | E2E test user | Auth flow completes; user reaches `/dashboard`; session persists across page navigation |
| Upload an image in the Docker-built app | E2E test user | Image stored via Supabase Storage; `<Image />` renders via the custom `sharp` loader without errors |
| Navigate all protected routes on Docker build | E2E test user | No middleware errors; session refresh works; protected pages render correctly |
| Run `pnpm build` with `DEPLOY_TARGET=vercel` (unset) | CI pipeline | Build completes without `output: "standalone"` in the output; no regressions |
| Run `pnpm build` with `DEPLOY_TARGET=docker` | CI pipeline | Build completes with `output: "standalone"`; `.next/standalone` directory exists |

### External adapters

| Target | Abstraction | Configuration entry point | Notes |
|--------|-------------|--------------------------|-------|
| Vercel | `vercel.json` + default `next.config.ts` | `vercel.json` secrets, Vercel dashboard | Default target; no `DEPLOY_TARGET` required |
| Docker / self-hosted | `Dockerfile` + `docker-compose.yml` + `DEPLOY_TARGET=docker` | `.env` file or `--env-file` flag | Standalone build; `sharp` image loader |
| AWS ECS / Fargate | ECS task definition + `DEPLOY_TARGET=self-hosted` | AWS Secrets Manager + task definition `environment` block | Image built and pushed via CI; runtime vars from Secrets Manager |
| Cloudflare Pages | `@cloudflare/next-on-pages` (follow-up) | `wrangler.toml` + `wrangler secret put` | MVP ships documentation stub only; full adapter is follow-up |

Image optimization adapters:

| Provider | Loader | Activation |
|----------|--------|------------|
| Vercel | Built-in Vercel CDN (`"default"`) | Default when `DEPLOY_TARGET` is unset or `vercel` |
| Docker / self-hosted | `ui/lib/image-loader.ts` (`sharp`-based, server-side) | Activated when `DEPLOY_TARGET=docker` or `self-hosted` |
| Cloudflare Images | Custom loader (adopter-provided) | Replace `ui/lib/image-loader.ts`; no app code changes needed |
| imgix / CloudFront | Custom loader (adopter-provided) | Replace `ui/lib/image-loader.ts`; no app code changes needed |

### Production readiness

- [ ] `Dockerfile` builds successfully in CI with `DEPLOY_TARGET=docker` and produces a `.next/standalone` output
- [ ] Docker image size verified under 500 MB in CI artifact step
- [ ] Container runs as non-root user (verified with `docker inspect` in CI)
- [ ] `docker-compose.yml` starts the application successfully with a valid `.env` file
- [ ] `next.config.ts` conditional logic unit-tested: verify `output: "standalone"` is set for `docker`/`self-hosted` and absent for `vercel`
- [ ] Custom `sharp` image loader (`ui/lib/image-loader.ts`) tested with representative image URL in Docker build
- [ ] `sharp` native binary builds correctly for `linux/amd64` in the Docker multi-stage build
- [ ] Middleware (`ui/middleware.ts`) verified to contain no Vercel-specific runtime imports
- [ ] E2E suite passes against Docker-built image in CI
- [ ] `.github/workflows/deploy-docker.yml` manually triggered and verified to push image to GHCR
- [ ] `docs/developer-guide/environment-guide.mdx` updated with Docker, AWS ECS, and Cloudflare sections
- [ ] `.env.docker.example` committed with all required variables and descriptive comments
- [ ] `docs/deployment/docker.md` committed with step-by-step instructions for local dev and self-hosted production
- [ ] `docs/deployment/non-vercel-notes.md` committed documenting middleware compatibility findings
- [ ] `DEPLOY_TARGET` variable added to `turbo.json` `globalEnv` so Turborepo invalidates cache on change
- [ ] Vercel CI pipeline verified to still pass with no changes to `.github/workflows/ci.yml`

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Use an explicit `DEPLOY_TARGET` env var vs. auto-detecting the runtime | Explicit `DEPLOY_TARGET` | Auto-detection is fragile (Vercel sets `VERCEL=1`, but Docker has no equivalent signal); explicit opt-in is clear and deliberate |
| Default target when `DEPLOY_TARGET` is unset | `vercel` (Vercel behavior) | Vercel is the current default; unset = no change in behavior for existing adopters; no regressions |
| `output: "standalone"` always-on vs. gated on `DEPLOY_TARGET` | Gated on `DEPLOY_TARGET=docker` or `self-hosted` | Vercel does not need standalone output and benefits from its own build pipeline; always-on would add an unused `.next/standalone` artifact to all Vercel builds |
| Image optimization for Docker: `unoptimized: true` vs. custom `sharp` loader | Custom `sharp`-based server-side loader | `unoptimized: true` disables optimization entirely, degrading performance; the `sharp` loader keeps optimization without Vercel dependency |
| Dockerfile location: monorepo root vs. `ui/` workspace | Monorepo root | The build context must include all workspace packages (`packages/core`, `packages/db`, etc.); a root Dockerfile with `pnpm -r` workspace install is the correct pattern for a monorepo |
| Docker Compose Supabase containers: include vs. exclude | Exclude | The template uses Supabase Cloud; including Supabase containers in docker-compose adds significant complexity (volumes, migrations, seed) that is out of scope for MVP; local dev uses `supabase start` from the Supabase CLI |
| GitHub Actions Docker workflow trigger: on push vs. `workflow_dispatch` | `workflow_dispatch` (manual) by default | Most adopters will not want automated Docker deploys without first configuring registry credentials and deploy targets; manual trigger prevents accidental runs on first fork |
| Container registry: Docker Hub vs. GHCR vs. adopter-defined | Default to GHCR | GHCR uses `GITHUB_TOKEN` — no extra credentials needed; adopters can change the registry in one line; Docker Hub requires a secret and rate-limits unauthenticated pulls |
| `NEXT_PUBLIC_` variables baked at build vs. runtime injection | Document clearly; provide `ARG` pattern in Dockerfile | This is a Next.js constraint, not a template choice; the key deliverable is clear documentation and a Dockerfile `ARG` pattern so adopters understand the implication |
| Cloudflare adapter: include in MVP vs. follow-up | Follow-up | `@cloudflare/next-on-pages` has significant compatibility constraints with App Router features used in this template (Server Actions, Route Handlers); shipping a broken adapter is worse than shipping a documented stub |

---

*Last updated: 2026-05-11*
