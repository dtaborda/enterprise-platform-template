import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ResourcesPage } from "./resources-page";

test.describe("Resources", () => {
  test("unauthenticated request to /dashboard/resources redirects to sign-in", async ({ page }) => {
    const resourcesPage = new ResourcesPage(page);

    await page.goto("/dashboard/resources");

    await resourcesPage.expectRedirectedToSignIn();
  });

  test("unauthenticated request to /dashboard/resources/new redirects to sign-in", async ({
    page,
  }) => {
    const resourcesPage = new ResourcesPage(page);

    await page.goto("/dashboard/resources/new");

    await resourcesPage.expectRedirectedToSignIn();
  });

  test.describe("authenticated flows (require running app + seeded DB)", () => {
    const uniqueTitle = `E2E Resource ${Date.now()}`;

    test("create resource happy path: fill form → submit → resource appears in list", async ({
      page,
    }) => {
      const resourcesPage = new ResourcesPage(page);

      await login(page);
      await resourcesPage.gotoNew();

      await resourcesPage.fillForm({
        title: uniqueTitle,
        type: "Document",
        status: "Active",
        description: "Resource created from E2E test",
      });

      await resourcesPage.submitForm();

      await resourcesPage.gotoList();
      await resourcesPage.expectResourceInTable(uniqueTitle);
    });

    test("list with type filter: applying 'Document' sets type query param", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);

      await login(page);
      await resourcesPage.gotoList();
      await resourcesPage.filterByType("Document");

      await expect(page).toHaveURL(/type=document/);
    });

    test("list with status filter: applying 'Active' sets status query param", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);

      await login(page);
      await resourcesPage.gotoList();
      await resourcesPage.filterByStatus("Active");

      await expect(page).toHaveURL(/status=active/);
    });

    test("view resource detail: clicking View opens detail page", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);

      await login(page);
      await resourcesPage.gotoList();

      const rows = page.getByRole("row");
      const rowCount = await rows.count();

      if (rowCount <= 1) {
        test.skip();
        return;
      }

      const firstRow = rows.nth(1);
      const titleCell = firstRow.getByRole("cell").nth(0);
      const title = (await titleCell.textContent()) ?? "";

      await firstRow.getByRole("link", { name: "View" }).click();
      await expect(page).toHaveURL(/\/dashboard\/resources\/[0-9a-f-]+$/);
      // Use heading role to avoid strict mode violation — title appears in both
      // the detail card heading and the table/breadcrumb, so getByText matches 2 elements.
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    });

    test("edit resource: change title and save → updated title appears in list", async ({
      page,
    }) => {
      const resourcesPage = new ResourcesPage(page);
      const editedTitle = `Edited Resource ${Date.now()}`;

      await login(page);
      await resourcesPage.gotoList();

      const rows = page.getByRole("row");
      const rowCount = await rows.count();

      if (rowCount <= 1) {
        test.skip();
        return;
      }

      const firstRow = rows.nth(1);
      await firstRow.getByRole("link", { name: "Edit" }).click();
      await expect(page).toHaveURL(/\/dashboard\/resources\/[0-9a-f-]+\/edit/);

      await page.getByLabel("Title").fill(editedTitle);
      await resourcesPage.submitForm();

      await resourcesPage.gotoList();
      await resourcesPage.expectResourceInTable(editedTitle);
    });

    test("delete resource (soft delete): resource disappears from default list", async ({
      page,
    }) => {
      const resourcesPage = new ResourcesPage(page);
      const deleteTitle = `Delete Resource ${Date.now()}`;

      await login(page);

      await resourcesPage.gotoNew();
      await resourcesPage.fillForm({
        title: deleteTitle,
        type: "Other",
        status: "Active",
      });
      await resourcesPage.submitForm();

      await resourcesPage.gotoList();
      await resourcesPage.expectResourceInTable(deleteTitle);

      await resourcesPage.deleteResource(deleteTitle);
      await resourcesPage.expectResourceNotInTable(deleteTitle);
    });
  });
});
