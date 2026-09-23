import { api } from "@/api/client";
import type { ApplicationSource, ApplicationStatus, JobApplication, Paginated } from "@/types";

export interface ApplicationFilters {
  status?: ApplicationStatus;
  search?: string;
  tag?: string;
  sort?: "newest" | "oldest" | "company";
  page?: number;
  pageSize?: number;
}

export interface ApplicationInput {
  company: string;
  role: string;
  jobUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  location?: string | null;
  status?: ApplicationStatus;
  source: ApplicationSource;
  isFavorite?: boolean;
  tags?: string[];
  nextFollowUp?: string | null;
}

function buildQuery(filters: ApplicationFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const applicationsApi = {
  list: (filters: ApplicationFilters = {}) =>
    api.get<Paginated<JobApplication>>(`/applications${buildQuery(filters)}`),
  get: (id: string) => api.get<JobApplication>(`/applications/${id}`),
  create: (input: ApplicationInput) => api.post<JobApplication>("/applications", input),
  update: (id: string, input: Partial<ApplicationInput>) =>
    api.patch<JobApplication>(`/applications/${id}`, input),
  updateStatus: (id: string, status: ApplicationStatus) =>
    api.patch<JobApplication>(`/applications/${id}/status`, { status }),
  updateFavorite: (id: string, isFavorite: boolean) =>
    api.patch<JobApplication>(`/applications/${id}/favorite`, { isFavorite }),
  remove: (id: string) => api.delete<void>(`/applications/${id}`),
};
