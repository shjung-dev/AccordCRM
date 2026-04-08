"use client";

import {
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { formatTime } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { GroupedActivityLog } from "@/lib/activity-utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { clientsApi, accountsApi } from "@/lib/api";
import { ClientSidebar } from "@/components/dashboard/client-sidebar";
import { groupActivityLogs, getActivitySummaryPrefix } from "@/lib/activity-utils";
import type { Client, ApiClient, ApiAccount, ActivityLog, AccountCreateRequest } from "@/types";
import { transformClient, getLocaleForCurrency } from "@/lib/transformers";

const BRANCH_OPTIONS = [
  { id: "d4e5f6a7-b8c9-4d0e-a1f2-3b4c5d6e7f8a", label: "Branch 01 — Central" },
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", label: "Branch 02 — North" },
  { id: "f7e6d5c4-b3a2-4f1e-9d8c-7b6a5f4e3d2c", label: "Branch 03 — East" },
  { id: "c9d8e7f6-a5b4-4c3d-2e1f-0a9b8c7d6e5f", label: "Branch 04 — West" },
  { id: "b2a1f0e9-d8c7-4b6a-5f4e-3d2c1b0a9f8e", label: "Branch 05 — South" },
];

export default function ClientDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const clientId = window.location.pathname.split("/").at(-1) ?? "";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [otherMethod, setOtherMethod] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [createAccountForm, setCreateAccountForm] = useState<Omit<AccountCreateRequest, "clientId">>({
    accountType: "Savings",
    accountStatus: "Active",
    openingDate: new Date().toISOString().split("T")[0],
    balance: 0,
    currency: "SGD",
    branchId: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetchAllClients = async () => {
      try {
        const [response, allAccounts] = await Promise.all([
          clientsApi.getByAgentId(user.id, 0, 1000),
          accountsApi.getAll(),
        ]) as [{ content: ApiClient[] }, ApiAccount[]];

        const accountsByClient = new Map<string, ApiAccount[]>();
        allAccounts.forEach((account: ApiAccount) => {
          if (!accountsByClient.has(account.clientId)) {
            accountsByClient.set(account.clientId, []);
          }
          accountsByClient.get(account.clientId)!.push(account);
        });

        const transformed = response.content
          .map((apiClient: ApiClient) =>
            transformClient(apiClient, accountsByClient.get(apiClient.clientId) || [])
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllClients(transformed);
      } catch {
        // Non-critical — sidebar just won't populate
      }
    };
    fetchAllClients();
  }, [user]);

  const fetchData = async () => {
    if (!user || !clientId) return;
    try {
      setLoading(true);
      const [apiClient, clientAccounts] = await Promise.all([
        clientsApi.getById(clientId),
        accountsApi.getByClientId(clientId),
      ]) as [ApiClient, ApiAccount[]];

      if (apiClient.assignedAgentId !== user.id) {
        toast.error("You do not have access to this client");
        router.push("/agent/clients");
        return;
      }

      const transformed = transformClient(apiClient, clientAccounts);
      setClient(transformed);
    } catch (error) {
      console.error("Failed to load client:", error);
      toast.error("Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, user, router]);

  useEffect(() => {
    setLogsLoading(false);
  }, []);

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

  const VERIFICATION_METHODS = [
    "Passport",
    "National ID",
    "Driver's License",
    "Birth Certificate",
  ] as const;

  const toggleMethod = (method: string) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const closeVerifyModal = useCallback(() => {
    setShowVerifyModal(false);
    setSelectedMethods([]);
    setOtherMethod("");
  }, []);

  const closeCreateAccountModal = useCallback(() => {
    setShowCreateAccountModal(false);
    setCreateAccountForm({
      accountType: "Savings",
      accountStatus: "Active",
      openingDate: new Date().toISOString().split("T")[0],
      balance: 0,
      currency: "SGD",
      branchId: "",
    });
  }, []);

  const handleCreateAccount = async () => {
    if (!createAccountForm.branchId.trim()) {
      toast.error("Branch ID is required");
      return;
    }
    setIsCreatingAccount(true);
    try {
      await accountsApi.create({ ...createAccountForm, clientId });
      toast.success("Account created successfully");
      closeCreateAccountModal();
      await fetchData();
    } catch (error) {
      console.error("Failed to create account:", error);
      toast.error("Failed to create account");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setDeletingAccountId(accountId);
    try {
      await accountsApi.delete(accountId);
      toast.success("Account deleted successfully");
      await fetchData();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const hasValidSelection =
    selectedMethods.length > 0 &&
    (!selectedMethods.includes("Other") || otherMethod.trim().length > 0);

  const handleVerifyClient = async () => {
    const methods = selectedMethods
      .map((m) => (m === "Other" ? otherMethod.trim() : m))
      .filter(Boolean);

    if (methods.length === 0) {
      toast.error("Please select at least one verification method");
      return;
    }

    setIsVerifying(true);
    try {
      await clientsApi.verify(clientId, methods.join(", "));
      toast.success("Client verified successfully");
      closeVerifyModal();
      await fetchData();
    } catch (error) {
      console.error("Failed to verify client:", error);
      toast.error("Failed to verify client");
    } finally {
      setIsVerifying(false);
    }
  };

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
              <div className="flex gap-2">
                <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                <div className="h-9 w-16 bg-muted animate-pulse rounded" />
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
            <div className="h-5 w-20 bg-muted animate-pulse rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => router.back()} />
          <h1 className="text-xl font-medium leading-none">Client Not Found</h1>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              The client you are looking for does not exist or has been removed.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.back()}
            >
              Back to Clients
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
          <h1 className="text-2xl font-medium leading-none">Client Details</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/agent/clients/${clientId}/edit`)}
          className="bg-muted hover:bg-muted/80 hover:cursor-pointer transition-colors"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Client
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full bg-sky-500/80 text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
                {client.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold leading-tight">{client.name}</h2>
                  {client.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium bg-muted text-muted-foreground">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="text-base font-medium text-muted-foreground mt-1">
                  {client.email}
                </p>
              </div>
            </div>
            {!client.verified && (
              <div className="flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowVerifyModal(true)}
                  disabled={isVerifying}
                >
                  Verify
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-8">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Phone</p>
                <p className="text-base font-normal">{client.phone}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Date of Birth</p>
                <p className="text-base font-normal">
                  {formatDate(client.dateOfBirth, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Client Since</p>
                <p className="text-base font-normal">
                  {formatDate(client.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Total Balance</p>
                <p className="text-base font-normal">
                  {formatCurrency(client.balance, getLocaleForCurrency(client.currency), client.currency || "SGD")}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Client ID</p>
                <p className="text-base font-normal">{client.id}</p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {client.verified && client.verificationMethod && (
        <Card className = "w-3/5">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Verification Method</h3>
            <p className="text-base font-normal">{client.verificationMethod}</p>
          </CardContent>
        </Card>
      )}

      <Card className="w-3/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              Accounts
              <span className="text-muted-foreground font-normal ml-1.5">({client.accountCount})</span>
            </h3>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5"
              onClick={() => setShowCreateAccountModal(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Account
            </Button>
          </div>
          {client.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No accounts yet.</p>
          ) : (
            <div className="divide-y">
              {client.accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{account.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opened {formatDate(account.openedAt, { month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium">
                      {formatCurrency(account.balance, getLocaleForCurrency(account.currency), account.currency)}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      account.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {account.status}
                    </span>
                    {account.status !== "Inactive" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        disabled={deletingAccountId === account.id}
                        onClick={() => handleDeleteAccount(account.id)}
                        aria-label="Delete account"
                      >
                        {deletingAccountId === account.id
                          ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className = "w-3/5">
        <h2 className="text-lg font-semibold mb-2">Client&apos;s Recent Activity</h2>
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
              <p className="text-sm text-muted-foreground">No activity recorded for this client.</p>
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
                              <span className="font-semibold">{client.name}</span>
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

        <ClientSidebar clients={allClients} currentClientId={clientId} />
      </div>

      {showCreateAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-account-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeCreateAccountModal}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 id="create-account-modal-title" className="text-lg font-semibold text-foreground">
                Create Account
              </h3>
              <button
                type="button"
                onClick={closeCreateAccountModal}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Type</label>
                <select
                  value={createAccountForm.accountType}
                  onChange={(e) => setCreateAccountForm((f) => ({ ...f, accountType: e.target.value }))}
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
                  value={createAccountForm.accountStatus}
                  onChange={(e) => setCreateAccountForm((f) => ({ ...f, accountStatus: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Opening Date</label>
                <input
                  type="date"
                  value={createAccountForm.openingDate}
                  onChange={(e) => setCreateAccountForm((f) => ({ ...f, openingDate: e.target.value }))}
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
                    value={createAccountForm.balance}
                    onChange={(e) => setCreateAccountForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Currency</label>
                  <select
                    value={createAccountForm.currency}
                    onChange={(e) => setCreateAccountForm((f) => ({ ...f, currency: e.target.value }))}
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
                  value={createAccountForm.branchId}
                  onChange={(e) => setCreateAccountForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                >
                  <option value="">Select a branch</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={closeCreateAccountModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeVerifyModal}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 id="verify-modal-title" className="text-lg font-semibold text-foreground">
                Verify Client
              </h3>
              <button
                type="button"
                onClick={closeVerifyModal}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Select the verification method(s) used to verify <span className="font-medium text-foreground">{client.name}</span>. This action cannot be undone.
              </p>
              <div className="space-y-2">
                {VERIFICATION_METHODS.map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(method)}
                      onChange={() => toggleMethod(method)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">{method}</span>
                  </label>
                ))}
                <label
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMethods.includes("Other")}
                    onChange={() => toggleMethod("Other")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Other</span>
                </label>
                {selectedMethods.includes("Other") && (
                  <input
                    type="text"
                    value={otherMethod}
                    onChange={(e) => setOtherMethod(e.target.value)}
                    placeholder="Enter verification method"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={closeVerifyModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyClient}
                  disabled={!hasValidSelection || isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
