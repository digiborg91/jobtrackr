import { api } from "@/api/client";
import type { User } from "@/types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  me: () => api.get<User>("/auth/me"),
  register: (input: RegisterInput) => api.post<User>("/auth/register", input),
  login: (input: LoginInput) => api.post<User>("/auth/login", input),
  logout: () => api.post<void>("/auth/logout"),
};
