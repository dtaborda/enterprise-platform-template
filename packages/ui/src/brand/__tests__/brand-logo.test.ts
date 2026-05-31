// @vitest-environment happy-dom
/**
 * BrandLogo component tests — RED phase
 *
 * Tests cover:
 * - Renders light variant <img> in light mode
 * - Renders dark variant <img> in dark mode
 * - alt attribute matches active variant
 * - Empty src renders displayName text fallback (no <img>)
 * - width and height passed to <img> when provided
 * - className prop applied to root element
 */

import type { BrandConfig } from "@enterprise/contracts";
import { act, createElement } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock dependencies
// ============================================================================

// Mock useBrand() to inject test brand configs
vi.mock("../provider", () => ({
  useBrand: vi.fn(),
}));

// Mock useTheme() to inject test mode
vi.mock("../../theme/provider", () => ({
  useTheme: vi.fn(),
}));

// ============================================================================
// Fixture helpers
// ============================================================================

const baseLightVariant = {
  src: "/images/enterprise/logo-light.svg",
  alt: "Enterprise Platform Light",
  width: 160,
  height: 32,
};

const baseDarkVariant = {
  src: "/images/enterprise/logo-dark.svg",
  alt: "Enterprise Platform Dark",
  width: 160,
  height: 32,
};

const baseLogo = {
  light: baseLightVariant,
  dark: baseDarkVariant,
};

function makeBrand(overrides: Partial<BrandConfig> = {}): BrandConfig {
  return {
    slug: "enterprise",
    name: "enterprise",
    displayName: "Enterprise Platform",
    description: "Enterprise Platform template.",
    logo: baseLogo,
    favicon: "/images/enterprise/favicon.svg",
    metadata: {
      titleTemplate: "%s | Enterprise Platform",
      defaultTitle: "Enterprise Platform",
      description: "Enterprise Platform template.",
      ogImage: "/images/enterprise/og-image.png",
    },
    legal: {
      privacyUrl: "https://example.com/privacy",
      termsUrl: "https://example.com/terms",
    },
    themeRef: "light",
    isDefault: true,
    ...overrides,
  };
}

// ============================================================================
// Render helper
// ============================================================================

function renderTree(tree: React.ReactElement): {
  container: HTMLDivElement;
  root: ReactDOM.Root;
} {
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

describe("BrandLogo", () => {
  const cleanup: Array<() => void> = [];

  afterEach(async () => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
    vi.clearAllMocks();
  });

  it("renders <img> with light variant src in light mode", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    vi.mocked(useBrand).mockReturnValue(makeBrand());
    vi.mocked(useTheme).mockReturnValue({
      mode: "light",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, {}));
    cleanup.push(() => act(() => root.unmount()));

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/images/enterprise/logo-light.svg");
  });

  it("renders <img> with dark variant src in dark mode", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    vi.mocked(useBrand).mockReturnValue(makeBrand());
    vi.mocked(useTheme).mockReturnValue({
      mode: "dark",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, {}));
    cleanup.push(() => act(() => root.unmount()));

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/images/enterprise/logo-dark.svg");
  });

  it("alt attribute matches the active variant", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    vi.mocked(useBrand).mockReturnValue(makeBrand());
    vi.mocked(useTheme).mockReturnValue({
      mode: "light",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, {}));
    cleanup.push(() => act(() => root.unmount()));

    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("Enterprise Platform Light");
  });

  it("renders displayName text fallback when light src is empty", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    const brand = makeBrand({
      logo: {
        light: { src: "", alt: "Enterprise Platform", width: 160, height: 32 },
        dark: baseDarkVariant,
      },
    });
    vi.mocked(useBrand).mockReturnValue(brand);
    vi.mocked(useTheme).mockReturnValue({
      mode: "light",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, {}));
    cleanup.push(() => act(() => root.unmount()));

    expect(container.querySelector("img")).toBeNull();
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("Enterprise Platform");
  });

  it("passes width and height to <img> when provided", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    vi.mocked(useBrand).mockReturnValue(makeBrand());
    vi.mocked(useTheme).mockReturnValue({
      mode: "dark",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, {}));
    cleanup.push(() => act(() => root.unmount()));

    const img = container.querySelector("img");
    expect(img?.getAttribute("width")).toBe("160");
    expect(img?.getAttribute("height")).toBe("32");
  });

  it("applies className prop to the root <img>", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    vi.mocked(useBrand).mockReturnValue(makeBrand());
    vi.mocked(useTheme).mockReturnValue({
      mode: "light",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, { className: "h-8 w-auto" }));
    cleanup.push(() => act(() => root.unmount()));

    const img = container.querySelector("img");
    expect(img?.className).toContain("h-8");
    expect(img?.className).toContain("w-auto");
  });

  it("applies className prop to the text fallback <span>", async () => {
    const { useBrand } = await import("../provider");
    const { useTheme } = await import("../../theme/provider");
    const { BrandLogo } = await import("../brand-logo");

    const brand = makeBrand({
      logo: {
        light: { src: "", alt: "Enterprise Platform" },
        dark: baseDarkVariant,
      },
    });
    vi.mocked(useBrand).mockReturnValue(brand);
    vi.mocked(useTheme).mockReturnValue({
      mode: "light",
      setMode: vi.fn(),
      toggleMode: vi.fn(),
    });

    const { container, root } = renderTree(createElement(BrandLogo, { className: "text-primary" }));
    cleanup.push(() => act(() => root.unmount()));

    const span = container.querySelector("span");
    expect(span?.className).toContain("text-primary");
  });
});
