import { test, expect } from "../fixtures/ui";

test.describe("filters", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/applications", {
      data: { company: "Acme Co", role: "SDET", tags: ["dream-job"] },
    });
    await request.post("/api/applications", {
      data: { company: "Globex", role: "QA Engineer", tags: ["backup"] },
    });
  });

  test("filters the board by search text", async ({ page }) => {
    await page.goto("/board");
    await expect(page.getByText("Acme Co")).toBeVisible();
    await expect(page.getByText("Globex")).toBeVisible();

    await page.getByLabel("Search applications").fill("acme");

    await expect(page.getByText("Acme Co")).toBeVisible();
    await expect(page.getByText("Globex")).toHaveCount(0);
  });

  test("filters the board by tag", async ({ page }) => {
    await page.goto("/board");

    await page.getByLabel("Filter by tag").fill("backup");

    await expect(page.getByText("Globex")).toBeVisible();
    await expect(page.getByText("Acme Co")).toHaveCount(0);
  });
});
