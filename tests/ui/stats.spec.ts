import { test, expect } from "../fixtures/ui";

test.describe("stats page", () => {
  test("shows zeroed stats for a new user", async ({ page }) => {
    await page.goto("/stats");

    await expect(page.getByTestId("stat-total")).toHaveText("0");
    await expect(page.getByTestId("stat-added-7d")).toHaveText("0");
  });

  test("reflects applications created via the API", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET", status: "applied" } });
    await request.post("/api/applications", { data: { company: "Globex", role: "QA", status: "interviewing" } });

    await page.goto("/stats");

    await expect(page.getByTestId("stat-total")).toHaveText("2");
    await expect(page.getByTestId("stat-count-applied")).toHaveText("1");
    await expect(page.getByTestId("stat-count-interviewing")).toHaveText("1");
  });

  test("navigates to stats from the board", async ({ page }) => {
    await page.goto("/board");
    await page.getByRole("link", { name: "Stats" }).click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByTestId("stats-cards")).toBeVisible();
  });
});
