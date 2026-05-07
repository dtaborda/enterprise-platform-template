# RFC — JSON-Configurable Theme System

## 1. Summary

This document defines the technical architecture for a **JSON-configurable theme system** that centralizes all visual decisions (colors, typography, spacing, radius, shadows, layout) behind a single validated JSON file.

The system will:

- Replace hardcoded CSS tokens with values generated from a theme JSON
- Support **light + dark modes** from V1 with runtime switching
- Validate the JSON against a Zod schema at build time
- Resolve internal references (`{colors.primitive.blue500}`) at build time — zero runtime overhead
- Generate CSS custom properties compatible with the existing shadcn/ui component library
- Auto-generate TypeScript token exports for programmatic access
- Prepare the schema for multi-tenant theming (V2) without implementing per-tenant switching

### What this RFC is NOT

- A visual theme editor or builder
- A marketplace of themes
- Component-level configuration (V1 only covers foundation tokens)
- Per-tenant theme storage or switching (prepared but not implemented)

---

## 2. Technical Objective

Design a theme abstraction layer that:

1. Uses a JSON file as the **single source of truth** for all visual tokens
2. Validates structure with a **Zod schema** in `@enterprise/contracts`
3. Resolves token references and generates CSS custom properties at **build time**
4. Exposes a **ThemeProvider** for runtime mode switching (light/dark)
5. Keeps existing shadcn/ui components **unchanged** — they already consume CSS variables
6. Auto-generates `packages/ui/src/tokens/index.ts` from the JSON

---

## 3. Architecture

### Processing Pipeline

```text
theme JSON files (light.json, dark.json)
   │
   ▼
Zod Schema Validation (@enterprise/contracts)
   │
   ▼
Reference Resolver (build-time)
   │  resolves "{colors.primitive.blue500}" → "#2563EB"
   ▼
CSS Generator (build-time)
   │  generates @theme block + :root / [data-theme="dark"] selectors
   ▼
Generated Files:
   ├── packages/ui/src/styles/theme-generated.css  (CSS custom properties)
   ├── packages/ui/src/tokens/index.ts             (auto-generated TS exports)
   └── packages/ui/src/themes/resolved/            (resolved JSON for debugging)
   │
   ▼
globals.css imports theme-generated.css
   │
   ▼
shadcn/ui Components (unchanged — consume CSS variables as before)
   │
   ▼
ThemeProvider (runtime light/dark switching via data attribute)
```

### Package Ownership

```text
@enterprise/contracts
 └── src/schemas/theme.ts          → Zod schema (themeSchema, themeMetadataSchema, etc.)
 └── src/types/theme.ts            → TypeScript types inferred from Zod

@enterprise/ui
 ├── src/themes/
 │   ├── light.json                → Light mode theme (source of truth)
 │   ├── dark.json                 → Dark mode theme (source of truth)
 │   └── resolved/                 → Auto-generated resolved JSONs (gitignored)
 ├── src/styles/
 │   ├── theme-generated.css       → Auto-generated CSS (gitignored)
 │   └── globals.css               → Imports theme-generated.css + base styles
 ├── src/tokens/
 │   └── index.ts                  → Auto-generated TS token exports (gitignored)
 ├── src/theme/
 │   ├── provider.tsx              → ThemeProvider component (light/dark switching)
 │   ├── context.ts                → React context for theme state
 │   ├── resolve.ts                → Reference resolver (build-time utility)
 │   ├── generate-css.ts           → CSS generator (build-time utility)
 │   ├── generate-tokens.ts        → TS token generator (build-time utility)
 │   └── validate.ts               → Validation wrapper using contracts schema
 │   └── types.ts                  → Re-exports from @enterprise/contracts
 └── scripts/
     └── build-theme.ts            → CLI script: validate → resolve → generate CSS + tokens
```

### Dependency Direction (respected)

```text
@enterprise/contracts → zod ONLY (defines theme schema)
@enterprise/ui → @enterprise/contracts (imports schema for build-time validation)
                 clsx, tailwind-merge, CVA, lucide-react (existing deps)
@enterprise/web → @enterprise/ui (imports ThemeProvider + globals.css)
```

