"use client";

import Link from "next/link";
import type { Client } from "@/types";
import { Button } from "@/components/ui/button";
import { CloseButton } from "../ui/close-button";
import { CheckCircle2, XCircle } from "lucide-react";
import { getLocaleForCurrency } from "@/lib/transformers";
import { formatCurrency, formatDate, formatTime } from "@/lib/formatters";

interface ClientDetailPanelProps {
  client: Client;
  onClose: () => void;
}

export function ClientDetailPanel({ client, onClose }: ClientDetailPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Client Details</h2>
        <div className="flex items-center gap-1">
          <CloseButton onClick={onClose} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
            {client.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <h3 className="text-xl font-semibold">{client.name}</h3>
            {client.verified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground flex-shrink-0">
                Unverified
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <span className="text-sm font-normal text-foreground truncate ml-4">{client.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Phone</span>
              <span className="text-sm font-normal text-foreground">{client.phone}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Date of Birth</span>
              <span className="text-sm font-normal text-foreground">
                {formatDate(client.dateOfBirth, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Created</span>
              <span className="text-sm font-normal text-foreground">
                {formatDate(client.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")} | {formatTime(client.createdAt)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span className="text-sm font-normal text-foreground">
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Verified</span>
              <span className="text-sm font-normal text-foreground">
                {client.verified ? (
                  <span className="text-emerald-600 font-medium">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {client.verified && client.verificationMethod && (
          <div className="rounded-lg space-y-3">
            <h3 className="text-sm font-medium mb-2">Verification Method</h3>
            <div className="flex justify-between p-3 border border-2 rounded-lg text-sm">
              {client.verificationMethod}
            </div>
          </div>
        )}

        <div className="rounded-lg space-y-3">
          <h3 className="text-sm font-medium mb-2">Account Information</h3>
          <div className="rounded-lg border border-2 p-4 space-y-4">

          <div className="flex justify-between py-2 border-b border-dashed">
            <span className="text-sm font-medium text-muted-foreground">Number of Accounts</span>
            <span className="text-sm font-normal text-foreground">{client.accountCount}</span>
          </div>

          {client.accounts.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No accounts available.
            </div>
          ) : (
            <div className="space-y-3">
              {client.accounts.map((account) => (
                <div key={account.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {account.status === "Active" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">
                        {account.status}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(account.openedAt, { month: "short", day: "2-digit", year: "numeric" })} | {formatTime(account.openedAt)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">Account No.</span>
                    <span className="text-sm font-normal">{account.id}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-semibold">Balance</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(account.balance, getLocaleForCurrency(account.currency), account.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <Button className="w-full" asChild>
          <Link href={`/agent/clients/${client.id}`}>
            View Full Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
