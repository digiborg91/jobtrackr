import { api } from "@/api/client";
import type { ApplicationNote } from "@/types";

export const notesApi = {
  list: (applicationId: string) =>
    api.get<ApplicationNote[]>(`/applications/${applicationId}/notes`),
  create: (applicationId: string, body: string) =>
    api.post<ApplicationNote>(`/applications/${applicationId}/notes`, { body }),
  remove: (noteId: string) => api.delete<void>(`/notes/${noteId}`),
};