No new packages. No circular dependencies. Contracts knows nothing about UI.

---

## 4. Theme JSON Structure

### Metadata

```json
{
  "metadata": {
    "name": "enterprise-dark",
    "version": "1.0.0",
    "mode": "dark",
    "description": "Enterprise Platform default dark theme"
  }
}
```

### Foundations

```json
{
  "foundations": {
    "colors": {
      "primitive": {
        "white": "#FFFFFF",
        "black": "#000000",
        "gray50": "#F9FAFB",
        "gray100": "#F3F4F6",
        "gray200": "#E5E7EB",
        "gray300": "#D1D5DB",
        "gray400": "#9CA3AF",
        "gray500": "#6B7280",
        "gray600": "#4B5563",
        "gray700": "#374151",
        "gray800": "#1F2937",
        "gray900": "#111827",
        "gray950": "#030712",
        "cyan50": "#ECFEFF",
        "cyan100": "#CFFAFE",
        "cyan200": "#A5F3FC",
        "cyan300": "#67E8F9",
        "cyan400": "#22D3EE",
        "cyan500": "#06B6D4",
        "cyan600": "#0891B2",
        "cyan700": "#0E7490",
        "cyan800": "#155E75",
        "cyan900": "#164E63",
        "violet50": "#F5F3FF",
        "violet500": "#8B5CF6",
        "violet600": "#7C3AED",
        "violet700": "#6D28D9",
        "red50": "#FEF2F2",
        "red400": "#F87171",
        "red500": "#EF4444",
        "red900": "#7F1D1D",
        "green400": "#4ADE80",
        "green500": "#22C55E",
        "amber400": "#FBBF24",
        "amber500": "#F59E0B"
      },
      "semantic": {
        "background": "{colors.primitive.gray950}",
        "foreground": "{colors.primitive.gray100}",
        "card": "{colors.primitive.gray900}",
        "cardForeground": "{colors.primitive.gray100}",
        "popover": "{colors.primitive.gray800}",
        "popoverForeground": "{colors.primitive.gray100}",
        "primary": "{colors.primitive.cyan400}",
        "primaryForeground": "{colors.primitive.cyan900}",
        "secondary": "{colors.primitive.violet600}",
        "secondaryForeground": "{colors.primitive.violet50}",
        "muted": "{colors.primitive.gray800}",
        "mutedForeground": "{colors.primitive.gray400}",
        "accent": "{colors.primitive.gray700}",
        "accentForeground": "{colors.primitive.gray100}",
        "destructive": "{colors.primitive.red400}",
        "destructiveForeground": "{colors.primitive.red900}",
        "border": "{colors.primitive.gray700}",
        "input": "{colors.primitive.gray700}",
        "ring": "{colors.primitive.cyan400}",
        "success": "{colors.primitive.green400}",
        "warning": "{colors.primitive.amber400}",
        "info": "{colors.primitive.cyan300}",
        "error": "{colors.primitive.red400}",
        "errorContainer": "{colors.primitive.red900}",
        "surfaceDim": "{colors.primitive.gray950}",
        "surfaceContainerLowest": "{colors.primitive.gray950}",
        "surfaceContainerLow": "{colors.primitive.gray900}",
        "surfaceContainer": "{colors.primitive.gray800}",
        "surfaceContainerHigh": "{colors.primitive.gray700}",
        "surfaceContainerHighest": "{colors.primitive.gray600}",
        "surfaceBright": "{colors.primitive.gray600}",
        "outline": "{colors.primitive.gray500}",
        "outlineVariant": "{colors.primitive.gray700}",
        "inverseSurface": "{colors.primitive.gray100}",
        "inverseOnSurface": "{colors.primitive.gray800}"
      }
    },
    "typography": {
      "fontFamily": {
        "sans": "Inter, ui-sans-serif, system-ui, sans-serif",
        "mono": "JetBrains Mono, ui-monospace, monospace",
        "display": "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif",
        "heading": "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
      },
      "fontSize": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.125rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem"
      },
      "fontWeight": {
        "normal": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      },
      "lineHeight": {
        "tight": 1.2,
        "normal": 1.5,
        "relaxed": 1.7
      }
    },
    "spacing": {
      "0": "0px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px",
      "10": "40px",
      "12": "48px",
      "16": "64px",
      "20": "80px",
      "24": "96px"
    },
    "sizing": {
      "xs": "24px",
      "sm": "32px",
      "md": "40px",
      "lg": "48px",
      "xl": "56px"
    },
    "radius": {
      "none": "0px",
      "sm": "0.25rem",
      "md": "0.5rem",
      "lg": "0.75rem",
      "xl": "1rem",
      "2xl": "1rem",
      "full": "9999px"
    },
    "shadows": {
      "xs": "0 1px 2px rgba(0,0,0,0.05)",
      "sm": "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      "md": "0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
      "lg": "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
      "xl": "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)"
    },
    "borders": {
      "thin": "1px",
      "thick": "2px"
    },
    "breakpoints": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    },
    "zIndex": {
      "base": 1,
      "dropdown": 1000,
      "sticky": 1100,
      "modal": 1300,
      "toast": 1400,
      "tooltip": 1500
    }
  }
}
```

