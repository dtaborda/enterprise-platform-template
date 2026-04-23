#!/usr/bin/env tsx
/**
 * build-theme.ts — Theme build pipeline
 *
 * Reads light.json and dark.json from src/themes/, validates them,
 * resolves token references, then generates:
 *   - src/styles/theme-generated.css  (CSS custom properties)
 *   - src/tokens/index.ts             (TypeScript token exports)
 *   - src/themes/resolved/light.json  (resolved light theme JSON)
 *   - src/themes/resolved/dark.json   (resolved dark theme JSON)
 *
 * Exit codes:
 *   0 — success
 *   1 — validation failure (Zod or structural mismatch)
 *   2 — resolution failure (light theme)
 *   3 — resolution failure (dark theme)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";

import { generateCSS } from "../src/theme/generate-css";
import { generateTokens } from "../src/theme/generate-tokens";
import { resolveReferences, ThemeResolutionError } from "../src/theme/resolve";
import { validateTheme, validateThemeStructure } from "../src/theme/validate";

// ============================================================================
// Path resolution
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..");

const THEMES_DIR = join(PACKAGE_ROOT, "src", "themes");
const RESOLVED_DIR = join(THEMES_DIR, "resolved");
const STYLES_DIR = join(PACKAGE_ROOT, "src", "styles");
const TOKENS_DIR = join(PACKAGE_ROOT, "src", "tokens");

// ============================================================================
// Helpers
// ============================================================================

function readJsonFile(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as unknown;
  } catch (err) {
    console.error(`[build-theme] Error reading ${filePath}:`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

console.log("[build-theme] Starting theme build pipeline...");

// ── Step 1: Read JSON files ───────────────────────────────────────────────────
const lightPath = join(THEMES_DIR, "light.json");
const darkPath = join(THEMES_DIR, "dark.json");

console.log(`[build-theme] Reading ${lightPath}`);
const lightJson = readJsonFile(lightPath);

console.log(`[build-theme] Reading ${darkPath}`);
const darkJson = readJsonFile(darkPath);

// ── Step 2: Validate each theme ──────────────────────────────────────────────
let lightTheme: ReturnType<typeof validateTheme>;
let darkTheme: ReturnType<typeof validateTheme>;

try {
  lightTheme = validateTheme(lightJson);
  console.log("[build-theme] ✓ light.json is valid");
} catch (err) {
  console.error("[build-theme] ✗ light.json validation failed:");
  if (err instanceof ZodError) {
    for (const issue of err.issues) {
      console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
    }
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
}

try {
  darkTheme = validateTheme(darkJson);
  console.log("[build-theme] ✓ dark.json is valid");
} catch (err) {
  console.error("[build-theme] ✗ dark.json validation failed:");
  if (err instanceof ZodError) {
    for (const issue of err.issues) {
      console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
    }
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
}

// ── Step 3: Validate structural parity ──────────────────────────────────────
try {
  validateThemeStructure(lightTheme, darkTheme);
  console.log("[build-theme] ✓ Semantic key parity check passed");
} catch (err) {
  console.error("[build-theme] ✗ Theme structure mismatch:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

// ── Step 4: Resolve references ───────────────────────────────────────────────
let resolvedLight: ReturnType<typeof resolveReferences>;
let resolvedDark: ReturnType<typeof resolveReferences>;

try {
  resolvedLight = resolveReferences(lightTheme);
  console.log("[build-theme] ✓ light.json references resolved");
} catch (err) {
  console.error("[build-theme] ✗ Light theme resolution failed:");
  if (err instanceof ThemeResolutionError) {
    console.error(`  Path: ${err.path}`);
    console.error(`  Reference: ${err.reference}`);
    console.error(`  Message: ${err.message}`);
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(2);
}

try {
  resolvedDark = resolveReferences(darkTheme);
  console.log("[build-theme] ✓ dark.json references resolved");
} catch (err) {
  console.error("[build-theme] ✗ Dark theme resolution failed:");
  if (err instanceof ThemeResolutionError) {
    console.error(`  Path: ${err.path}`);
    console.error(`  Reference: ${err.reference}`);
    console.error(`  Message: ${err.message}`);
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exit(3);
}

// ── Step 5: Generate outputs ─────────────────────────────────────────────────
mkdirSync(RESOLVED_DIR, { recursive: true });
mkdirSync(STYLES_DIR, { recursive: true });
mkdirSync(TOKENS_DIR, { recursive: true });

// 5a. Write resolved JSONs (trailing newline for consistent biome formatting)
const resolvedLightPath = join(RESOLVED_DIR, "light.json");
writeFileSync(resolvedLightPath, `${JSON.stringify(resolvedLight, null, 2)}\n`, "utf-8");
console.log(`[build-theme] ✓ Written: ${resolvedLightPath}`);

const resolvedDarkPath = join(RESOLVED_DIR, "dark.json");
writeFileSync(resolvedDarkPath, `${JSON.stringify(resolvedDark, null, 2)}\n`, "utf-8");
console.log(`[build-theme] ✓ Written: ${resolvedDarkPath}`);

// 5b. Generate and write CSS
const generatedCssPath = join(STYLES_DIR, "theme-generated.css");
const css = generateCSS(resolvedLight, resolvedDark);
writeFileSync(generatedCssPath, css, "utf-8");
console.log(`[build-theme] ✓ Written: ${generatedCssPath}`);

// 5c. Generate and write TypeScript tokens
const tokensPath = join(TOKENS_DIR, "index.ts");
const tsTokens = generateTokens(resolvedLight);
writeFileSync(tokensPath, tsTokens, "utf-8");
console.log(`[build-theme] ✓ Written: ${tokensPath}`);

// ── Done ──────────────────────────────────────────────────────────────────────
console.log("[build-theme] Theme build complete.");
process.exit(0);
