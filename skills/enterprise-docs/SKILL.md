---
name: enterprise-docs
description: >
  Documentation style guide and writing standards for the Enterprise Platform.
  Trigger: When writing documentation, guides, READMEs, or MDX pages.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0"
  scope: [root]
  auto_invoke:
    - "Writing documentation"
    - "Creating MDX pages"
    - "Adding developer guides"
---

## Critical Rules

- ALWAYS write in English (project Language Policy — no exceptions)
- ALWAYS include frontmatter with `title`, `description`, `owner`, `lastUpdated`
- ALWAYS start pages with Purpose + Scope sections
- ALWAYS use `---` horizontal rules between major sections
- ALWAYS show correct pattern first (✅), then wrong pattern (❌) in code examples
- ALWAYS define acronyms on first use: "Row-Level Security (RLS)"
- NEVER duplicate content — link to the source of truth instead
- NEVER use "you might want to" or "it's possible to" — be direct
- NEVER add emojis unless explicitly requested

---

## Page Format

```mdx
---
title: "Page Title"
description: "One-sentence description of what this page covers."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Page Title

## Purpose

What this document covers and why it exists.

## Scope

- Included: what topics this page addresses
- Excluded: what topics are covered elsewhere (with links)

---

## Content sections...

---

*Last updated: 2026-05-07*
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | ✅ | Page title — Sentence case, not Title Case |
| `description` | ✅ | One-sentence summary for navigation/search |
| `owner` | ✅ | Responsible team or person |
| `lastUpdated` | ✅ | ISO date of last significant update |

---

## Writing Conventions

### Voice and Tone

- Use **present tense** and **active voice**: "The service validates input" not "Input will be validated"
- Be **direct** and **imperative**: "Run `pnpm test`" not "You should run..."
- Use **second person** ("you/your") when addressing the reader
- Use **inclusive language**: avoid gendered pronouns, use "they/them" for generic references
- Avoid militaristic language: "address the issue" not "fight the bug"

### Capitalization

- **Headings**: Sentence case — "How to configure auth" not "How to Configure Auth"
- **Code references**: Keep exact casing — `getUser()`, `ActionResult<T>`, `@enterprise/core`
- **Proper nouns**: Capitalize product names — Supabase, Next.js, Tailwind CSS, Drizzle

### Technical Terminology

- Define acronyms on first use: "Row-Level Security (RLS)" then "RLS" thereafter
- Prefer verbal constructions: "The migration was generated" not "The generation of the migration"
- Use project-specific terms consistently:
  | Term | Meaning |
  |------|---------|
  | Server Action | Next.js server function in `features/*/actions.ts` |
  | Service | Business logic function in `packages/core/src/services/` |
  | Contract | Zod schema + inferred type in `@enterprise/contracts` |
  | Workspace | A package or app within the monorepo |

---

## Structure Patterns

### Prefer Tables Over Bullets for Comparisons

```markdown
<!-- ✅ Clear comparison -->
| Pattern | When to Use |
|---------|-------------|
| Server Component | Data fetching, no interactivity |
| Client Component | Forms, event handlers, hooks |

<!-- ❌ Hard to scan -->
- Server Components are for data fetching with no interactivity
- Client Components are for forms, event handlers, and hooks
```

### Use Decision Trees for Placement Questions

```markdown
<!-- ✅ Algorithmic -->
Is it business logic?
├── Yes → packages/core/src/services/
└── No → ...

<!-- ❌ Prose -->
If the code contains business logic, it should go in the services directory
within the core package.
```

### Callouts / Admonitions

Use blockquotes with bold labels for emphasis:

```markdown
> **Warning**: Disabling RLS exposes all tenant data to any authenticated user.

> **Note**: This pattern requires the `supabase` skill to be loaded first.

> **Important**: Never import from `@enterprise/web` in any package.
```

---

## Code Examples

### Annotation Standard

```typescript
// ✅ Correct — function-based service with DI
export async function createResource(
  client: SupabaseClient,
  input: CreateResourceDto,
): Promise<ServiceResult<Resource>> {
  // ...
}

// ❌ Wrong — class-based, creates own client
class ResourceService {
  private client = createClient();
  async create(input: CreateResourceDto) { /* ... */ }
}
```

### Rules for Examples

- Show the **correct** pattern FIRST, then the wrong one
- Keep examples **minimal** — pattern only, not full implementation
- Use **real project imports** (`@enterprise/contracts`, `@enterprise/core`)
- Annotate with `// ✅ Correct` and `// ❌ Wrong` on the first line
- Include the **language annotation** in code fences: ` ```typescript `

---

## Cross-References

- Link to other docs using **relative paths**: `[Architecture](./architecture.mdx)`
- Reference AGENTS.md when the doc is normative: "Enforced in `packages/core/AGENTS.md`"
- When a skill covers the topic in depth, reference the skill: "See `drizzle` skill for patterns"
- NEVER duplicate content across pages — link to the source

---

## Decision Trees

### Where Does a New Doc Go?

```
Is it a how-to for daily development?
├── Yes → docs/developer-guide/{topic}.mdx
└── No
    ├── Is it a deep-dive on system design?
    │   └── Yes → docs/architecture/{topic}.md
    ├── Is it a decision record (why we chose X)?
    │   └── Yes → docs/adr/{NNN}-{description}.md
    └── Is it a product requirement or RFC?
        └── Yes → docs/ root level (prd-*.md, rfc-*.md)
```

### Should This Also Update AGENTS.md?

```
Does it define a rule that AI agents should follow?
├── Yes → Update the relevant workspace AGENTS.md or skill
└── No
    ├── Does a skill reference this doc?
    │   └── Yes → Keep the doc as source of truth, skill points to it
    └── No → Doc is standalone, no AGENTS.md update needed
```

---

## AI-Driven Documentation

When writing documentation, consider: "Would an AI agent benefit from knowing this?"

- If YES → ensure the relevant `AGENTS.md` or skill references the doc
- If the doc defines conventions that agents must follow → the doc is the source of truth, the skill or AGENTS.md points to it
- Skills use `references/` directories to point to docs — never duplicate doc content in a skill

---

## Commands

```bash
# Create a new developer guide page
# (then fill with frontmatter template above)
touch docs/developer-guide/{topic}.mdx

# Create an ADR
touch docs/adr/{NNN}-{description}.md

# Verify frontmatter is valid (manual check)
head -10 docs/developer-guide/{topic}.mdx
```

---

## QA Checklist (before committing docs)

- [ ] Frontmatter has all 4 required fields
- [ ] Page starts with Purpose + Scope
- [ ] Sections separated by `---` horizontal rules
- [ ] Code examples use ✅/❌ annotation
- [ ] Acronyms defined on first use
- [ ] No duplicated content — links to source of truth
- [ ] Cross-references use relative paths
- [ ] `lastUpdated` field reflects today's date
- [ ] If normative → relevant AGENTS.md or skill updated
