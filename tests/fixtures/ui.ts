import { test as base, expect } from "@playwright/test";
import { newUserCredentials } from "./test-data";

interface UiFixtures {
  testUser: ReturnType<typeof newUserCredentials>;
}

// Registers a fresh user via the API and seeds the browser context's cookies from it,
// so tests that use this `test` start already logged in on the board. Tests that
// exercise the login/register screens themselves should import the plain, unauthenticated
// `test` from "@playwright/test" instead.
export const test = base.extend<UiFixtures>({
  testUser: async ({}, use) => {
    await use(newUserCredentials());
  },

  storageState: async ({ playwright, baseURL, testUser }, use) => {
    const apiContext = await playwright.request.newContext({ baseURL });
    const response = await apiContext.post("/api/auth/register", { data: testUser });
    if (!response.ok()) {
      throw new Error(`Failed to register test user: ${response.status()} ${await response.text()}`);
    }
    const state = await apiContext.storageState();
    await apiContext.dispose();
    await use(state);
  },
});

export { expect };
