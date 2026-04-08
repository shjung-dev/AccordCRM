"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    if (user.isRootAdmin) {
      router.replace("/admin/root/dashboard");
    } else {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal">
          Welcome back,{" "}
          <span className="font-medium text-2xl">{user?.first_name}</span>.
        </h1>
      </div>
      <div className="text-muted-foreground">Loading dashboard...</div>
    </div>
  );
}
