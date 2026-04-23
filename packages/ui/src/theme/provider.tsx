"use client";

import type { ThemeMode } from "@enterprise/contracts";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "./context";

// ============================================================================
// ThemeProvider
// ============================================================================

export interface ThemeProviderProps {
  children?: React.ReactNode;
  /** Initial theme mode before localStorage hydration. Defaults to "dark". */
  defaultMode?: ThemeMode;
  /** localStorage key for persisting the theme preference. */
  storageKey?: string;
}

/**
 * ThemeProvider — wraps the application and provides theme context.
 *
 * Behaviour:
 * - Initializes mode from defaultMode prop
 * - On mount, reads localStorage to hydrate the stored preference
 * - Syncs data-theme attribute on document.documentElement on every mode change
 * - Persists mode to localStorage via setMode
 */
export function ThemeProvider({
  children,
  defaultMode = "dark",
  storageKey = "enterprise-theme-mode",
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  // Hydrate from localStorage and set initial data-theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeMode | null;
    const resolved = stored ?? defaultMode;

    if (resolved !== mode) {
      setModeState(resolved);
    }

    document.documentElement.setAttribute("data-theme", resolved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data-theme attribute whenever mode changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  }

  function toggleMode() {
    setMode(mode === "dark" ? "light" : "dark");
  }

  return <ThemeContext value={{ mode, setMode, toggleMode }}>{children}</ThemeContext>;
}

// ============================================================================
// useTheme hook
// ============================================================================

/**
 * Returns the current ThemeContextValue.
 * Must be used inside a ThemeProvider — throws if context is null.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
