import { test, expect } from "@playwright/test";
import { newUserCredentials } from "../fixtures/test-data";

test.describe("authentication", () => {
  test("redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("registers a new user and lands on the board", async ({ page }) => {
    const user = newUserCredentials();

    await page.goto("/register");
    await page.getByLabel("Name").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole("button", { name: "New application" })).toBeVisible();
  });

  test("shows a validation error for an invalid email on login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("valid email");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows an error for the wrong password", async ({ page, request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("Incorrect email or password");
  });

  test("logs in and back out", async ({ page, request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/board$/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
