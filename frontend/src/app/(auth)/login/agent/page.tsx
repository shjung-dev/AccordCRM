"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AgentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingSession, setPendingSession] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      const result = await login(email, "agent", password);
      if (result?.type === "NEW_PASSWORD_REQUIRED") {
        setPendingSession(result.session);
        return;
      }
      router.push("/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, session: pendingSession, newPassword, role: "agent" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Failed to set password.");
        return;
      }
      router.push("/agent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden lg:flex lg:w-3/4 relative bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070')"
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h1 className="text-5xl font-bold mb-4">AccordCRM</h1>
          <p className="text-xl text-white/80 max-w-lg">
            Streamline your banking operations with our comprehensive customer relationship management platform.
          </p>
          <p className="text-sm text-white/60 mt-4">
            Powered by UBS and SMU G2-T2
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/4 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Agent Login</h2>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              Enter your credentials to access the agent dashboard
            </p>
          </div>

          {pendingSession ? (
            <form onSubmit={handleNewPassword} className="space-y-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
                Your account requires a new password before continuing.
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                  <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <Label htmlFor="new-password" className="text-sm block mb-1">New Password</Label>
                <Input id="new-password" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm block mb-1">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full" size="md" disabled={isSubmitting}>
                {isSubmitting ? "Setting password..." : "Set Password & Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                  <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <Label htmlFor="email" className="text-sm block mb-1">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm block mb-1">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full" size="md" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link href="/login/admin" className="text-sm font-medium underline underline-offset-4 text-muted-foreground hover:text-primary">
              Signing in as Administrator?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
