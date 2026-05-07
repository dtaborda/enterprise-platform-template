# PRD — Resource Management Platform (Example)

> **Note:** This is an example PRD included with the template. Replace the content with your own product requirements when starting a new project. The structure and sections below illustrate what a good PRD looks like.

## 1. Context

The team currently manages resources (products, documents, assets) across disconnected spreadsheets, email threads, and shared drives. There is no single source of truth, and information gets lost as the team grows.

## 2. Problem

The core problem is not a lack of tools, but a lack of **structured organization**.

Today, resources:

- Are tracked in multiple places with no synchronization
- Have no clear ownership or status tracking
- Cannot be searched or filtered efficiently
- Lack audit trails for changes

This directly impacts:

- Time wasted searching for information
- Duplicate or outdated records
- Poor visibility for managers

## 3. Objective

Build a multi-tenant platform that enables:

- Centralizing resource management in one place
- Tracking resource status through a clear lifecycle
- Assigning ownership and audit trails
- Filtering and searching across the catalog

## 4. Value Proposition

**One place to manage all resources**, with clear status, ownership, and history — accessible to the entire team.

## 5. Users

| Role | Responsibilities |
|------|-----------------|
| **Owner** | Global visibility, metrics, system configuration |
| **Admin** | Resource management, user administration |
| **Member** | Read-only access, day-to-day usage |

> **Primary user: Admin** — manages resources daily.

## 6. MVP Scope

### Included

- Resource CRUD (create, read, update, archive)
- Resource types and statuses
- Multi-tenant isolation (each organization sees only its data)
- Role-based access control
- Basic filtering and pagination

### Not Included

- File attachments or uploads
- Notifications or alerts
- Reporting dashboards
- API integrations with third-party tools

## 7. User Journey

### Onboarding

1. User signs up and creates an organization
2. System provisions a tenant workspace
3. User lands on the dashboard

### Daily Usage

1. Admin navigates to Resources
2. Creates or updates a resource
3. Filters by type or status to find what they need

### Administration

1. Owner reviews system usage
2. Manages team members and roles
3. Archives outdated resources

## 8. Core Features

### 8.1 Resource Management

- Create, edit, and archive resources
- Assign type (product, service, asset, document, other)
- Track status (active, draft, archived, suspended)

### 8.2 Filtering & Search

- Filter by type, status
- Paginated list view
- Detail view per resource

### 8.3 Role-Based Access

- Owners and admins can create, edit, and archive
- Members have read-only access
- All data is tenant-isolated via RLS

## 9. Non-Functional Requirements

- **Multi-tenant** — data isolated per organization
- **Responsive** — works on desktop and mobile
- **Secure** — RLS at database level, role-based UI guards
- **Fast** — server-side rendered pages, minimal client JS
- **Auditable** — CUD operations logged

## 10. Success Metrics

### Product

- Resources created per tenant
- Daily active users
- Average time to find a resource

### Technical

- Zero RLS bypass incidents
- Test coverage above thresholds
- Page load under 2 seconds

## 11. Roadmap

### MVP

- Resource CRUD with types and statuses
- Multi-tenant with RLS
- Role-based access
- Basic filtering

### V2

- File attachments
- Activity feed
- Dashboard with metrics

### V3

- API integrations
- Notifications
- Advanced search (full-text)

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Low adoption | Keep UI simple, minimize required fields |
| Data inconsistency | Zod validation on all inputs, RLS enforcement |
| Over-engineering | Start with MVP scope, defer advanced features |
| Security gaps | RLS by default, role checks in UI and server |

## 13. Definition of Success

The product will be successful if:

- The team uses it as their **primary resource catalog**
- It reduces time spent searching for information
- Admins manage resources without needing technical help
- The system scales to multiple tenants without code changes

## 14. In One Sentence

> A multi-tenant platform for managing resources with clear status tracking, role-based access, and tenant isolation — built to be extended for any domain.
