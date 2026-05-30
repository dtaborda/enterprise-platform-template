// @vitest-environment happy-dom
/**
 * BrandFooter component tests — RED phase
 *
 * Tests cover:
 * - Renders copyright line with displayName and current year
 * - Legal links rendered when privacyUrl and termsUrl are non-empty
 * - Legal links omitted when privacyUrl/termsUrl are empty string
 * - Social links rendered when brand.social is present
 * - "Powered by" text rendered when features.showPoweredBy is true
 * - "Powered by" text omitted when features.showPoweredBy is false
 * - className prop applied to root <footer>
 */

import { act, createElement } from "react";
import * as ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrandConfig } from "@enterprise/contracts";

// ============================================================================
// Mock dependencies
// ============================================================================

vi.mock("../provider", () => ({
  useBrand: vi.fn(),
}));

// ============================================================================
// Fixture helpers
// ============================================================================

const baseLogo = {
  light: { src: "/logo-light.svg", alt: "Logo", width: 160, height: 32 },
  dark: { src: "/logo-dark.svg", alt: "Logo", width: 160, height: 32 },
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

describe("BrandFooter", () => {
  const cleanup: Array<() => void> = [];

  afterEach(() => {
    for (const fn of cleanup) fn();
    cleanup.length = 0;
    vi.clearAllMocks();
  });

  it("renders copyright line with displayName", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(makeBrand());

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain("Enterprise Platform");
  });

  it("renders the current year in the copyright line", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(makeBrand());

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const currentYear = new Date().getFullYear().toString();
    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain(currentYear);
  });

  it("renders privacy and terms links when URLs are non-empty", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(
      makeBrand({
        legal: {
          privacyUrl: "https://example.com/privacy",
          termsUrl: "https://example.com/terms",
        },
      }),
    );

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://example.com/privacy");
    expect(hrefs).toContain("https://example.com/terms");
  });

  it("omits privacy link when privacyUrl is empty string", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(
      makeBrand({
        legal: { privacyUrl: "", termsUrl: "https://example.com/terms" },
      }),
    );

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const links = Array.from(container.querySelectorAll("a"));
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("");
    // terms link still present
    expect(hrefs).toContain("https://example.com/terms");
  });

  it("omits terms link when termsUrl is empty string", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(
      makeBrand({
        legal: { privacyUrl: "https://example.com/privacy", termsUrl: "" },
      }),
    );

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const links = Array.from(container.querySelectorAll("a"));
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://example.com/privacy");
    // terms link should NOT be present
    expect(hrefs.every((h) => h !== "")).toBe(true);
    expect(links).toHaveLength(1); // only privacy
  });

  it("renders GitHub social link when brand.social.github is present", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(
      makeBrand({
        social: { github: "https://github.com/your-org" },
      }),
    );

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    const links = Array.from(container.querySelectorAll("a"));
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://github.com/your-org");
  });

  it("renders 'Powered by' when features.showPoweredBy is true", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(makeBrand({ features: { showPoweredBy: true } }));

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    expect(container.textContent).toContain("Powered by");
  });

  it("omits 'Powered by' when features.showPoweredBy is false", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(makeBrand({ features: { showPoweredBy: false } }));

    const { container, root } = renderTree(createElement(BrandFooter, {}));
    cleanup.push(() => act(() => root.unmount()));

    expect(container.textContent).not.toContain("Powered by");
  });

  it("applies className prop to root <footer>", async () => {
    const { useBrand } = await import("../provider");
    const { BrandFooter } = await import("../brand-footer");

    vi.mocked(useBrand).mockReturnValue(makeBrand());

    const { container, root } = renderTree(
      createElement(BrandFooter, { className: "py-8 border-t" }),
    );
    cleanup.push(() => act(() => root.unmount()));

    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("py-8");
    expect(footer?.className).toContain("border-t");
  });
});
