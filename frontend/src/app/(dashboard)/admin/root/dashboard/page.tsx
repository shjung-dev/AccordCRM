"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { usersApi, clientsApi } from "@/lib/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { StatisticCard } from "@/components/dashboard/statistic-card";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Shield, ShieldCheck, Users, UserCheck, Trash2, Plus } from "lucide-react";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { ActivityTimeline, type UserInfo } from "@/components/dashboard/activity-timeline";
import type { ActivityLog, ApiClient, ApiUser, PagedResponse } from "@/types";

const ITEMS_PER_PAGE = 10;

export default function RootAdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const agentPage = Math.max(1, Number(searchParams.get("agentPage")) || 1);
  const adminPage = Math.max(1, Number(searchParams.get("adminPage")) || 1);
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [admins, setAdmins] = useState<ApiUser[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [clientMap, setClientMap] = useState<Map<string, string>>(() => new Map());
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<ApiUser | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<ApiUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && !user.isRootAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const openDeleteModal = useCallback((e: React.MouseEvent, agent: ApiUser) => {
    e.stopPropagation();
    setAgentToDelete(agent);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (!isDeleting) setAgentToDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      await usersApi.delete(agentToDelete.userId);
      setAgents((prev) => prev.filter((a) => a.userId !== agentToDelete.userId));
      toast.success(`${agentToDelete.firstName} ${agentToDelete.lastName} was deleted.`);
      setAgentToDelete(null);
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setIsDeleting(false);
    }
  }, [agentToDelete]);

  const openAdminDeleteModal = useCallback((e: React.MouseEvent, admin: ApiUser) => {
    e.stopPropagation();
    setAdminToDelete(admin);
  }, []);

  const closeAdminDeleteModal = useCallback(() => {
    if (!isDeleting) setAdminToDelete(null);
  }, [isDeleting]);

  const confirmAdminDelete = useCallback(async () => {
    if (!adminToDelete) return;

    setIsDeleting(true);
    try {
      await usersApi.delete(adminToDelete.userId);
      setAdmins((prev) => prev.filter((a) => a.userId !== adminToDelete.userId));
      toast.success(`${adminToDelete.firstName} ${adminToDelete.lastName} was deleted.`);
      setAdminToDelete(null);
    } catch {
      toast.error("Failed to delete administrator");
    } finally {
      setIsDeleting(false);
    }
  }, [adminToDelete]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          usersApi.getAll(),
          clientsApi.getCount(),
          clientsApi.getAllForAdmin(0, 100),
        ]);

        const [usersResult, clientsCountResult, clientsResult] = results;

        const apiUsers = (usersResult.status === "fulfilled" ? usersResult.value : []) as ApiUser[];
        const clientCount =
          clientsCountResult.status === "fulfilled" ? (clientsCountResult.value as number) : 0;
        const clientsRaw = clientsResult.status === "fulfilled" ? clientsResult.value : { content: [] };
        const apiClients = (Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw as PagedResponse<ApiClient>).content ?? []) as ApiClient[];
        const cMap = new Map<string, string>();
        apiClients.forEach((c: ApiClient) => {
          cMap.set(c.clientId, `${c.firstName} ${c.lastName}`);
        });
        setClientMap(cMap);

        const agentUsers = apiUsers.filter((u: ApiUser) => !u.isAdmin);
        const adminUsers = apiUsers.filter((u: ApiUser) => u.isAdmin);

        setAgents(agentUsers);
        setAdmins(adminUsers);
        setTotalClients(clientCount);

        const uMap = new Map<string, UserInfo>();
        apiUsers.forEach((u: ApiUser) => {
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

      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const agentTotalPages = Math.max(1, Math.ceil(agents.length / ITEMS_PER_PAGE));
  const paginatedAgents = useMemo(() => {
    const start = (agentPage - 1) * ITEMS_PER_PAGE;
    return agents.slice(start, start + ITEMS_PER_PAGE);
  }, [agents, agentPage]);

  const adminTotalPages = Math.max(1, Math.ceil(admins.length / ITEMS_PER_PAGE));
  const paginatedAdmins = useMemo(() => {
    const start = (adminPage - 1) * ITEMS_PER_PAGE;
    return admins.slice(start, start + ITEMS_PER_PAGE);
  }, [admins, adminPage]);

  const handlePageChange = useCallback((paramKey: string, page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, String(page));
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  if (!user?.isRootAdmin) {
    return null;
  }

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
          title="Total Admins"
          value={admins.filter((a) => !a.isRootAdmin).length}
          description="Registered administrators"
        />
        <StatisticCard
          title="Total Clients"
          value={totalClients}
          description="All registered clients"
        />
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Agents</h2>
            </div>
            <Button asChild>
              <Link href="/admin/agents/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {agents.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No agents found.
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Phone
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Created
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {paginatedAgents.map((agent) => (
                        <tr
                          key={agent.userId}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              {agent.firstName} {agent.lastName}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            {agent.emailAddress}
                          </td>
                          <td className="p-4 align-middle">
                            {agent.phoneNumber || "\u2014"}
                          </td>
                          <td className="p-4 align-middle">
                            {formatDate(agent.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-500 hover:bg-transparent hover:scale-120 hover:cursor-pointer transition-all"
                              onClick={(e) => openDeleteModal(e, agent)}
                              aria-label={`Delete ${agent.firstName} ${agent.lastName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <PaginationBar
            totalCount={agents.length}
            currentPage={agentPage}
            totalPages={agentTotalPages}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={(page) => handlePageChange("agentPage", page)}
            itemLabel={{ singular: "agent", plural: "agents" }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Administrators</h2>
            </div>
            <Button asChild>
              <Link href="/admin/root/admins/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Admin
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {admins.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No administrators found.
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Phone
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Role
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Created
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {paginatedAdmins.map((admin) => (
                        <tr
                          key={admin.userId}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">
                            <div className="flex items-center gap-2">
                              {admin.isRootAdmin ? (
                                <ShieldCheck className="h-4 w-4 text-primary" />
                              ) : (
                                <Shield className="h-4 w-4 text-muted-foreground" />
                              )}
                              {admin.firstName} {admin.lastName}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            {admin.emailAddress}
                          </td>
                          <td className="p-4 align-middle">
                            {admin.phoneNumber || "\u2014"}
                          </td>
                          <td className="p-4 align-middle">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                admin.isRootAdmin
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {admin.isRootAdmin ? "Root Admin" : "Admin"}
                            </span>
                          </td>
                          <td className="p-4 align-middle">
                            {formatDate(admin.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                          </td>
                          <td className="p-4 align-middle text-right">
                            {!admin.isRootAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-500 hover:bg-transparent hover:scale-120 hover:cursor-pointer transition-all"
                                onClick={(e) => openAdminDeleteModal(e, admin)}
                                aria-label={`Delete ${admin.firstName} ${admin.lastName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <PaginationBar
            totalCount={admins.length}
            currentPage={adminPage}
            totalPages={adminTotalPages}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={(page) => handlePageChange("adminPage", page)}
            itemLabel={{ singular: "administrator", plural: "administrators" }}
          />
        </div>
      </div>

      <ActivityTimeline
        activities={activityLogs}
        clientMap={clientMap}
        transactions={[]}
        userMap={userMap}
        canViewClients={false}
        pageSize={10}
      />

      <DeleteConfirmationModal
        isOpen={agentToDelete !== null}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={agentToDelete ? `${agentToDelete.firstName} ${agentToDelete.lastName}` : ""}
        title="Delete Agent"
        consequences={[
          "This will permanently delete the agent's account and all associated data.",
          "Any clients assigned to this agent will need to be reassigned.",
          "This action cannot be undone.",
        ]}
        isLoading={isDeleting}
      />

      <DeleteConfirmationModal
        isOpen={adminToDelete !== null}
        onClose={closeAdminDeleteModal}
        onConfirm={confirmAdminDelete}
        itemName={adminToDelete ? `${adminToDelete.firstName} ${adminToDelete.lastName}` : ""}
        title="Delete Administrator"
        consequences={[
          "This will permanently delete the administrator's account.",
          "This action cannot be undone.",
        ]}
        isLoading={isDeleting}
      />

    </div>
  );
}
