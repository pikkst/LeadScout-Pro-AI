// Auth service: login/register/logout/current user against the backend.
import { api, setToken } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
  isActive: boolean;
  createdAt: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user, token } = await api<{ user: AuthUser; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(token);
  return user;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  role?: AuthUser["role"];
}): Promise<{ user: AuthUser; token?: string }> {
  const result = await api<{ user: AuthUser; token?: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (result.token) setToken(result.token);
  return result;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await api<{ user: AuthUser }>("/auth/me");
    return user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

export async function fetchTeam(): Promise<AuthUser[]> {
  return api<AuthUser[]>("/auth/team");
}
