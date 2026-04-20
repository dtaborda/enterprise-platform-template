// Design system tokens - Abstract tokens for the platform
// These should be overridden by domain-specific apps via CSS variables

/** Color tokens - semantic naming */
export const colors = {
  // Backgrounds
  background: {
    primary: "var(--color-background-primary)",
    secondary: "var(--color-background-secondary)",
    muted: "var(--color-background-muted)",
    inverse: "var(--color-background-inverse)",
  },
  // Foreground / Text
  foreground: {
    primary: "var(--color-foreground-primary)",
    secondary: "var(--color-foreground-secondary)",
    muted: "var(--color-foreground-muted)",
    inverse: "var(--color-foreground-inverse)",
  },
  // Accent / Brand
  accent: {
    primary: "var(--color-accent-primary)",
    primaryHover: "var(--color-accent-primary-hover)",
    primaryMuted: "var(--color-accent-primary-muted)",
  },
  // Semantic
  semantic: {
    success: "var(--color-semantic-success)",
    warning: "var(--color-semantic-warning)",
    error: "var(--color-semantic-error)",
    info: "var(--color-semantic-info)",
  },
  // Borders
  border: {
    default: "var(--color-border-default)",
    muted: "var(--color-border-muted)",
    focus: "var(--color-border-focus)",
  },
} as const;

/** Typography tokens */
export const typography = {
  // Font families
  fontFamily: {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
    display: "var(--font-display)",
  },
  // Font sizes
  fontSize: {
    xs: "var(--font-size-xs)",
    sm: "var(--font-size-sm)",
    base: "var(--font-size-base)",
    lg: "var(--font-size-lg)",
    xl: "var(--font-size-xl)",
    "2xl": "var(--font-size-2xl)",
    "3xl": "var(--font-size-3xl)",
    "4xl": "var(--font-size-4xl)",
  },
  // Font weights
  fontWeight: {
    normal: "var(--font-weight-normal)",
    medium: "var(--font-weight-medium)",
    semibold: "var(--font-weight-semibold)",
    bold: "var(--font-weight-bold)",
  },
  // Line heights
  lineHeight: {
    tight: "var(--line-height-tight)",
    normal: "var(--line-height-normal)",
    relaxed: "var(--line-height-relaxed)",
  },
  // Letter spacing
  letterSpacing: {
    tight: "var(--letter-spacing-tight)",
    normal: "var(--letter-spacing-normal)",
    wide: "var(--letter-spacing-wide)",
  },
} as const;

/** Spacing tokens */
export const spacing = {
  0: "var(--spacing-0)",
  1: "var(--spacing-1)",
  2: "var(--spacing-2)",
  3: "var(--spacing-3)",
  4: "var(--spacing-4)",
  5: "var(--spacing-5)",
  6: "var(--spacing-6)",
  8: "var(--spacing-8)",
  10: "var(--spacing-10)",
  12: "var(--spacing-12)",
  16: "var(--spacing-16)",
  20: "var(--spacing-20)",
  24: "var(--spacing-24)",
  32: "var(--spacing-32)",
  40: "var(--spacing-40)",
  48: "var(--spacing-48)",
  64: "var(--spacing-64)",
} as const;

/** Border radius tokens */
export const radius = {
  none: "var(--radius-none)",
  sm: "var(--radius-sm)",
  base: "var(--radius-base)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  full: "var(--radius-full)",
} as const;

/** Shadow tokens */
export const shadows = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  base: "var(--shadow-base)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
  "2xl": "var(--shadow-2xl)",
} as const;

/** Z-index tokens */
export const zIndex = {
  0: "var(--z-index-0)",
  10: "var(--z-index-10)",
  20: "var(--z-index-20)",
  30: "var(--z-index-30)",
  40: "var(--z-index-40)",
  50: "var(--z-index-50)",
  dropdown: "var(--z-index-dropdown)",
  sticky: "var(--z-index-sticky)",
  modal: "var(--z-index-modal)",
  popover: "var(--z-index-popover)",
  tooltip: "var(--z-index-tooltip)",
} as const;

/** Animation tokens */
export const animation = {
  duration: {
    fast: "var(--animation-duration-fast)",
    normal: "var(--animation-duration-normal)",
    slow: "var(--animation-duration-slow)",
  },
  easing: {
    default: "var(--animation-easing-default)",
    in: "var(--animation-easing-in)",
    out: "var(--animation-easing-out)",
    bounce: "var(--animation-easing-bounce)",
  },
} as const;

/** Breakpoints (for reference) */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/** Export all tokens as flat object */
export const tokens = {
  ...colors,
  ...typography,
  ...spacing,
  ...radius,
  ...shadows,
  ...zIndex,
  ...animation,
  ...breakpoints,
} as const;
