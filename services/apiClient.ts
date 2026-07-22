// Central API client. Authentication is carried by an HttpOnly same-site cookie.

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
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401) {
    // Notify the app so it can redirect to login.
    window.dispatchEvent(new CustomEvent("unitel:unauthorized"));
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { error: response.ok ? "Invalid JSON response" : response.statusText || "Request failed" }; }
  }

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
