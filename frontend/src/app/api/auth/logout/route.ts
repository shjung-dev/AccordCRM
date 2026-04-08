import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  const isSecure = new URL(request.url).protocol === "https:";
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  return response;
}
