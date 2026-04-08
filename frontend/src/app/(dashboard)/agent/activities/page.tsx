"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  type GroupedActivityLog,
  groupActivityLogs,
  getActionText,
  getEntityDisplayName,
  formatFullTimestamp,
} from "@/lib/activity-utils";

import { toast } from "sonner";
import { Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback, useEffect } from "react";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { transformTransaction, transformActivityLog } from "@/lib/transformers";
import { clientsApi, accountsApi, transactionsApi, usersApi } from "@/lib/api";
import { TransactionDetailsDrawer } from "@/components/dashboard/transaction-details-drawer";
import { ActivityDetailsDrawer, StatusBadge } from "@/components/dashboard/activity-details-drawer";
import type { ActivityLog, ApiActivityLog, ApiClient, ApiAccount, ApiTransaction, Transaction, PagedResponse } from "@/types";

const ITEMS_PER_PAGE = 10;

export default function ActivitiesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [selectedActivity, setSelectedActivity] = useState<GroupedActivityLog | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());
  const [accountClientMap, setAccountClientMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsResult, accountsResult, txResult, logsResult] = await Promise.allSettled([
          clientsApi.getByAgentId(user.id, 0, 100),
          accountsApi.getAll(),
          transactionsApi.getAll(0, 100),
          usersApi.getLogs(),
        ]);

        const clientsRaw = clientsResult.status === "fulfilled" ? clientsResult.value : { content: [] };
        const apiClients = (Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw as PagedResponse<ApiClient>).content ?? []) as ApiClient[];
        const map = new Map<string, string>();
        apiClients.forEach((client: ApiClient) => {
          map.set(client.clientId, `${client.firstName} ${client.lastName}`);
        });
        setClientMap(map);

        const apiAccounts = (accountsResult.status === "fulfilled" ? accountsResult.value : []) as ApiAccount[];
        const accountTypeMap = new Map<string, string>();
        const accClientMap = new Map<string, string>();
        apiAccounts.forEach((account: ApiAccount) => {
          accountTypeMap.set(account.accountId, account.accountType);
          const clientName = map.get(account.clientId);
          if (clientName) accClientMap.set(account.accountId, clientName);
        });
        setAccountClientMap(accClientMap);

        const txRaw = txResult.status === "fulfilled" ? txResult.value : { content: [] };
        const apiTransactions = (Array.isArray(txRaw) ? txRaw : (txRaw as PagedResponse<ApiTransaction>).content ?? []) as ApiTransaction[];
        const txns = apiTransactions.map((txn: ApiTransaction) =>
          transformTransaction(txn, map, accountTypeMap)
        );
        setTransactions(txns);

        const apiLogs = (logsResult.status === "fulfilled" ? logsResult.value : []) as ApiActivityLog[];
        setLogs(apiLogs.map(transformActivityLog));
      } catch (error) {
        console.error("Failed to load activities:", error);
        toast.error("Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const groupedLogs = useMemo(() => groupActivityLogs(logs), [logs]);
  const transactionMap = useMemo(
    () => new Map(transactions.map((txn) => [txn.id, txn])),
    [transactions]
  );

  const totalCount = groupedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedLogs, currentPage]);

  const handleViewDetails = useCallback((log: GroupedActivityLog) => {
    setSelectedActivity(log);
  }, []);

  const handleViewTransaction = useCallback(
    (transactionId: string) => {
      const txn = transactionMap.get(transactionId);
      if (txn) {
        setSelectedTransaction(txn);
      }
    },
    [transactionMap]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Your Activities</h1>
          <div className="h-5 w-36 bg-muted animate-pulse rounded mt-2" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Timestamp</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Related To</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></td>
                      <td className="p-4 text-right"><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></td>
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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Your Activities</h1>
        {totalCount > 0 && (
          <p className="text-base text-muted-foreground mt-2">
            {totalCount} {totalCount !== 1 ? "activities" : "activity"} total
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {totalCount === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No activities found.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Related To
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.log_id}
                      className="border-b text-sm transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatFullTimestamp(log.timestamp)}
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {getActionText(log.action)}
                      </td>
                      <td className="p-4 align-middle">
                        {log.entity_type}
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {log.entity_type.toLowerCase() === "transaction" &&
                          transactionMap.has(log.entity_id) ? (
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => handleViewTransaction(log.entity_id)}
                          >
                            {log.entity_id}
                          </button>
                        ) : (
                          getEntityDisplayName(log.entity_type, log.entity_id, clientMap, undefined, accountClientMap)
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <StatusBadge status={log.action_status} />
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-transparent hover:cursor-pointer hover:scale-120 transition-all duration-300"
                          onClick={() => handleViewDetails(log)}
                          aria-label="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
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
        pageSize={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        itemLabel={{ singular: "activity", plural: "activities" }}
      />

      <ActivityDetailsDrawer
        activity={selectedActivity}
        clientMap={clientMap}
        accountClientMap={accountClientMap}
        transactionMap={transactionMap}
        onOpenTransaction={handleViewTransaction}
        onClose={handleCloseDrawer}
        showClientProfileLink
      />

      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
