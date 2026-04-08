import {
  ACCESS_TOKEN_COOKIE_NAME,
  buildSessionPayload,
  createSessionToken,
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  getSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/session";
import { CognitoAuthError, friendlyCognitoError, initiateAuth, CognitoTokens } from "@/lib/cognito";

export const REFRESH_TOKEN_COOKIE = "accord_crm_refresh";
import { NextResponse } from "next/server";
import type { ApiUser, User, UserRole } from "@/types";

function badRequest(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function getUserServiceUrl(): string {
  return (
    process.env.USER_SERVICE_URL ||
    process.env.NEXT_PUBLIC_USER_SERVICE_URL ||
    "http://localhost:8081"
  );
}

function getCognitoConfig(): { clientId: string; region: string } | null {
  const clientId = process.env.COGNITO_CLIENT_ID?.trim();
  const region = process.env.COGNITO_REGION?.trim() || "ap-southeast-1";
  if (!clientId) return null;
  return { clientId, region };
}

export async function POST(request: Request) {
  let email = "";
  let password = "";
  let role: UserRole | null = null;

  try {
    const body = (await request.json()) as { email?: string; password?: string; role?: UserRole };
    email = typeof body.email === "string" ? body.email.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
    role = body.role === "admin" || body.role === "agent" ? body.role : null;
  } catch {
    return badRequest("Invalid request payload.");
  }

  if (!email || !role) {
    return badRequest("Please provide a valid email and role.");
  }
  if (!password) {
    return badRequest("Password is required.");
  }

  // ------------------------------------------------------------------
  // Step 1 — Verify password with Cognito (required)
  // ------------------------------------------------------------------
  const cognitoConfig = getCognitoConfig();
  if (!cognitoConfig) {
    return NextResponse.json(
      { message: "Authentication service is not configured." },
      { status: 500 },
    );
  }

  let cognitoTokens: CognitoTokens;
  try {
    const authResult = await initiateAuth(email, password, cognitoConfig.clientId, cognitoConfig.region);
    if ("challenge" in authResult) {
      // First-login: user must set a new password
      return NextResponse.json(
        { challenge: authResult.challenge, session: authResult.session },
        { status: 202 },
      );
    }
    cognitoTokens = authResult;
  } catch (err) {
    if (err instanceof CognitoAuthError) {
      return badRequest(friendlyCognitoError(err), 401);
    }
    return NextResponse.json(
      { message: "Authentication service is unavailable. Please try again." },
      { status: 503 },
    );
  }

  const secret = getSessionSecret();
  if (!secret) {
    return NextResponse.json(
      { message: "Server authentication is not configured." },
      { status: 500 }
    );
  }
  const internalKey =
    process.env.INTERNAL_SERVICE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_INTERNAL_SERVICE_KEY?.trim();
  if (!internalKey) {
    return NextResponse.json(
      { message: "Server authentication is not configured." },
      { status: 500 }
    );
  }

  let apiUser: ApiUser;
  try {
    const userServiceUrl = getUserServiceUrl();
    const lookupUrl = `${userServiceUrl}/api/users/email/${encodeURIComponent(email)}`;
    const lookupResponse = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": internalKey,
      },
    });

    if (!lookupResponse.ok) {
      if (lookupResponse.status === 404) {
        return badRequest("No account found with this email address.", 404);
      }
      if (lookupResponse.status >= 500) {
        return badRequest("The server is experiencing issues. Please try again later.", 502);
      }
      return badRequest("Something went wrong. Please try again.", 500);
    }

    apiUser = (await lookupResponse.json()) as ApiUser;
  } catch {
    return badRequest(
      "Unable to connect to the server. Please check your connection and try again.",
      503
    );
  }

  if (role === "admin" && !apiUser.isAdmin) {
    return badRequest("This account does not have administrator access.", 403);
  }
  if (role === "agent" && apiUser.isAdmin) {
    return badRequest("This account is an administrator. Please use the admin login.", 403);
  }

  const user: User = {
    id: apiUser.userId,
    email: apiUser.emailAddress,
    first_name: apiUser.firstName,
    last_name: apiUser.lastName,
    role,
    isRootAdmin: apiUser.isRootAdmin,
  };

  const payload = buildSessionPayload(user);
  const token = await createSessionToken(payload, secret);

  const isSecure = new URL(request.url).protocol === "https:";
  const response = NextResponse.json({ user, accessToken: cognitoTokens.accessToken });
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
  response.cookies.set(REFRESH_TOKEN_COOKIE, cognitoTokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60,
  });
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, cognitoTokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
