import { faker } from '@faker-js/faker';
import { test, expect } from '../../fixtures/auth.fixture';
import { uniqueApplication } from '../../fixtures/test-data';
import { ApplicationsClient } from '../../clients/ApplicationsClient';
import { request as playwrightRequest } from '@playwright/test';

interface ApplicationSummary {
    id: string;
    company: string;
}

test.describe('Applications API', () => {
    test('Create a new Application', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const response = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            jobUrl: testApplication.jobUrl,
            salaryMin: Number(testApplication.salaryMin),
            salaryMax: Number(testApplication.salaryMax),
            location: testApplication.location,
            source: testApplication.source,
            tags: testApplication.tags.split(','),
            nextFollowUp: testApplication.followUpDate,
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toMatchObject({
            company: testApplication.company,
            role: testApplication.role,
            jobUrl: testApplication.jobUrl,
            status: 'wishlist', // the default when no status is provided
        });
        expect(body.salaryMin).toBe(Number(testApplication.salaryMin));
        expect(body.salaryMax).toBe(Number(testApplication.salaryMax));
        expect(body.tags).toEqual(testApplication.tags.split(','));
    })

    test('update an existing Application', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const created = await createResponse.json();

        const updatedRole = faker.person.jobTitle();
        const updateResponse = await applicationsClient.update(created.id, { role: updatedRole });

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody.role).toBe(updatedRole);

        // Don't just trust the PATCH response's own claim — fetch it back
        // separately to confirm the change actually persisted.
        const getResponse = await applicationsClient.get(created.id);
        expect(getResponse.status()).toBe(200);
        const fetched = await getResponse.json();
        expect(fetched.role).toBe(updatedRole);
        expect(fetched.company).toBe(testApplication.company); // untouched field stays as-is
    })

    test('transition an application through statuses', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const created = await createResponse.json();
        expect(created.status).toBe('wishlist');

        const statuses = ['applied', 'interviewing', 'offer', 'rejected'];

        for (const status of statuses) {
            await test.step(`transitions to ${status}`, async () => {
                const response = await applicationsClient.updateStatus(created.id, status);
                expect(response.status()).toBe(200);
                const body = await response.json();
                expect(body.status).toBe(status);

                // Verify it stuck, independent of what the PATCH response claims.
                const getResponse = await applicationsClient.get(created.id);
                const fetched = await getResponse.json();
                expect(fetched.status).toBe(status);
            });
        }
    })

    test('delete an existing Application', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const created = await createResponse.json();

        const deleteResponse = await applicationsClient.delete(created.id);
        expect(deleteResponse.status()).toBe(204);

        // Ensure the record is actually gone by trying to fetch it 
        const getResponse = await applicationsClient.get(created.id);
        expect(getResponse.status()).toBe(404);
    })

    test('Search works', async ({ apiContext }) => {
        const applicationsClient = new ApplicationsClient(apiContext);
        const matching = uniqueApplication();
        const other = uniqueApplication();

        const [matchingResponse, otherResponse] = await Promise.all([
            applicationsClient.create({ company: matching.company, role: matching.role, source: matching.source }),
            applicationsClient.create({ company: other.company, role: other.role, source: other.source }),
            
        ]);
        const matchingApp: ApplicationSummary = await matchingResponse.json();
        const otherApp: ApplicationSummary = await otherResponse.json();

        try {
            const response = await applicationsClient.list({ search: matching.company });
            expect(response.status()).toBe(200);
            const body = await response.json();
            const ids = body.items.map((item: ApplicationSummary) => item.id);

            expect(ids).toContain(matchingApp.id);
            expect(ids).not.toContain(otherApp.id);
        } finally {
            await applicationsClient.delete(matchingApp.id);
            await applicationsClient.delete(otherApp.id);
        }
    })

    test('you can filter applications', async ({ apiContext }) => {
        const applicationsClient = new ApplicationsClient(apiContext);
        const tagged = uniqueApplication();
        const untagged = uniqueApplication();

        const [taggedResponse, untaggedResponse] = await Promise.all([
            applicationsClient.create({ company: tagged.company, role: tagged.role, source: tagged.source, tags: ['unique-tag'] }),
            applicationsClient.create({ company: untagged.company, role: untagged.role, source: untagged.source, tags: ['other-tag'] }),
        ]);
        const taggedApp: ApplicationSummary = await taggedResponse.json();
        const untaggedApp: ApplicationSummary = await untaggedResponse.json();

        try {
            const response = await applicationsClient.list({ tag: 'unique-tag' });
            expect(response.status()).toBe(200);
            const body = await response.json();
            const ids = body.items.map((item: ApplicationSummary) => item.id);

            expect(ids).toContain(taggedApp.id);
            expect(ids).not.toContain(untaggedApp.id);
        } finally {
            await applicationsClient.delete(taggedApp.id);
            await applicationsClient.delete(untaggedApp.id);
        }
    })

    test('arrange applications in order , A-Z New-Old', async ({ apiContext }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        // Created sequentially, not in parallel, so each gets a distinct,
        // known createdAt — required for the oldest/newest assertions.
        const seeds = [uniqueApplication(), uniqueApplication(), uniqueApplication()];
        const created: ApplicationSummary[] = [];
        for (const seed of seeds) {
            const response = await applicationsClient.create({ company: seed.company, role: seed.role, source: seed.source });
            created.push(await response.json());
        }
        const knownIds = created.map((app) => app.id);

        // Only compare the relative order of the ids this test created,
        // ignoring anything else the account happens to have — other tests
        // running in parallel against the same shared account can otherwise
        // make an exact-list comparison flaky even though sorting is correct.
        function orderOfKnown(items: ApplicationSummary[]): string[] {
            return items.map((item) => item.id).filter((id) => knownIds.includes(id));
        }

        try {
            const newestResponse = await applicationsClient.list({ sort: 'newest', pageSize: '100' });
            const newestBody = await newestResponse.json();
            expect(orderOfKnown(newestBody.items)).toEqual([...knownIds].reverse());

            const oldestResponse = await applicationsClient.list({ sort: 'oldest', pageSize: '100' });
            const oldestBody = await oldestResponse.json();
            expect(orderOfKnown(oldestBody.items)).toEqual(knownIds);

            const companyResponse = await applicationsClient.list({ sort: 'company', pageSize: '100' });
            const companyBody = await companyResponse.json();
            const expectedAlphabetical = [...created]
                .sort((a, b) => a.company.localeCompare(b.company))
                .map((app) => app.id);
            expect(orderOfKnown(companyBody.items)).toEqual(expectedAlphabetical);
        } finally {
            for (const app of created) {
                await applicationsClient.delete(app.id);
            }
        }
    })

    test( 'User can Toggle favourite of a existing Application', async ({ apiContext, testApplication }) => {
        // Create a application
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
            isFavorite: false
            });
    
        //Assert the created application has defaulted isFavorite to false
        const responseBody = await createResponse.json();
        expect(responseBody.isFavorite).toBe(false);

        //Update the application to favorite - update the patch with an optional parameter isFavorite true
        const updateFavoriteResponse = await applicationsClient.updateFavorite(responseBody.id, true);//Update
        const updateFavoriteBody = await updateFavoriteResponse.json(); //Capture the response 
            expect(updateFavoriteBody.isFavorite).toBe(true); // Assert ? 
    })
    
    test('Ensure a user can edit notes for an application', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);
        //Creaste a application
        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
            });
            
            //Assert the created application has created with note

        const responsebody = await createResponse.json();

        const noteResponse = await apiContext.post(`/api/applications/${responsebody.id}/notes`, { data: { body: testApplication.notes } });
        const note = await noteResponse.json();
        expect(note.body).toBe(testApplication.notes);
        expect(noteResponse.status()).toBe(201);

        //Update the application to edit notes - update the patch with an optional parameter notes
        const updateNotesResponse = await applicationsClient.editNotes(note.id, "Updated Notes");//Update
        const updateNotesBody = await updateNotesResponse.json();
        expect(updateNotesBody.body).toBe("Updated Notes"); 
        expect(updateNotesResponse.status()).toBe(200);

    })

    test('Ensure a user cannot edit notes for an application on an empty body', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody = await createResponse.json();

        const noteResponse = await apiContext.post(`/api/applications/${responsebody.id}/notes`, { data: { body: testApplication.notes } });
        const note = await noteResponse.json();
        expect(note.body).toBe(testApplication.notes);
        expect(noteResponse.status()).toBe(201);

        //Update notes on an application of an empty body
        const updateNotesResponse = await applicationsClient.editNotes(note.id, "");//Update
        expect(updateNotesResponse.status()).toBe(400);

    })

    test('Ensure a user cannot edit notes for an application of another user', async ({ apiContext, testApplication, baseURL }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });


        const responsebody = await createResponse.json();

        const noteResponse = await apiContext.post(`/api/applications/${responsebody.id}/notes`, { data: { body: testApplication.notes } });
        const note = await noteResponse.json();
        expect(note.body).toBe(testApplication.notes);
        expect(noteResponse.status()).toBe(201);


        
        // Register + log in as a second, completely separate user
        const otherUserContext = await playwrightRequest.newContext({ baseURL });
        await otherUserContext.post('/api/auth/register', {
            data: { name: 'Other User', email: `other-${Date.now()}@example.com`, password: 'password123' },
        });

        const otherApplicationsClient = new ApplicationsClient(otherUserContext);

        const updateNotesResponse = await otherApplicationsClient.editNotes(note.id, "Updated Notes");
        expect(updateNotesResponse.status()).toBe(404);     

        await otherUserContext.dispose();

    })

    test('Ensure a user cannot edit notes for a non-existent application', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody = await createResponse.json();

        const noteResponse = await apiContext.post(`/api/applications/${responsebody.id}/notes`, { data: { body: testApplication.notes } });
        const note = await noteResponse.json();
        expect(note.body).toBe(testApplication.notes);
        expect(noteResponse.status()).toBe(201);

        //Application is added.  now update a non-existent application and return 500
        const updateNotesResponse = await applicationsClient.editNotes("non-existent-id", "Updated Notes");
        expect(updateNotesResponse.status()).toBe(500);

    })

    test('Ensure a user can bulk move applications to a new status', async ({ apiContext, testApplication }) => {

        //Create a few applications at wishlist status
        const applicationsClient = new ApplicationsClient(apiContext);

        const createResponse1 = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody1 = await createResponse1.json();

        const createResponse2 = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody2 = await createResponse2.json();

        const createResponse3 = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody3 = await createResponse3.json();
        
        //Bulk update the applications to a new status
        const ids = [responsebody1.id, responsebody2.id, responsebody3.id];
        const bulkUpdateResponse = await applicationsClient.bulkUpdateStatus(ids, "applied");
        expect(bulkUpdateResponse.status()).toBe(200);

        const bulkBody = await bulkUpdateResponse.json();
        expect(bulkBody.updated).toBe(ids.length);
        expect(bulkBody.items).toHaveLength(ids.length);
            for (const item of bulkBody.items) {
                expect(item.status).toBe("applied");
            }

        for (const id of ids) {
            const getResponse = await applicationsClient.get(id);
            const fetched = await getResponse.json();
            expect(fetched.status).toBe("applied");
        }
    })

    test('Ensure a user cannot bulk move applications to a new status with invalid ids. 400 returned', async ({ apiContext, testApplication }) => {

        //Create a few applications at wishlist status
        const applicationsClient = new ApplicationsClient(apiContext);    
        
        const createResponse1 = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody1 = await createResponse1.json();

        const createResponse2 = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const responsebody2 = await createResponse2.json();

        //Bulk update the applications to a new status with invalid ids
        const ids = [responsebody1.id, responsebody2.id, "invalid-id"];
        const bulkUpdateResponse = await applicationsClient.bulkUpdateStatus(ids, "applied");
        expect(bulkUpdateResponse.status()).toBe(400);
        
        //Assert both of this test's applications still exist. Only count our own ids: the account is
        //shared, so other tests' applications can be in the list at the same time.
        const listResponse = await applicationsClient.list({ pageSize: '100' });
        const listBody = await listResponse.json();
        const mine = listBody.items.filter((item: { id: string }) => [responsebody1.id, responsebody2.id].includes(item.id));
        expect(mine).toHaveLength(2);

        // Add assert that the applications are still in the original status and not updated
        for (const id of [responsebody1.id, responsebody2.id]) {
            const getResponse = await applicationsClient.get(id);
            const fetched = await getResponse.json();
            expect(fetched.status).toBe("wishlist");
        }

    })

    test('Ensure ids can only hold 50 entries -> 51 returns 400', async ({ apiContext }) => {
        const applicationsClient = new ApplicationsClient(apiContext);

        // 49 and 50 pass validation (404: the fake ids don't exist); 51 is rejected for size (400).
        const cases = [
            { size: 49, expected: 404 },
            { size: 50, expected: 404 },
            { size: 51, expected: 400 },
        ];

        for (const { size, expected } of cases) {
            const ids = Array.from({ length: size }, () => faker.string.uuid());
            const response = await applicationsClient.bulkUpdateStatus(ids, "applied");
            expect(response.status(), `${size} ids`).toBe(expected);
        }
    })

    test('Ensure duplicated IDs are treated as one.', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext);
        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const created = await createResponse.json();

        const ids = [created.id, created.id, created.id];
        const response = await applicationsClient.bulkUpdateStatus(ids, "applied");
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.updated).toBe(1);
        expect(body.items).toHaveLength(1);
        expect(body.items[0].id).toBe(created.id);
        expect(body.items[0].status).toBe("applied");
    })

    test('Ensure if any listed id does not exist, the whole request returns 404 & nothing is updated', async ({ apiContext, testApplication }) => {
        const applicationsClient = new ApplicationsClient(apiContext)
        const createResponse = await applicationsClient.create({
            company: testApplication.company,
            role: testApplication.role,
            source: testApplication.source,
        });
        const created = await createResponse.json();
        
        const missingId = faker.string.uuid()
        const bulkResponse = await applicationsClient.bulkUpdateStatus([created.id, missingId], "applied");
        expect(bulkResponse.status()).toBe(404)

        const getResponse = await applicationsClient.get(created.id)
        const fetched = await getResponse.json();
        expect(fetched.status).toBe("wishlist");
    })

    test('Ensure a no session cookie returns a 401 error', async ({ baseURL }) => {
        const unknownContext = await playwrightRequest.newContext({ baseURL });
        const unknownClient = await new ApplicationsClient(unknownContext);

        const response = await unknownClient.bulkUpdateStatus([faker.string.uuid()], "applied");
        expect(response.status()).toBe(401)

        //assert no id was created
        const body = await response.json()
        expect(body.error.code).toBe("unauthorized");
        expect(body).not.toHaveProperty("id");

        //dispose
        await unknownContext.dispose();
    })
});
