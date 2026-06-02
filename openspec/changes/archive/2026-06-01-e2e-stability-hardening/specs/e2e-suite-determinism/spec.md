# E2E Suite Determinism Specification

> **Change**: e2e-stability-hardening
> **Type**: NEW spec (no prior canonical spec for this domain)

## Purpose

Quality requirements governing Playwright suite determinism against a shared local Supabase
instance (`workers=1`). Guarantees 0 failed / 0 flaky across sequential test execution when
tests mutate shared DB state, test account credentials, or CI infrastructure state.

---

## Requirements

### Requirement: afterEach State Restoration

Tests that mutate shared DB or application state MUST restore that state in `afterEach` hooks,
not inline within the test body. Restoration MUST run even when the test fails.

Covered mutations: notification `is_read` flags; team member roles; workspace slug; security
toggle settings; test account passwords.

#### Scenario: Unread notifications filter is order-independent

- GIVEN the "mark all as read" test ran first (setting member notifications to `is_read=true`)
- WHEN the "filter by unread" test begins its execution
- THEN the prior test's `afterEach` has reset seed notifications to `is_read=false`
- AND the unread filter returns the expected seed unread notifications

#### Scenario: Team role restored on test failure

- GIVEN a test changes member@enterprise.dev to role "Guest" and fails mid-assertion
- WHEN the `afterEach` hook executes
- THEN the role is restored to "Member" in the DB before the next test starts

#### Scenario: Workspace slug restored on test failure

- GIVEN a test changes the workspace slug to a generated value and fails mid-assertion
- WHEN the `afterEach` hook executes
- THEN the slug is restored to the seed value before the next test starts

---

### Requirement: Page Object Content-Readiness

Page object `goto()` methods for Server Component pages MUST assert a visible content landmark
(heading) after `waitForURL` before returning control to the caller. Hard-coded `waitForTimeout`
calls are PROHIBITED as a substitute for state-based waits.

#### Scenario: Team page goto awaits Members heading

- GIVEN `teamPage.goto()` is called
- WHEN `waitForURL` resolves
- THEN the page object additionally waits for the "Members" heading to be visible (≤ 30 s)
- AND the test receives control only after Server Component content has rendered

#### Scenario: No waitForTimeout in notification state assertions

- GIVEN the notification list page has loaded
- WHEN the test waits for a state change (e.g., mark-as-read badge update)
- THEN the wait is expressed as an `expect(...).toBeVisible()` / `toHaveText()` assertion
- AND no `waitForTimeout(N)` call is present in the notification spec or page object

---

### Requirement: Email Polling Reliability

`getLatestEmail()` MUST poll the mail server for up to **35 seconds** (up from 20 s).
`clearMailbox()` MUST delete messages individually via per-message DELETE requests when a
bulk-DELETE request returns HTTP 404 (Mailpit compatibility).

#### Scenario: clearMailbox works with Mailpit

- GIVEN Mailpit returns HTTP 404 on the bulk-DELETE endpoint
- WHEN `clearMailbox()` is called
- THEN each existing message is deleted individually
- AND `getLatestEmail()` called immediately after returns only messages sent after the clear

#### Scenario: Password-reset account self-heals across runs

- GIVEN a password-reset test changed a test account's password during the run
- WHEN the test's `afterEach` hook executes
- THEN the password is restored to `password123`
- AND the next CI run can authenticate as that account using the seed credential

---

### Requirement: CI Readiness Pre-flight

The CI E2E workflow MUST validate that PostgREST is accepting connections AND that seed data is
present before the Playwright test step begins. Tests MUST NOT start against an unready stack.

#### Scenario: PostgREST health check gates test start

- GIVEN the e2e.yml `supabase start` step has completed
- WHEN the readiness step polls `GET http://127.0.0.1:55331/rest/v1/` with the service API key
- THEN the workflow proceeds to the test step only when a 2xx response is received

#### Scenario: Seed verification fails fast on missing data

- GIVEN PostgREST is ready
- WHEN the seed-verification step queries for at least 1 notification row via the service-role key
- THEN if 0 rows are found the workflow fails the step with an actionable error message
- AND the Playwright test step is skipped entirely
