# Users and Roles

This template defines a four-role model (owner, admin, member, guest) enforced at both the database and UI layers.

---

## Role model at a glance

| Role | Typical audience | Read tenant data | Create/update domain records | Manage users/roles | View audit log |
|------|-------------------|------------------|------------------------------|--------------------|----------------|
| `owner` | Organization creator | ✅ | ✅ | ✅ | ✅ |
| `admin` | Tenant administrator | ✅ | ✅ | ✅ | ✅ |
| `member` | Internal contributor | ✅ | ❌ (default template policy) | ❌ | ❌ |
| `guest` | Limited collaborator | ✅ (scoped by module) | ❌ | ❌ | ❌ |

> The exact matrix can evolve per feature, but the template default is conservative for writes.

## Where roles are stored

Roles exist in two places:

1. **`public.profiles.role`** (source in relational model)
2. **`auth.users.raw_app_meta_data.role`** (claim consumed by RLS)

Tenant context also exists in two places:

1. **`public.profiles.tenant_id`**
2. **`auth.users.raw_app_meta_data.tenant_id`**

This dual representation allows fast policy checks directly in SQL.

## Signup to authorization flow

```text
User submits sign-up form
        │
        ▼
Supabase Auth inserts auth.users row
        │
        ▼
Trigger: handle_new_user()
  ├─ creates tenants row
  └─ creates profiles row with role = owner
        │
        ▼
JWT contains app_metadata (tenant_id, role)
        │
        ▼
RLS policies evaluate claims on every query
```

## Role flow in detail

### Step 1: Signup

User signs up through auth actions. Metadata is validated in contracts and passed to Supabase.

### Step 2: Trigger provisioning

The `handle_new_user()` trigger creates:

- one tenant (`public.tenants`)
- one profile (`public.profiles`) linked to that tenant
- role defaults to `owner` for the first user

### Step 3: JWT claim hydration

`tenant_id` and `role` are present in `app_metadata` and used by RLS expressions.

### Step 4: Runtime enforcement

- Middleware verifies user session and routes unauthorized users away from protected pages.
- SQL policies allow/deny read and write operations.
- UI checks hide actions (for example, create/edit/delete buttons for members/guests).

## Role checks in the UI

UI checks are for user experience, not primary security.

Pattern example:

```tsx
const isAdminOrOwner = user.role === "admin" || user.role === "owner";
```

Use this for conditional controls such as:

- “New Resource” button
- Edit and archive actions
- Tenant management views

Even if a control is exposed accidentally, RLS remains the final gate.

## RLS role checks

Common policy predicates:

```sql
auth.jwt()->'app_metadata'->>'tenant_id'
auth.jwt()->'app_metadata'->>'role'
```

Example write constraint:

```sql
auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin')
```

## Seed users for local development

`supabase/seed.sql` creates deterministic users:

- `admin@enterprise.dev` / `password123` (owner)
- `member@enterprise.dev` / `password123` (member)
- `guest@enterprise.dev` / `password123` (guest)
- `reset@enterprise.dev` / `password123` (member)
- `reset2@enterprise.dev` / `password123` (member)

It also aligns users into a single demo tenant for predictable E2E behavior.

## Practical guidance

When adding a new feature:

1. Define who can read vs mutate.
2. Encode those rules in RLS first.
3. Mirror the same logic in UI checks for UX clarity.
4. Add tests for both authorized and unauthorized paths.

## Related docs

- [Multi-Tenant Model](./multi-tenant.md)
- [Request Flow](./request-flow.md)
- [Service Layer](./service-layer.md)
