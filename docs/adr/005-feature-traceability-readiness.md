# ADR 005: Feature Traceability Readiness Convention

## Status
Accepted

## Context
The platform template has individual rules for audit logging (AGENTS.md, packages/core/AGENTS.md), Sentry instrumentation (sentry skill), and testing (playwright skill, ui/AGENTS.md). However, these rules are fragmented: no single checklist forces every new feature to define its full traceability surface before implementation begins.

This means traceability depends on the implementer remembering to wire audit events, Sentry tags, local seed data, E2E flows, and external provider adapters. In a template designed for production teams, that is unacceptable — conventions must be structural, not aspirational.

## Decision

Every feature that includes mutations (create, update, delete) or external integrations MUST complete a **Feature Traceability Readiness** checklist before implementation starts. This checklist is enforced through a reusable `feature-readiness` skill that agents auto-invoke when writing or reviewing PRD/RFC documents.

### What the convention requires

Each feature PRD/RFC MUST define:

| Category | What to define |
|----------|---------------|
| **Audit events** | One named event per mutation (e.g., `tenant_member.invited`, `resource.archived`) |
| **Sentry instrumentation** | Sentry area tag for Server Actions, which errors to capture, PII exclusions |
| **Seed data** | Deterministic local users, entities, and state variations for E2E testing |
| **E2E flows** | Minimum Playwright scenarios covering happy path, permission denied, and error states |
| **External adapters** | Any external provider (email, storage, payment, webhook), with a local fake mode |
| **Environment variables** | Required and optional env vars, with graceful degradation when optional vars are missing |
| **Production readiness** | What must pass before the feature ships (tests, RLS verification, audit coverage) |

### Audit event naming

Audit events follow the pattern `{domain}.{action}`:

```
tenant_member.invited
tenant_member.removed
tenant_member.role_changed
tenant_invitation.revoked
tenant_invitation.accepted
resource.created
resource.archived
```

### Sentry area registration

Each feature registers a Sentry area in `ui/lib/sentry.ts` by extending the `SentryArea` union type. Server Actions use `withServerActionInstrumentation` for tracing and `captureActionError` for error capture.

### External adapter pattern

External integrations use a port/adapter pattern:

```
Is there an external provider (email, storage, payment)?
├── Yes → Define an adapter interface in @enterprise/core
│         ├── Local: fake/stub implementation (logs to console or returns mock)
│         └── Production: real provider implementation (Resend, Stripe, S3)
│         └── Selection: based on env var presence, not NODE_ENV
└── No  → Skip this category
```

### Seed data requirements

Local seed data in `supabase/seed.sql` must include:
- At least one entity per relevant state (e.g., pending invitation, expired invitation, active member)
- Deterministic IDs and emails so Playwright tests can reference them without dynamic lookup
- Alignment with existing seed users (`admin@enterprise.dev`, `member@enterprise.dev`, etc.)

### When the convention applies

```
Does the feature include mutations (CUD)?
├── Yes → Full checklist required
└── No
    ├── Does it integrate with an external provider?
    │   └── Yes → Adapter + env var sections required
    └── No  → Convention does not apply (read-only, no external deps)
```

## Consequences
- Every feature PRD/RFC has a traceability section before implementation starts
- Agents auto-invoke the `feature-readiness` skill when creating or reviewing feature docs
- Local development works without production provider credentials
- E2E tests have predictable seed data
- Audit log coverage is defined upfront, not retrofitted
- Sentry instrumentation is planned, not forgotten

## References
- ADR 001: Platform Architecture
- ADR 003: Service Layer Architecture
- `sentry` skill: Server Action instrumentation patterns
- `packages/core/AGENTS.md`: CUD audit logging rule
- `ui/AGENTS.md`: E2E test requirements
