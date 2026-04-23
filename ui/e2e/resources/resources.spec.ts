import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ResourcesPage } from "./resources-page";
import {
  getAdminTenantId,
  type SeededResource,
  seedResources,
  teardownResources,
} from "./resources-seed";

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
    let seededResources: SeededResource[] = [];

    test.beforeAll(async () => {
      const tenantId = await getAdminTenantId();
      seededResources = await seedResources(tenantId);
    });

    test.afterAll(async () => {
      await teardownResources();
    });

    test("create resource happy path: fill form → submit → resource appears in list", async ({
      page,
    }) => {
      const resourcesPage = new ResourcesPage(page);
      const createdTitle = `E2E UI Resource ${Date.now()}`;

      await login(page);
      await resourcesPage.gotoNew();

      await resourcesPage.fillForm({
        title: createdTitle,
        type: "Document",
        status: "Active",
        description: "Resource created from E2E test",
      });

      await resourcesPage.submitForm();

      await resourcesPage.gotoList();
      await resourcesPage.expectResourceInTable(createdTitle);
    });

    test("list with type filter: applying 'Document' sets type query param", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);
      const seededDocument = seededResources.find((resource) => resource.type === "document");

      if (!seededDocument) {
        test.skip();
        return;
      }

      await login(page);
      await resourcesPage.gotoList();
      await resourcesPage.filterByType("Document");

      await expect(page).toHaveURL(/type=document/);
      await resourcesPage.expectResourceInTable(seededDocument.title);
    });

    test("list with status filter: applying 'Active' sets status query param", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);
      const activeResource = seededResources.find((resource) => resource.status === "active");

      if (!activeResource) {
        test.skip();
        return;
      }

      await login(page);
      await resourcesPage.gotoList();
      await resourcesPage.filterByStatus("Active");

      await expect(page).toHaveURL(/status=active/);
      await resourcesPage.expectResourceInTable(activeResource.title);
    });

    test("view resource detail: clicking View opens detail page", async ({ page }) => {
      const resourcesPage = new ResourcesPage(page);
      const targetResource = seededResources[0];

      if (!targetResource) {
        test.skip();
        return;
      }

      await login(page);
      await resourcesPage.gotoList();

      await resourcesPage.expectResourceInTable(targetResource.title);
      await resourcesPage.clickViewResource(targetResource.title);
      await expect(page).toHaveURL(/\/dashboard\/resources\/[0-9a-f-]+$/);
      // CardTitle renders a <div>, not a semantic heading, so use getByText
      // with .first() to avoid strict mode violation (title also appears in breadcrumb).
      await expect(page.getByText(targetResource.title).first()).toBeVisible();
    });

    test("edit resource: change title and save → updated title appears in list", async ({
      page,
    }) => {
      const resourcesPage = new ResourcesPage(page);
      const resourceToEdit = seededResources[1];

      if (!resourceToEdit) {
        test.skip();
        return;
      }

      const editedTitle = `${resourceToEdit.title}-edited`;

      await login(page);
      await resourcesPage.gotoList();

      await resourcesPage.expectResourceInTable(resourceToEdit.title);
      await resourcesPage.clickEditResource(resourceToEdit.title);
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
      const deleteTitle = `E2E UI Resource Delete ${Date.now()}`;

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
