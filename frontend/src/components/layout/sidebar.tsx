import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ArrowLeftRight, Activity, Settings, Shield, LogOut, ContactRound, Landmark } from "lucide-react";

const agentNavigationItems = [
  {
    title: "Dashboard",
    href: "/agent",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    href: "/agent/clients",
    icon: Users,
  },
  {
    title: "Transactions",
    href: "/agent/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Activity Logs",
    href: "/agent/activities",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/agent/settings",
    icon: Settings,
  },
];

const getAdminNavigationItems = (isRootAdmin: boolean) => {
  const baseItems = [
    {
      title: "Admin Dashboard",
      href: isRootAdmin ? "/admin/root/dashboard" : "/admin/dashboard",
      icon: Shield,
    },
  ];

  const activityItem = {
    title: "Activity Logs",
    href: "/admin/activities",
    icon: Activity,
  };

  const agentsItem = {
    title: "Agents",
    href: "/admin/agents",
    icon: Users,
  };

  const clientsItem = {
    title: "Clients",
    href: "/admin/clients",
    icon: ContactRound,
  };

  const accountsItem = {
    title: "Accounts",
    href: "/admin/accounts",
    icon: Landmark,
  };

  if (!isRootAdmin) return [...baseItems, agentsItem, clientsItem, accountsItem, activityItem];

  return [
    ...baseItems,
    agentsItem,
    clientsItem,
    accountsItem,
    activityItem,
    {
      title: "Settings",
      href: "/admin/root/settings",
      icon: Settings,
    },
  ];
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navItems = user?.role === "admin" ? getAdminNavigationItems(!!user?.isRootAdmin) : agentNavigationItems;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const renderLogo = () => {
    if (user?.role === "admin") {
      if (user.isRootAdmin) {
        return (
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <h1 className="text-xl font-semibold text-primary">AccordCRM</h1>
              <span className="text-[10px] text-muted-foreground font-medium">(root admin)</span>
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <h1 className="text-xl font-semibold text-primary">AccordCRM</h1>
            <span className="text-[10px] text-muted-foreground font-medium">(admin)</span>
          </div>
        </div>
      );
    }
    if (user?.role === "agent") {
      return (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <h1 className="text-xl font-semibold text-primary">AccordCRM</h1>
            <span className="text-[10px] text-muted-foreground font-medium">(agent)</span>
          </div>
        </div>
      );
    }
    return <h1 className="text-xl font-semibold text-primary">AccordCRM</h1>;
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card transition-colors duration-300">
      <div className="flex h-16 items-center border-b px-6">
        {renderLogo()}
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = item.href === "/agent" || item.href === "/admin/root/dashboard" || item.href === "/admin/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
