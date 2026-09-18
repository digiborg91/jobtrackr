import { test, expect } from "../fixtures/ui";

test.describe("notes", () => {
  test("adds and deletes a note on an application", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } });
    await page.goto("/board");

    await page.getByRole("button", { name: "SDET", exact: true }).click();

    const notesList = page.getByTestId("notes-list");
    await expect(notesList.getByText("No notes yet.")).toBeVisible();

    await page.getByPlaceholder(/Add a note/).fill("Recruiter call scheduled for Friday");
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(notesList.getByText("Recruiter call scheduled for Friday")).toBeVisible();

    await page.getByRole("button", { name: "Delete note" }).click();
    await expect(notesList.getByText("No notes yet.")).toBeVisible();
  });

  test("does not submit an empty note", async ({ page, request }) => {
    await request.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } });
    await page.goto("/board");

    await page.getByRole("button", { name: "SDET", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add note" })).toBeDisabled();
  });
});
