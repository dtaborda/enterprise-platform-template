# Theme System

The Enterprise Platform uses a **JSON-configurable theme system** that centralizes all visual tokens (colors, typography, spacing, radius, shadows, layout) behind validated JSON files.

## How It Works

```text
light.json + dark.json (source of truth)
       │
       ▼
  Zod validation (themeSchema from @enterprise/contracts)
       │
       ▼
  Reference resolution (build-time)
       │  e.g. "{colors.primitive.cyan600}" → "#0891B2"
       ▼
  Code generation
       ├── theme-generated.css   (CSS custom properties)
       └── tokens/index.ts       (TypeScript exports)
       │
       ▼
  globals.css imports theme-generated.css
       │
       ▼
  Components consume tokens via Tailwind classes (unchanged)
```

Everything happens at **build time** — zero runtime overhead for token resolution. Runtime switching between light and dark modes uses a CSS `[data-theme]` selector and a React `ThemeProvider`.

## File Map

| What | Where |
|------|-------|
| Zod schema | `packages/contracts/src/schemas/theme.ts` |
| TypeScript types | `packages/contracts/src/types/theme.ts` |
| Light theme JSON | `packages/ui/src/themes/light.json` |
| Dark theme JSON | `packages/ui/src/themes/dark.json` |
| Reference resolver | `packages/ui/src/theme/resolve.ts` |
| CSS generator | `packages/ui/src/theme/generate-css.ts` |
| TS token generator | `packages/ui/src/theme/generate-tokens.ts` |
| Validation wrapper | `packages/ui/src/theme/validate.ts` |
| Build script | `packages/ui/scripts/build-theme.ts` |
| Generated CSS | `packages/ui/src/styles/theme-generated.css` |
| Generated TS tokens | `packages/ui/src/tokens/index.ts` |
| ThemeProvider | `packages/ui/src/theme/provider.tsx` |
| ThemeToggle | `packages/ui/src/theme/toggle.tsx` |

## Theme JSON Structure

Each theme file (`light.json`, `dark.json`) has three sections:

### metadata

```json
{
  "metadata": {
    "name": "Enterprise Dark",
    "version": "1.0.0",
    "mode": "dark",
    "description": "Dark theme for the Enterprise Platform"
  }
}
```

- `name` — human-readable theme name
- `version` — semver string, for future schema evolution
- `mode` — `"light"` or `"dark"`
- `description` — optional
- `tenantId` — optional UUID, reserved for future multi-tenant theming

### foundations

Contains all design tokens organized by category:

```json
{
  "foundations": {
    "colors": {
      "primitive": {
        "cyan400": "#22D3EE",
        "navy900": "#212529"
      },
      "semantic": {
        "primary": "{colors.primitive.cyan600}",
        "background": "{colors.primitive.white}",
        "foreground": "{colors.primitive.navy900}"
      }
    },
    "typography": {
      "fontFamily": { "sans": "Inter, ui-sans-serif, system-ui, sans-serif" },
      "fontSize": { "sm": "0.875rem", "base": "1rem" },
      "fontWeight": { "normal": 400, "bold": 700 },
      "lineHeight": { "normal": 1.5, "tight": 1.25 }
    },
    "spacing": { "0": "0px", "1": "4px", "4": "16px" },
    "sizing": { "sm": "640px", "lg": "1024px" },
    "radius": { "sm": "0.25rem", "md": "0.5rem", "full": "9999px" },
    "shadows": { "sm": "0 1px 3px rgba(0,0,0,0.1)" },
    "borders": { "thin": "1px", "thick": "2px" },
    "breakpoints": { "sm": "640px", "lg": "1024px" },
    "zIndex": { "dropdown": 1000, "modal": 1300 }
  }
}
```

**Primitive colors** are raw hex values. **Semantic colors** can be raw hex or references to other tokens using `{path.to.token}` syntax (resolved at build time).

### layout

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

## Token References

Semantic tokens can reference other tokens using `{section.subsection.key}` syntax. References are anchored to `foundations.*`:

```json
{
  "primary": "{colors.primitive.cyan600}",
  "ring": "{colors.semantic.primary}",
  "paddingX": "{spacing.4}"
}
```

References can **chain** (semantic → semantic → primitive) up to 5 levels deep. The build script detects circular references and fails with a clear error.

## Generated CSS

The build script produces `theme-generated.css` with two blocks:

```css
/* @theme block — light mode defaults (Tailwind 4 convention) */
@theme {
  --color-background: #ffffff;
  --color-primary: #0891b2;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-md: 0.5rem;
  --sidebar-width: 256px;
  /* ... all tokens ... */
}

/* Dark mode — overrides ONLY color tokens */
[data-theme="dark"] {
  --color-background: #111318;
  --color-primary: #00e5ff;
  /* ... color overrides only ... */
}
```

Typography, radius, spacing, shadows, and layout tokens are **mode-independent** — defined once in `@theme`. Only color tokens change between modes.

The motion token `--animate-fade-in-up` stays in `globals.css` (not generated) because it references `@keyframes`.

## Modifying a Theme

### Change an existing token

1. Edit the value in `packages/ui/src/themes/light.json` and/or `dark.json`
2. Run `pnpm --filter @enterprise/ui build:theme`
3. Verify the generated CSS looks correct
4. Commit the JSON files AND the generated files

### Add a new color token

1. Add the primitive color in `colors.primitive` (both files must have the same keys)
2. Add the semantic reference in `colors.semantic`
3. Run `pnpm --filter @enterprise/ui build:theme`
4. The new `--color-your-token` CSS variable is now available as a Tailwind class `bg-your-token`

