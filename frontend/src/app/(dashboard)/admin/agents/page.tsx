"use client";

import Link from "next/link";
import { toast } from "sonner";
import type { ApiUser } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { usersApi, clientsApi } from "@/lib/api";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AgentDetailPanel } from "@/components/dashboard/agent-detail-panel";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

const ITEMS_PER_PAGE = 10;

export default function AdminAgentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [clientCounts, setClientCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<ApiUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<ApiUser | null>(null);
  const lastSelectedAgent = useRef<ApiUser | null>(null);

  if (selectedAgent) {
    lastSelectedAgent.current = selectedAgent;
  }

  const displayAgent = selectedAgent ?? lastSelectedAgent.current;
  const isCollapsed = !!selectedAgent;

  const collapsibleTh = `transition-[max-width,opacity,padding-left,padding-right] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
    isCollapsed ? "max-w-0 opacity-0 px-0" : "max-w-[200px] opacity-100 px-4"
  }`;
  const collapsibleTd = `transition-[max-width,opacity,padding-left,padding-right] duration-300 ease-in-out overflow-hidden whitespace-nowrap align-middle py-3 ${
    isCollapsed ? "max-w-0 opacity-0 px-0" : "max-w-[200px] opacity-100 px-4"
  }`;

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

      if (selectedAgent?.userId === agentToDelete.userId) {
        setSelectedAgent(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("agent");
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
      }

      toast.success(`${agentToDelete.firstName} ${agentToDelete.lastName} was deleted.`);
      setAgentToDelete(null);
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setIsDeleting(false);
    }
  }, [agentToDelete, selectedAgent, router, searchParams, pathname]);

  useEffect(() => {
    if (!user) return;

    const loadAgents = async () => {
      try {
        const users = await usersApi.getAll() as ApiUser[];
        const agentUsers = users
          .filter((u: ApiUser) => !u.isAdmin)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setAgents(agentUsers);

        const agentParam = searchParams.get("agent");
        if (agentParam) {
          const match = agentUsers.find((a) => a.userId === agentParam);
          if (match) setSelectedAgent(match);
        }
      } catch {
        toast.error("Failed to load agents");
      } finally {
        setLoading(false);
      }

      // Fetch client counts separately so agent list still loads on failure
      try {
        const clientsResponse = await clientsApi.getAllForAdmin(0, 1000);
        const counts = new Map<string, number>();
        clientsResponse.content.forEach((client) => {
          if (client.assignedAgentId) {
            counts.set(client.assignedAgentId, (counts.get(client.assignedAgentId) || 0) + 1);
          }
        });
        setClientCounts(counts);
      } catch {
        // Client counts are non-critical
      }
    };

    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalCount = agents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return agents.slice(start, start + ITEMS_PER_PAGE);
  }, [agents, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    params.delete("agent");
    setSelectedAgent(null);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleAgentClick = useCallback((agent: ApiUser) => {
    setSelectedAgent(agent);
    const params = new URLSearchParams(searchParams.toString());
    params.set("agent", agent.userId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, searchParams, pathname]);

  const handleClosePanel = useCallback(() => {
    setSelectedAgent(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("agent");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [router, searchParams, pathname]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Agents</h1>
            <div className="h-5 w-32 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b">
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Email</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Phone</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Clients</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Created</th>
                    <th className="h-12 px-4 text-base text-right align-middle font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-36 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4 text-right"><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Agents</h1>
          {totalCount > 0 && (
            <p className="text-base text-muted-foreground mt-2">
              {totalCount} agents total
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/admin/agents/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Link>
        </Button>
      </div>

      <div className="relative flex gap-4">
        <div className={`min-w-0 transition-all duration-300 ${selectedAgent ? "w-1/3" : "w-full"}`}>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {agents.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No agents found.
                </div>
              ) : (
                <>
                  <div className="relative w-full overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors">
                          <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                            Name
                          </th>
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Email
                          </th>
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Phone
                          </th>
                          <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                            Clients
                          </th>
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Created
                          </th>
                          <th className={`h-12 text-base text-right align-middle font-medium text-muted-foreground ${collapsibleTh}`} />
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {paginatedAgents.map((agent) => (
                          <tr
                            key={agent.userId}
                            className={`border-b transition-colors hover:bg-muted/50 cursor-pointer h-[52px] ${
                              selectedAgent?.userId === agent.userId ? "bg-muted" : ""
                            }`}
                            onClick={() => handleAgentClick(agent)}
                          >
                            <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">
                              {agent.firstName} {agent.lastName}
                            </td>
                            <td className={collapsibleTd}>
                              {agent.emailAddress}
                            </td>
                            <td className={collapsibleTd}>
                              {agent.phoneNumber || "\u2014"}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {clientCounts.get(agent.userId) ?? 0}
                            </td>
                            <td className={collapsibleTd}>
                              {formatDate(agent.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                            </td>
                            <td className={`text-right ${collapsibleTd}`}>
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
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
          <PaginationBar
            totalCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            itemLabel={{ singular: "agent", plural: "agents" }}
          />
          </div>
        </div>

        <div
          className={`relative transition-all duration-300 ease-in-out ${
            isCollapsed ? "w-2/3 min-h-[600px] opacity-100" : "w-0 opacity-0 pointer-events-none"
          }`}
        >
          {displayAgent && (
            <div
              className={`absolute right-0 w-full max-h-[600px] rounded-xl border bg-card shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${
                isCollapsed ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
            >
              <AgentDetailPanel
                agent={displayAgent}
                onClose={handleClosePanel}
              />
            </div>
          )}
        </div>
      </div>

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

    </div>
  );
}
