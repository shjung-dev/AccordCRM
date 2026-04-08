"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatisticCard } from "@/components/dashboard/statistic-card";
import { transformTransaction } from "@/lib/transformers";
import { clientsApi, accountsApi, transactionsApi } from "@/lib/api";
import { ActivityTimeline, type UserInfo } from "@/components/dashboard/activity-timeline";
import type { ActivityLog, ApiAccount, ApiClient, ApiTransaction, Transaction } from "@/types";

export default function AgentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    totalClients: 0,
    accountsOpened: 0,
    transactionsToday: 0,
    activityLogs: [] as ActivityLog[],
    transactions: [] as Transaction[],
  });
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());
  const [userMap] = useState<Map<string, UserInfo>>(() => {
    if (!user) return new Map();
    const map = new Map<string, UserInfo>();
    map.set(user.id, {
      name: `${user.first_name} ${user.last_name}`,
      isAdmin: user.role === "admin",
    });
    return map;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadAllData = async () => {
      try {
        const results = await Promise.allSettled([
          clientsApi.getByAgentId(user.id, 0, 100),
          accountsApi.getAll(),
          transactionsApi.getAll(0, 100),
        ]);

        const [clientsResult, accountsResult, txResult] = results;

        const clientsRaw = clientsResult.status === "fulfilled" ? clientsResult.value : { content: [] };
        const clients = (Array.isArray(clientsRaw) ? clientsRaw : clientsRaw.content ?? []) as ApiClient[];
        const accountsRaw: unknown = accountsResult.status === "fulfilled" ? accountsResult.value : { content: [] };
        const accounts = (Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw as { content?: unknown[] }).content ?? []) as ApiAccount[];
        const txRaw = txResult.status === "fulfilled" ? txResult.value : { content: [] };
        const transactions = (Array.isArray(txRaw) ? txRaw : txRaw.content ?? []) as ApiTransaction[];
        const map = new Map<string, string>();
        const clientIds = new Set<string>();
        clients.forEach((c: ApiClient) => {
          map.set(c.clientId, `${c.firstName} ${c.lastName}`);
          clientIds.add(c.clientId);
        });
        setClientMap(map);

        const agentAccounts = accounts.filter((a: ApiAccount) => clientIds.has(a.clientId));
        const accountTypeMap = new Map<string, string>();
        agentAccounts.forEach((a: ApiAccount) => {
          accountTypeMap.set(a.accountId, a.accountType);
        });

        const accountsOpened = agentAccounts.filter(
          (a: ApiAccount) => a.accountStatus === "Active" || a.accountStatus === "Pending"
        ).length;

        const agentTransactions = transactions.filter((t: ApiTransaction) => clientIds.has(t.clientId));
        const today = new Date();
        const transactionsToday = agentTransactions.filter((t: ApiTransaction) => {
          const txnDate = new Date(t.createdAt);
          return (
            txnDate.getFullYear() === today.getFullYear() &&
            txnDate.getMonth() === today.getMonth() &&
            txnDate.getDate() === today.getDate()
          );
        }).length;

        const transformedTransactions = agentTransactions.map((txn: ApiTransaction) =>
          transformTransaction(txn, map, accountTypeMap)
        );

        setData({
          totalClients: clients.length,
          accountsOpened,
          transactionsToday,
          activityLogs: [],
          transactions: transformedTransactions,
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal">
              Welcome back,{" "}
              <span className="font-medium text-2xl">{user?.first_name}</span>.
            </h1>
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-md">
              <CardContent className="px-5 py-6">
                <div className="space-y-1">
                  <div className="h-5 w-28 bg-muted animate-pulse rounded mb-3" />
                  <div className="h-10 w-16 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">
            Welcome back,{" "}
            <span className="font-medium text-2xl">{user?.first_name}</span>.
          </h1>
        </div>
        <Button asChild>
          <Link href="/agent/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Client
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        <StatisticCard
          title="Total Clients"
          value={data.totalClients}
          description="All registered clients"
        />
        <StatisticCard
          title="Accounts Opened"
          value={data.accountsOpened}
          description="Active & pending accounts"
        />
        <StatisticCard
          title="Transactions Today"
          value={data.transactionsToday}
          description="Processed today"
        />
      </div>
      <ActivityTimeline
        activities={data.activityLogs}
        clientMap={clientMap}
        transactions={data.transactions}
        userMap={userMap}
        canViewClients={user?.role === "agent"}
      />
    </div>
  );
}
