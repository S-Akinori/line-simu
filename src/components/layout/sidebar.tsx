"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Calculator,
  TableProperties,
  Clock,
  Users,
  Bell,
  UserCog,
  Smartphone,
  BarChart2,
  Workflow,
  Hash,
  HelpCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/channels", label: "LINEアカウント", icon: Smartphone },
  { href: "/questions", label: "質問管理", icon: MessageSquare },
  { href: "/routes", label: "ルート管理", icon: GitBranch },
  { href: "/flow", label: "フロービュー", icon: Workflow },
  { href: "/formulas", label: "計算式", icon: Calculator },
  { href: "/global-constants", label: "グローバル定数", icon: Hash },
  { href: "/lookups", label: "ルックアップ", icon: TableProperties },
  { href: "/result-configs", label: "結果表示設定", icon: BarChart2 },
  { href: "/delivery", label: "ステップ配信", icon: Clock },
  { href: "/sessions", label: "セッション", icon: Users },
  { href: "/notifications", label: "通知ログ", icon: Bell },
  { href: "/accounts", label: "アカウント管理", icon: UserCog },
  { href: "/help", label: "使い方", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold text-sidebar-foreground">
          賠償シミュレーター
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
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
