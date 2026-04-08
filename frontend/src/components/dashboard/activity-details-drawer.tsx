"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { useState, useCallback, useEffect } from "react";
import type { Transaction } from "@/types";
import {
  ACTION_STATUS_TEXT_STYLES,
  ACTION_STATUS_LABELS,
} from "@/lib/constants";
import { formatActivityTimestamp, formatAttributeName } from "@/lib/formatters";
import {
  type GroupedActivityLog,
  getActionText,
  getEntityDisplayName,
  getEntityIdLabel,
  getActivitySummaryPrefix,
  getClientLink,
} from "@/lib/activity-utils";

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

export function StatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center text-sm font-semibold text-green-600">
        Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-sm font-semibold text-red-600">
      Failed
    </span>
  );
}

interface ActivityDetailsDrawerProps {
  activity: GroupedActivityLog | null;
  clientMap: Map<string, string>;
  accountClientMap?: Map<string, string>;
  transactionMap: Map<string, Transaction>;
  onOpenTransaction: (transactionId: string) => void;
  onClose: () => void;
  showClientProfileLink?: boolean;
}

export function ActivityDetailsDrawer({
  activity,
  clientMap,
  accountClientMap,
  transactionMap,
  onOpenTransaction,
  onClose,
  showClientProfileLink = false,
}: ActivityDetailsDrawerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isDrawerVisible = !!activity;

  useEffect(() => {
    if (activity) {
      requestAnimationFrame(() => {
        setIsDrawerOpen(true);
      });
    }
  }, [activity]);

  const handleClose = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDrawerOpen, handleClose]);

  if (!isDrawerVisible || !activity) {
    return null;
  }

  const clientLink = showClientProfileLink ? getClientLink(activity, clientMap) : null;

  const renderEntityName = () => {
    if (
      activity.entity_type.toLowerCase() === "client" &&
      clientMap.has(activity.entity_id) &&
      showClientProfileLink
    ) {
      return (
        <Link
          href={`/agent/clients/${activity.entity_id}`}
          className="text-primary hover:underline font-semibold"
        >
          {getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap, undefined, accountClientMap)}
        </Link>
      );
    }
    if (activity.entity_type.toLowerCase() === "transaction" && transactionMap.has(activity.entity_id)) {
      return (
        <button
          type="button"
          className="text-primary hover:underline font-semibold"
          onClick={() => onOpenTransaction(activity.entity_id)}
        >
          {activity.entity_id}
        </button>
      );
    }
    return (
      <span>{getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap)}</span>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-card border-l rounded-tl-lg rounded-bl-lg shadow-lg z-50 overflow-y-auto transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activity Details</h2>
            <CloseButton onClick={handleClose} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-base text-foreground leading-relaxed">
              <span className="font-normal">
                {getActivitySummaryPrefix(activity)}{" "}
                {getEntityIdLabel(activity.entity_type)}{": "}
                {renderEntityName()}
              </span>
              {activity.action_status === "FAILURE" && (
                <span className="inline-flex text-red-700 items-center ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                  Failed
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Timestamp</span>
              <span className="text-sm font-normal font-slate-700">
                {formatActivityTimestamp(activity.timestamp)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">
                {getEntityIdLabel(activity.entity_type)}
              </span>
              <span className="text-sm font-normal font-slate-700">
                {getEntityDisplayName(activity.entity_type, activity.entity_id, clientMap, undefined, accountClientMap)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Action</span>
              <span className="text-sm font-normal font-slate-700">
                {getActionText(activity.action)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
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
              <div>
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

        {clientLink && (
          <div className="p-4 border-t">
            <Button className="w-full" asChild>
              <Link href={`/agent/clients/${clientLink}`}>
                View Client Profile
              </Link>
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
