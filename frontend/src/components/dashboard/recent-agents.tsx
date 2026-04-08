"use client";

import Link from "next/link";
import type { ApiUser } from "@/types";
import { UserCheck } from "lucide-react";
import { formatDate } from "@/lib/formatters";

interface RecentAgentsProps {
  agents: ApiUser[];
}

export function RecentAgents({ agents }: RecentAgentsProps) {
  const displayedAgents = agents.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Recently Created Agents</h2>
        </div>
        {agents.length > 0 && (
          <Link
            href="/admin/agents"
            className="text-sm font-medium text-primary hover:underline hover:underline-offset-3 hover:font-semibold duration-300 transition-all"
          >
            View More
          </Link>
        )}
      </div>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          {displayedAgents.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No agents found.
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {displayedAgents.map((agent) => (
                    <tr
                      key={agent.userId}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          {agent.firstName} {agent.lastName}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {agent.emailAddress}
                      </td>
                      <td className="p-4 align-middle">
                        {agent.phoneNumber || "\u2014"}
                      </td>
                      <td className="p-4 align-middle">
                        {formatDate(agent.createdAt, { day: "2-digit", month: "short", year: "numeric" }, "en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