### Layout

```json
{
  "layout": {
    "container": {
      "maxWidth": "1280px",
      "paddingX": "{spacing.4}",
      "paddingXMobile": "{spacing.3}",
      "sectionGap": "{spacing.8}"
    },
    "sidebar": {
      "width": "256px",
      "widthCollapsed": "56px"
    }
  }
}
```

---

## 5. Zod Schema Design

The schema lives in `packages/contracts/src/schemas/theme.ts`.

### Schema Structure

```typescript
import { z } from "zod";

// --- Metadata ---
export const themeMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  mode: z.enum(["light", "dark"]),
  description: z.string().optional(),
  tenantId: z.string().uuid().optional(), // prepared for V2 multi-tenant
});

// --- Token Reference ---
// Values can be raw strings/numbers OR references like "{colors.primitive.blue500}"
const tokenValueSchema = z.string();
const tokenRefOrValue = z.string(); // resolver handles expansion

// --- Color Tokens ---
const hexColorPattern = /^#([0-9A-Fa-f]{3,8})$/;
const primitiveColorSchema = z.record(
  z.string(),
  z.string().regex(hexColorPattern, "Must be a valid hex color")
);

const semanticColorSchema = z.record(z.string(), tokenRefOrValue);

const colorsSchema = z.object({
  primitive: primitiveColorSchema,
  semantic: semanticColorSchema,
});

// --- Typography ---
const typographySchema = z.object({
  fontFamily: z.record(z.string(), z.string()),
  fontSize: z.record(z.string(), z.string()),
  fontWeight: z.record(z.string(), z.number()),
  lineHeight: z.record(z.string(), z.number()),
});

// --- Spacing / Sizing / Radius ---
const scaleSchema = z.record(z.string(), z.string());

// --- Shadows ---
const shadowsSchema = z.record(z.string(), z.string());

// --- Borders ---
const bordersSchema = z.record(z.string(), z.string());

// --- Breakpoints ---
const breakpointsSchema = z.record(z.string(), z.string());

// --- Z-Index ---
const zIndexSchema = z.record(z.string(), z.number());

// --- Foundations ---
export const themeFoundationsSchema = z.object({
  colors: colorsSchema,
  typography: typographySchema,
  spacing: scaleSchema,
  sizing: scaleSchema,
  radius: scaleSchema,
  shadows: shadowsSchema,
  borders: bordersSchema,
  breakpoints: breakpointsSchema,
  zIndex: zIndexSchema,
});

// --- Layout ---
export const themeLayoutSchema = z.object({
  container: z.object({
    maxWidth: z.string(),
    paddingX: tokenRefOrValue,
    paddingXMobile: tokenRefOrValue,
    sectionGap: tokenRefOrValue,
  }),
  sidebar: z.object({
    width: z.string(),
    widthCollapsed: z.string(),
  }).optional(),
});

// --- Full Theme ---
export const themeSchema = z.object({
  metadata: themeMetadataSchema,
  foundations: themeFoundationsSchema,
  layout: themeLayoutSchema,
});

// --- Inferred Types ---
export type ThemeConfig = z.infer<typeof themeSchema>;
export type ThemeMetadata = z.infer<typeof themeMetadataSchema>;
export type ThemeFoundations = z.infer<typeof themeFoundationsSchema>;
export type ThemeLayout = z.infer<typeof themeLayoutSchema>;
export type ThemeMode = z.infer<typeof themeMetadataSchema>["mode"];
```

