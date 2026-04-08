"use client";

import { Suspense } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { clientsApi, usersApi } from "@/lib/api";
import { RecentAgents } from "@/components/dashboard/recent-agents";
import { StatisticCard } from "@/components/dashboard/statistic-card";
import { ActivityTimeline, type UserInfo } from "@/components/dashboard/activity-timeline";
import type { ActivityLog, ApiClient, ApiUser, PagedResponse } from "@/types";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [clientMap, setClientMap] = useState<Map<string, string>>(() => new Map());
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  console.log("[AdminDashboard] render — user:", user?.id, "role:", user?.role, "isRootAdmin:", user?.isRootAdmin, "loading:", loading);

  useEffect(() => {
    if (!user) {
      console.log("[AdminDashboard] useEffect skipped — no user");
      return;
    }
    console.log("[AdminDashboard] starting loadAllData for user:", user.id);
    const loadAllData = async () => {
      try {
        const results = await Promise.allSettled([
          usersApi.getAll(),
          clientsApi.getCount(),
          clientsApi.getAllForAdmin(0, 100),
        ]);

        const [usersResult, clientsCountResult, clientsResult] = results;

        console.log("[AdminDashboard] usersApi.getAll:", usersResult.status, usersResult.status === "rejected" ? (usersResult as PromiseRejectedResult).reason : "ok");
        console.log("[AdminDashboard] clientsApi.getCount:", clientsCountResult.status, clientsCountResult.status === "rejected" ? (clientsCountResult as PromiseRejectedResult).reason : "ok");
        console.log("[AdminDashboard] clientsApi.getAllForAdmin:", clientsResult.status, clientsResult.status === "rejected" ? (clientsResult as PromiseRejectedResult).reason : "ok");

        const users = (usersResult.status === "fulfilled" ? usersResult.value : []) as ApiUser[];
        const clientCount =
          clientsCountResult.status === "fulfilled" ? (clientsCountResult.value as number) : 0;
        const clientsRaw = clientsResult.status === "fulfilled" ? clientsResult.value : { content: [] };
        const apiClients = (Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw as PagedResponse<ApiClient>).content ?? []) as ApiClient[];
        const cMap = new Map<string, string>();
        apiClients.forEach((c: ApiClient) => {
          cMap.set(c.clientId, `${c.firstName} ${c.lastName}`);
        });
        setClientMap(cMap);

        const agentUsers = users
          .filter((u: ApiUser) => !u.isAdmin)
          .sort(
            (a: ApiUser, b: ApiUser) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 3);

        setAgents(agentUsers);
        setTotalClients(clientCount);

        const uMap = new Map<string, UserInfo>();
        users.forEach((u: ApiUser) => {
          uMap.set(u.userId, {
            name: `${u.firstName} ${u.lastName}`.trim(),
            isAdmin: u.isAdmin,
          });
        });
        if (user && !uMap.has(user.id)) {
          const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email;
          uMap.set(user.id, {
            name: displayName,
            isAdmin: user.role === "admin" || user.isRootAdmin,
          });
        }
        setUserMap(uMap);

        console.log("[AdminDashboard] loadAllData done — agents:", agentUsers.length, "clients:", clientCount);
      } catch (err) {
        console.error("[AdminDashboard] loadAllData threw unexpectedly:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal">
          Welcome back,{" "}
          <span className="font-medium text-2xl">{user?.first_name}</span>.
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        <StatisticCard
          title="Total Agents"
          value={agents.length}
          description="Registered agents"
        />
        <StatisticCard
          title="Total Clients"
          value={totalClients}
          description="All registered clients"
        />
      </div>

      <RecentAgents agents={agents} />

      <Suspense fallback={null}>
        <ActivityTimeline
          activities={activityLogs}
          clientMap={clientMap}
          transactions={[]}
          userMap={userMap}
          canViewClients={false}
          pageSize={10}
        />
      </Suspense>
    </div>
  );
}
