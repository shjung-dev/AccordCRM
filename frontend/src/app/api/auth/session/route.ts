import {
  buildSessionPayload,
  createSessionToken,
  getSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@/lib/session";
import type { User } from "@/types";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = getSessionSecret();
  if (!secret) {
    return NextResponse.json(
      { message: "Server authentication is not configured." },
      { status: 500 }
    );
  }

  const isSecure = new URL(request.url).protocol === "https:";

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value || "";
  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    const response = NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat: _iat, exp: _exp, ...user } = payload;

  const tokenAge = Math.floor(Date.now() / 1000) - payload.iat;
  if (tokenAge > SESSION_TTL_SECONDS / 2) {
    const newPayload = buildSessionPayload(user as User);
    const newToken = await createSessionToken(newPayload, secret);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  }

  return NextResponse.json({ user });
}
