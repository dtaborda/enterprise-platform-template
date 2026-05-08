---
name: feature-readiness
description: >
  Feature traceability readiness checklist for the Enterprise Platform. Ensures every feature with mutations
  or external integrations defines audit events, Sentry instrumentation, seed data, E2E flows, external
  adapters, env vars, and production readiness criteria before implementation begins.
  Trigger: When writing PRD/RFC docs, reviewing feature specs, creating SDD proposals, or starting feature implementation.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0"
  scope: [root, ui, packages/core, packages/db, packages/contracts]
  auto_invoke:
    - "Writing a feature PRD or RFC"
    - "Reviewing a feature PRD or RFC"
    - "Starting feature implementation"
    - "Creating SDD proposals for features"
---

## Critical Rules

- ALWAYS complete the traceability checklist before implementation starts
- ALWAYS define one audit event per mutation (create, update, delete)
- ALWAYS register a Sentry area for each new feature module
- ALWAYS define local seed data for E2E testing
- ALWAYS use the adapter pattern for external providers
- ALWAYS ensure local dev works without production provider credentials
- NEVER skip traceability for features with mutations — this is not optional
- NEVER send PII or secrets to Sentry — only field names, codes, and IDs
- NEVER hardcode test data in E2E tests — use deterministic seed data

---

## When to use

Load this skill when:
- Writing or reviewing a feature PRD or RFC
- Creating SDD proposals, specs, or task breakdowns for features
- Starting implementation of a feature with mutations or external integrations
- Reviewing whether a feature is ready to ship

## When this does NOT apply

```
Does the feature include mutations (CUD)?
├── Yes → Full checklist required
└── No
    ├── Does it integrate with an external provider?
    │   └── Yes → Adapter + env var sections required
    └── No  → This skill does not apply (read-only, no external deps)
```

---

## Traceability checklist

Every feature PRD/RFC MUST include a **Traceability** section with these categories resolved:

### 1. Audit events

Define one named event per mutation using `{domain}.{action}` format:

```
tenant_member.invited
tenant_member.removed
tenant_member.role_changed
tenant_invitation.revoked
tenant_invitation.accepted
resource.created
resource.updated
resource.archived
```

Rules:
- Use `AuditService.log()` or equivalent audit abstraction in the service layer
- Include `tenantId`, `userId`, `action`, `resource`, `resourceId` in every event
- Include relevant non-PII metadata (e.g., `{ previousRole: "member", newRole: "admin" }`)
- Log at service layer, never in Server Actions

### 2. Sentry instrumentation

Define:

| Item | What to specify |
|------|----------------|
| **Area tag** | New `SentryArea` value to add to `ui/lib/sentry.ts` (e.g., `"team"`) |
| **Server Actions** | List all actions that need `withServerActionInstrumentation` |
| **Error capture** | Which service failures trigger `captureActionError` |
| **PII exclusions** | What data MUST NOT be sent (emails, tokens, invite URLs, form values) |
| **Allowed metadata** | What CAN be sent (`inputShape` keys, error codes, IDs) |

Example for a feature RFC:

```markdown
## Sentry instrumentation

- Area: `team`
- Instrumented actions: `inviteMemberAction`, `changeMemberRoleAction`, `removeMemberAction`
- Captured errors: DB failures, role sync failures, email delivery failures
- PII exclusions: email addresses, invitation tokens, form field values
- Allowed metadata: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `userRole`
```

### 3. Seed data

Define deterministic local data in `supabase/seed.sql`:

| Item | What to specify |
|------|----------------|
| **Users** | Deterministic emails and passwords aligned with existing seed users |
| **Entities** | At least one entity per relevant state |
| **Relationships** | Cross-entity references needed for E2E flows |

Rules:
- Use existing seed users when possible (`admin@enterprise.dev`, `member@enterprise.dev`)
- Add new seed users only when the feature requires a distinct persona
- Use deterministic UUIDs so Playwright tests can reference them
- Document seed data in the RFC for implementer clarity

### 4. E2E flows

Define minimum Playwright scenarios:

| Category | Required scenarios |
|----------|--------------------|
| **Happy path** | Core CRUD or workflow succeeds end-to-end |
| **Permission denied** | Lower-role user cannot perform restricted action |
| **Validation error** | Invalid input shows client-side and server-side errors |
| **Error state** | Expired/revoked/missing entity shows appropriate UI feedback |
| **Empty state** | Feature renders correctly with no data |

Rules:
- Use Page Object Model pattern (see `playwright` skill)
- Reference seed data by deterministic values, not dynamic lookup
- Tag critical flows with `@critical`

### 5. External adapters

For each external provider (email, storage, payment, webhook):

| Item | What to specify |
|------|----------------|
| **Interface** | Port/adapter interface in `@enterprise/core` |
| **Local mode** | Fake/stub implementation (console log, in-memory, mock return) |
| **Production mode** | Real provider implementation |
| **Selection** | Based on env var presence, NOT `NODE_ENV` |

Example:

```markdown
## Email adapter

- Interface: `InvitationEmailPort` in `@enterprise/core`
- Local: `ConsoleInvitationEmailAdapter` — logs invite URL to console
- Production: `ResendInvitationEmailAdapter` — sends via Resend API
- Selection: if `RESEND_API_KEY` is set, use Resend; otherwise use console adapter
```

### 6. Environment variables

| Variable | Required | Scope | Fallback behavior |
|----------|----------|-------|-------------------|
| `RESEND_API_KEY` | Optional | Server | Console adapter used when missing |

Rules:
- Required vars MUST fail fast at startup if missing
- Optional vars MUST degrade gracefully (local fake, disabled feature, console log)
- Use `getEnv()` for all access — never `process.env.X!`

### 7. Production readiness

Define what must pass before the feature ships:

```markdown
## Production readiness criteria

- [ ] All audit events verified in audit_log table
- [ ] Sentry area registered and Server Actions instrumented
- [ ] Unit tests pass for service layer
- [ ] E2E tests pass for all defined flows
- [ ] RLS policies verified (no cross-tenant leaks)
- [ ] Seed data committed and `supabase db reset` works cleanly
- [ ] Optional provider env vars documented in production deployment guide
```

---

## PRD/RFC section template

Add this section to every feature PRD that involves mutations or external integrations:

```markdown
---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `{domain}.{action}` | When {description} | `{ key: value }` |

### Sentry

- Area: `{area}`
- Instrumented actions: {list}
- Captured errors: {list}
- PII exclusions: {list}

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| {entity} | {state} | {deterministic values} |

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| {description} | {role} | {result} |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| {name} | {port} | {fake} | {real} | {var} |

### Production readiness

- [ ] {criterion}
```

---

## Decision tree: does this feature need the full checklist?

```
New feature being planned or implemented?
├── Does it include CUD operations?
│   └── Yes → Full checklist (all 7 categories)
├── Does it integrate with an external provider?
│   └── Yes → Categories 5, 6, 7 required; 1-4 if it also has mutations
├── Is it read-only with no external deps?
│   └── Yes → Checklist NOT required
└── Is it a UI-only change (styling, layout)?
    └── Yes → Checklist NOT required
```

---

## References

- [ADR 005: Feature Traceability Readiness](../../docs/adr/005-feature-traceability-readiness.md) — Decision record for this convention
- [Service Layer](../../docs/architecture/service-layer.md) — Audit logging in services
- [Sentry skill](../sentry/SKILL.md) — Server Action instrumentation patterns
- [Playwright skill](../playwright/SKILL.md) — E2E test patterns
