# Release Automation Specification

## Purpose

Ensure the repository release pipeline always maintains a consistent relationship between release-please manifest state, repository version files, git tags, and GitHub Releases.

---

## Requirements

### Requirement: Reconcile Missing Release Baseline

The system MUST restore a valid baseline when a release PR has bumped repository version files but the corresponding git tag and GitHub Release were not created.

#### Scenario: Missing `v1.3.0` is restored from PR #70

- **Given** `.release-please-manifest.json`, `package.json`, and `CHANGELOG.md` already represent `1.3.0`
- **And** PR #70 merge commit `efd81fe` is the intended source release commit
- **And** no remote tag `v1.3.0` exists
- **When** the reconciliation procedure is executed
- **Then** remote tag `v1.3.0` MUST exist on `efd81fe`
- **And** GitHub Release `v1.3.0` MUST exist
- **And** the stale `autorelease: pending` state MUST be cleared

### Requirement: Fail Loudly on Invalid Release Preconditions

The release workflow MUST fail with actionable output when the configured token or repository preconditions cannot support Release/tag creation.

#### Scenario: Token path cannot create releases

- **Given** the workflow is using an expired, invalid, or under-scoped token
- **When** the release workflow runs
- **Then** the workflow MUST fail
- **And** the job summary MUST explain that release creation prerequisites were not met
- **And** the workflow MUST NOT report a misleading green success for a broken release state

### Requirement: Detect Manifest/Tag Desync

The repository MUST detect and fail on unexpected drift between release-please manifest state and the latest git tag.

#### Scenario: Manifest is ahead of the latest tag without a valid pending release PR

- **Given** `.release-please-manifest.json` version is newer than the latest git tag version
- **And** there is no legitimate open or freshly merged `autorelease: pending` release PR that explains the gap
- **When** the consistency guard runs
- **Then** it MUST fail
- **And** it MUST print remediation guidance

#### Scenario: Open pending release PR temporarily explains the gap

- **Given** `.release-please-manifest.json` is ahead of the latest tag
- **And** there is a legitimate release PR in `autorelease: pending` state
- **When** the consistency guard runs
- **Then** it MUST treat that state as expected
- **And** it MUST NOT fail solely because the next tag has not yet been published

### Requirement: Expose Real Release Outcome

The release workflow MUST make it clear whether it updated a release PR, published a GitHub Release, or encountered an inconsistent state.

#### Scenario: Release was published

- **Given** `release-please` created a release
- **When** the workflow summary is generated
- **Then** it MUST include tag name, version, and commit SHA

#### Scenario: No release was published

- **Given** `release-please` did not create a release
- **When** the workflow summary is generated
- **Then** it MUST indicate whether that outcome was expected
- **And** it MUST surface any inconsistency detected by the guard

### Requirement: Document Operational Recovery

The repository MUST include maintainer-facing documentation for the release flow, token rotation, and desync recovery.

#### Scenario: Maintainer needs to recover a future desync

- **Given** a future manifest/tag mismatch incident occurs
- **When** a maintainer opens the release runbook
- **Then** they MUST find the normal release flow
- **And** required token scopes/rotation steps
- **And** the supported desync recovery procedure
