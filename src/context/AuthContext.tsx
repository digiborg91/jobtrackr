import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type LoginInput, type RegisterInput } from "@/api/auth";
import { ApiRequestError } from "@/api/client";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = React.useCallback(
    async (input: LoginInput) => {
      const loggedInUser = await authApi.login(input);
      queryClient.setQueryData(["auth", "me"], loggedInUser);
    },
    [queryClient],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const newUser = await authApi.register(input);
      queryClient.setQueryData(["auth", "me"], newUser);
    },
    [queryClient],
  );

  const logout = React.useCallback(async () => {
    await authApi.logout();
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
  }, [queryClient]);

  const value = React.useMemo(
    () => ({ user: user ?? null, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
