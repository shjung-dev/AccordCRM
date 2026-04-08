"use client";


import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { clientsApi, accountsApi } from "@/lib/api";
import { transformClient } from "@/lib/transformers";
import type { Client, ApiClient, ApiAccount } from "@/types";
import { createPortal } from "react-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { Plus, Trash2, Pencil, Eye, CheckCircle2, XCircle, EllipsisVertical } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ClientDetailPanel } from "@/components/dashboard/client-detail-panel";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { ClientFormPreviewModal } from "@/components/dashboard/client-form-preview-modal";

export default function AgentClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastSelectedClient = useRef<Client | null>(null);

  if (selectedClient) {
    lastSelectedClient.current = selectedClient;
  }

  const displayClient = selectedClient ?? lastSelectedClient.current;
  const isCollapsed = !!selectedClient;

  const collapsibleTh = `transition-[max-width,opacity,padding-left,padding-right] duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
    isCollapsed ? "max-w-0 opacity-0 px-0" : "max-w-[200px] opacity-100 px-4"
  }`;
  const collapsibleTd = `transition-[max-width,opacity,padding-left,padding-right] duration-300 ease-in-out overflow-hidden whitespace-nowrap align-middle py-3 ${
    isCollapsed ? "max-w-0 opacity-0 px-0" : "max-w-[200px] opacity-100 px-4"
  }`;

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await clientsApi.getByAgentId(user.id, currentPage - 1, 10) as { content: ApiClient[]; totalPages: number; totalElements: number };

        setTotalPages(Math.max(1, response.totalPages));
        setTotalElements(response.totalElements);

        const accountResults = await Promise.all(
          response.content.map((c) =>
            accountsApi.getByClientId(c.clientId).catch(() => [])
          )
        ) as ApiAccount[][];

        const accountsByClient = new Map<string, ApiAccount[]>();
        response.content.forEach((c, i) => {
          accountsByClient.set(c.clientId, accountResults[i] ?? []);
        });

        const transformedClients = response.content
          .map((apiClient: ApiClient) =>
            transformClient(apiClient, accountsByClient.get(apiClient.clientId) || [])
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setClients(transformedClients);

        const clientParam = searchParams.get("client");
        if (clientParam) {
          const match = transformedClients.find((c) => c.id === clientParam);
          if (match) setSelectedClient(match);
        }
      } catch {
        toast.error("Failed to load clients");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    params.delete("client");
    setSelectedClient(null);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const openDeleteModal = useCallback((e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setClientToDelete(client);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setClientToDelete(null);
  }, []);

  const handleClientClick = useCallback((client: Client) => {
    setSelectedClient(client);
    const params = new URLSearchParams(searchParams.toString());
    params.set("client", client.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, searchParams, pathname]);

  const handleClosePanel = useCallback(() => {
    setSelectedClient(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("client");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [router, searchParams, pathname]);

  const confirmDelete = useCallback(async (reason?: string) => {
    if (!clientToDelete) return;

    try {
      await clientsApi.delete(clientToDelete.id, reason);
      setClients((prev) =>
        prev.filter((existing) => existing.id !== clientToDelete.id)
      );

      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("client");
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
      }

      toast.success(`${clientToDelete.name} was deleted.`);
      setClientToDelete(null);
    } catch {
      toast.error("Failed to delete client");
    }
  }, [clientToDelete, selectedClient, router, searchParams, pathname]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Your Clients</h1>
            <div className="h-5 w-32 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          </div>
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
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Date of Birth</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Accounts</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Verified</th>
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
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-4 bg-muted animate-pulse rounded-full" /></td>
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
          <h1 className="text-3xl font-semibold">Your Clients</h1>
          {totalElements > 0 && (
            <p className="text-base text-muted-foreground mt-2">
              {totalElements} clients total
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button className = "bg-muted hover:bg-muted/80 hover:cursor-pointer transition-colors" variant="secondary" onClick={() => setShowFormPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Application Form
          </Button>
          <Button asChild>
            <Link href="/agent/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Client
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative flex gap-4">
        <div className={`min-w-0 transition-all duration-300 ${selectedClient ? "w-1/3" : "w-full"}`}>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {clients.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No clients available.
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
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Date of Birth
                          </th>
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Accounts
                          </th>
                          <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                            Verified
                          </th>
                          <th className={`h-12 text-base text-left align-middle font-medium text-muted-foreground ${collapsibleTh}`}>
                            Created
                          </th>
                          <th className={`h-12 text-base text-right align-middle font-medium text-muted-foreground ${collapsibleTh}`} />
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {clients.map((client) => (
                          <tr
                            key={client.id}
                            className={`border-b transition-colors hover:bg-muted/50 cursor-pointer h-[52px] ${
                              selectedClient?.id === client.id ? "bg-muted" : ""
                            }`}
                            onClick={() => handleClientClick(client)}
                          >
                            <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">
                              {client.name}
                            </td>
                            <td className={collapsibleTd}>{client.email}</td>
                            <td className={collapsibleTd}>{client.phone}</td>
                            <td className={collapsibleTd}>
                              {formatDate(client.dateOfBirth, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                            </td>
                            <td className={collapsibleTd}>
                              {client.accountCount ?? 0}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {client.verified ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className={collapsibleTd}>
                              {formatDate(client.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                            </td>
                            <td className={`text-right ${collapsibleTd}`}>
                              <Button
                                ref={openMenuId === client.id ? triggerRef : undefined}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted hover:cursor-pointer transition-all rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openMenuId === client.id) {
                                    setOpenMenuId(null);
                                  } else {
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const menuHeight = 88;
                                    const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4;
                                    setMenuPos({ top, left: rect.right - 140 });
                                    setOpenMenuId(client.id);
                                  }
                                }}
                                aria-label={`Actions for ${client.name}`}
                              >
                                <EllipsisVertical className="h-4 w-4" />
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
        </div>

        <div
          className={`relative min-h-[600px] transition-all duration-300 ease-in-out ${
            isCollapsed ? "w-2/3 opacity-100" : "w-0 opacity-0 pointer-events-none"
          }`}
        >
          {displayClient && (
            <div
              className={`absolute right-0 w-full max-h-[600px] rounded-xl border bg-card shadow-lg overflow-y-auto transition-all duration-300 ease-in-out ${
                isCollapsed ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
            >
              <ClientDetailPanel
                client={displayClient}
                onClose={handleClosePanel}
              />
            </div>
          )}
        </div>
      </div>

      <PaginationBar
        totalCount={totalElements}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={10}
        onPageChange={handlePageChange}
        itemLabel={{ singular: "client", plural: "clients" }}
      />

      <DeleteConfirmationModal
        isOpen={clientToDelete !== null}
        onClose={closeDeleteModal}
        onConfirm={() => confirmDelete()}
        onConfirmWithReason={(reason) => confirmDelete(reason)}
        itemName={clientToDelete?.name ?? ""}
        title="Delete Client"
        consequences={[
          "This will permanently delete the client's account and all associated data.",
          "Any pending transactions or requests will be cancelled.",
          "This action cannot be undone.",
        ]}
        showReasonSelection
      />

      <ClientFormPreviewModal
        isOpen={showFormPreview}
        onClose={() => setShowFormPreview(false)}
      />

      {openMenuId && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[99999] min-w-[140px] rounded-md border py-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ top: menuPos.top, left: menuPos.left, backgroundColor: "#ffffff" }}
        >
          <Link
            href={`/agent/clients/${openMenuId}/edit`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(null);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-muted transition-colors cursor-pointer"
            onClick={(e) => {
              const client = clients.find((c) => c.id === openMenuId);
              if (client) openDeleteModal(e, client);
              setOpenMenuId(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}