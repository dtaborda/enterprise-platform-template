# ADR 004: Package Dependency Rules

## Status
Accepted

## Context
In a monorepo with multiple packages, we need clear rules about what can depend on what to maintain clean boundaries.

## Decision

### Allowed Dependencies

```
@enterprise/ui
  └─ (no @enterprise/* dependencies - purely presentational)

@enterprise/contracts  
  └─ zod (peer dependency)

@enterprise/db
  └─ drizzle-orm (peer dependency)
  
@enterprise/core
  ├─ @enterprise/contracts  ✅
  ├─ @enterprise/db        ✅
  └─ @supabase/*            ✅
```

### Forbidden Dependencies

```
@enterprise/contracts
  ├─ @enterprise/db        ❌ (schema details)
  ├─ @enterprise/core      ❌ (services)
  └─ @enterprise/ui       ❌ (presentation)
  
@enterprise/db
  ├─ @enterprise/core      ❌ (services depend on db)
  └─ @enterprise/ui       ❌ (ui doesn't need schema)
  
@enterprise/ui  
  ├─ @enterprise/core      ❌ (use services in app, not ui)
  └─ @enterprise/db       ❌ (db access from app layer)
```

### Domain Packages

Domain packages (added during instantiation) CAN depend on:

```typescript
// packages/my-domain/package.json
{
  "dependencies": {
    "@enterprise/contracts": "workspace:*",  ✅
    "@enterprise/core": "workspace:*",       ✅  
    "@enterprise/db": "workspace:*",         ✅
    "@enterprise/ui": "workspace:*"          ✅
  }
}
```

### Why These Rules

1. **Contracts are lowest level** - no dependencies, used by everyone
2. **DB is schema-only** - no business logic, no services
3. **Core uses DB and Contracts** - orchestrates everything
4. **UI is presentational** - tokens and utilities only
5. **Domain packages extend platform** - can use any platform package

## Consequences
- Clear architectural boundaries
- Easier to reason about changes
- Prevents circular dependencies
- Domain packages can access everything they need

## References
- Related to SAL-39 (Platform Architecture)