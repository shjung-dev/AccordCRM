import type { User } from "@/types";

export const SESSION_TTL_SECONDS = 60 * 60 * 12;
export const SESSION_COOKIE_NAME = "accord_crm_session";

export type SessionPayload = User & {
  iat: number;
  exp: number;
};

const textEncoder = new TextEncoder();

// Encodes data into base64url format (URL-safe base64 without padding)
function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? textEncoder.encode(data) : data;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
    .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Decodes base64url-encoded string format back to a regular string
function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  return atob(padded);
}

async function createHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Decodes a base64url-encoded string into raw bytes (Uint8Array)
function base64UrlDecodeToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getSessionSecret(): string | null {
  return process.env.AUTH_COOKIE_SECRET?.trim() || null;
}

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await createHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));
  return `${data}.${signatureEncoded}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const data = `${header}.${body}`;
  const key = await createHmacKey(secret);
  const signatureBytes = base64UrlDecodeToBytes(signature);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    textEncoder.encode(data)
  );

  if (!isValid) return null;

  try {
    const payload = JSON.parse(base64UrlDecodeToString(body)) as SessionPayload;
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const CSRF_COOKIE_NAME = "accord_crm_csrf";
export const ACCESS_TOKEN_COOKIE_NAME = "cognito_access_token";

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildSessionPayload(user: User): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    ...user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
}
