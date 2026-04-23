# RFC — Example CRM Architecture

## 1. Summary

This document defines how the InmoAutos CRM system will be built from a technical perspective.

The system is based on a modern, modular, and scalable architecture, focused on:

- WhatsApp integration
- AI agent processing
- Centralized database
- Realtime experience

## 2. Technical Objective

Design an architecture that enables:

- Capturing messages from WhatsApp
- Structuring commercial context
- Managing opportunities
- Administering inventory
- Automating follow-up
- Scaling to multiple companies (SaaS)

## 3. General Architecture

### Main Flow

```
WhatsApp → Webhook → Backend → AI Agent → Database → Frontend
```

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ WhatsApp │───▶│ Webhook  │───▶│ Backend  │───▶│ AI Agent │
│ (YCloud) │    │ Endpoint │    │ (API)    │    │ Service  │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                                     ▼
┌──────────┐    ┌──────────┐    ┌──────────────────────────┐
│ Frontend │◀───│ Realtime │◀───│   Supabase (PostgreSQL)  │
│ (Next.js)│    │ Updates  │    │   Multi-tenant DB        │
└──────────┘    └──────────┘    └──────────────────────────┘
```

## 4. Components

### Frontend

- **Next.js** (App Router)
- Mobile-first design
- Realtime data consumption
- shadcn/ui component library

### Backend

- Lightweight API (Node.js / Next.js Server Actions)
- Webhook handling
- Business logic in service layer

### Database

- **Supabase** (PostgreSQL)
- Multi-tenant by workspace
- Realtime subscriptions
- Row Level Security (RLS)

### AI Agent

- Independent service
- Message processing
- Context generation

### WhatsApp Integration

- **YCloud** as WhatsApp Business API provider
- Event reception via webhooks

## 5. Data Flow

### Incoming Message

1. WhatsApp sends webhook event
2. Backend receives event
3. Contact is identified (or created)
4. Context is constructed
5. Message is sent to AI agent
6. Agent processes and generates summary
7. Result is saved to database
8. Frontend updates in realtime

## 6. Data Model

### Core Entities

| Entity | Description |
|--------|-------------|
| `workspaces` | Tenant isolation unit (one per company) |
| `users` | System users with roles (owner, admin, seller) |
| `contacts` | Leads and clients captured from WhatsApp |
| `opportunities` | Commercial deals linked to contacts and properties |
| `properties` | Real estate inventory items |
| `conversation_summaries` | AI-generated summaries of WhatsApp conversations |
| `tasks` | Follow-up actions (manual and automated) |

> **Central entity: `opportunities`** — everything connects through deals.

### Entity Relationships

```
workspaces
  ├── users
  ├── contacts
  │     └── opportunities
  │           ├── properties (linked)
  │           ├── tasks
  │           └── conversation_summaries
  └── properties
```

## 7. Multi-Tenant Strategy

- Each company has its own **workspace**
- All data is isolated by `workspace_id`
- Access controlled by **roles** (owner, admin, seller)
- RLS policies enforce tenant isolation at the database level

## 8. Realtime

Used for:

- **Kanban board** — opportunity stage changes
- **Tasks** — creation and status updates
- **Activity feed** — recent actions

Technology: **Supabase Realtime** (PostgreSQL changes broadcast)

## 9. AI Agent

### Functions

- Summarize conversations
- Extract structured data (name, intent, property interest)
- Classify lead intention
- Suggest next actions

### Boundaries

- Does NOT replace WhatsApp
- Does NOT make critical decisions without human control
- Operates as a **suggestion engine**, not an autonomous actor

## 10. Integrations

### Critical (MVP)

| Integration | Provider | Purpose |
|-------------|----------|---------|
| WhatsApp | YCloud | Message capture and webhook events |

### Future

| Integration | Purpose |
|-------------|---------|
| Google Drive | Property list import |
| Google Calendar | Visit scheduling |

> **Note:** WordPress/Houzez integration is explicitly excluded — WordPress will be deprecated.

## 11. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Monorepo | Shared types, contracts, and UI across packages |
| Supabase as primary backend | PostgreSQL + Auth + Realtime + RLS in one platform |
| AI agent as separate service | Decoupled processing, independent scaling |
| No WhatsApp rebuild | CRM augments WhatsApp, does not replace it |
| Next.js App Router | Server Components, Server Actions, streaming |
| Mobile-first | Primary users (sellers) work from phones |

## 12. Trade-offs

### Prioritized

- Speed of delivery
- Simplicity
- Focus on core value

### Sacrificed

- Advanced initial features
- Complex customization
- Comprehensive reporting (deferred to V2)

## 13. Risks

| Risk | Mitigation |
|------|------------|
| Poor WhatsApp integration | Use proven provider (YCloud), test webhook flow early |
| AI agent errors | Agent suggests only, human confirms actions |
| Inconsistent data | Strong validation at contracts layer, RLS enforcement |
| Low adoption | Mobile-first, minimal friction, augment existing workflow |

## 14. Scalability

- Multi-tenant architecture prepared from day one
- Modular architecture (packages isolate concerns)
- AI agent decoupled (can scale independently)
- Supabase handles connection pooling and realtime at scale

## 15. Implementation Plan

### Phase 1 — MVP

- [ ] WhatsApp webhook integration (YCloud)
- [ ] Contact management (auto-creation from messages)
- [ ] Opportunity pipeline (kanban)
- [ ] Basic property inventory
- [ ] Simple AI agent (summarize + suggest)

### Phase 2

- [ ] Automations (task creation, reminders)
- [ ] AI improvements (better classification, richer context)
- [ ] Dashboard with metrics

### Phase 3

- [ ] Full SaaS (onboarding, self-service)
- [ ] Billing and subscription management
- [ ] Advanced reporting

## 16. In One Sentence

> The RFC defines how to build a system that converts WhatsApp messages into structured commercial context through AI and centralizes it in an operational, scalable CRM.
