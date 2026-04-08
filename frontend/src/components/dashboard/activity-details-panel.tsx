"use client";

import {
  ACTION_STATUS_TEXT_STYLES,
  ACTION_STATUS_LABELS,
} from "@/lib/constants";
import {
  type GroupedActivityLog,
  getActionText,
  getEntityDisplayName,
  getEntityIdLabel,
  getActivitySummaryPrefix,
  getClientLink,
} from "@/lib/activity-utils";

import React from "react";
import Link from "next/link";
import type { Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { formatActivityTimestamp, formatAttributeName } from "@/lib/formatters";

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/;

function formatAttributeValue(value: string): string {
  if (TIMESTAMP_PATTERN.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatActivityTimestamp(value);
    }
  }
  return value;
}

export interface UserInfo {
  name: string;
  isAdmin: boolean;
}

function getPerformerInfo(userId: string, userMap?: Map<string, UserInfo>): UserInfo | null {
  if (!userMap) return null;
  return userMap.get(userId) ?? null;
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

function StatusBadge({ status }: { status: string }) {
  if (status === "FAILURE") {
    return (
      <span className="inline-flex text-red-700 items-center ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        Failed
      </span>
    );
  }
  return null;
}

interface ActivityDetailsPanelProps {
  activity: GroupedActivityLog;
  clientMap: Map<string, string>;
  userMap?: Map<string, UserInfo>;
  userNameMap?: Map<string, string>;
  transactionMap: Map<string, Transaction>;
  canViewClients: boolean;
  onClose: () => void;
  onTransactionClick: (txnId: string) => void;
  panelRef?: React.Ref<HTMLDivElement>;
  panelTop?: number;
}

export function ActivityDetailsPanel({
  activity,
  clientMap,
  userMap,
  userNameMap,
  transactionMap,
  canViewClients,
  onClose,
  onTransactionClick,
  panelRef,
  panelTop = 0,
}: ActivityDetailsPanelProps) {
  const renderEntityName = () => {
    if (
      activity.entity_type.toLowerCase() === "client" &&
      clientMap.has(activity.entity_id) &&
      canViewClients
    ) {
      return (
        <Link
          href={`/agent/clients/${activity.entity_id}`}
          className="text-primary hover:underline font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap, userNameMap)}
        </Link>
      );
    }
    if (activity.entity_type.toLowerCase() === "transaction" && transactionMap.has(activity.entity_id)) {
      return (
        <button
          type="button"
          className="text-primary hover:underline font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            onTransactionClick(activity.entity_id);
          }}
        >
          {activity.entity_id}
        </button>
      );
    }
    return (
      <span>{getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap, userNameMap)}</span>
    );
  };

  return (
    <div className="relative w-2/5 min-h-[600px]">
      <div
        ref={panelRef}
        style={{ top: panelTop }}
        className="absolute right-0 w-full max-h-[600px] rounded-xl border bg-card shadow-lg animate-in slide-in-from-right-5 duration-300 overflow-y-auto"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Activity Details</h2>
            <CloseButton onClick={onClose} />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <p className="text-base text-foreground leading-relaxed">
                <span className="font-normal">
                  {getActivitySummaryPrefix(activity)}{" "}
                  {getEntityIdLabel(activity.entity_type)}{": "}
                  {renderEntityName()}
                </span>
                <StatusBadge status={activity.action_status} />
              </p>
            </div>

            <div className="rounded-lg border border-2 p-4 space-y-3">
              {getPerformerInfo(activity.user_id, userMap) && (
                <div className="flex justify-between py-2 border-b border-dashed">
                  <span className="text-sm font-medium text-muted-foreground">
                    Performed by
                  </span>
                  <span className="font-medium text-sm">
                    <PerformerBadge userId={activity.user_id} userMap={userMap} />
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-dashed">
                <span className="text-sm font-medium text-muted-foreground">
                  Timestamp
                </span>
                <span className="text-sm font-normal font-slate-700">
                  {formatActivityTimestamp(activity.timestamp)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-dashed">
                <span className="text-sm font-medium text-muted-foreground">
                  {getEntityIdLabel(activity.entity_type)}
                </span>
                <span className="text-sm font-normal font-slate-700">
                  {getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap, userNameMap)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-dashed">
                <span className="text-sm font-medium text-muted-foreground">
                  Action
                </span>
                <span className="text-sm font-normal font-slate-700">
                  {getActionText(activity.action)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Status
                </span>
                <span className="text-sm font-normal font-slate-700">
                  <span className={ACTION_STATUS_TEXT_STYLES[activity.action_status] ?? ""}>
                    {ACTION_STATUS_LABELS[activity.action_status] ?? activity.action_status}
                  </span>
                </span>
              </div>
            </div>

            {(() => {
              const changedAttrs = activity.attributes.filter(
                (attr) =>
                  attr.before_value &&
                  attr.after_value &&
                  attr.before_value !== attr.after_value
              );
              if (changedAttrs.length === 0 || activity.action_status === "FAILURE") return null;
              return (
                <div className="">
                  <h3 className="text-sm font-medium mb-2">Changes</h3>
                  <div className="space-y-3">
                    {changedAttrs.map((attr, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-2 bg-muted/60 p-3"
                      >
                        <p className="text-sm font-medium text-foreground mb-2">
                          {formatAttributeName(attr.attribute_name)}
                        </p>
                        <div className="mb-2">
                          <span className="text-sm font-normal text-muted-foreground">
                            From:{" "}
                          </span>
                          <span className="text-sm">
                            {formatAttributeValue(attr.before_value ?? "")}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-normal text-muted-foreground">
                            To:{" "}
                          </span>
                          <span className="text-sm font-medium">
                            {formatAttributeValue(attr.after_value ?? "")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {activity.reason && (
              <div className="rounded-lg space-y-3">
                <h3 className="text-sm font-medium mb-2">Reason for Action</h3>
                <div className="flex justify-between p-3 border border-2 rounded-lg text-sm">
                    {activity.reason}
                </div>
              </div>
            )}

            {activity.error_message && (
              <div className="rounded-lg space-y-3">
                <h3 className="text-sm font-medium mb-2">Error Message</h3>
                <div className="flex justify-between p-3 border border-2 border-destructive/30 rounded-lg text-sm font-medium text-destructive">
                    {activity.error_message}
                </div>
              </div>
            )}
          </div>

          {canViewClients && getClientLink(activity, clientMap) && (
            <div className="p-4 border-t">
              <Button className="w-full" asChild>
                <Link
                  href={`/agent/clients/${getClientLink(activity, clientMap)}`}
                >
                  View Client Profile
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