Types are re-exported from `packages/contracts/src/types/theme.ts`.

---

## 6. Reference Resolver

The resolver is a **build-time only** utility. It processes the JSON and replaces all `{path.to.token}` references with their resolved values.

### Resolution Rules

1. References use dot notation: `{colors.primitive.blue500}` → looks up `foundations.colors.primitive.blue500`
2. References can chain through semantic tokens: `{colors.semantic.primary}` → resolves to `{colors.primitive.cyan400}` → resolves to `#22D3EE`
3. Maximum resolution depth: **5 levels** (prevents circular references)
4. If a reference cannot be resolved, the build **fails with a clear error** indicating the path and the missing key
5. Circular references are detected and cause a build failure

### Resolution Algorithm

```text
1. Parse JSON
2. Collect all values matching /{[a-zA-Z0-9.]+}/ pattern
3. Build dependency graph
4. Detect cycles → fail if found
5. Topological sort
6. Resolve in order, substituting values
7. Output fully resolved JSON (no references remain)
```

### Location

`packages/ui/src/theme/resolve.ts` — pure function, no side effects, fully testable.

---

## 7. CSS Generation

### Output: `theme-generated.css`

The generator maps resolved theme tokens to CSS custom properties that match the existing `@theme` block in `globals.css`.

### Mapping Strategy

The semantic color tokens map **directly** to the shadcn/Tailwind CSS variable names:

| Theme JSON path | CSS Variable | Tailwind class |
|-----------------|-------------|----------------|
| `colors.semantic.background` | `--color-background` | `bg-background` |
| `colors.semantic.foreground` | `--color-foreground` | `text-foreground` |
| `colors.semantic.primary` | `--color-primary` | `bg-primary` |
| `colors.semantic.primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `colors.semantic.card` | `--color-card` | `bg-card` |
| `colors.semantic.destructive` | `--color-destructive` | `bg-destructive` |
| `colors.semantic.border` | `--color-border` | `border-border` |
| `colors.semantic.ring` | `--color-ring` | `ring-ring` |
| `colors.semantic.surfaceDim` | `--color-surface-dim` | `bg-surface-dim` |
| `colors.semantic.surfaceContainerLow` | `--color-surface-container-low` | `bg-surface-container-low` |
| `typography.fontFamily.sans` | `--font-sans` | `font-sans` |
| `typography.fontFamily.heading` | `--font-heading` | `font-heading` |
| `radius.sm` | `--radius-sm` | `rounded-sm` |
| `radius.md` | `--radius-md` | `rounded-md` |
| `shadows.sm` | `--shadow-sm` | `shadow-sm` |
| `layout.sidebar.width` | `--sidebar-width` | — |

### Generated CSS Structure

```css
/* AUTO-GENERATED — DO NOT EDIT MANUALLY */
/* Source: light.json + dark.json */
/* Generated: 2026-04-23T00:00:00Z */

