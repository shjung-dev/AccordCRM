"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatbotWrapper } from "@/components/smartcrm/chatbot-wrapper";
import { useRouter, usePathname } from "next/navigation";
import { resolveDashboardAccess } from "@/lib/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [smartcrmOpen, setSmartcrmOpen] = useState(false);

  const toggleSmartcrm = useCallback(() => {
    setSmartcrmOpen((prev) => !prev);
  }, []);

  /**
   * Single source of truth for routing decisions
   */
  const guard = useMemo(() => {
    // Wait until auth is resolved
    if (isLoading) return null;

    // Not logged in → redirect to login
    if (!user) {
      return {
        status: "redirect",
        redirectTo: "/login",
      };
    }

    // Role / access control logic
    return resolveDashboardAccess(user, pathname);
  }, [user, isLoading, pathname]);

  /**
   * Handle redirects ONLY here (no other redirect logic anywhere)
   */
  useEffect(() => {
    if (!guard) return;

    if (guard.status === "redirect") {
      router.replace(guard.redirectTo);
    }
  }, [guard, router]);

  /**
   * Loading state (IMPORTANT: prevents flicker on refresh)
   */
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  /**
   * If not allowed or redirecting, render nothing
   */
  if (!user || guard?.status !== "allow") {
    return null;
  }

  /**
   * Main layout
   */
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto bg-background p-6">
        {children}
      </main>
      {user.role === "agent" && (
        <ChatbotWrapper isOpen={smartcrmOpen} onToggle={toggleSmartcrm} />
      )}
    </div>
  );
}