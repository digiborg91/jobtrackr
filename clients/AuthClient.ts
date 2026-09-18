import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export class AuthClient {
    constructor(private request: APIRequestContext) {}

    // Every method returns the raw APIResponse rather than parsed/asserted
    // data — the client's job is just "make the request," not "decide if it
    // was successful." That matters for API testing especially, since a test
    // asserting a 400/401 response needs the raw response just as much as a
    // happy-path test does.
    async register(data: RegisterPayload): Promise<APIResponse> {
        return this.request.post('/api/auth/register', { data });
    }

    async login(data: LoginPayload): Promise<APIResponse> {
        return this.request.post('/api/auth/login', { data });
    }

    async logout(): Promise<APIResponse> {
        return this.request.post('/api/auth/logout');
    }

    async me(): Promise<APIResponse> {
        return this.request.get('/api/auth/me');
    }
}
