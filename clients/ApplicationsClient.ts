import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface ApplicationPayload {
    company: string;
    role: string;
    jobUrl?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    location?: string | null;
    status?: string;
    source?: string;
    tags?: string[];
    nextFollowUp?: string | null;
    isFavorite?: boolean;
    note?: string | null;
}

export class ApplicationsClient {
    constructor(private request: APIRequestContext) {}

    async create(data: Partial<ApplicationPayload>): Promise<APIResponse> {
        return this.request.post('/api/applications', { data });
    }

    async get(id: string): Promise<APIResponse> {
        return this.request.get(`/api/applications/${id}`);
    }

    async list(query: Record<string, string> = {}): Promise<APIResponse> {
        const queryString = new URLSearchParams(query).toString();
        return this.request.get(`/api/applications${queryString ? `?${queryString}` : ''}`);
    }

    async update(id: string, data: Partial<ApplicationPayload>): Promise<APIResponse> {
        return this.request.patch(`/api/applications/${id}`, { data });
    }

    async updateStatus(id: string, status: string): Promise<APIResponse> {
        return this.request.patch(`/api/applications/${id}/status`, { data: { status } });
    }

    async updateFavorite(id: string, isFavorite: boolean): Promise<APIResponse> {
        return this.request.patch(`/api/applications/${id}/favorite`, { data: { isFavorite } });
    }

    async delete(id: string): Promise<APIResponse> {
        return this.request.delete(`/api/applications/${id}`);
    }

    async editNotes(noteId: string, notes: string): Promise<APIResponse> {
        return this.request.patch(`/api/notes/${noteId}`, { data: { body: notes } });
    }

    async deleteNotes(id: string): Promise<APIResponse> {
        return this.request.delete(`/api/applications/${id}/notes`);
    }

    async bulkUpdateStatus(ids: string[], status: string): Promise<APIResponse> {
        return this.request.post('/api/applications/bulk-status', { data: { ids, status } });
    
    }
}
