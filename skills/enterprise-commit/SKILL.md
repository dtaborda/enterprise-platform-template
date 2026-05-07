---
name: enterprise-commit
description: >
  Creates professional git commits following conventional-commits format with project-specific scopes.
  Trigger: When creating commits, after completing code changes, when user asks to commit.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0"
  scope: [root, ui, packages/core, packages/db, packages/ui, packages/contracts]
  auto_invoke:
    - "Creating a git commit"
    - "Committing changes"
---

## Critical Rules

- ALWAYS use conventional-commits format: `type(scope): description`
- ALWAYS keep the first line under 72 characters
- ALWAYS ask for user confirmation before committing
- ALWAYS structure commits as deliverable work units (not file-type batches)
- NEVER be overly specific (avoid counts like "6 files", "3 components")
- NEVER include implementation details in the title
- NEVER use `-n` flag unless user explicitly requests it
- NEVER use `git push --force` or `git push -f` (destructive, rewrites history)
- NEVER add "Co-Authored-By" or AI attribution headers
- NEVER proactively offer to commit — wait for explicit user request

---

## Commit Format

```
type(scope): concise description

- Key change 1
- Key change 2
- Key change 3
```

### Types

| Type | Use When |
|------|----------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance, dependencies, configs |
| `refactor` | Code change without feature/fix |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `style` | Formatting, no code change |

### Scopes (Project-Specific)

| Scope | When | Examples |
|-------|------|----------|
| `ui` | Changes in `ui/` (app, features, pages) | `feat(ui): add resource list page` |
| `core` | Changes in `packages/core/` (services, clients) | `feat(core): add resource service` |
| `db` | Changes in `packages/db/` (schema, migrations) | `feat(db): add resources table with RLS` |
| `contracts` | Changes in `packages/contracts/` (schemas, DTOs) | `feat(contracts): add resource schemas` |
| `ui-pkg` | Changes in `packages/ui/` (components, tokens) | `feat(ui-pkg): add data table component` |
| `e2e` | Changes in `ui/e2e/` (Playwright tests) | `test(e2e): add resource CRUD tests` |
| `skills` | Changes in `skills/` | `docs(skills): add commit conventions skill` |
| `ci` | Changes in `.github/` | `ci: add PR template` |
| `deps` | Dependency updates | `chore(deps): bump next to 15.3` |
| *omit* | Multiple scopes or root-level changes | `docs: update AGENTS.md pattern` |

### Scope Selection Rule

```
Changes in ONE workspace?
├── Yes → Use that workspace scope
└── No (multiple workspaces)
    ├── Changes are related (same feature) → Omit scope
    └── Changes are unrelated → Split into separate commits
```

---

## Good vs Bad Examples

### Title Line

```
# ✅ GOOD — Concise and clear
feat(core): add resource service with CRUD operations
fix(ui): resolve dashboard loading state flash
refactor(db): normalize audit log schema
docs: update AGENTS.md workspace specifications
test(e2e): add auth flow E2E coverage

# ❌ BAD — Too specific, too long, or missing context
feat(core): add resource service with create, read, update, delete, list, and search operations
fix(ui): fix the bug in dashboard component on line 45 of resource-list.tsx
chore: update stuff
feat: add things
```

### Body (Bullet Points)

```
# ✅ GOOD — High-level, outcome-focused
- Add CRUD operations with tenant isolation via RLS
- Include audit logging for create/update/delete
- Wire service into Server Actions with Zod validation

# ❌ BAD — Too detailed, file-focused
- Modified resource-service.ts lines 45-120
- Added 3 new functions and 2 interfaces
- Updated index.ts to export new service
```

---

## Decision Tree

```
Single file changed?
├── Yes → Title only, may omit body
└── No → Include body with 2-5 bullet points

Multiple scopes affected?
├── Same feature across workspaces → Omit scope
├── Unrelated changes → Split into separate commits
└── Single workspace → Include scope

What type?
├── New user-facing behavior → feat
├── Bug that users experience → fix
├── Internal restructure, no behavior change → refactor
├── Only tests added/changed → test
├── Only docs/comments → docs
└── Dependencies, CI, configs → chore
```

---

## Work Unit Rules

Commits represent **deliverable work units**, not file-type batches:

| ❌ File-type batches | ✅ Work-unit commits |
|---------------------|---------------------|
| `add schemas` | `feat(contracts): add resource validation schemas` |
| `add service` | `feat(core): add resource service with tenant isolation` |
| `add tests` | Tests included WITH the feature commit |
| `update docs` | Docs included WITH the user-facing change |

**Each commit should:**
- Have one clear purpose
- Leave the repo in a working state
- Include tests/docs for that unit when relevant
- Be a candidate for its own PR if the change grows

---

## Workflow

1. **Analyze changes**
   ```bash
   git status
   git diff --stat HEAD
   git log -3 --oneline  # Check recent commit style
   ```

2. **Draft commit message**
   - Choose type from table above
   - Determine scope (single workspace → use it; multiple → omit)
   - Write title < 72 chars, outcome-focused
   - Add 2-5 bullet points for multi-file changes

3. **Present to user for confirmation**
   - Show files to be committed
   - Show proposed message
   - Wait for explicit "yes" / confirmation

4. **Execute commit**
   ```bash
   git add <files>
   git commit -m "type(scope): description

   - Change 1
   - Change 2"
   ```

---

## Commands

```bash
# Check state before committing
git status
git diff --stat HEAD
git diff --cached --stat

# Standard commit (single line)
git add <files>
git commit -m "type(scope): description"

# Multi-line commit with body
git commit -m "type(scope): description

- Change 1
- Change 2
- Change 3"

# Check recent commit style for consistency
git log --oneline -5
```
