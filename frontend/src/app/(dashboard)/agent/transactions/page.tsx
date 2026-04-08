"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  TRANSACTION_STATUS_STYLES,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/constants";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import { transformTransaction } from "@/lib/transformers";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { clientsApi, transactionsApi, accountsApi } from "@/lib/api";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TransactionDetailsDrawer } from "@/components/dashboard/transaction-details-drawer";
import type { Transaction, ApiClient, ApiTransaction, ApiAccount, PagedResponse } from "@/types";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [txnResponse, apiClientsResponse, accountsRaw] = await Promise.all([
          transactionsApi.getAll(currentPage - 1, PAGE_SIZE),
          clientsApi.getByAgentId(user.id, 0, 100),
          accountsApi.getAll(),
        ]) as [PagedResponse<ApiTransaction>, PagedResponse<ApiClient>, unknown];

        const apiClients = apiClientsResponse.content;
        const apiAccounts = (Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw as { content?: unknown[] }).content ?? []) as ApiAccount[];

        const clientNameMap = new Map<string, string>();
        apiClients.forEach((client: ApiClient) => {
          clientNameMap.set(client.clientId, `${client.firstName} ${client.lastName}`);
        });

        const accountTypeMap = new Map<string, string>();
        apiAccounts.forEach((account: ApiAccount) => {
          accountTypeMap.set(account.accountId, account.accountType);
        });

        const transformedTransactions = txnResponse.content.map((txn: ApiTransaction) =>
          transformTransaction(txn, clientNameMap, accountTypeMap)
        );

        setTransactions(transformedTransactions);
        setTotalPages(Math.max(1, txnResponse.totalPages));
        setTotalCount(txnResponse.totalElements);
      } catch {
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentPage]);

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

  const handleViewDetails = useCallback((txn: Transaction) => {
    setSelectedTransaction(txn);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Client Transactions</h1>
          <div className="h-5 w-40 bg-muted animate-pulse rounded mt-2" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Client</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Account</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Client Transactions</h1>
        <p className="text-base text-muted-foreground mt-2">
          {totalCount} transactions total
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {totalCount === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      ID
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Account
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Date
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
                  {transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle text-sm">
                        {txn.id}
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {txn.clientName}
                      </td>
                      <td className="p-4 align-middle">
                        {txn.accountId}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center gap-1.5">
                          {txn.type === "deposit" ? (
                            <ArrowDownCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className="hidden sm:inline">{TRANSACTION_TYPE_LABELS[txn.type]}</span>
                          <span className="sm:hidden">{txn.type === "deposit" ? "D" : "W"}</span>
                        </span>
                      </td>
                      <td className="p-4 align-middle font-medium">
                        {formatCurrency(txn.amount, "en-SG", "SGD")}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(
                          txn.date,
                          { day: "2-digit", month: "short", year: "numeric" },
                          "en-GB"
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TRANSACTION_STATUS_STYLES[txn.status]}`}
                        >
                          {TRANSACTION_STATUS_LABELS[txn.status]}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetails(txn)}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {txn.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:text-primary"
                              onClick={() => handleViewDetails(txn)}
                              aria-label="Retry transaction"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        itemLabel={{ singular: "transaction", plural: "transactions" }}
      />

      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
