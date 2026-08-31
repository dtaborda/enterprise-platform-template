# Archive Report: Brand Abstraction Layer + Backend Provider Decoupling

**Archived**: 2026-06-08
**Status**: Complete — all tracks shipped on `main`

## Summary

This change bundled two orthogonal P1 efforts: Brand abstraction (#14) and backend
provider decoupling (#16), plus a trivial roadmap fix (Track A). All three tracks
are implemented and merged. The original plan's file layout diverged from what
shipped (see note below); the planning artifacts are archived for traceability.

## Outcome by track

| Track | Status | Where it shipped |
|-------|--------|------------------|
| **A — Roadmap fix** | ✅ Done | `docs/features/roadmap.md` — Notifications (#10) = "Done" |
| **B — Brand abstraction (#14)** | ✅ Done | Standalone `@enterprise/brand` package at `packages/brand/` (PR #125+): `brandConfigSchema` in contracts, registry, `resolveBrand()`, `BrandProvider`/`useBrand()`, `generateBrandMetadata()`, `BrandLogo`, `BrandFooter`, E2E (`ui/e2e/brand/brand.spec.ts`); `ui/app/layout.tsx` migrated to `generateMetadata` + `BrandProvider` |
| **C — Backend decoupling (#16)** | ✅ Done | `AuthPort`/`StoragePort`/`SessionPort` + Supabase adapters + `createBackendAdapters()` factory (PR #116); `auth-service` migrated to `AuthPort`; actions/middleware use the factory; tests on `createMockAuthPort()` |
| **C3 docs tail** | ✅ Done | `.env.example` documents `BRAND_SLUG`/`BACKEND_AUTH_PROVIDER`/`BACKEND_STORAGE_PROVIDER`; `packages/core/AGENTS.md` documents the Port/Adapter pattern; `docs/migrations/brand-and-decoupling-migration-guide.md` added |

## Layout divergence from the plan

The plan placed the brand module under `@enterprise/ui` (`packages/ui/src/brand/`).
The implementation instead extracted a dedicated `@enterprise/brand` workspace
(`packages/brand/`), wired into `ui/next.config.ts` `transpilePackages`. This is a
cleaner import boundary and is the canonical location going forward. The archived
`tasks.md` retains the original path references with corrected Evidence columns.

## Notes

- The change's per-capability `specs/` folders were never populated — requirements
  live in the monolithic `spec.md` archived alongside this report. Nothing required
  syncing into `openspec/specs/`.
- No database schema or RLS changes were involved; both tracks are fully reversible
  (see the rollback plan in `proposal.md`).
- Migration guidance for adopters: `docs/migrations/brand-and-decoupling-migration-guide.md`.
