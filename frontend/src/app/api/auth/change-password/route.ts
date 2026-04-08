// Handles the Cognito NEW_PASSWORD_REQUIRED challenge (first login).
// The frontend sends the session token + new password; we complete the
// challenge, then issue the normal session cookie.
import {
  buildSessionPayload,
  createSessionToken,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/session";
import {
  CognitoAuthError,
  friendlyCognitoError,
  respondToNewPasswordChallenge,
} from "@/lib/cognito";
import { NextResponse } from "next/server";
import type { ApiUser, User, UserRole } from "@/types";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  let email = "";
  let session = "";
  let newPassword = "";
  let role: UserRole | null = null;

  try {
    const body = (await request.json()) as {
      email?: string;
      session?: string;
      newPassword?: string;
      role?: UserRole;
    };
    email = typeof body.email === "string" ? body.email.trim() : "";
    session = typeof body.session === "string" ? body.session : "";
    newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    role = body.role === "admin" || body.role === "agent" ? body.role : null;
  } catch {
    return badRequest("Invalid request payload.");
  }

  if (!email || !session || !newPassword || !role) {
    return badRequest("Missing required fields.");
  }

  const clientId = process.env.COGNITO_CLIENT_ID?.trim();
  const region = process.env.COGNITO_REGION?.trim() || "ap-southeast-1";

  if (!clientId) {
    return NextResponse.json({ message: "Authentication service is not configured." }, { status: 500 });
  }

  try {
    await respondToNewPasswordChallenge(session, email, newPassword, clientId, region);
  } catch (err) {
    if (err instanceof CognitoAuthError) {
      return badRequest(friendlyCognitoError(err), 400);
    }
    return NextResponse.json({ message: "Failed to set password. Please try again." }, { status: 503 });
  }

  const secret = getSessionSecret();
  const internalKey = process.env.INTERNAL_SERVICE_KEY?.trim();
  if (!secret || !internalKey) {
    return NextResponse.json({ message: "Server authentication is not configured." }, { status: 500 });
  }

  const userServiceUrl =
    process.env.USER_SERVICE_URL || process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:8081";

  let apiUser: ApiUser;
  try {
    const res = await fetch(`${userServiceUrl}/api/users/email/${encodeURIComponent(email)}`, {
      headers: { "Content-Type": "application/json", "X-Internal-Key": internalKey },
    });
    if (!res.ok) return badRequest("Account not found.", 404);
    apiUser = (await res.json()) as ApiUser;
  } catch {
    return badRequest("Unable to connect to server.", 503);
  }

  const user: User = {
    id: apiUser.userId,
    email: apiUser.emailAddress,
    first_name: apiUser.firstName,
    last_name: apiUser.lastName,
    role,
    isRootAdmin: apiUser.isRootAdmin,
  };

  const token = await createSessionToken(buildSessionPayload(user), secret);
  const isSecure = new URL(request.url).protocol === "https:";
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
    httpOnly: false,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
