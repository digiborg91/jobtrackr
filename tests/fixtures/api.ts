import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { newUserCredentials } from "./test-data";

interface ApiFixtures {
  testUser: ReturnType<typeof newUserCredentials>;
  authedRequest: APIRequestContext;
}

export const test = base.extend<ApiFixtures>({
  testUser: async ({}, use) => {
    await use(newUserCredentials());
  },

  authedRequest: async ({ playwright, baseURL, testUser }, use) => {
    const context = await playwright.request.newContext({ baseURL });
    const response = await context.post("/api/auth/register", { data: testUser });
    if (!response.ok()) {
      throw new Error(`Failed to register test user: ${response.status()} ${await response.text()}`);
    }
    await use(context);
    await context.dispose();
  },
});

export { expect };
