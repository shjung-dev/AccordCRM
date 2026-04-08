"use client";

import { X, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { clientsApi, accountsApi } from "@/lib/api";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ApiClient, ApiAccount, AccountCreateRequest, PagedResponse } from "@/types";

const PAGE_SIZE = 10;

const BRANCH_OPTIONS = [
  { id: "d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f8a", label: "Branch 01 — Central" },
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", label: "Branch 02 — North" },
  { id: "f7e6d5c4-b3a2-4f1e-9d8c-7b6a5f4e3d2c", label: "Branch 03 — East" },
  { id: "c9d8e7f6-a5b4-4c3d-2e1f-0a9b8c7d6e5f", label: "Branch 04 — West" },
  { id: "b2a1f0e9-d8c7-4b6a-5f4e-3d2c1b0a9f8e", label: "Branch 05 — South" },
];

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  Savings: "Savings",
  Checking: "Checking",
  Business: "Business",
};

const ACCOUNT_STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Inactive: "bg-muted text-muted-foreground",
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === "admin" || user?.isRootAdmin;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [clientNameMap, setClientNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [createForm, setCreateForm] = useState<AccountCreateRequest>({
    clientId: "",
    accountType: "Savings",
    accountStatus: "Active",
    openingDate: new Date().toISOString().split("T")[0],
    balance: 0,
    currency: "SGD",
    branchId: "",
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [accountsRaw, clientsRaw] = await Promise.all([
        accountsApi.getAll(),
        clientsApi.getAllForAdmin(0, 1000),
      ]) as [ApiAccount[], PagedResponse<ApiClient> | ApiClient[]];

      const apiAccounts = (Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw as { content?: ApiAccount[] }).content ?? []) as ApiAccount[];
      const apiClients = (Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw as PagedResponse<ApiClient>).content ?? []) as ApiClient[];

      const map = new Map<string, string>();
      apiClients.forEach((c) => map.set(c.clientId, `${c.firstName} ${c.lastName}`));

      setAccounts(apiAccounts);
      setClientNameMap(map);
      setClients(apiClients);
      setCreateForm((f) => ({ ...f, clientId: apiClients[0]?.clientId ?? "" }));
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      const clientName = (clientNameMap.get(a.clientId) ?? "").toLowerCase();
      return (
        a.accountId.toLowerCase().includes(q) ||
        clientName.includes(q) ||
        a.accountType.toLowerCase().includes(q) ||
        a.accountStatus.toLowerCase().includes(q)
      );
    });
  }, [accounts, clientNameMap, searchQuery]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // reset to page 1 on search
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleDelete = useCallback(async (accountId: string) => {
    setDeletingAccountId(accountId);
    try {
      await accountsApi.delete(accountId);
      toast.success("Account deleted");
      await fetchData();
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeletingAccountId(null);
    }
  }, [fetchData]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setCreateForm({
      clientId: clients[0]?.clientId ?? "",
      accountType: "Savings",
      accountStatus: "Active",
      openingDate: new Date().toISOString().split("T")[0],
      balance: 0,
      currency: "SGD",
      branchId: "",
    });
  }, [clients]);

  const handleCreate = useCallback(async () => {
    if (!createForm.clientId) {
      toast.error("Please select a client");
      return;
    }
    if (!createForm.branchId.trim()) {
      toast.error("Branch ID is required");
      return;
    }
    setIsCreating(true);
    try {
      await accountsApi.create(createForm);
      toast.success("Account created");
      closeCreateModal();
      await fetchData();
    } catch {
      toast.error("Failed to create account");
    } finally {
      setIsCreating(false);
    }
  }, [createForm, closeCreateModal, fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Manage Accounts</h1>
            <div className="h-5 w-40 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Account ID", "Client", "Type", "Status", "Balance", "Opened", ...(isReadOnly ? [] : ["Actions"])].map((h) => (
                      <th key={h} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: isReadOnly ? 6 : 7 }).map((__, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded w-full" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Manage Accounts</h1>
          <p className="text-base text-muted-foreground mt-2">{totalCount} accounts total</p>
        </div>
        {!isReadOnly && (
          <Button className="gap-1.5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Add New Account
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by account ID, client, type..."
          className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No accounts match your search." : "No accounts found."}
              </p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Account ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Client</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Balance</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Opened</th>
                    {!isReadOnly && <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginated.map((account) => (
                    <tr key={account.accountId} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-mono text-xs">{account.accountId}</td>
                      <td className="p-4 align-middle font-medium">
                        {clientNameMap.get(account.clientId) ?? account.clientId}
                      </td>
                      <td className="p-4 align-middle">
                        {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACCOUNT_STATUS_STYLES[account.accountStatus] ?? "bg-muted text-muted-foreground"}`}>
                          {account.accountStatus}
                        </span>
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {formatCurrency(account.balance, "en-SG", account.currency || "SGD")}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(account.openingDate, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                      </td>
                      {!isReadOnly && (
                        <td className="p-4 align-middle text-right">
                          {account.accountStatus !== "Inactive" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              disabled={deletingAccountId === account.accountId}
                              onClick={() => handleDelete(account.accountId)}
                              aria-label="Delete account"
                            >
                              {deletingAccountId === account.accountId
                                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                : <Trash2 className="h-4 w-4" />
                              }
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaginationBar
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        itemLabel={{ singular: "account", plural: "accounts" }}
      />

      {/* Create Account Modal */}
      {showCreateModal && !isReadOnly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-account-title"
        >
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeCreateModal}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 id="create-account-title" className="text-lg font-semibold">Add New Account</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Client</label>
                <select
                  value={createForm.clientId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  {clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Type</label>
                <select
                  value={createForm.accountType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, accountType: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="Savings">Savings</option>
                  <option value="Checking">Checking</option>
                  <option value="Business">Business</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select
                  value={createForm.accountStatus}
                  onChange={(e) => setCreateForm((f) => ({ ...f, accountStatus: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Opening Date</label>
                <input
                  type="date"
                  value={createForm.openingDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, openingDate: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Initial Balance</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.balance}
                    onChange={(e) => setCreateForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Currency</label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  >
                    <option value="SGD">SGD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Branch</label>
                <select
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="">Select a branch</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={closeCreateModal}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
