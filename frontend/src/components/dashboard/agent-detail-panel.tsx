"use client";

import Link from "next/link";
import type { ApiUser } from "@/types";
import { Button } from "@/components/ui/button";
import { CloseButton } from "../ui/close-button";
import { formatDate, formatTime } from "@/lib/formatters";

interface AgentDetailPanelProps {
  agent: ApiUser;
  onClose: () => void;
}

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  const agentName = `${agent.firstName} ${agent.lastName}`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Agent Details</h2>
        <div className="flex items-center gap-1">
          <CloseButton onClick={onClose} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
            {agent.firstName[0]}{agent.lastName[0]}
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <h3 className="text-xl font-semibold">{agentName}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <span className="text-sm font-normal text-foreground truncate ml-4">{agent.emailAddress}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Phone</span>
              <span className="text-sm font-normal text-foreground">{agent.phoneNumber || "\u2014"}</span>
            </div>
          </div>

          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Created</span>
              <span className="text-sm font-normal text-foreground">
                {formatDate(agent.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")} | {formatTime(agent.createdAt)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Role</span>
              <span className="text-sm font-normal text-foreground">Agent</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg space-y-3">
          <h3 className="text-sm font-medium mb-2">Agent Information</h3>
          <div className="rounded-lg border border-2 p-4 space-y-3">
            <div className="flex justify-between py-2 border-b border-dashed">
              <span className="text-sm font-medium text-muted-foreground">Agent ID</span>
              <span className="text-sm font-normal text-foreground">{agent.userId}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Admin Access</span>
              <span className="text-sm font-normal text-foreground">
                <span className="text-muted-foreground">No</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <Button className="w-full" asChild>
          <Link href={`/admin/agents/${agent.userId}`}>
            View Full Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
