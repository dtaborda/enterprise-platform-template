import { expect, type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class NavigationPage {
  readonly moreButton: Locator;
  readonly moreDrawer: Locator;

  constructor(private readonly page: Page) {
    this.moreButton = this.page.getByTestId("bottom-tab-more");
    this.moreDrawer = this.page.locator('[data-slot="sheet-content"]');
  }

  async gotoDashboard(): Promise<void> {
    await this.page.goto(ROUTES.dashboard);
    await this.page.waitForURL(new RegExp(ROUTES.dashboard));
  }

  sidebarLink(label: string): Locator {
    return this.page.locator("aside").getByRole("link", { name: label, exact: true });
  }

  bottomTabItem(label: string): Locator {
    return this.page.getByTestId(`bottom-tab-item-${label.toLowerCase()}`);
  }

  async expectBottomBarVisible(): Promise<void> {
    await expect(this.page.getByTestId("bottom-tab-bar")).toBeVisible();
  }

  async expectBottomBarHidden(): Promise<void> {
    await expect(this.page.getByTestId("bottom-tab-bar")).toBeHidden();
  }

  async openMoreDrawer(): Promise<void> {
    await this.moreButton.click();
    await expect(this.moreDrawer).toBeVisible();
  }
}
