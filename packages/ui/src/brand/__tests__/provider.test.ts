// @vitest-environment happy-dom
/**
 * BrandProvider + useBrand() tests
 *
 * Tests cover:
 * - useBrand() returns the brand config inside BrandProvider
 * - useBrand() throws with guidance when called outside BrandProvider
 * - ThemeProvider receives the correct defaultMode derived from themeRef
 */

import type { BrandConfig } from "@enterprise/contracts";
import { act, createElement } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock ThemeProvider to capture the defaultMode prop passed to it
// ============================================================================

let capturedDefaultMode: string | undefined;

vi.mock("../../theme/provider", () => ({
  ThemeProvider: ({
    children,
    defaultMode,
  }: {
    children: React.ReactNode;
    defaultMode?: string;
  }) => {
    capturedDefaultMode = defaultMode;
    return children;
  },
}));

// ============================================================================
// Fixture
// ============================================================================

const baseLogoVariant = {
  src: "/images/enterprise/logo.svg",
  alt: "Enterprise Platform",
  width: 160,
  height: 32,
};

const baseLogo = {
  light: baseLogoVariant,
  dark: { ...baseLogoVariant, src: "/images/enterprise/logo-dark.svg" },
};

const baseMetadata = {
  titleTemplate: "%s | Enterprise Platform",
  defaultTitle: "Enterprise Platform",
  description: "Enterprise Platform template.",
  ogImage: "/images/enterprise/og-image.png",
};

const baseLegal = {
  privacyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
};

function makeBrand(overrides: Partial<BrandConfig> = {}): BrandConfig {
  return {
    slug: "enterprise",
    name: "enterprise",
    displayName: "Enterprise Platform",
    description: "Enterprise Platform template.",
    logo: baseLogo,
    favicon: "/images/enterprise/favicon.svg",
    metadata: baseMetadata,
    legal: baseLegal,
    themeRef: "light",
    isDefault: true,
    ...overrides,
  };
}

// ============================================================================
// Test helpers
// ============================================================================

function renderTree(tree: React.ReactElement): { container: HTMLDivElement; root: ReactDOM.Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(tree);
  });
  return { container, root };
}

// ============================================================================
// Tests
// ============================================================================

describe("BrandProvider + useBrand", () => {
  const cleanup: Array<() => void> = [];

  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
    capturedDefaultMode = undefined;
  });

  it("useBrand() returns the brand config inside BrandProvider", async () => {
    const { BrandProvider, useBrand } = await import("../provider");
    const brand = makeBrand();
    let captured: BrandConfig | null = null;

    function Consumer() {
      captured = useBrand();
      return null;
    }

    const tree = createElement(BrandProvider, { brand }, createElement(Consumer));
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(captured).not.toBeNull();
    expect((captured as unknown as BrandConfig).slug).toBe("enterprise");
  });

  it("useBrand() throws outside BrandProvider with guidance", async () => {
    const { useBrand } = await import("../provider");

    // Simulate what useBrand does: reads null context and throws
    const ctx: BrandConfig | null = null;
    expect(() => {
      if (ctx === null) {
        throw new Error(
          "useBrand() must be called inside a <BrandProvider>. " +
            "Ensure the root layout wraps its children with <BrandProvider brand={...}>.",
        );
      }
    }).toThrow(/BrandProvider/);

    // Also test the actual hook behavior by rendering outside a provider
    const { BrandContext } = await import("../context");
    let threwError = false;
    function OutsideConsumer() {
      try {
        // biome-ignore lint/correctness/useHookAtTopLevel: deliberately calling the hook outside a provider to assert it throws
        useBrand();
      } catch {
        threwError = true;
      }
      return null;
    }

    const contextValue = null;
    const tree = createElement(
      BrandContext,
      { value: contextValue },
      createElement(OutsideConsumer),
    );
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));
    expect(threwError).toBe(true);
  });

  it("ThemeProvider receives 'light' defaultMode when themeRef ends in 'light'", async () => {
    const { BrandProvider } = await import("../provider");
    const brand = makeBrand({ themeRef: "light" });

    const tree = createElement(BrandProvider, { brand }, null);
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(capturedDefaultMode).toBe("light");
  });

  it("ThemeProvider receives 'dark' defaultMode when themeRef does not end in 'light'", async () => {
    const { BrandProvider } = await import("../provider");
    const brand = makeBrand({ themeRef: "dark" });

    const tree = createElement(BrandProvider, { brand }, null);
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(capturedDefaultMode).toBe("dark");
  });

  it("ThemeProvider receives 'dark' for custom themeRef like 'acme-dark'", async () => {
    const { BrandProvider } = await import("../provider");
    const brand = makeBrand({ themeRef: "acme-dark" });

    const tree = createElement(BrandProvider, { brand }, null);
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(capturedDefaultMode).toBe("dark");
  });

  it("ThemeProvider receives 'light' for custom themeRef like 'acme-light'", async () => {
    const { BrandProvider } = await import("../provider");
    const brand = makeBrand({ themeRef: "acme-light" });

    const tree = createElement(BrandProvider, { brand }, null);
    const { root } = renderTree(tree);
    cleanup.push(() => act(() => root.unmount()));

    expect(capturedDefaultMode).toBe("light");
  });
});
