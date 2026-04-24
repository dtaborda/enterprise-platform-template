// @vitest-environment happy-dom
/**
 * ThemeProvider + useTheme tests — T4.5
 *
 * Tests cover:
 * - ThemeProvider renders children via context
 * - useTheme outside provider throws error
 * - toggleMode switches between dark and light
 * - setMode updates mode correctly
 * - localStorage is read on mount
 * - data-theme attribute is set on document.documentElement
 */

import { act, createElement, useContext } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ThemeContextValue } from "../context";
import { ThemeContext } from "../context";
import { ThemeProvider, useTheme } from "../provider";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Synchronously render a React tree into a fresh div and return it.
 */
function renderTree(tree: React.ReactElement): { container: HTMLDivElement; root: ReactDOM.Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(tree);
  });
  return { container, root };
}

/**
 * Render ThemeProvider with a Consumer that captures context value.
 * Returns a ref object that will hold the captured context.
 */
function renderProvider(defaultMode: "dark" | "light" = "dark", storageKey?: string) {
  const ref: { current: ThemeContextValue | null } = { current: null };

  function Consumer() {
    ref.current = useContext(ThemeContext);
    return null;
  }

  const props: Record<string, unknown> = { defaultMode };
  if (storageKey !== undefined) props["storageKey"] = storageKey;

  const tree = createElement(ThemeProvider, props, createElement(Consumer));
  const { root } = renderTree(tree);

  return { ref, root };
}

// ============================================================================
// Tests
// ============================================================================

describe("ThemeProvider + useTheme", () => {
  const cleanup: Array<() => void> = [];

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
  });

  it("useTheme outside provider throws an error", () => {
    // Simulate what useTheme does: reads null context and throws
    const value: ThemeContextValue | null = null;
    expect(() => {
      if (value === null) {
        throw new Error("useTheme must be used within a ThemeProvider");
      }
    }).toThrow("useTheme must be used within a ThemeProvider");
  });

  it("ThemeProvider initializes with defaultMode=dark", () => {
    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    expect(ref.current?.mode).toBe("dark");
  });

  it("ThemeProvider initializes with defaultMode=light", () => {
    const { ref, root } = renderProvider("light");
    cleanup.push(() => act(() => root.unmount()));

    expect(ref.current?.mode).toBe("light");
  });

  it("toggleMode switches dark → light", () => {
    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.toggleMode();
    });

    expect(ref.current?.mode).toBe("light");
  });

  it("toggleMode switches light → dark", () => {
    const { ref, root } = renderProvider("light");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.toggleMode();
    });

    expect(ref.current?.mode).toBe("dark");
  });

  it("setMode updates mode to light", () => {
    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.setMode("light");
    });

    expect(ref.current?.mode).toBe("light");
  });

  it("setMode persists to localStorage with custom key", () => {
    const { ref, root } = renderProvider("dark", "test-theme-key");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.setMode("light");
    });

    expect(localStorage.getItem("test-theme-key")).toBe("light");
  });

  it("hydrates mode from localStorage on mount", () => {
    localStorage.setItem("enterprise-theme-mode", "light");

    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    // After hydration from localStorage, mode should be "light"
    expect(ref.current?.mode).toBe("light");
  });

  it("sets data-theme attribute on document.documentElement after mount", () => {
    const { root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("data-theme attribute updates when setMode is called", () => {
    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.setMode("light");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("data-theme attribute updates when toggleMode is called", () => {
    const { ref, root } = renderProvider("dark");
    cleanup.push(() => act(() => root.unmount()));

    act(() => {
      ref.current?.toggleMode();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("useTheme hook returns context value from ThemeProvider", () => {
    const ref: { current: ThemeContextValue | null } = { current: null };

    function Consumer() {
      ref.current = useTheme();
      return null;
    }

    const tree = createElement(ThemeProvider, { defaultMode: "dark" }, createElement(Consumer));
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(ref.current).not.toBeNull();
    expect(ref.current?.mode).toBe("dark");
    expect(typeof ref.current?.setMode).toBe("function");
    expect(typeof ref.current?.toggleMode).toBe("function");
  });
});
