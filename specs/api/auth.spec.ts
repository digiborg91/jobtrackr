import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { AuthClient } from '../../clients/AuthClient';

function newCredentials() {
    return {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 12 }),
    };
}

test.describe('Auth API', () => {
    test.describe('register', () => {
        test('registers a new user and returns it without a password', async ({ request }) => {
            const authClient = new AuthClient(request);
            const newUser = newCredentials();

            const response = await authClient.register(newUser);

            expect(response.status()).toBe(201);
            const body = await response.json();
            expect(body).toMatchObject({ email: newUser.email.toLowerCase(), name: newUser.name });
            expect(body).not.toHaveProperty('password');
            expect(body).not.toHaveProperty('passwordHash');
        });
    });

    test.describe('login', () => {
        test('logs in with correct credentials and sets a session cookie', async ({ request }) => {
            const authClient = new AuthClient(request);
            const user = newCredentials();
            await authClient.register(user);

            const response = await authClient.login({ email: user.email, password: user.password });

            expect(response.status()).toBe(200);
            expect(response.headers()['set-cookie']).toContain('jobtrackr_token');
        });

        test('rejects an incorrect password', async ({ request }) => {
            const authClient = new AuthClient(request);
            const user = newCredentials();
            await authClient.register(user);

            const response = await authClient.login({ email: user.email, password: 'the-wrong-password' });

            expect(response.status()).toBe(401);
        });

        test('rejects an email that has not been registered', async ({ request }) => {
            const authClient = new AuthClient(request);

            const response = await authClient.login({ email: faker.internet.email(), password: 'whatever-password' });

            expect(response.status()).toBe(401);
        });

        test('rejects an invalid email format with a field error', async ({ request }) => {
            const authClient = new AuthClient(request);

            const response = await authClient.login({ email: 'not-an-email', password: 'password123' });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.error.fieldErrors).toHaveProperty('email');
        });
    });
});