/* Light mode (default when data-theme="light") */
@theme {
  /* shadcn token mapping */
  --color-background: #FFFFFF;
  --color-foreground: #111827;
  --color-card: #F9FAFB;
  /* ... all semantic color tokens ... */

  /* Extended tokens (surface hierarchy) */
  --color-surface-dim: #F3F4F6;
  /* ... */

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  /* ... */

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  /* ... */

  /* Layout */
  --sidebar-width: 256px;
  --sidebar-width-collapsed: 56px;

  /* Motion */
  --animate-fade-in-up: fadeInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Dark mode override */
[data-theme="dark"] {
  --color-background: #030712;
  --color-foreground: #F3F4F6;
  --color-card: #111827;
  /* ... only color overrides — typography, radius, layout stay the same ... */
}
```

### Key Design Decisions

1. **`@theme` block** contains the light mode tokens as defaults (Tailwind 4 convention)
2. **`[data-theme="dark"]`** selector overrides only the color tokens that change
3. Typography, radius, shadows, spacing, layout are **mode-independent** — defined once in `@theme`
4. The existing `globals.css` base styles (scrollbar, selection, focus-visible, body) remain untouched
5. `globals.css` imports `theme-generated.css` instead of defining tokens inline

### Updated globals.css

After migration, `globals.css` becomes:

```css
/*
 * @enterprise/ui — package styles entry point
 *
 * Tokens are auto-generated from theme JSON files.
 * See: src/themes/light.json, src/themes/dark.json
 * Generate: pnpm --filter @enterprise/ui build:theme
 */

@import "./theme-generated.css";

:root {
  color-scheme: light dark;
}

* {
  border-color: var(--color-border);
}

html {
  background-color: var(--color-background);
}

body {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* ... rest of base styles unchanged ... */
```

---

## 8. TypeScript Token Generation

The pipeline auto-generates `packages/ui/src/tokens/index.ts` from the resolved JSON.

### Generated Output

```typescript
// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Source: light.json (resolved)
// Regenerate: pnpm --filter @enterprise/ui build:theme

/** Semantic color tokens */
export const colors = {
  background: "var(--color-background)",
  foreground: "var(--color-foreground)",
  card: "var(--color-card)",
  cardForeground: "var(--color-card-foreground)",
  primary: "var(--color-primary)",
  primaryForeground: "var(--color-primary-foreground)",
  // ... all semantic colors
} as const;

/** Typography tokens */
export const typography = {
  fontFamily: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
    display: "var(--font-display)",
    heading: "var(--font-heading)",
  },
  // ... fontSize, fontWeight, lineHeight
} as const;

/** Spacing scale */
export const spacing = { /* ... */ } as const;

/** Border radius */
export const radius = { /* ... */ } as const;

/** Shadow scale */
export const shadows = { /* ... */ } as const;

/** Z-index scale */
export const zIndex = { /* ... */ } as const;

/** All tokens */
export const tokens = {
  colors, typography, spacing, radius, shadows, zIndex,
} as const;
```

This replaces the current hand-written `tokens/index.ts` with an auto-generated version that stays in sync with the JSON.

---

## 9. ThemeProvider

### Implementation

```typescript
// packages/ui/src/theme/provider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ThemeMode } from "@enterprise/contracts";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "enterprise-theme-mode";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = "dark",
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      document.documentElement.setAttribute("data-theme", defaultMode);
    }
  }, [defaultMode, storageKey]);

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      localStorage.setItem(storageKey, newMode);
      document.documentElement.setAttribute("data-theme", newMode);
    },
    [storageKey],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  return (
    <ThemeContext value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

### Integration in App

```tsx
// ui/app/layout.tsx
import { ThemeProvider } from "@enterprise/ui/theme/provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultMode="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Flash Prevention

The `data-theme` attribute is set on the `<html>` element via:

1. **SSR default**: `data-theme="dark"` rendered server-side
2. **Client hydration**: ThemeProvider reads localStorage and updates immediately in `useEffect`
3. **`suppressHydrationWarning`** on `<html>` prevents React mismatch warning

For a zero-flash experience, a blocking `<script>` can be added to `<head>` in a future iteration.

---

## 10. Build Pipeline

### Script: `packages/ui/scripts/build-theme.ts`

```text
Usage: pnpm --filter @enterprise/ui build:theme

Steps:
  1. Read light.json and dark.json from src/themes/
  2. Validate each against themeSchema (Zod)
  3. Resolve all token references in each file
  4. Generate src/styles/theme-generated.css
  5. Generate src/tokens/index.ts
  6. Write resolved JSONs to src/themes/resolved/ (for debugging)

Exit codes:
  0 — success
  1 — validation error (with detailed message)
  2 — unresolved reference (with path info)
  3 — circular reference detected
```

### Package.json Scripts

```json
{
  "scripts": {
    "build:theme": "tsx scripts/build-theme.ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

### Turborepo Integration

The `build:theme` script runs **before** typecheck and the Next.js build, since generated files need to exist for TypeScript compilation.

```json
// turbo.json (relevant task)
{
  "tasks": {
    "build:theme": {
      "inputs": ["packages/ui/src/themes/*.json"],
      "outputs": [
        "packages/ui/src/styles/theme-generated.css",
        "packages/ui/src/tokens/index.ts"
      ]
    }
  }
}
```

### Gitignore Policy

Generated files are **committed** (not gitignored) to avoid requiring the build step for consumers. The JSON source files are the source of truth, but generated output is checked in for deterministic builds.

---

## 11. Migration Plan

### Phase 1 — Schema + Validation (no visual changes)

1. Create `packages/contracts/src/schemas/theme.ts` with Zod schema
2. Create `packages/contracts/src/types/theme.ts` with inferred types
3. Export from contracts barrel
4. Unit tests for schema validation

**Tests**: Validate correct JSON passes, invalid JSON fails with clear errors, references are syntactically valid.

### Phase 2 — Resolver + Generators (no visual changes)

1. Create `packages/ui/src/theme/resolve.ts` — reference resolver
2. Create `packages/ui/src/theme/generate-css.ts` — CSS generator
3. Create `packages/ui/src/theme/generate-tokens.ts` — TS token generator
4. Create `packages/ui/src/theme/validate.ts` — validation wrapper
5. Create `packages/ui/scripts/build-theme.ts` — CLI orchestrator
6. Unit tests for resolver (references, cycles, depth limit, missing keys)
7. Unit tests for CSS generator (correct variable names, value mapping)

**Tests**: Resolver produces correct output from known input. Generator CSS matches expected snapshot.

### Phase 3 — Dark Theme JSON (replace current globals.css tokens)

1. Create `packages/ui/src/themes/dark.json` matching current `globals.css` values exactly
2. Run `build:theme` — verify generated CSS matches current `globals.css` token block
3. Update `globals.css` to import `theme-generated.css` instead of inline tokens
4. Visual regression: the app must look **identical** before and after

**Tests**: Snapshot test of generated CSS. Manual visual check. E2E smoke test passes.

### Phase 4 — Light Theme JSON + ThemeProvider

1. Create `packages/ui/src/themes/light.json` with light mode values
2. Create `ThemeProvider` + `useTheme` hook
3. Integrate ThemeProvider in `ui/app/layout.tsx`
4. Add a theme toggle component (button or switch in settings/header)
5. Test light/dark switching in browser

**Tests**: E2E test for theme toggle. Unit test for ThemeProvider state management.

### Phase 5 — Cleanup + Documentation

1. Remove inline token definitions from `globals.css` (already replaced by import)
2. Verify all existing components work in both modes
3. Update `packages/ui/AGENTS.md` with new theme workflow
4. Add `docs/architecture/theme-system.md`

---

## 12. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Zod schema in contracts | Follows project convention: contracts = source of truth for types and validation |
| Build-time reference resolution | Zero runtime overhead, simpler debugging, fails fast on invalid themes |
| `data-theme` attribute for mode | CSS-only switching, no JS framework dependency for applying styles, SSR-compatible |
| Two separate JSON files (light/dark) | Clearer separation, easier to diff, no nested mode objects |
| Generated files committed to git | Consumers don't need to run build:theme, deterministic CI |
| `@theme` block for Tailwind 4 | Matches existing pattern, tokens available as Tailwind utilities |
| No component-level config in V1 | Components already consume tokens via Tailwind classes — adding JSON config per component adds complexity without clear V1 value |
| Multi-tenant `tenantId` in schema only | Schema supports it, implementation deferred to V2 |

---

## 13. Trade-offs

### Prioritized

- **Simplicity**: Foundation tokens only, no component-level config in V1
- **Zero visual regression**: Dark theme JSON must produce identical output to current CSS
- **Existing component compatibility**: shadcn/ui components unchanged
- **Build-time safety**: Validation and resolution catch errors before deploy

### Sacrificed

- Component-level theming (deferred — can be added without breaking changes)
- Runtime theme loading from API (deferred to V2 multi-tenant)
- CSS-in-JS token consumption (uses CSS variables + Tailwind only)
- Theme inheritance/extension (V2 — one theme extends another)

---

## 14. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Generated CSS diverges from shadcn expectations | Components break visually | Mapping table is explicit; snapshot tests catch drift |
| Reference resolver has edge cases | Build fails or produces wrong values | Comprehensive unit tests; max depth = 5; cycle detection |
| Light theme values are wrong | Poor visual experience in light mode | Start with well-known light palette; visual QA pass |
| ThemeProvider flash of wrong theme | Brief visual glitch on page load | SSR default + immediate useEffect + future blocking script |
| Two JSON files drift apart (missing keys) | One mode has undefined tokens | Build script validates both files have identical key sets |
| Generated files out of sync with JSON | Stale tokens in production | CI step runs `build:theme` and fails if output differs from committed |

---

## 15. Multi-Tenant Preparation (V2)

The schema includes an optional `tenantId` field in metadata. The V2 architecture will:

1. Store theme JSON per tenant in Supabase (storage or jsonb column)
2. Load tenant theme at request time via middleware
3. Generate CSS on-the-fly or cache pre-generated CSS per tenant
4. ThemeProvider receives the resolved theme from server props

No V1 code needs to change — the JSON structure and CSS variable names remain stable.

---

## 16. Acceptance Criteria

1. A Zod schema in `@enterprise/contracts` validates the theme JSON structure
2. Two theme JSON files exist (`light.json`, `dark.json`) in `@enterprise/ui`
3. `pnpm --filter @enterprise/ui build:theme` generates CSS and TS tokens from JSON
4. The generated CSS produces **identical** visual output to the current `globals.css` for dark mode
5. Light mode renders correctly with appropriate colors
6. `ThemeProvider` enables runtime switching between light and dark modes
7. Theme preference persists in localStorage
8. All existing shadcn/ui components work unchanged in both modes
9. Build fails with clear error messages for invalid JSON, missing references, or circular references
10. `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass
11. E2E smoke test passes in both light and dark modes

---

## 17. File Inventory

### New Files

| File | Package | Purpose |
|------|---------|---------|
| `src/schemas/theme.ts` | contracts | Zod schema for theme validation |
| `src/types/theme.ts` | contracts | TypeScript types (inferred from Zod) |
| `src/themes/light.json` | ui | Light mode theme source |
| `src/themes/dark.json` | ui | Dark mode theme source |
| `src/theme/resolve.ts` | ui | Build-time reference resolver |
| `src/theme/generate-css.ts` | ui | Build-time CSS generator |
| `src/theme/generate-tokens.ts` | ui | Build-time TS token generator |
| `src/theme/validate.ts` | ui | Validation wrapper |
| `src/theme/provider.tsx` | ui | ThemeProvider + useTheme |
| `src/theme/context.ts` | ui | React context |
| `scripts/build-theme.ts` | ui | CLI build orchestrator |
| `src/styles/theme-generated.css` | ui | Auto-generated CSS (committed) |

### Modified Files

| File | Change |
|------|--------|
| `packages/ui/src/styles/globals.css` | Remove inline tokens, import `theme-generated.css` |
| `packages/ui/src/tokens/index.ts` | Replaced with auto-generated version |
| `packages/ui/package.json` | Add `build:theme` script, `tsx` dev dependency |
| `packages/ui/src/index.ts` | Export ThemeProvider and useTheme |
| `packages/contracts/src/index.ts` | Export theme schemas and types |
| `ui/app/layout.tsx` | Wrap with ThemeProvider, add `data-theme` |
| `ui/app/globals.css` | No changes needed (already imports from ui) |
| `turbo.json` | Add `build:theme` task |

### Deleted Files

None. The existing `tokens/index.ts` content is replaced, not deleted.

---

## 18. In One Sentence

> A build-time theme pipeline that validates JSON configs with Zod, resolves token references, and generates CSS custom properties + TypeScript exports — enabling light/dark switching via a ThemeProvider while keeping all existing shadcn/ui components unchanged.
