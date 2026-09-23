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

    test('Ensure a user cannot edit notes for an application of another user', async ({ apiContext, testApplication }) => {
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
        const otherUserContext = await playwrightRequest.newContext({ baseURL: 'http://localhost:5174' });
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

        //Application is added.  now update a non existant application adn return 403 
        const updateNotesResponse = await applicationsClient.editNotes("non-existent-id", "Updated Notes");
        expect(updateNotesResponse.status()).toBe(500);

    })
});
