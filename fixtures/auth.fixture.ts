import { test as base, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { uniqueApplication } from './test-data';

type TestApplication = ReturnType<typeof uniqueApplication>;

interface Fixtures {
    apiContext: APIRequestContext;
    testApplication: TestApplication;
}

export const test = base.extend<Fixtures>({
    // An authenticated API context, logged in as the same user the UI tests use.
    // Handy for fast setup/teardown that doesn't need to go through the UI.
    apiContext: async ({ baseURL }, use) => {
        const context = await playwrightRequest.newContext({ baseURL });
        await context.post('/api/auth/login', {
            data: { email: process.env.EMAIL, password: process.env.PASSWORD },
        });

        await use(context);

        await context.dispose();
    },

    // Unique application data for a test to create through the UI, automatically
    // deleted via the API once the test finishes — pass or fail. Because the
    // company/role are unique per run, this can never collide with data left
    // over from a previous run, and it never accumulates in the database either.
    testApplication: async ({ apiContext }, use) => {
        const data = uniqueApplication();

        await use(data);

        const response = await apiContext.get(`/api/applications?search=${encodeURIComponent(data.company)}`);
        const body = await response.json();
        for (const application of body.items ?? []) {
            await apiContext.delete(`/api/applications/${application.id}`);
        }
    },
});

export { expect } from '@playwright/test';
