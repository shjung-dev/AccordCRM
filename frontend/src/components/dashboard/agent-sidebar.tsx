"use client";

import Link from "next/link";
import type { ApiUser } from "@/types";
import { Search, X } from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFuzzySearch } from "@/hooks/use-fuzzy-search";

interface AgentSidebarProps {
  agents: ApiUser[];
  currentAgentId: string;
}

const FUSE_CONFIG = {
  keys: ["firstName", "lastName"],
  getText: (a: ApiUser) => `${a.firstName} ${a.lastName}`,
  threshold: 0.4,
};

export function AgentSidebar({ agents, currentAgentId }: AgentSidebarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    ),
    [agents],
  );

  const { results: filteredAgents, suggestion } = useFuzzySearch(
    sortedAgents,
    query,
    FUSE_CONFIG,
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const applySuggestion = useCallback((name: string) => {
    setQuery(name);
  }, []);

  return (
    <div className="w-64 flex-shrink-0">
      <Card className="sticky top-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">
            All Agents
            {agents.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1.5">({agents.length})</span>
            )}
          </h3>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full h-8 rounded-md border border-input bg-card text-sm pl-8 pr-8 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-200"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all hover:cursor-pointer hover:scale-120 duration-300"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {suggestion && (
            <p className="text-xs text-muted-foreground px-1 pb-2">
              Did you mean{" "}
              <button
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="text-primary font-medium hover:underline"
              >
                {suggestion}
              </button>
              ?
            </p>
          )}

          <div className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {filteredAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No agents found
              </p>
            ) : (
              filteredAgents.map((a) => (
                <Link
                  key={a.userId}
                  href={`/admin/agents/${a.userId}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    a.userId === currentAgentId
                      ? "bg-primary text-white"
                      : "hover:bg-muted"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      a.userId === currentAgentId
                        ? "bg-white text-black"
                        : "bg-sky-500/80 text-white"
                    }`}
                  >
                    {a.firstName[0]}{a.lastName[0]}
                  </div>
                  <span className="truncate font-medium">
                    {a.firstName} {a.lastName}
                  </span>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
