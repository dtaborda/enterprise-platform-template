import type { ResolvedTheme, ThemeConfig } from "@enterprise/contracts";

// ============================================================================
// Constants
// ============================================================================

/** Maximum reference resolution depth before throwing a cycle/depth error */
const MAX_DEPTH = 5;

/** Regex to detect a {ref} token pattern */
const REF_PATTERN = /^\{([^}]+)\}$/;

// ============================================================================
// Error
// ============================================================================

export class ThemeResolutionError extends Error {
  /** The dot-path of the token that caused the error */
  readonly path: string;
  /** The reference string that could not be resolved */
  readonly reference: string;

  constructor(message: string, path: string, reference: string) {
    super(message);
    this.name = "ThemeResolutionError";
    this.path = path;
    this.reference = reference;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Build a flat lookup map of all resolvable string values from the theme.
 * Keys use dot-notation anchored to `foundations.*` or `layout.*`.
 */
function buildTokenMap(theme: ThemeConfig): Map<string, string> {
  const map = new Map<string, string>();

  // colors.primitive.*
  for (const [key, val] of Object.entries(theme.foundations.colors.primitive)) {
    map.set(`colors.primitive.${key}`, val);
  }

  // colors.semantic.*
  for (const [key, val] of Object.entries(theme.foundations.colors.semantic)) {
    map.set(`colors.semantic.${key}`, val);
  }

  // spacing.*
  for (const [key, val] of Object.entries(theme.foundations.spacing)) {
    map.set(`spacing.${key}`, val);
  }

  // sizing.*
  for (const [key, val] of Object.entries(theme.foundations.sizing)) {
    map.set(`sizing.${key}`, val);
  }

  // radius.*
  for (const [key, val] of Object.entries(theme.foundations.radius)) {
    map.set(`radius.${key}`, val);
  }

  // shadows.*
  for (const [key, val] of Object.entries(theme.foundations.shadows)) {
    map.set(`shadows.${key}`, val);
  }

  // borders.*
  for (const [key, val] of Object.entries(theme.foundations.borders)) {
    map.set(`borders.${key}`, val);
  }

  // breakpoints.*
  for (const [key, val] of Object.entries(theme.foundations.breakpoints)) {
    map.set(`breakpoints.${key}`, val);
  }

  // typography.fontFamily.*
  for (const [key, val] of Object.entries(theme.foundations.typography.fontFamily)) {
    map.set(`typography.fontFamily.${key}`, val);
  }

  // typography.fontSize.*
  for (const [key, val] of Object.entries(theme.foundations.typography.fontSize)) {
    map.set(`typography.fontSize.${key}`, val);
  }

  // layout.container.*
  map.set("layout.container.maxWidth", theme.layout.container.maxWidth);
  map.set("layout.container.paddingX", theme.layout.container.paddingX);
  map.set("layout.container.paddingXMobile", theme.layout.container.paddingXMobile);
  map.set("layout.container.sectionGap", theme.layout.container.sectionGap);

  // layout.sidebar.*
  if (theme.layout.sidebar) {
    map.set("layout.sidebar.width", theme.layout.sidebar.width);
    map.set("layout.sidebar.widthCollapsed", theme.layout.sidebar.widthCollapsed);
  }

  return map;
}

/**
 * Resolve a single token value, following references recursively.
 * Throws ThemeResolutionError if:
 *   - The reference target is not found
 *   - A circular dependency is detected
 *   - The resolution depth exceeds MAX_DEPTH
 */
function resolveValue(
  value: string,
  tokenPath: string,
  tokenMap: Map<string, string>,
  visiting: Set<string>,
  depth: number,
): string {
  // Plain value — return as-is
  const refMatch = REF_PATTERN.exec(value);
  if (!refMatch) return value;

  // refMatch[1] is guaranteed by the regex capture group — assert string
  const refKey = refMatch[1] as string;

  // Depth guard — throw before recursing deeper
  if (depth >= MAX_DEPTH) {
    throw new ThemeResolutionError(
      `Maximum reference depth (${MAX_DEPTH}) exceeded at "${tokenPath}" → "${value}"`,
      tokenPath,
      value,
    );
  }

  // Circular reference guard
  if (visiting.has(refKey)) {
    throw new ThemeResolutionError(
      `Circular reference detected: "${refKey}" is already being resolved (path: "${tokenPath}")`,
      tokenPath,
      value,
    );
  }

  // Missing reference guard
  const target = tokenMap.get(refKey);
  if (target === undefined) {
    throw new ThemeResolutionError(
      `Unresolved reference "{${refKey}}" at "${tokenPath}" — token not found`,
      tokenPath,
      refKey,
    );
  }

  visiting.add(refKey);
  const resolved = resolveValue(target, refKey, tokenMap, visiting, depth + 1);
  visiting.delete(refKey);

  // Update map for memoization (avoids redundant re-resolution)
  tokenMap.set(refKey, resolved);

  return resolved;
}

/**
 * Resolve all {ref} tokens in a string record.
 */
function resolveStringRecord(
  record: Record<string, string>,
  prefix: string,
  tokenMap: Map<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const tokenPath = `${prefix}.${key}`;
    result[key] = resolveValue(value, tokenPath, tokenMap, new Set([`${prefix}.${key}`]), 1);
  }
  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve all `{path.to.token}` references in a ThemeConfig, returning a
 * ResolvedTheme where every string value is a concrete resolved value.
 *
 * Reference paths are anchored to `foundations.*` and `layout.*`.
 * Supports depth up to MAX_DEPTH (5). Circular references and missing
 * references throw ThemeResolutionError.
 */
export function resolveReferences(theme: ThemeConfig): ResolvedTheme {
  const tokenMap = buildTokenMap(theme);

  // Resolve semantic colors (may reference primitives or other semantics)
  const resolvedSemantic = resolveStringRecord(
    theme.foundations.colors.semantic,
    "colors.semantic",
    tokenMap,
  );

  // Resolve layout container fields
  const resolvedContainerMaxWidth = resolveValue(
    theme.layout.container.maxWidth,
    "layout.container.maxWidth",
    tokenMap,
    new Set(["layout.container.maxWidth"]),
    1,
  );
  const resolvedContainerPaddingX = resolveValue(
    theme.layout.container.paddingX,
    "layout.container.paddingX",
    tokenMap,
    new Set(["layout.container.paddingX"]),
    1,
  );
  const resolvedContainerPaddingXMobile = resolveValue(
    theme.layout.container.paddingXMobile,
    "layout.container.paddingXMobile",
    tokenMap,
    new Set(["layout.container.paddingXMobile"]),
    1,
  );
  const resolvedContainerSectionGap = resolveValue(
    theme.layout.container.sectionGap,
    "layout.container.sectionGap",
    tokenMap,
    new Set(["layout.container.sectionGap"]),
    1,
  );

  // Resolve sidebar if present
  let resolvedSidebar: ResolvedTheme["layout"]["sidebar"];
  if (theme.layout.sidebar) {
    resolvedSidebar = {
      width: resolveValue(
        theme.layout.sidebar.width,
        "layout.sidebar.width",
        tokenMap,
        new Set(["layout.sidebar.width"]),
        1,
      ),
      widthCollapsed: resolveValue(
        theme.layout.sidebar.widthCollapsed,
        "layout.sidebar.widthCollapsed",
        tokenMap,
        new Set(["layout.sidebar.widthCollapsed"]),
        1,
      ),
    };
  }

  return {
    metadata: { ...theme.metadata },
    foundations: {
      colors: {
        primitive: { ...theme.foundations.colors.primitive },
        semantic: resolvedSemantic,
      },
      typography: {
        fontFamily: { ...theme.foundations.typography.fontFamily },
        fontSize: { ...theme.foundations.typography.fontSize },
        fontWeight: { ...theme.foundations.typography.fontWeight },
        lineHeight: { ...theme.foundations.typography.lineHeight },
      },
      spacing: { ...theme.foundations.spacing },
      sizing: { ...theme.foundations.sizing },
      radius: { ...theme.foundations.radius },
      shadows: { ...theme.foundations.shadows },
      borders: { ...theme.foundations.borders },
      breakpoints: { ...theme.foundations.breakpoints },
      zIndex: { ...theme.foundations.zIndex },
    },
    layout: {
      container: {
        maxWidth: resolvedContainerMaxWidth,
        paddingX: resolvedContainerPaddingX,
        paddingXMobile: resolvedContainerPaddingXMobile,
        sectionGap: resolvedContainerSectionGap,
      },
      sidebar: resolvedSidebar,
    },
  };
}
