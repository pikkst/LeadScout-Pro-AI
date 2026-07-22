// Auth service: login/register/logout/current user against the backend.
import { api } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
  isActive: boolean;
  createdAt: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { user } = await api<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  role?: AuthUser["role"];
}): Promise<{ user: AuthUser; autoLoggedIn?: boolean }> {
  return api<{ user: AuthUser; autoLoggedIn?: boolean }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  } finally { /* cookie is cleared by the server */ }
}

export async function fetchTeam(): Promise<AuthUser[]> {
  return api<AuthUser[]>("/auth/team");
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: AuthUser["role"];
  isActive?: boolean;
}): Promise<AuthUser> {
  return api<AuthUser>("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      password: input.password,
      role: input.role ?? "AGENT",
      isActive: input.isActive ?? true,
    }),
  });
}

export async function updateUser(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    role: AuthUser["role"];
    isActive: boolean;
    password: string;
  }>,
): Promise<AuthUser> {
  return api<AuthUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await api(`/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchAllUsers(): Promise<AuthUser[]> {
  return api<AuthUser[]>("/admin/users");
}
