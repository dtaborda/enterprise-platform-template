---
title: "Notifications PRD"
description: "Defines product requirements for in-app and outbound notification workflows."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Notifications PRD

## Purpose

Define roadmap-level requirements for notifying users about key tenant events while avoiding noisy or low-value messaging.

## Scope

- Included: in-app notification center and foundational outbound events.
- Excluded: full campaign automation, advanced segmentation, and marketing messaging.

---

## Problem

Users miss important events (invites, role changes, billing issues) when the product has no consistent notification model.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant members | Timely awareness of relevant actions |
| Tenant admins | Visibility into operational or security events |
| Product team | Reusable event-to-notification framework |

## Goals

- Surface important events in-app with clear relevance.
- Support baseline outbound delivery for critical workflows.
- Provide user-level preference controls for non-critical signals.

---

## MVP scope

- In-app notification feed with read/unread state.
- Event types: invitation, role change, subscription issue, webhook delivery failure.
- Basic email delivery for critical events.
- Per-user opt-out for non-critical categories.

## Out of scope

- SMS or push channels.
- Workflow builder and conditional rules engine.
- Multi-step digest customization.

---

## Success metrics

- Read rate for critical notifications.
- Median time to acknowledge high-priority events.
- Reduction in missed-action support incidents.

## Risks

- Over-notification can reduce trust in the channel.
- Poor event classification can hide critical alerts.
- Delivery failures can go unnoticed without observability.

## Open questions

- Should unread badges be global or tenant-scoped in MVP?
- Which events are always non-optional?
- How long should notification history be retained by default?

---

*Last updated: 2026-05-07*
