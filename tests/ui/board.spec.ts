import { test, expect } from "../fixtures/ui";

test.describe("board", () => {
  test("creates a new application through the dialog", async ({ page }) => {
    await page.goto("/board");

    await page.getByRole("button", { name: "New application" }).click();
    await page.getByLabel("Company").fill("Acme Co");
    await page.getByLabel("Role").fill("SDET");
    await page.getByRole("button", { name: "Add application" }).click();

    await expect(page.getByText("Application added")).toBeVisible();
    const wishlistColumn = page.getByTestId("column-wishlist");
    await expect(wishlistColumn.getByText("Acme Co")).toBeVisible();
    await expect(wishlistColumn.getByText("SDET")).toBeVisible();
  });

  test("shows a validation error when required fields are missing", async ({ page }) => {
    await page.goto("/board");

    await page.getByRole("button", { name: "New application" }).click();
    await page.getByRole("button", { name: "Add application" }).click();

    await expect(page.getByText("Company is required")).toBeVisible();
    await expect(page.getByText("Role is required")).toBeVisible();
  });

  test("edits an existing application", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } });
    await page.goto("/board");

    await page.getByRole("button", { name: "SDET", exact: true }).click();
    await page.getByLabel("Role").fill("Senior SDET");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Application updated")).toBeVisible();
    await expect(page.getByTestId("column-wishlist").getByText("Senior SDET")).toBeVisible();
  });

  test("deletes an application", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } });
    await page.goto("/board");

    await page.getByRole("button", { name: "SDET", exact: true }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Application deleted")).toBeVisible();
    await expect(page.getByTestId("column-wishlist").getByText("Acme Co")).toHaveCount(0);
  });

  test("moves a card to the next column with the keyboard", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET", status: "wishlist" } });
    await page.goto("/board");

    await expect(page.getByTestId("column-wishlist").getByText("Acme Co")).toBeVisible();

    // dnd-kit measures droppable rects asynchronously after each keyboard drag
    // event, so a beat is needed between keys for the move to register correctly.
    const grip = page.getByRole("button", { name: "Move SDET at Acme Co" });
    await grip.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await page.keyboard.press("Space");

    await expect(page.getByTestId("column-applied").getByText("Acme Co")).toBeVisible();
    await expect(page.getByTestId("column-wishlist").getByText("Acme Co")).toHaveCount(0);

    const response = await request.get("/api/applications?status=applied");
    const body = await response.json();
    expect(body.items.some((a: { company: string }) => a.company === "Acme Co")).toBe(true);
  });
});
