import { expect, test } from "@playwright/test";

/**
 * Brand E2E Tests — Brand Abstraction Layer
 *
 * Verifies that the default "enterprise" brand resolves correctly and renders
 * expected metadata and page structure. Tests are minimal by design — the
 * unit tests cover component behavior; E2E covers the full server resolution
 * and rendering integration.
 *
 * Tests:
 * - Page title contains the brand default title
 * - Document has a favicon link
 * - Sign-in page loads without errors (brand provider does not crash the app)
 */

test.describe("Brand System", () => {
  test("page title contains the enterprise brand default title", async ({ page }) => {
    // The enterprise brand metadata.defaultTitle = "Enterprise Platform"
    // generateMetadata() in layout.tsx uses this via generateBrandMetadata()
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/Enterprise Platform/);
  });

  test("document has a favicon link", async ({ page }) => {
    // The enterprise brand favicon = "/images/enterprise/favicon.svg"
    // generateBrandMetadata maps brand.favicon to icons.icon
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    const favicon = page.locator("link[rel='icon']");
    await expect(favicon).toHaveCount(1);
    const href = await favicon.getAttribute("href");
    expect(href).toBeTruthy();
  });

  test("page loads without hydration errors (BrandProvider does not crash)", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // Filter to only brand-related or hydration errors — ignore network errors
    const brandErrors = errors.filter(
      (e) =>
        e.includes("brand") ||
        e.includes("BrandProvider") ||
        e.includes("Hydration") ||
        e.includes("useBrand"),
    );

    expect(brandErrors).toHaveLength(0);
  });

  test("sign-in page is accessible and brand name appears in title", async ({ page }) => {
    // Full integration: brand resolves → metadata generated → page renders correctly
    await page.goto("/sign-in");

    const title = await page.title();
    expect(title).toContain("Enterprise Platform");
  });
});
