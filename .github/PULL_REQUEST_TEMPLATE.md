## Summary

<!-- 1-3 bullet points: WHAT changed and WHY -->

-

## Changes

<!-- Table of key files changed and what was done -->

| File | Change |
|------|--------|
| `path/to/file` | What changed |

## Verification

<!-- Check all that apply -->

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] E2E tests pass (if feature has UI pages)
- [ ] No `any` types introduced
- [ ] No secrets in committed code

<!-- Add workspace-specific sections below if applicable -->

<details>
<summary><b>UI Changes</b> (expand if applicable)</summary>

- [ ] All UI states handled (loading, error, empty)
- [ ] Responsive: tested at mobile (< 640px) and desktop (> 1024px)
- [ ] E2E tests added/updated for new pages
- [ ] Screenshots attached for visual changes

</details>

<details>
<summary><b>Database Changes</b> (expand if applicable)</summary>

- [ ] Migration is incremental (not a full dump)
- [ ] RLS policies present for tenant-scoped tables
- [ ] `supabase db reset` runs successfully

</details>

<details>
<summary><b>Service Layer Changes</b> (expand if applicable)</summary>

- [ ] Service uses function-based pattern
- [ ] Unit tests with mocked Supabase client
- [ ] No `"use server"` or Next.js APIs in this package

</details>