### Add a new token category

The Zod schema in `packages/contracts/src/schemas/theme.ts` defines the structure. To add a new category:

1. Add the Zod sub-schema in `theme.ts`
2. Add the category to `themeFoundationsSchema`
3. Update `generate-css.ts` to emit the new category
4. Update `generate-tokens.ts` to export the new tokens
5. Add the category to both JSON files

## Light/Dark Switching

### ThemeProvider

Wrap your app with `ThemeProvider` (already done in `ui/app/layout.tsx`):

```tsx
import { ThemeProvider } from "@enterprise/ui";

<html data-theme="dark" suppressHydrationWarning>
  <body>
    <ThemeProvider defaultMode="dark">
      {children}
    </ThemeProvider>
  </body>
</html>
```

- `defaultMode` — SSR default, must match `data-theme` on `<html>`
- `storageKey` — localStorage key (default: `"enterprise-theme-mode"`)
- `suppressHydrationWarning` — prevents React warning when client hydrates a different mode

### useTheme Hook

```tsx
import { useTheme } from "@enterprise/ui";

function MyComponent() {
  const { mode, setMode, toggleMode } = useTheme();

  return (
    <div>
      <p>Current: {mode}</p>
      <button onClick={toggleMode}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
    </div>
  );
}
```

### ThemeToggle Component

A ready-made toggle button with Sun/Moon icons:

```tsx
import { ThemeToggle } from "@enterprise/ui";

// Renders a button that switches between light and dark
<ThemeToggle />
```

### How Switching Works

1. `ThemeProvider` sets `data-theme` attribute on `<html>`
2. The CSS selector `[data-theme="dark"]` overrides the `@theme` color variables
3. Tailwind utilities (`bg-primary`, `text-foreground`) automatically pick up new values
4. Preference is persisted in `localStorage`

## Build Pipeline

### Command

```bash
pnpm --filter @enterprise/ui build:theme
```

### Steps

1. Reads `light.json` and `dark.json` from `src/themes/`
2. Validates each against `themeSchema` (Zod)
3. Verifies both files have identical semantic key sets
4. Resolves all `{ref}` references in each file
5. Generates `src/styles/theme-generated.css`
6. Generates `src/tokens/index.ts`
7. Writes resolved JSONs to `src/themes/resolved/` (debugging)

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Zod validation error or key mismatch between files |
| 2 | Unresolved reference (missing token) |
| 3 | Circular reference detected |

### Turborepo Integration

`build:theme` runs **before** `typecheck` and `build` in the Turborepo pipeline. It is cached based on `src/themes/*.json` inputs.

### Generated Files Policy

Generated files (`theme-generated.css`, `tokens/index.ts`) are **committed to git**. This ensures:

- Consumers do not need to run `build:theme` to use the library
- CI builds are deterministic
- Changes are visible in pull request diffs

**Never edit generated files manually** — edit the JSON source files and regenerate.

## Schema Validation

The Zod schema in `@enterprise/contracts` validates:

- `metadata.version` is valid semver
- `metadata.mode` is `"light"` or `"dark"`
- Primitive colors are valid hex (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`)
- `fontWeight` and `zIndex` values are numbers (not strings)
- Layout container fields are present
- Sidebar is optional

```typescript
import { themeSchema } from "@enterprise/contracts";
import type { ThemeConfig, ThemeMode } from "@enterprise/contracts";

// Validate unknown JSON
const result = themeSchema.safeParse(jsonData);
if (!result.success) {
  console.error(result.error.flatten());
}
```

## Semantic Token → CSS Variable Mapping

JSON semantic keys use camelCase. The generator converts to kebab-case CSS variables:

| JSON key | CSS variable | Tailwind class |
|----------|-------------|----------------|
| `background` | `--color-background` | `bg-background` |
| `foreground` | `--color-foreground` | `text-foreground` |
| `primary` | `--color-primary` | `bg-primary` |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `card` | `--color-card` | `bg-card` |
| `cardForeground` | `--color-card-foreground` | `text-card-foreground` |
| `destructive` | `--color-destructive` | `bg-destructive` |
| `muted` | `--color-muted` | `bg-muted` |
| `mutedForeground` | `--color-muted-foreground` | `text-muted-foreground` |
| `border` | `--color-border` | `border-border` |
| `ring` | `--color-ring` | `ring-ring` |
| `surfaceDim` | `--color-surface-dim` | `bg-surface-dim` |
| `surfaceContainerLow` | `--color-surface-container-low` | `bg-surface-container-low` |

Extended tokens (Material Design 3 hierarchy):

| JSON key | CSS variable |
|----------|-------------|
| `primaryFixed` | `--color-primary-fixed` |
| `primaryFixedDim` | `--color-primary-fixed-dim` |
| `primaryContainer` | `--color-primary-container` |
| `onPrimaryContainer` | `--color-on-primary-container` |
| `secondaryContainer` | `--color-secondary-container` |
| `tertiary` | `--color-tertiary` |
| `error` | `--color-error` |
| `errorContainer` | `--color-error-container` |
| `outline` | `--color-outline` |
| `inverseSurface` | `--color-inverse-surface` |

## Future: Multi-Tenant Theming (V2)

The schema includes an optional `tenantId` field. The V2 architecture will:

1. Store theme JSON per tenant in Supabase
2. Load at request time via middleware
3. Generate CSS per tenant (cached)
4. No V1 code changes needed — the JSON structure and CSS variable names are stable
