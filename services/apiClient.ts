// Central API client. Handles auth token, JSON, and error normalization.
const TOKEN_KEY = "unitel_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    setToken(null);
    // Notify the app so it can redirect to login.
    window.dispatchEvent(new CustomEvent("unitel:unauthorized"));
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data && data.error) || response.statusText || "Request failed",
      data?.code,
      data?.details,
    );
  }
  return data as T;
}
