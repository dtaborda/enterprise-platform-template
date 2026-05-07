---
name: enterprise-pr
description: >
  Creates Pull Requests for Enterprise Platform following the project template and conventions.
  Trigger: When creating a pull request, opening a PR, or preparing changes for review.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0"
  scope: [root]
  auto_invoke:
    - "Creating a pull request"
    - "Opening a PR"
    - "Preparing changes for review"
---

## Critical Rules

- ALWAYS fill every section of the PR template (Context, Summary, Changes, Verification)
- ALWAYS use conventional-commit format for PR title: `type(scope): description`
- ALWAYS link related issues with `Closes #N`, `Fixes #N`, or `Resolves #N`
- ALWAYS include workspace-specific checklist items when applicable
- NEVER create a PR without running quality checks first (`pnpm typecheck && pnpm lint && pnpm test`)
- NEVER push `--force` to main/master
- NEVER include secrets, `.env` files, or credentials in the PR

---

## PR Creation Workflow

```
1. Ensure branch is up to date with main
2. Run quality checks: pnpm typecheck && pnpm lint && pnpm test
3. Review all commits: git log main..HEAD --oneline
4. Review full diff: git diff main...HEAD --stat
5. Fill PR template sections
6. Create PR: gh pr create --title "type(scope): description" --body "..."
7. Verify CI passes
```

---

## Branch Naming

```
^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$
```

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/{description}` | `feat/resource-crud` |
| Bug fix | `fix/{description}` | `fix/auth-redirect-loop` |
| Docs | `docs/{description}` | `docs/agents-md-spec` |
| Refactor | `refactor/{description}` | `refactor/service-layer` |
| Chore | `chore/{description}` | `chore/bump-dependencies` |

---

## PR Template

The template lives at `.github/PULL_REQUEST_TEMPLATE.md`. Every PR body MUST contain:

### Structure

```markdown
## Summary

- {1-3 bullet points explaining WHAT and WHY}

## Changes

| File | Change |
|------|--------|
| `path/to/file` | What changed |

## Verification

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] {Workspace-specific checks}
```

---

## Workspace-Specific Checks

When a PR touches specific workspaces, add the relevant checklist:

### UI Changes (`ui/`)

```markdown
### UI Verification
- [ ] All UI states handled (loading, error, empty)
- [ ] Responsive: tested at mobile (< 640px) and desktop (> 1024px)
- [ ] E2E tests added/updated for new pages
- [ ] Screenshots attached for visual changes
```

### Database Changes (`packages/db/`)

```markdown
### Database Verification
- [ ] Migration is incremental (not a full dump)
- [ ] RLS policies present for tenant-scoped tables
- [ ] `supabase db reset` runs successfully
```

### Service Layer Changes (`packages/core/`)

```markdown
### Service Layer Verification
- [ ] Service uses function-based pattern
- [ ] Unit tests with mocked Supabase client
- [ ] No `"use server"` or Next.js APIs in this package
```

### Contract Changes (`packages/contracts/`)

```markdown
### Contract Verification
- [ ] Schemas have colocated type exports
- [ ] No imports from other @enterprise/* packages
- [ ] Tests cover validation edge cases
```

---

## Title Conventions

Same as commit conventions (conventional-commits):

```
feat(ui): add resource list page
fix(core): resolve tenant isolation leak
docs: add AGENTS.md specification
refactor(db): normalize audit log indexes
test(e2e): add auth flow coverage
chore(deps): bump next to 15.3
```

---

## Decision Tree

```
Is this a single-workspace change?
├── Yes → Include scope in title: type(scope): description
└── No  → Omit scope: type: description

Does it fix an issue?
├── Yes → Add "Closes #N" in Summary section
└── No  → No issue linkage required (but recommended)

Are there UI changes?
├── Yes → Add UI Verification checklist + screenshots
└── No  → Standard checklist only

Are there DB schema changes?
├── Yes → Add Database Verification checklist
└── No  → Skip

Is the diff > 400 lines?
├── Yes → Consider splitting into chained PRs (see chained-pr skill)
└── No  → Single PR is fine
```

---

## Before Creating PR

1. ✅ Branch is up to date with main (`git pull origin main --rebase`)
2. ✅ `pnpm typecheck` passes
3. ✅ `pnpm lint` passes
4. ✅ `pnpm test` passes
5. ✅ E2E tests pass (if feature has UI: `pnpm e2e`)
6. ✅ Commits follow conventional-commits format
7. ✅ No `any` types introduced
8. ✅ No secrets in code

---

## Commands

```bash
# Ensure branch is current
git pull origin main --rebase

# Run all quality checks
pnpm typecheck && pnpm lint && pnpm test

# Review what will be in the PR
git log main..HEAD --oneline
git diff main...HEAD --stat

# Create PR with heredoc body
gh pr create --title "feat(scope): description" --body "$(cat <<'EOF'
## Summary

- Add resource CRUD feature with tenant isolation

## Changes

| File | Change |
|------|--------|
| `packages/core/src/services/resource-service.ts` | New service with CRUD operations |
| `ui/features/resources/actions.ts` | Server Actions (thin wrappers) |
| `ui/e2e/resources/resources.spec.ts` | E2E test coverage |

## Verification

- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `pnpm e2e` passes

Closes #42
EOF
)"

# Create draft PR
gh pr create --draft --title "feat(scope): wip description"
```
