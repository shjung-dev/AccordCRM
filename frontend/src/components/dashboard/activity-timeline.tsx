"use client";

import {
  type GroupedActivityLog,
  groupActivityLogs,
  getEntityDisplayName,
  getActivitySummaryPrefix,
} from "@/lib/activity-utils";

import Link from "next/link";
import { formatTime } from "@/lib/formatters";
import type { ActivityLog, Transaction } from "@/types";
import { PaginationBar } from "@/components/dashboard/pagination-bar";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { TransactionDetailsDrawer } from "@/components/dashboard/transaction-details-drawer";
import { ActivityDetailsPanel, type UserInfo } from "@/components/dashboard/activity-details-panel";

export type { UserInfo };

interface ActivityTimelineProps {
  activities: ActivityLog[];
  clientMap: Map<string, string>;
  transactions: Transaction[];
  userMap?: Map<string, UserInfo>;
  canViewClients: boolean;
  pageSize?: number;
}

interface DateGroup {
  label: string;
  items: GroupedActivityLog[];
}

function getDateOnly(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateKey = getDateOnly(date);
  const todayKey = getDateOnly(today);
  const yesterdayKey = getDateOnly(yesterday);

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function groupByDate(items: GroupedActivityLog[]): DateGroup[] {
  const groups: Map<string, GroupedActivityLog[]> = new Map();

  for (const item of items) {
    const label = getDateLabel(item.timestamp);
    const existing = groups.get(label) || [];
    existing.push(item);
    groups.set(label, existing);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

interface ClientLinkProps {
  name: string;
  clientId: string;
  className?: string;
}

function ClientLink({ name, clientId, className = "" }: ClientLinkProps) {
  return (
    <Link
      href={`/agent/clients/${clientId}`}
      className={`text-primary hover:underline font-semibold ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "FAILURE") {
    return (
      <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        Failed
      </span>
    );
  }
  return null;
}

type TimeFilter = "1h" | "24h" | "3d" | "7d";

const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  "1h": "Past Hour",
  "24h": "24 Hours",
  "3d": "3 Days",
  "7d": "Past Week",
};

const TIME_FILTER_HOURS: Record<TimeFilter, number> = {
  "1h": 1,
  "24h": 24,
  "3d": 72,
  "7d": 168,
};

function getPerformerInfo(userId: string, userMap?: Map<string, UserInfo>): UserInfo | null {
  if (!userMap) return null;
  return userMap.get(userId) ?? null;
}

function getPerformerText(userId: string, userMap?: Map<string, UserInfo>): string | null {
  const info = getPerformerInfo(userId, userMap);
  if (!info) return null;
  return `${info.isAdmin ? "Admin" : "Agent"}: ${info.name}`;
}

function PerformerBadge({ userId, userMap }: { userId: string; userMap?: Map<string, UserInfo> }) {
  const info = getPerformerInfo(userId, userMap);
  if (!info) return <span>—</span>;
  return (
    <span className={info.isAdmin ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground"}>
      {info.isAdmin ? "Admin" : "Agent"}: {info.name}
    </span>
  );
}

export function ActivityTimeline({
  activities,
  clientMap,
  transactions,
  userMap,
  canViewClients,
  pageSize,
}: ActivityTimelineProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedItem, setSelectedItem] = useState<GroupedActivityLog | null>(
    null
  );
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [panelTop, setPanelTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRowOffsetRef = useRef<number | null>(null);
  const restoredFromUrlRef = useRef(false);

  const transactionMap = useMemo(
    () => new Map(transactions.map((txn) => [txn.id, txn])),
    [transactions]
  );

  const userNameMap = useMemo(() => {
    if (!userMap) return undefined;
    const map = new Map<string, string>();
    userMap.forEach((info, id) => map.set(id, info.name));
    return map;
  }, [userMap]);

  const handleTransactionClick = useCallback(
    (txnId: string) => {
      const txn = transactionMap.get(txnId);
      if (txn) {
        setSelectedTransaction(txn);
      }
    },
    [transactionMap]
  );

  const filteredActivities = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - TIME_FILTER_HOURS[timeFilter] * 60 * 60 * 1000);
    return activities.filter((a) => new Date(a.timestamp) >= cutoff);
  }, [activities, timeFilter]);

  const groupedLogs = useMemo(() => groupActivityLogs(filteredActivities), [filteredActivities]);

  const activityCurrentPage = Math.max(1, Number(searchParams.get("activityPage")) || 1);
  const activityTotalPages = pageSize ? Math.max(1, Math.ceil(groupedLogs.length / pageSize)) : 1;
  const paginatedLogs = useMemo(() => {
    if (!pageSize) return groupedLogs;
    const start = (activityCurrentPage - 1) * pageSize;
    return groupedLogs.slice(start, start + pageSize);
  }, [groupedLogs, pageSize, activityCurrentPage]);

  const handleActivityPageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("activityPage");
    } else {
      params.set("activityPage", String(page));
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const dateGroups = useMemo(() => groupByDate(paginatedLogs), [paginatedLogs]);

  useEffect(() => {
    if (restoredFromUrlRef.current || groupedLogs.length === 0) return;
    const activityId = searchParams.get("activity");
    if (!activityId) return;
    const match = groupedLogs.find((log) => log.log_id === activityId);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItem(match);
    }
    restoredFromUrlRef.current = true;
  }, [groupedLogs, searchParams]);

  const updatePanelPosition = useCallback(() => {
    if (!containerRef.current || !panelRef.current) return;
    const container = containerRef.current;
    const panel = panelRef.current;
    const rowOffset = pendingRowOffsetRef.current ?? 0;

    const maxTop = Math.max(
      container.scrollTop,
      container.scrollTop + container.clientHeight - panel.offsetHeight
    );
    const clampedTop = Math.min(Math.max(rowOffset, container.scrollTop), maxTop);
    setPanelTop(clampedTop);
  }, []);

  const handleSelectItem = useCallback(
    (item: GroupedActivityLog, rowElement: HTMLElement) => {
      setSelectedItem(item);

      const params = new URLSearchParams(searchParams.toString());
      params.set("activity", item.log_id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const rowRect = rowElement.getBoundingClientRect();
      pendingRowOffsetRef.current =
        rowRect.top - containerRect.top + containerRef.current.scrollTop;

      updatePanelPosition();
    },
    [updatePanelPosition, searchParams, router, pathname]
  );

  useEffect(() => {
    if (!selectedItem) return;
    updatePanelPosition();
  }, [selectedItem, updatePanelPosition]);

  useEffect(() => {
    if (!selectedItem || !containerRef.current || !panelRef.current) return;
    const container = containerRef.current;
    const panel = panelRef.current;
    const maxTop = Math.max(
      container.scrollTop,
      container.scrollTop + container.clientHeight - panel.offsetHeight
    );
    if (panelTop > maxTop) {
      setPanelTop(maxTop);
    }
  }, [panelTop, selectedItem]);

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("activity");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const renderEntityName = (item: GroupedActivityLog) => {
    if (
      item.entity_type.toLowerCase() === "client" &&
      clientMap.has(item.entity_id) &&
      canViewClients
    ) {
      return (
        <ClientLink name={getEntityDisplayName(item.entity_type, item.entity_id, clientMap, userNameMap)} clientId={item.entity_id} />
      );
    }
    if (item.entity_type.toLowerCase() === "transaction" && transactionMap.has(item.entity_id)) {
      return (
        <button
          type="button"
          className="text-primary hover:underline font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            handleTransactionClick(item.entity_id);
          }}
        >
          {item.entity_id}
        </button>
      );
    }
    return (
      <span>{getEntityDisplayName(item.entity_type, item.entity_id, clientMap, userNameMap)}</span>
    );
  };

  if (activities.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">My Recent Activities</h2>
        <div className="bg-card rounded-xl p-6 border border-border transition-colors duration-300">
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No activity to display.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 shadow-cl">
        <h2 className="text-lg font-semibold">My Recent Activities</h2>
        <div className="flex items-center gap-1">
          {(Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTimeFilter(key);
                if (pageSize) handleActivityPageChange(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all hover:cursor-pointer ${
                timeFilter === key
                  ? "bg-primary text-white font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {TIME_FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={`relative flex gap-6 ${selectedItem ? "items-start" : ""}`}>
        <div
          className={`min-w-0 transition-all duration-300 ${selectedItem ? "w-3/5" : "w-full"}`}
        >
          <div className="bg-card shadow-md rounded-xl p-6 border border-1 transition-colors duration-300">
            {dateGroups.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No activity in the selected time range.
                </p>
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
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleSelectItem(item, e.currentTarget)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectItem(item, e.currentTarget);
                          }
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-md hover:bg-muted/50 hover:cursor-pointer transition-colors ${
                          selectedItem?.log_id === item.log_id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-baseline gap-0 text-sm text-foreground leading-relaxed">
                          <span className="w-[4.5rem] shrink-0 text-muted-foreground">
                            {formatTime(item.timestamp)}
                          </span>
                          {userMap && userMap.size > 0 && (
                            <span className="w-40 shrink-0 font-semibold truncate" title={getPerformerText(item.user_id, userMap) ?? undefined}>
                              <PerformerBadge userId={item.user_id} userMap={userMap} />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="font-normal">
                              {getActivitySummaryPrefix(item)}{" "}
                              {renderEntityName(item)}
                            </span>
                            {item.reason && (
                              <span className="text-muted-foreground">
                                {" "}| {item.reason}
                              </span>
                            )}
                            <StatusBadge status={item.action_status} />
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

        {selectedItem && (
          <ActivityDetailsPanel
            activity={selectedItem}
            clientMap={clientMap}
            userMap={userMap}
            userNameMap={userNameMap}
            transactionMap={transactionMap}
            canViewClients={canViewClients}
            onClose={handleClosePanel}
            onTransactionClick={handleTransactionClick}
            panelRef={panelRef}
            panelTop={panelTop}
          />
        )}
      </div>

      {pageSize && groupedLogs.length > 0 && (
        <div className="mt-4">
          <PaginationBar
            totalCount={groupedLogs.length}
            currentPage={activityCurrentPage}
            totalPages={activityTotalPages}
            pageSize={pageSize}
            onPageChange={handleActivityPageChange}
            itemLabel={{ singular: "activity", plural: "activities" }}
          />
        </div>
      )}

      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
