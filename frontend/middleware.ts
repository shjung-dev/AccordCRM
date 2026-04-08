import {
  getSessionSecret,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

function redirectWithClearCookie(request: NextRequest, location: string) {
  const response = NextResponse.redirect(new URL(location, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/login");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAgentRoute = pathname.startsWith("/agent");

  const secret = getSessionSecret();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!secret) {
    if (isLoginRoute) return NextResponse.next();
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  const session = token ? await verifySessionToken(token, secret) : null;

  if (!session) {
    if (isLoginRoute) return NextResponse.next();
    return redirectWithClearCookie(request, "/login");
  }

  if (isLoginRoute) {
    const redirectTo =
      session.role === "admin"
        ? session.isRootAdmin
          ? "/admin/root/dashboard"
          : "/admin/dashboard"
        : "/agent";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  if (isAdminRoute && session.role !== "admin") {
    return NextResponse.redirect(new URL("/agent", request.url));
  }

  if (isAgentRoute && session.role !== "agent") {
    const redirectTo = session.isRootAdmin ? "/admin/root/dashboard" : "/admin/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const norm = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const isAdminDashboardRoute = norm === "/admin" || norm === "/admin/dashboard";
  const isAdminActivitiesRoute = norm.startsWith("/admin/activities");
  const isAdminAgentsRoute = norm.startsWith("/admin/agents");
  const isAdminClientsRoute = norm.startsWith("/admin/clients");
  if (
    session.role === "admin" &&
    !session.isRootAdmin &&
    isAdminRoute &&
    !isAdminDashboardRoute &&
    !isAdminActivitiesRoute &&
    !isAdminAgentsRoute &&
    !isAdminClientsRoute
  ) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/login", "/login/:path*"],
};
