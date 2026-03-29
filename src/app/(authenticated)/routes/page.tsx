"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Route } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import { useChannel } from "@/contexts/channel-context";

export default function RoutesPage() {
  const { selectedChannelId } = useChannel();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = useCallback(async () => {
    if (!selectedChannelId) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("routes")
      .select("*")
      .eq("channel_id", selectedChannelId)
      .order("sort_order", { ascending: true });
    if (data) setRoutes(data as Route[]);
    setLoading(false);
  }, [selectedChannelId]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  async function handleDelete(id: string) {
    if (!confirm("このルートを削除しますか？")) return;
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    const supabase = createClient();
    await supabase.from("routes").delete().eq("id", id);
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ルート管理</h1>
        <Link href={`/routes/new?channel=${selectedChannelId}`}>
          <Button><Plus className="mr-2 h-4 w-4" />新規ルート</Button>
        </Link>
      </div>
      <div className="rounded-md border text-sm">
        <div className="grid grid-cols-[2fr_3fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-2 font-medium">
          <span>名前</span><span>説明</span><span>表示順</span><span></span>
        </div>
        {routes.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground">ルートがありません。</p>
        ) : routes.map((route) => (
          <div key={route.id} className="grid grid-cols-[2fr_3fr_1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-0">
            <span className="flex items-center gap-2 font-medium">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              {route.name}
            </span>
            <span className="truncate text-muted-foreground">{route.description ?? "—"}</span>
            <Badge variant="outline">{route.sort_order}</Badge>
            <div className="flex gap-1">
              <Link href={`/routes/${route.id}`}>
                <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(route.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
