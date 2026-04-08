import { CSRF_COOKIE_NAME } from "@/lib/session";

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? match.split("=")[1] : undefined;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getServiceUrl(serviceName: string): string {
  const isServer = typeof window === "undefined";
  if (isServer) {
    const serverURLs: Record<string, string> = {
      // user-service
      user: process.env.USER_SERVICE_URL || process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8081",

      // client-service
      client: process.env.CLIENT_SERVICE_URL || process.env.NEXT_PUBLIC_CLIENT_SERVICE_URL || "http://localhost:8082",

      // account-service
      account: process.env.ACCOUNT_SERVICE_URL || process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL || "http://localhost:8083",

    };
    return serverURLs[serviceName] || "";
  }

  // Route all browser-side API calls through the Next.js proxy
  return `/api/proxy/${serviceName}`;
}

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

const GENERIC_ERROR_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  429: "Too many requests",
  500: "Internal server error",
  502: "Service unavailable",
  503: "Service unavailable",
  504: "Request timed out",
};

export class ApiClient {
  private static async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const method = (options.method || "GET").toUpperCase();
      const csrfHeaders: Record<string, string> = {};
      if (method !== "GET" && method !== "HEAD") {
        const token = getCsrfToken();
        if (token) {
          csrfHeaders["X-CSRF-Token"] = token;
        }
      }

      const contentTypeHeader: Record<string, string> =
        method !== "GET" && method !== "HEAD"
          ? { "Content-Type": "application/json" }
          : {};

      const finalHeaders = {
        ...contentTypeHeader,
        ...csrfHeaders,
        ...options.headers,
      };

      console.log("[ApiClient] Request:", {
        method,
        url,
        headers: finalHeaders,
        body: options.body ?? null,
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: "include",
        headers: finalHeaders,
      });

      if (!response.ok) {
        let errorMessage = GENERIC_ERROR_MESSAGES[response.status] || `Request failed (${response.status})`;
        try {
          const errorText = await response.text();
          const errorBody = JSON.parse(errorText);
          if (typeof errorBody.message === "string" && errorBody.message) {
            errorMessage = errorBody.message;
          }
        } catch {
          // Ignore parse errors, use generic message
        }
        console.error("[ApiClient] Error response:", {
          method,
          url,
          status: response.status,
          statusText: response.statusText,
        });
        throw new ApiError(response.status, errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError(response.status, "Invalid response from server");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(504, "Request timed out");
      }
      throw new ApiError(0, "Network error");
    } finally {
      clearTimeout(timeout);
    }
  }

  // GET method
  static async get<T>(serviceName: string, endpoint: string): Promise<T> {
    const url = `${getServiceUrl(serviceName)}${endpoint}`;
    return this.request<T>(url, { method: "GET" });
  }

  // POST method
  static async post<T>(
    serviceName: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${getServiceUrl(serviceName)}${endpoint}`;
    return this.request<T>(url, {
      method: "POST", 
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT method
  static async put<T>(
    serviceName: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${getServiceUrl(serviceName)}${endpoint}`;
    return this.request<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE method
  static async delete<T>(
    serviceName: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${getServiceUrl(serviceName)}${endpoint}`;
    return this.request<T>(url, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}
