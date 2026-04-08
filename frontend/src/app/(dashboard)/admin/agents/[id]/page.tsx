"use client";

import Link from "next/link";
import { toast } from "sonner";
import { accountsApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/formatters";
import { CheckCircle2, XCircle, Pencil } from "lucide-react";
import type { GroupedActivityLog } from "@/lib/activity-utils";
import { usersApi, clientsApi } from "@/lib/api";
import { AgentSidebar } from "@/components/dashboard/agent-sidebar";
import { transformClient } from "@/lib/transformers";
import { groupActivityLogs, getActivitySummaryPrefix } from "@/lib/activity-utils";
import type { ApiUser, ApiClient, ApiAccount, ActivityLog, Client } from "@/types";

export default function AgentDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [agentId, setAgentId] = useState<string>('');

  const [agent, setAgent] = useState<ApiUser | null>(null);
  const [allAgents, setAllAgents] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const logsLoading = false;

  useEffect(() => {
    const segments = window.location.pathname.split('/');
    const id = segments[segments.length - 1];
    setAgentId(id);
  }, []);

  useEffect(() => {
    if (!user || !agentId || agentId === '_') return;

    const fetchAgent = async () => {
      try {
        setLoading(true);
        const [apiUser, allUsers] = await Promise.all([
          usersApi.getById(agentId) as Promise<ApiUser>,
          usersApi.getAll() as Promise<ApiUser[]>,
        ]);
        if (apiUser.isAdmin) {
          toast.error("This user is not an agent");
          router.push("/admin/agents");
          return;
        }
        setAgent(apiUser);
        setAllAgents(
          allUsers
            .filter((u) => !u.isAdmin)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      } catch {
        toast.error("Failed to load agent details");
        router.push("/admin/agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, user, router]);

  useEffect(() => {
    if (!user || !agentId || agentId === '_') return;

    const fetchClients = async () => {
      try {
        setClientsLoading(true);
        const [allClientsResponse, apiAccounts] = await Promise.all([
          clientsApi.getAllForAdmin(0, 1000),
          accountsApi.getAll(),
        ]) as [{ content: ApiClient[]; totalPages: number; totalElements: number }, ApiAccount[]];

        const agentClients = allClientsResponse.content.filter(
          (client) => client.assignedAgentId === agentId
        );

        const accountsByClient = new Map<string, ApiAccount[]>();
        apiAccounts.forEach((account: ApiAccount) => {
          if (!accountsByClient.has(account.clientId)) {
            accountsByClient.set(account.clientId, []);
          }
          accountsByClient.get(account.clientId)!.push(account);
        });

        const transformedClients = agentClients.map((apiClient: ApiClient) =>
          transformClient(apiClient, accountsByClient.get(apiClient.clientId) || [])
        );

        setClients(transformedClients);
      } catch {
        // Fail silently - clients list is non-critical
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
  }, [agentId, user]);


  const groupedLogs = useMemo(() => groupActivityLogs(activityLogs), [activityLogs]);

  const dateGroups = useMemo(() => {
    const groups: Map<string, GroupedActivityLog[]> = new Map();
    for (const item of groupedLogs) {
      const date = new Date(item.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
      let label: string;
      if (dateKey === todayKey) label = "Today";
      else if (dateKey === yesterdayKey) label = "Yesterday";
      else {
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("en-GB", { month: "short" });
        label = `${day} ${month} ${date.getFullYear()}`;
      }
      const existing = groups.get(label) || [];
      existing.push(item);
      groups.set(label, existing);
    }
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [groupedLogs]);

  const agentName = agent ? `${agent.firstName} ${agent.lastName}` : "";

  // All conditional returns AFTER all hooks
  if (!agentId || agentId === '_') return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => router.back()} />
          <div className="h-7 w-40 bg-muted animate-pulse rounded" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div>
                  <div className="h-5 w-36 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
            <div className="border-t pt-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="h-5 w-32 bg-muted animate-pulse rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => router.back()} />
          <h1 className="text-xl font-medium leading-none">Agent Not Found</h1>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              The agent you are looking for does not exist or has been removed.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/admin/agents")}
            >
              Back to Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => router.back()} />
          <h1 className="text-2xl font-medium leading-none">Agent Details</h1>
        </div>
        <Button asChild>
          <Link href={`/admin/agents/${agentId}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Agent
          </Link>
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-sky-500/80 text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold leading-tight">{agentName}</h2>
                    <p className="text-base font-medium text-muted-foreground mt-1">
                      {agent.emailAddress}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Phone</p>
                    <p className="text-base font-normal">{agent.phoneNumber || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Created</p>
                    <p className="text-base font-normal">
                      {formatDate(agent.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Assigned Clients</p>
                    <p className="text-base font-normal">
                      {clientsLoading ? (
                        <span className="inline-block h-4 w-8 bg-muted animate-pulse rounded" />
                      ) : (
                        clients.length
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Agent ID</p>
                    <p className="text-base font-normal">{agent.userId}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Assigned Clients
                  {!clientsLoading && (
                    <span className="text-muted-foreground font-normal ml-1.5">({clients.length})</span>
                  )}
                </h3>
              </div>
              {clientsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No clients assigned to this agent.
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors">
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Verified</th>
                        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">{client.name}</td>
                          <td className="p-4 align-middle">{client.email}</td>
                          <td className="p-4 align-middle">{client.phone}</td>
                          <td className="p-4 align-middle">
                            {client.verified ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            {formatDate(client.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-2">Agent&apos;s Recent Activity</h2>
            <div className="bg-card shadow-md rounded-xl p-6 border border-1 transition-colors duration-300">
              {logsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-4 w-16 bg-muted animate-pulse rounded flex-shrink-0" />
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : dateGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No activity recorded for this agent.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {dateGroups.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {group.label}
                      </h3>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <div
                            key={item.log_id}
                            className="w-full text-left px-3 py-2.5 rounded-md"
                          >
                            <div className="flex items-baseline gap-0 text-sm text-foreground leading-relaxed">
                              <span className="w-[4.5rem] shrink-0 text-muted-foreground">
                                {formatTime(item.timestamp)}
                              </span>
                              <span className="min-w-0">
                                <span className="font-normal">
                                  {getActivitySummaryPrefix(item)}{" "}
                                  <span className="font-semibold">{agentName}</span>
                                </span>
                                {item.reason && (
                                  <span className="text-muted-foreground">
                                    {" "}| {item.reason}
                                  </span>
                                )}
                                {item.action_status === "FAILURE" && (
                                  <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                                    Failed
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <AgentSidebar agents={allAgents} currentAgentId={agentId} />
      </div>
    </div>
  );
}