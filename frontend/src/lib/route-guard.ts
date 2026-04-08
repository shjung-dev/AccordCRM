import type { User } from "@/types";

type GuardResult =
  | { status: "allow" }
  | { status: "redirect"; redirectTo: string };

/** Strip trailing slash so checks work with both static export (trailingSlash: true) and SSR */
function normalize(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

function isAdminDashboardRoute(pathname: string): boolean {
  const p = normalize(pathname);
  return p === "/admin" || p === "/admin/dashboard";
}

function isAdminActivitiesRoute(pathname: string): boolean {
  return normalize(pathname).startsWith("/admin/activities");
}

function isAdminAgentsRoute(pathname: string): boolean {
  return normalize(pathname).startsWith("/admin/agents");
}

function isAdminClientsRoute(pathname: string): boolean {
  return normalize(pathname).startsWith("/admin/clients");
}

function isAdminAccountsRoute(pathname: string): boolean {
  return normalize(pathname).startsWith("/admin/accounts");
}

export function resolveDashboardAccess(user: User, pathname: string): GuardResult {
  const p = normalize(pathname);
  const isAdminRoute = p.startsWith("/admin");
  const isAgentRoute = p.startsWith("/agent");

  // Transactions page is removed for admin — redirect to dashboard
  if (p.startsWith("/admin/transactions")) {
    return {
      status: "redirect",
      redirectTo: user.isRootAdmin ? "/admin/root/dashboard" : "/admin/dashboard",
    };
  }

  // Admin Route Protection: Non-admin users cannot access admin routes
  if (isAdminRoute && user.role !== "admin") {
    return {
      status: "redirect", redirectTo: "/agent"
    };
  }

  // Agent Route Protection: Non-agent users cannot access agent routes
  if (isAgentRoute && user.role !== "agent") {
    return {
      status: "redirect",
      redirectTo: user.isRootAdmin ? "/admin/root/dashboard" : "/admin/dashboard",
    };
  }

  // Non-Root Admin Restrictions: Regular admins have limited access to admin routes
  if (
    user.role === "admin" &&
    !user.isRootAdmin &&
    isAdminRoute &&
    !isAdminDashboardRoute(pathname) &&
    !isAdminActivitiesRoute(pathname) &&
    !isAdminAgentsRoute(pathname) &&
    !isAdminClientsRoute(pathname) &&
    !isAdminAccountsRoute(pathname)
  ) {
    return {
      status: "redirect",
      redirectTo: "/admin/dashboard",
    };
  }

  // Allow access if none of the above restrictions apply
  return {
    status: "allow",
  }
}