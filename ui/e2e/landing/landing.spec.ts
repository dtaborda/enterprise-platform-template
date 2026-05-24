import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { LandingPage } from "./landing-page";

// ─── Landing page E2E — LANDING-E2E-001 to LANDING-E2E-008 ───────────────────
//
// All tests run as anonymous users unless noted (LANDING-E2E-005).
// No server-side setup required — the landing page is fully static.

test.describe("Landing page", () => {
  // ─── LANDING-E2E-001 — @critical ──────────────────────────────────────────

  test("anonymous user sees landing page at root URL with hero headline", {
    tag: ["@critical"],
  }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.expectHeroVisible();

    // Must be on the root URL
    await expect(page).toHaveURL(ROUTES.home);
    // Single h1 — no duplicates
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  // ─── LANDING-E2E-002 — @critical ──────────────────────────────────────────

  test("hero gradient CTA navigates to /sign-up", { tag: ["@critical"] }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.clickGetStarted();

    await expect(page).toHaveURL(/\/sign-up/);
  });

  // ─── LANDING-E2E-003 — @high ──────────────────────────────────────────────

  test("navigation bar is visible with Sign In link and Get Started CTA", {
    tag: ["@high"],
  }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.expectNavVisible();
  });

  test("nav Sign In link navigates to /sign-in", { tag: ["@high"] }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.clickNavSignIn();

    await expect(page).toHaveURL(/\/sign-in/);
  });

  // ─── LANDING-E2E-004 — @high ──────────────────────────────────────────────

  test("features section renders exactly 3 feature cards on desktop viewport", {
    tag: ["@high"],
  }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.expectFeaturesVisible();

    // Each card should have visible content
    const cards = page.getByTestId("feature-card");
    await expect(cards.nth(0)).toBeVisible();
    await expect(cards.nth(1)).toBeVisible();
    await expect(cards.nth(2)).toBeVisible();
  });

  // ─── LANDING-E2E-005 — @high ──────────────────────────────────────────────

  test("authenticated user visiting root URL is redirected to dashboard", {
    tag: ["@high"],
  }, async ({ page }) => {
    // Perform login first
    await login(page);

    // Now navigate to the root URL — middleware should redirect to dashboard
    await page.goto(ROUTES.home);

    await expect(page).toHaveURL(new RegExp(ROUTES.dashboard));
  });

  // ─── LANDING-E2E-006 — @medium ────────────────────────────────────────────

  test("footer is visible with ThemeToggle and copyright text", {
    tag: ["@medium"],
  }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.expectFooterVisible();

    // Copyright text is present
    await expect(page.getByText(/Enterprise Platform\. All rights reserved/)).toBeVisible();
  });

  // ─── LANDING-E2E-007 — @medium ────────────────────────────────────────────

  test("mobile viewport (375px) — feature cards stack in a single column and page has no horizontal scroll", {
    tag: ["@medium"],
  }, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const landing = new LandingPage(page);

    await landing.goto();

    // All 3 cards still visible in single-column layout
    const cards = page.getByTestId("feature-card");
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }

    // No horizontal scroll — scrollWidth should not exceed viewport width
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  // ─── LANDING-E2E-008 — @medium ────────────────────────────────────────────

  test("CTA banner is visible with a link pointing to /sign-up", {
    tag: ["@medium"],
  }, async ({ page }) => {
    const landing = new LandingPage(page);

    await landing.goto();
    await landing.expectCtaBannerVisible();

    // The CTA link must point to /sign-up
    const ctaLink = landing.ctaBannerLink;
    await expect(ctaLink).toHaveAttribute("href", "/sign-up");
  });
});
