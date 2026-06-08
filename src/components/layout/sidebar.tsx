"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChannel } from "@/contexts/channel-context";
import {
  LayoutDashboard,
  TableProperties,
  Bell,
  UserCog,
  Smartphone,
  Hash,
  HelpCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard, superAdminOnly: false },
  { href: "/channels", label: "LINEアカウント", icon: Smartphone, superAdminOnly: false },
  { href: "/lookups", label: "ルックアップ", icon: TableProperties, superAdminOnly: false },
  { href: "/global-constants", label: "グローバル定数", icon: Hash, superAdminOnly: true },
  { href: "/notifications", label: "通知ログ", icon: Bell, superAdminOnly: false },
  { href: "/accounts", label: "アカウント管理", icon: UserCog, superAdminOnly: false },
  { href: "/help", label: "使い方", icon: HelpCircle, superAdminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUserRole } = useChannel();
  const isSuperAdmin = currentUserRole === "super_admin";

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold text-sidebar-foreground">
          ラインシミュレーター
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
