"use client";

import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatTime } from "@/lib/formatters";
import { clientsApi, accountsApi, usersApi } from "@/lib/api";
import type { ApiClient, ApiAccount, ApiUser } from "@/types";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function AdminClientsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = Math.max(0, (Number(searchParams.get("page")) || 1) - 1);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [accountCounts, setAccountCounts] = useState<Map<string, number>>(new Map());
  const [agentNames, setAgentNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadClients = async () => {
      try {
        setLoading(true);
        const [response, apiAccounts, apiUsers] = await Promise.all([
          clientsApi.getAllForAdmin(page, 10),
          accountsApi.getAll() as Promise<ApiAccount[]>,
          usersApi.getAll() as Promise<ApiUser[]>,
        ]);
        const sortedClients = [...response.content].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setClients(sortedClients);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);

        const counts = new Map<string, number>();
        apiAccounts.forEach((account) => {
          counts.set(account.clientId, (counts.get(account.clientId) || 0) + 1);
        });
        setAccountCounts(counts);

        const names = new Map<string, string>();
        apiUsers.forEach((u) => {
          names.set(u.userId, `${u.firstName} ${u.lastName}`);
        });
        setAgentNames(names);
      } catch {
        toast.error("Failed to load clients");
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [user, page]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Clients</h1>
          <div className="h-5 w-32 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b">
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Accounts</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Verified</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Created Date</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Created Time</th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-4 bg-muted animate-pulse rounded-full" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
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
      <div>
        <h1 className="text-3xl font-semibold">Clients</h1>
        {totalElements > 0 && (
          <p className="text-base text-muted-foreground mt-2">
            {totalElements} clients total
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          {clients.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No clients found.
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Accounts
                    </th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Verified
                    </th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Created Date
                    </th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Created Time
                    </th>
                    <th className="h-12 px-4 text-base text-left align-middle font-medium text-muted-foreground">
                      Created By
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {clients.map((client) => (
                    <tr
                      key={client.clientId}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle font-medium">
                        {client.firstName} {client.lastName}
                      </td>
                      <td className="p-4 align-middle">
                        {accountCounts.get(client.clientId) ?? 0}
                      </td>
                      <td className="p-4 align-middle">
                        {client.verifiedAt ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {formatDate(client.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                      </td>
                      <td className="p-4 align-middle">
                        {formatTime(client.createdAt)}
                      </td>
                      <td className="p-4 align-middle">
                        {client.assignedAgentId ? (agentNames.get(client.assignedAgentId) ?? "\u2014") : "\u2014"}
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
        totalCount={totalElements}
        currentPage={page + 1}
        totalPages={totalPages}
        pageSize={10}
        onPageChange={handlePageChange}
        itemLabel={{ singular: "client", plural: "clients" }}
      />
    </div>
  );
}
