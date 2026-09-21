import { faker } from '@faker-js/faker';
import { test, expect } from '../../fixtures/auth.fixture';
import { uniqueApplication } from '../../fixtures/test-data';
import { BoardPage } from '../../pages/BoardPage';
import { ApplicationDialoguePage } from '../../pages/ApplicationDialoguePage';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Inventory assignment', () => {
    let loginPage: LoginPage;
    let boardPage: BoardPage;
    let applicationDialoguePage: ApplicationDialoguePage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        boardPage = new BoardPage(page);
        applicationDialoguePage = new ApplicationDialoguePage(page);

        await loginPage.goto();
        await loginPage.login(process.env.EMAIL!, process.env.PASSWORD!);
        // Longer timeout here specifically: many tests share one real account,
        // so under parallel load a login occasionally takes longer than the
        // default 5s to redirect — it still succeeds, just not that fast.
        await expect(page).toHaveURL(/\/board$/, { timeout: 15_000 });
    });

    test('add a new application', async ({ page, testApplication }) => {
        await boardPage.createNewApplication();
        await applicationDialoguePage.createNewApplication(testApplication, 'Applied');

        await expect(page.getByText('Application added', { exact: true })).toBeVisible();
        await expect(boardPage.cardByRole(testApplication.role)).toBeVisible();
    })

    test('Ensure when dragging and dropping the status field updates', async ({ page, testApplication }) => {
        await test.step('Create a new application with status Wishlist', async () => {
            await boardPage.createNewApplication();
            await applicationDialoguePage.createNewApplication(testApplication, 'Wishlist');
            await expect(page.getByText('Application added', { exact: true })).toBeVisible();
            await expect(boardPage.cardInColumn('wishlist', testApplication.role)).toBeVisible();
        });

        await test.step('Move from Wishlist to Applied', async () => {
            await boardPage.moveCard(testApplication.role, testApplication.company, 'ArrowRight');
            await expect(boardPage.cardInColumn('applied', testApplication.role)).toBeVisible();
        });

        await test.step('Move from Applied to Interviewing', async () => {
            await boardPage.moveCard(testApplication.role, testApplication.company, 'ArrowRight');
            await expect(boardPage.cardInColumn('interviewing', testApplication.role)).toBeVisible();
        });

        await test.step('Move from Interviewing to Offer', async () => {
            await boardPage.moveCard(testApplication.role, testApplication.company, 'ArrowRight');
            await expect(boardPage.cardInColumn('offer', testApplication.role)).toBeVisible();
        });

        await test.step('Move from Offer to Rejected', async () => {
            await boardPage.moveCard(testApplication.role, testApplication.company, 'ArrowRight');
            await expect(boardPage.cardInColumn('rejected', testApplication.role)).toBeVisible();
        });
    })

    test('Update an existing application', async ({ page, apiContext, testApplication }) => {
        // Creation isn't what's under test here, so seed it directly via the
        // API — faster, and keeps the test focused on the update behaviour.
        await apiContext.post('/api/applications', {
            data: { company: testApplication.company, role: testApplication.role, source: testApplication.source },
        });
        await page.reload();

        const updatedRole = faker.person.jobTitle();

        await boardPage.openApplication(testApplication.role);
        await applicationDialoguePage.roleInput.fill(updatedRole);
        await applicationDialoguePage.save();

        await expect(page.getByText('Application updated', { exact: true })).toBeVisible();
        await expect(boardPage.cardByRole(updatedRole)).toBeVisible();
        await expect(boardPage.cardByRole(testApplication.role)).toHaveCount(0);
    })

    test('Delete an existing application', async ({ page, apiContext, testApplication }) => {
        await apiContext.post('/api/applications', {
            data: { company: testApplication.company, role: testApplication.role, source: testApplication.source },
        });
        await page.reload();

        await boardPage.openApplication(testApplication.role);
        await applicationDialoguePage.delete();

        await expect(page.getByText('Application deleted', { exact: true })).toBeVisible();
        await expect(boardPage.cardByRole(testApplication.role)).toHaveCount(0);
    })

    test('View an existing application', async ({ page, apiContext, testApplication }) => {
        await apiContext.post('/api/applications', {
            data: {
                company: testApplication.company,
                role: testApplication.role,
                jobUrl: testApplication.jobUrl,
                salaryMin: Number(testApplication.salaryMin),
                salaryMax: Number(testApplication.salaryMax),
                tags: testApplication.tags.split(','),
                location: testApplication.location,
                source: testApplication.source,
                nextFollowUp: testApplication.followUpDate,
            },
        });
        await page.reload();

        await boardPage.openApplication(testApplication.role);

        // Confirms the dialog actually loads the existing record's data rather
        // than opening blank — this is what "View" means for a dialog that
        // doubles as both the create and edit form.
        await expect(applicationDialoguePage.companyInput).toHaveValue(testApplication.company);
        await expect(applicationDialoguePage.roleInput).toHaveValue(testApplication.role);
        await expect(applicationDialoguePage.joblistingURLInput).toHaveValue(testApplication.jobUrl);
        await expect(applicationDialoguePage.salaryMinInput).toHaveValue(testApplication.salaryMin);
        await expect(applicationDialoguePage.salaryMaxInput).toHaveValue(testApplication.salaryMax);
    })

    test('Search a company or role', async ({ page, apiContext }) => {
        const matching = uniqueApplication();
        const other = uniqueApplication();
        const created = await Promise.all([
            apiContext.post('/api/applications', { data: { company: matching.company, role: matching.role, source: matching.source } }),
            apiContext.post('/api/applications', { data: { company: other.company, role: other.role, source: other.source } }),
        ]);
        const [matchingApp, otherApp] = await Promise.all(created.map((r) => r.json()));

        try {
            await page.reload();
            await boardPage.searchCompanyRoleInput.fill(matching.company);

            await expect(boardPage.cardByRole(matching.role)).toBeVisible();
            await expect(boardPage.cardByRole(other.role)).toHaveCount(0);
        } finally {
            await apiContext.delete(`/api/applications/${matchingApp.id}`);
            await apiContext.delete(`/api/applications/${otherApp.id}`);
        }
    })

    test('Ensure you can filter by a tag', async ({ page, apiContext }) => {
        const tagged = uniqueApplication();
        const untagged = uniqueApplication();
        const created = await Promise.all([
            apiContext.post('/api/applications', {
                data: { company: tagged.company, role: tagged.role, source: tagged.source, tags: ['unique-tag'] },
            }),
            apiContext.post('/api/applications', {
                data: { company: untagged.company, role: untagged.role, source: untagged.source, tags: ['other-tag'] },
            }),
        ]);
        const [taggedApp, untaggedApp] = await Promise.all(created.map((r) => r.json()));

        try {
            await page.reload();
            await boardPage.filterByTagInput.fill('unique-tag');

            await expect(boardPage.cardByRole(tagged.role)).toBeVisible();
            await expect(boardPage.cardByRole(untagged.role)).toHaveCount(0);
        } finally {
            await apiContext.delete(`/api/applications/${taggedApp.id}`);
            await apiContext.delete(`/api/applications/${untaggedApp.id}`);
        }
    })

    test('Ensure you can sort by oldest & newest & A-Z', async ({ page, apiContext }) => {
        // Created sequentially (not Promise.all) so each gets a distinct,
        // known createdAt — required for the oldest/newest assertions to mean
        // anything.
        const apps = [uniqueApplication(), uniqueApplication(), uniqueApplication()];
        const created: { id: string; company: string; source: string }[] = [];
        for (const app of apps) {
            const response = await apiContext.post('/api/applications', {
                data: { company: app.company, role: app.role, source: app.source },
            });
            created.push(await response.json());
        }

        const knownIds = created.map((a) => a.id);

        try {
            await page.reload();

            await boardPage.selectSort('Newest first');
            await expect(async () => {
                expect(await boardPage.orderOfKnownApplications('wishlist', knownIds)).toEqual(
                    [...knownIds].reverse(),
                );
            }).toPass();

            await boardPage.selectSort('Oldest first');
            await expect(async () => {
                expect(await boardPage.orderOfKnownApplications('wishlist', knownIds)).toEqual(knownIds);
            }).toPass();

            await boardPage.selectSort('Company A–Z');
            const expectedAlphabetical = [...created]
                .sort((a, b) => a.company.localeCompare(b.company))
                .map((a) => a.id);
            await expect(async () => {
                expect(await boardPage.orderOfKnownApplications('wishlist', knownIds)).toEqual(expectedAlphabetical);
            }).toPass();
        } finally {
            for (const app of created) {
                await apiContext.delete(`/api/applications/${app.id}`);
            }
        }
    })

})
