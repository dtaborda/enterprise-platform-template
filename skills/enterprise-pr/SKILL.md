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
- NEVER create a PR without running quality checks first (`pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test`)
- ALWAYS run `pnpm install --frozen-lockfile` as the FIRST check whenever ANY `package.json` changed — CI runs it before everything else and FAILS the whole pipeline if `pnpm-lock.yaml` is stale. `typecheck`/`lint`/`test` do NOT catch this because they install without the frozen flag.
- If you added/removed/bumped a dependency, you MUST run `pnpm install` (no flag) to regenerate `pnpm-lock.yaml`, then commit the lockfile in the SAME PR as the `package.json` change.
- NEVER push `--force` to main/master
- NEVER include secrets, `.env` files, or credentials in the PR

---

## PR Creation Workflow

```
1. Ensure branch is up to date with main
2. Verify lockfile integrity: pnpm install --frozen-lockfile  (MUST pass — mirrors CI's first step)
3. Run quality checks: pnpm typecheck && pnpm lint && pnpm test
4. Review all commits: git log main..HEAD --oneline
5. Review full diff: git diff main...HEAD --stat
6. Confirm no stray files from other branches leaked in (see "Lockfile & Branch Hygiene" below)
7. Fill PR template sections
8. Create PR: gh pr create --title "type(scope): description" --body "..."
9. Verify CI passes
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

- [ ] `pnpm install --frozen-lockfile` passes
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
2. ✅ `pnpm install --frozen-lockfile` passes (run FIRST — this is exactly what CI does before any other step)
3. ✅ `pnpm typecheck` passes
4. ✅ `pnpm lint` passes
5. ✅ `pnpm test` passes
6. ✅ E2E tests pass (if feature has UI: `pnpm e2e`)
7. ✅ `git diff main...HEAD --stat` shows ONLY files this PR should touch (no leaked commits from sibling branches)
8. ✅ Commits follow conventional-commits format
9. ✅ No `any` types introduced
10. ✅ No secrets in code

---

## Lockfile & Branch Hygiene

The #1 silent CI failure on this repo is a stale `pnpm-lock.yaml`. CI runs `pnpm install --frozen-lockfile` as its FIRST step in BOTH the `quality` and `security` jobs and aborts the entire pipeline if the lockfile does not match every `package.json`. Local `typecheck`/`lint`/`test` install WITHOUT the frozen flag, so they never surface this.

### Rule: package.json and lockfile travel together

```bash
# After ANY dependency add/remove/bump in a package.json:
pnpm install                    # regenerates pnpm-lock.yaml
git add pnpm-lock.yaml          # stage it in the SAME commit/PR as the package.json change

# Then prove CI will pass:
pnpm install --frozen-lockfile  # must print "Lockfile is up to date"
```

Adding only `exports`/`scripts`/`name` fields (no dependency change) does NOT require a lockfile update — but running `pnpm install --frozen-lockfile` to confirm costs seconds and removes all doubt.

### Rule: verify the diff is scoped to THIS branch

When working with stacked or sibling branches, commits can leak across branches (e.g. cherry-pick mistakes, wrong active branch). Before opening the PR:

```bash
git diff <base>...HEAD --stat   # every file must belong to THIS PR's scope
git log <base>..HEAD --oneline  # every commit must belong to THIS PR
```

If you see files or commits from an unrelated track, rebuild the branch cleanly off its intended base (cherry-pick only this PR's commits) before creating the PR.

---

## Commands

```bash
# Ensure branch is current
git pull origin main --rebase

# Run all quality checks (lockfile check FIRST — mirrors CI order)
pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test

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
