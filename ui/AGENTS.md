# @enterprise/web — Agent Instructions

## Purpose

Next.js 15 App Router application for the Enterprise Platform template.

## Layer Rules (MANDATORY)

- UI routes/components MAY import from `@enterprise/contracts`, `@enterprise/core`, `@enterprise/ui`, and `@enterprise/db`
- UI code MUST NOT implement business logic that belongs in `@enterprise/core/services`
- Server Actions MUST remain thin wrappers (validate input, get client, call service, return result)
- Auth and role decisions SHOULD be delegated to core services when possible

## Skills Discoverability

Repo-local skills are stored in `skills/` and exposed to OpenCode via the `.agents/skills` symlink.

Run one of these before relying on repo-local skills:

```bash
pnpm skills:setup
# or
./skills/setup.sh --opencode
```

Without this setup, only globally installed skills are discoverable.
