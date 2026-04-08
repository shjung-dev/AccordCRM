"use client";

import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/providers/theme-provider";
import { Card, CardContent } from "@/components/ui/card";

export default function RootAdminSettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium leading-none">Settings</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-14 h-14 rounded-full bg-sky-500/80 text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold leading-tight">
                  {user?.first_name} {user?.last_name}
                </h2>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium bg-primary/10 text-primary">
                  Root Admin
                </span>
              </div>
              <p className="text-base font-medium text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Full Name</p>
                <p className="text-base font-normal">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Email Address</p>
                <p className="text-base font-normal">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Role</p>
                <p className="text-base font-normal">Root Admin</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">User ID</p>
                <p className="text-base font-normal text-muted-foreground">{user?.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dark-mode" className="text-sm font-medium">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
