"use client";

import Link from "next/link";
import type { Client } from "@/types";
import { Search, X } from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFuzzySearch } from "@/hooks/use-fuzzy-search";

interface ClientSidebarProps {
  clients: Client[];
  currentClientId: string;
}

const FUSE_CONFIG = {
  keys: ["name"],
  getText: (c: Client) => c.name,
  threshold: 0.4,
};

export function ClientSidebar({ clients, currentClientId }: ClientSidebarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const { results: filteredClients, suggestion } = useFuzzySearch(
    sortedClients,
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
            Your Clients
            {clients.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1.5">({clients.length})</span>
            )}
          </h3>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
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
            {filteredClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No clients found
              </p>
            ) : (
              filteredClients.map((c) => {
                const initials = c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
                return (
                  <Link
                    key={c.id}
                    href={`/agent/clients/${c.id}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      c.id === currentClientId
                        ? "bg-primary text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        c.id === currentClientId
                          ? "bg-white text-black"
                          : "bg-sky-500/80 text-white"
                      }`}
                    >
                      {initials}
                    </div>
                    <span className="truncate font-medium">
                      {c.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
