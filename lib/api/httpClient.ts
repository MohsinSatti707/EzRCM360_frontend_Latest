/**
 * Concrete HTTP client implementation. Single Responsibility: HTTP transport only.
 */

import { API_URL, AUTH_TOKEN_KEY } from "@/lib/env";
import { handle401, handle403 } from "./authCallbacks";
import type { IHttpClient } from "./interfaces";

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export class HttpClient implements IHttpClient {
  constructor(
    private readonly baseUrl: string = API_URL.replace(/\/$/, ""),
    private readonly getToken: () => string | null = () =>
      typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null
  ) {}

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith("http")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        const parsed = JSON.parse(text);
        // Handle array-format validation errors: [{"errorMessage":"..."}]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const msgs = parsed
            .map((e: { errorMessage?: string; ErrorMessage?: string }) =>
              e.errorMessage ?? e.ErrorMessage
            )
            .filter(Boolean);
          message = msgs.length > 0 ? msgs.join(" ") : text;
        } else if (parsed && typeof parsed === "object") {
          const json = parsed as {
            message?: string;
            title?: string;
            detail?: string;
            errors?: Record<string, string[]>;
          };
          // Extract field-level validation errors from ValidationProblemDetails
          if (json.errors && typeof json.errors === "object") {
            const fieldErrors = Object.values(json.errors).flat().filter(Boolean);
            if (fieldErrors.length > 0) {
              message = fieldErrors.join(" ");
            } else {
              message = json.detail || json.message || json.title || text;
            }
          } else {
            message = json.detail || json.message || json.title || text;
          }
        }
      } catch {
        /* use text as-is */
      }
      if (res.status === 401) {
        handle401();
        throw new Error("Your session has expired. Please sign in again.");
      }
      if (res.status === 403) {
        handle403(message);
        throw new Error(message || "You don't have permission to perform this action.");
      }
      throw new Error(message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = (await res.json()) as ApiResponse<T> | T;
      if (
        json &&
        typeof json === "object" &&
        "data" in json &&
        "success" in json
      )
        return (json as ApiResponse<T>).data as T;
      return json as T;
    }
    return res.text() as Promise<T>;
  }
}
