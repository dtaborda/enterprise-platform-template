---
title: "Webhooks RFC"
description: "Defines technical architecture for outbound webhook events, signing, retries, and delivery observability."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Webhooks RFC

## Purpose

Define a robust technical pattern for tenant-configurable webhook delivery integrated with existing service and audit conventions.

## Scope

- Included: endpoint configuration model, signing, dispatch pipeline, retries, and logs.
- Excluded: customer-side receiver libraries and event transformation engine.

---

## Summary

Webhook dispatch runs through an event outbox and worker process that signs payloads, applies retry policy, and records delivery outcomes.

## Technical objective

- Provide at-least-once delivery with observable outcomes.
- Keep tenant boundaries explicit for endpoints and event payload selection.
- Minimize coupling between domain services and transport details.

---

## Proposed design

| Area | Design |
|------|--------|
| Data model | `webhook_endpoints`, `webhook_events_outbox`, `webhook_deliveries` |
| Service layer | Domain services emit normalized events to outbox |
| Dispatcher | Background processor signs payload and sends HTTP POST |
| Security | HMAC signature per endpoint secret, rotated by tenant admin |
| App layer | Admin UI for endpoint config and delivery log visibility |

## Security and tenant isolation implications

- Endpoint ownership is tenant-scoped and enforced through RLS.
- Signing secrets are encrypted at rest and never fully re-displayed.
- Delivery logs avoid sensitive payload persistence by default.

---

## Trade-offs

- **Chosen:** outbox-based asynchronous dispatch for reliability.
- **Not chosen:** synchronous inline webhook calls, because they increase user-facing latency and failure coupling.

## Risks

- Queue backlogs can delay event delivery.
- Misconfigured retry windows can create endpoint pressure.
- Partial payload logging can reduce debugging depth.

---

## Rollout and implementation phases

1. Endpoint and secret management foundations.
2. Outbox and dispatcher with retries.
3. Delivery logs and admin observability UI.
4. Event catalog expansion and stability tuning.

## Open questions

- Which queue mechanism is preferred for baseline template implementation?
- Should endpoint health checks run proactively?
- What payload redaction standard is required by default?

---

*Last updated: 2026-05-07*
