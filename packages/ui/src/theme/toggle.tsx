"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./provider";

// ============================================================================
// ThemeToggle
// ============================================================================

/**
 * ThemeToggle — a button that switches between light and dark modes.
 *
 * Renders:
 * - Moon icon when in light mode (clicking switches to dark)
 * - Sun icon when in dark mode (clicking switches to light)
 *
 * Must be used inside a ThemeProvider.
 */
export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleMode}
      className="inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
