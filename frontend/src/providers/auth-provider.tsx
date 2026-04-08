"use client";

import type { User, UserRole } from "@/types";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { createContext, useCallback, useEffect, useState } from "react";

export interface NewPasswordRequiredError {
  type: "NEW_PASSWORD_REQUIRED";
  session: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, role: UserRole, password: string) => Promise<void | NewPasswordRequiredError>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  if (initialUser) {
    setUser(initialUser);

    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { accessToken?: string } | null) => {
        if (data?.accessToken) setAccessToken(data.accessToken);
      })
      .catch(() => {});

    setIsLoading(false);
    return;
  }

  const controller = new AbortController();

  const loadSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!response.ok) {
        setUser(null);
        setAccessToken(null);
        return;
      }

      let data: { user?: User };
      try {
        data = await response.json();
      } catch {
        setUser(null);
        return;
      }

      if (controller.signal.aborted) return;

      if (data?.user) {
        setUser(data.user);

        // 🔥 IMPORTANT FIX: do NOT block loading on refresh token
        fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        })
          .then(r => (r.ok ? r.json() : null))
          .then((d: { accessToken?: string } | null) => {
            if (d?.accessToken) setAccessToken(d.accessToken);
          })
          .catch(() => {});
      } else {
        setUser(null);
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setUser(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false); 
      }
    }
  };

  loadSession();

  return () => controller.abort();
}, [initialUser]);

  const login = useCallback(async (email: string, role: UserRole, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, password }),
    });

    // First-login: Cognito requires a new password
    if (response.status === 202) {
      try {
        const data = (await response.json()) as { challenge: string; session: string };
        return { type: "NEW_PASSWORD_REQUIRED" as const, session: data.session };
      } catch {
        throw new Error("Unexpected response from server. Please try again.");
      }
    }

    if (!response.ok) {
      let message = "Something went wrong. Please try again";
      try {
        const data = (await response.json()) as { message?: string };
        if (data?.message) {
          message = data.message;
        }
      } catch {
        // Ignore parsing errors
      }
      throw new Error(message);
    }

    let data: { user: User; accessToken?: string };
    try {
      data = (await response.json()) as { user: User; accessToken?: string };
    } catch {
      throw new Error("Unexpected response from server. Please try again.");
    }
    setUser(data.user);
    if (data.accessToken) { setAccessToken(data.accessToken); }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {
      document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
