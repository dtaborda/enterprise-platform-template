---
name: skill-sync
description: >
  Syncs skill metadata to AGENTS.md Auto-invoke sections.
  Trigger: When updating skill metadata (metadata.scope/metadata.auto_invoke), regenerating Auto-invoke tables, or running ./skills/skill-sync/assets/sync.sh (including --dry-run/--scope).
license: Apache-2.0
metadata:
  author: anyoneAI
  version: "1.0.0"
  scope: [root]
  auto_invoke:
    - "After creating/modifying a skill"
    - "Regenerate AGENTS.md Auto-invoke tables (sync.sh)"
    - "Troubleshoot why a skill is missing from AGENTS.md auto-invoke"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Purpose

Keeps AGENTS.md Auto-invoke sections in sync with skill metadata. When you create or modify a skill, run the sync script to automatically update all affected AGENTS.md files.

## Required Skill Metadata

Each skill that should appear in Auto-invoke sections needs these fields in `metadata`.

`auto_invoke` can be either a single string **or** a list of actions.

### Scope Values

| Scope | Updates |
|-------|---------|
| `root` | `AGENTS.md` (repo root) |
| `ui` | `ui/AGENTS.md` |
| `packages` | `packages/AGENTS.md` |
| `packages/ui` | `packages/ui/AGENTS.md` |
| `packages/core` | `packages/core/AGENTS.md` |
| `packages/contracts` | `packages/contracts/AGENTS.md` |
| `packages/db` | `packages/db/AGENTS.md` |

Skills can have multiple scopes: `scope: [packages/ui, root]`

## Usage

```bash
./skills/skill-sync/assets/sync.sh
./skills/skill-sync/assets/sync.sh --dry-run
./skills/skill-sync/assets/sync.sh --scope packages/ui
```

## Checklist After Modifying Skills

- [ ] Added `metadata.scope` to new/modified skill
- [ ] Added `metadata.auto_invoke` with action description
- [ ] Ran `./skills/skill-sync/assets/sync.sh`
- [ ] Verified AGENTS.md files updated correctly
