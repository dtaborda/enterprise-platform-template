import { expect, type Page } from "@playwright/test";

export interface ResourceFormData {
  title?: string;
  type?: string;
  status?: string;
  description?: string;
  metadata?: string;
  imageUrls?: string;
}

export class ResourcesPage {
  constructor(private readonly page: Page) {}

  async gotoList(): Promise<void> {
    // Use page.waitForURL() for App Router SPA navigation.
    // NEVER use page.waitForFunction(() => window.location...) — it's unreliable
    // with Next.js prefetching in production builds.
    await this.page.goto("/dashboard/resources");
    await this.page.waitForURL(/\/dashboard\/resources/);
  }

  async gotoNew(): Promise<void> {
    // Use page.waitForURL() for App Router SPA navigation.
    // NEVER use page.waitForFunction(() => window.location...) — it's unreliable
    // with Next.js prefetching in production builds.
    await this.page.goto("/dashboard/resources/new");
    await this.page.waitForURL(/\/dashboard\/resources\/new/);
  }

  async navigateToList(): Promise<void> {
    await this.page.getByRole("link", { name: "Resources" }).click();
    await this.page.waitForURL(/\/dashboard\/resources/, { timeout: 10_000 });
  }

  async fillForm(data: ResourceFormData): Promise<void> {
    if (data.title !== undefined) {
      await this.page.getByLabel("Title").fill(data.title);
    }

    if (data.type !== undefined) {
      await this.page.getByLabel("Type").click();
      await this.page.getByRole("option", { name: data.type, exact: true }).click();
    }

    if (data.status !== undefined) {
      await this.page.getByLabel("Status").click();
      await this.page.getByRole("option", { name: data.status, exact: true }).click();
    }

    if (data.description !== undefined) {
      await this.page.getByLabel("Description").fill(data.description);
    }

    if (data.metadata !== undefined) {
      await this.page.getByLabel("Metadata (JSON)").fill(data.metadata);
    }

    if (data.imageUrls !== undefined) {
      await this.page.getByLabel("Image URLs").fill(data.imageUrls);
    }
  }

  async submitForm(): Promise<void> {
    await this.page.getByRole("button", { name: /create resource|update resource/i }).click();
  }

  async expectResourceInTable(title: string): Promise<void> {
    // Wait for the table to be present before asserting the specific cell.
    // In CI the page re-fetches via Server Components after revalidatePath,
    // which can take longer than the default expect timeout.
    await expect(this.page.getByRole("table")).toBeVisible();
    await expect(this.page.getByRole("cell", { name: title })).toBeVisible();
  }

  async expectResourceNotInTable(title: string): Promise<void> {
    await expect(this.page.getByRole("cell", { name: title })).toHaveCount(0);
  }

  async clickViewResource(title: string): Promise<void> {
    const row = this.page.getByRole("row").filter({ hasText: title });
    await row.getByRole("link", { name: "View" }).click();
  }

  async clickEditResource(title: string): Promise<void> {
    const row = this.page.getByRole("row").filter({ hasText: title });
    await row.getByRole("link", { name: "Edit" }).click();
  }

  async deleteResource(title: string): Promise<void> {
    await this.clickViewResource(title);
    await this.page.getByRole("button", { name: "Archive" }).click();
    await this.page.getByRole("button", { name: "Archive Resource" }).click();
    await this.page.waitForURL(/\/dashboard\/resources(?!\/)/, { timeout: 15_000 });
  }

  async filterByType(type: string): Promise<void> {
    await this.page.getByLabel("Type").click();
    await this.page.getByRole("option", { name: type, exact: true }).click();
    await this.page.waitForURL(/\/dashboard\/resources/);
  }

  async filterByStatus(status: string): Promise<void> {
    await this.page.getByLabel("Status").click();
    await this.page.getByRole("option", { name: status, exact: true }).click();
    await this.page.waitForURL(/\/dashboard\/resources/);
  }

  async expectRedirectedToSignIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in/);
  }
}
