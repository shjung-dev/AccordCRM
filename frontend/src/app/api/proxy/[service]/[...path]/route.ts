import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/session";

const SERVICE_URLS: Record<string, string> = {
  user: process.env.USER_SERVICE_URL || process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8081",
  client: process.env.CLIENT_SERVICE_URL || process.env.NEXT_PUBLIC_CLIENT_SERVICE_URL || "http://localhost:8082",
  account: process.env.ACCOUNT_SERVICE_URL || process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL || "http://localhost:8083",
};

const BLOCKED_PATH_PREFIXES = [
  "actuator",
  "management",
  "internal",
  "env",
  "health",
  "metrics",
  "info",
  "beans",
  "configprops",
  "mappings",
  "trace",
  "threaddump",
  "heapdump",
  "loggers",
  "shutdown",
];

const STRIPPED_RESPONSE_HEADERS = [
  "set-cookie",
  "x-powered-by",
  "server",
  "x-application-context",
  "x-aspnet-version",
];

type ProxyParams = { service: string; path: string[] | string | undefined };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const PROXY_TIMEOUT_MS = 30_000;
const MAX_REQUEST_BODY_BYTES = 1_048_576;

const RATE_LIMIT_ENABLED =
  (process.env.PROXY_RATE_LIMIT_ENABLED || "true").toLowerCase() !== "false";
const SMARTCRM_CHATBOT_ENABLED =
  (process.env.SMARTCRM_CHATBOT_ENABLED || "true").toLowerCase() !== "false";
const RATE_LIMIT_WINDOW_SECONDS = Number.parseInt(
  process.env.PROXY_RATE_LIMIT_WINDOW_SECONDS || "60",
  10
);
const RATE_LIMIT_MAX = Number.parseInt(
  process.env.PROXY_RATE_LIMIT_MAX || "120",
  10
);

const rateLimitStore: Map<string, RateLimitEntry> =
  (globalThis as unknown as { __proxyRateLimitStore?: Map<string, RateLimitEntry> })
    .__proxyRateLimitStore || new Map();
(globalThis as unknown as { __proxyRateLimitStore?: Map<string, RateLimitEntry> })
  .__proxyRateLimitStore = rateLimitStore;

function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : realIp || "unknown";
  return `${ip}:${request.nextUrl.pathname}`;
}

function checkRateLimit(request: NextRequest): NextResponse | null {
  if (!RATE_LIMIT_ENABLED) return null;
  if (!Number.isFinite(RATE_LIMIT_WINDOW_SECONDS) || RATE_LIMIT_WINDOW_SECONDS <= 0) {
    return null;
  }
  if (!Number.isFinite(RATE_LIMIT_MAX) || RATE_LIMIT_MAX <= 0) {
    return null;
  }
  const key = getClientKey(request);
  const now = Date.now();
  const resetAt = now + RATE_LIMIT_WINDOW_SECONDS * 1000;
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt });
    return null;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { message: "Too many requests." },
      { status: 429, headers: { "Retry-After": `${Math.ceil((entry.resetAt - now) / 1000)}` } }
    );
  }
  entry.count += 1;
  return null;
}

async function proxy(request: NextRequest, params: ProxyParams) {
  const limited = checkRateLimit(request);
  if (limited) return limited;

  if (!SMARTCRM_CHATBOT_ENABLED) {
    const rawPath = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
    if (params.service === "account" && rawPath.startsWith("api/ai/chat")) {
      return NextResponse.json({ message: "Feature not available." }, { status: 403 });
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = request.headers.get("X-CSRF-Token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ message: "Invalid CSRF token." }, { status: 403 });
    }
  }

  const baseUrl = SERVICE_URLS[params.service];
  if (!baseUrl) {
    return NextResponse.json({ message: "Unknown service." }, { status: 400 });
  }

  const rawPath = Array.isArray(params.path)
    ? params.path.join("/")
    : params.path || "";

  const pathSegments = rawPath.replace(/^\/+/, "").split("/");
  const hasBlockedSegment = pathSegments.some((segment) =>
    BLOCKED_PATH_PREFIXES.includes(segment.toLowerCase())
  );
  if (hasBlockedSegment) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const trimmedBase = baseUrl.replace(/\/+$/, "");
  let normalizedPath = rawPath.replace(/^\/+/, "");
  if (trimmedBase.endsWith("/api") && normalizedPath.startsWith("api/")) {
    normalizedPath = normalizedPath.slice(4);
  }

  const targetUrl = normalizedPath
    ? `${trimmedBase}/${normalizedPath}${request.nextUrl.search}`
    : `${trimmedBase}${request.nextUrl.search}`;

  console.log(`[proxy] ${request.method} ${request.nextUrl.pathname} → ${targetUrl}`);

  const token = request.cookies.get("cognito_access_token")?.value;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("origin");
  headers.delete("referer");
  // Strip Next.js RSC headers — large values cause Tomcat 400 (header size limit)
  headers.delete("rsc");
  headers.delete("next-router-state-tree");
  headers.delete("next-router-prefetch");
  headers.delete("next-router-segment-prefetch");
  headers.delete("next-url");
  headers.delete("next-action");

  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("content-type", headers.get("content-type") || "application/json");
  } else {
    headers.delete("content-type");
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
    if (body.length > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { message: "Request body too large." },
        { status: 413 }
      );
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  const init: RequestInit = {
    method: request.method,
    headers,
    body,
    signal: controller.signal,
    cache: "no-store",
  };

  let response: Response;
  try {
    response = await fetch(targetUrl, init);
  } catch (err) {
    console.error(`[proxy] ${request.method} ${targetUrl} — fetch error:`, err);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ message: "Upstream timeout." }, { status: 504 });
    }
    return NextResponse.json({ message: "Upstream unreachable." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  console.log(`[proxy] ${request.method} ${targetUrl} → ${response.status}`);

  const responseHeaders = new Headers(response.headers);
  for (const header of STRIPPED_RESPONSE_HEADERS) {
    responseHeaders.delete(header);
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<ProxyParams> }
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<ProxyParams> }
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<ProxyParams> }
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<ProxyParams> }
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<ProxyParams> }
) {
  return proxy(request, await params);
}
