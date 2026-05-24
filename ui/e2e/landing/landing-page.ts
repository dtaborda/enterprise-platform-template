import { expect, type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

// ─── Locator constants ────────────────────────────────────────────────────────

/** All canonical locators sourced from the spec (LANDING-E2E). */

// ─── LandingPage — Page Object ────────────────────────────────────────────────

export class LandingPage {
  // ── Nav ────────────────────────────────────────────────────────────────────
  readonly nav: Locator;
  readonly navSignIn: Locator;
  readonly navGetStarted: Locator;

  // ── Hero ───────────────────────────────────────────────────────────────────
  readonly heroSection: Locator;
  readonly heroHeading: Locator;
  readonly heroCta: Locator;
  readonly heroSignIn: Locator;

  // ── Features ───────────────────────────────────────────────────────────────
  readonly featureCards: Locator;

  // ── Social proof ───────────────────────────────────────────────────────────
  readonly socialProofSection: Locator;

  // ── CTA banner ─────────────────────────────────────────────────────────────
  readonly ctaBannerSection: Locator;
  readonly ctaBannerLink: Locator;

  // ── Footer ─────────────────────────────────────────────────────────────────
  readonly footer: Locator;
  readonly themeToggle: Locator;

  constructor(private readonly page: Page) {
    // Nav — scoped to the <nav> landmark
    this.nav = page.getByRole("navigation", { name: "Main navigation" });
    this.navSignIn = this.nav.getByRole("link", { name: "Sign In" });
    this.navGetStarted = this.nav.getByRole("link", { name: "Get Started" });

    // Hero
    this.heroSection = page.getByTestId("hero-section");
    this.heroHeading = page.getByRole("heading", { level: 1 });
    // Hero CTA is a Link rendered inside a Button — role=link in the DOM
    this.heroCta = this.heroSection.getByRole("link", { name: "Get Started" });
    this.heroSignIn = this.heroSection.getByRole("link", { name: "Sign In" });

    // Features — each card has data-testid="feature-card"
    this.featureCards = page.getByTestId("feature-card");

    // Social proof section by id
    this.socialProofSection = page.locator("#social-proof");

    // CTA banner — the section wrapping the CTA
    this.ctaBannerSection = page.locator("[aria-labelledby='cta-heading']");
    this.ctaBannerLink = this.ctaBannerSection.getByRole("link", { name: "Start Building Today" });

    // Footer — contentinfo is the ARIA role for <footer>
    this.footer = page.getByRole("contentinfo");
    // ThemeToggle renders aria-label="Toggle theme"
    this.themeToggle = page.getByRole("button", { name: "Toggle theme" });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.home);
  }

  // ─── Assertions ─────────────────────────────────────────────────────────────

  async expectHeroVisible(): Promise<void> {
    await expect(this.heroHeading).toBeVisible();
  }

  async expectNavVisible(): Promise<void> {
    await expect(this.nav).toBeVisible();
    await expect(this.navSignIn).toBeVisible();
    // navGetStarted is hidden on mobile — just check it exists in DOM
    await expect(this.navGetStarted).toBeAttached();
  }

  async expectFeaturesVisible(): Promise<void> {
    await expect(this.featureCards).toHaveCount(3);
  }

  async expectSocialProofVisible(): Promise<void> {
    await expect(this.socialProofSection).toBeVisible();
    // At least one metric stat visible ("10,000+" is present in DOM)
    await expect(this.page.getByText("10,000+")).toBeVisible();
  }

  async expectCtaBannerVisible(): Promise<void> {
    await expect(this.ctaBannerSection).toBeVisible();
    await expect(this.ctaBannerLink).toBeVisible();
  }

  async expectFooterVisible(): Promise<void> {
    await expect(this.footer).toBeVisible();
    await expect(this.themeToggle).toBeVisible();
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  async clickGetStarted(): Promise<void> {
    await this.heroCta.click();
  }

  async clickNavSignIn(): Promise<void> {
    await this.navSignIn.click();
  }
}
