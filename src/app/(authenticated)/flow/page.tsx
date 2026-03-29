"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Route, RouteConnection } from "@/types/database";
import { useChannel } from "@/contexts/channel-context";

const RouteFlowCanvas = dynamic(
  () =>
    import("@/components/flow/RouteFlowCanvas").then(
      (m) => m.RouteFlowCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    ),
  }
);

export default function FlowPage() {
  const { selectedChannelId } = useChannel();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [connections, setConnections] = useState<RouteConnection[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    if (!selectedChannelId) {
      setRoutes([]);
      setConnections([]);
      setQuestionCounts({});
      return;
    }
    setLoadingRoutes(true);
    const supabase = createClient();

    supabase
      .from("routes")
      .select("*")
      .eq("channel_id", selectedChannelId)
      .order("sort_order", { ascending: true })
      .then(async ({ data: routeData }) => {
        const fetchedRoutes = (routeData ?? []) as Route[];
        setRoutes(fetchedRoutes);

        if (fetchedRoutes.length === 0) {
          setConnections([]);
          setQuestionCounts({});
          setLoadingRoutes(false);
          return;
        }

        const routeIds = fetchedRoutes.map((r) => r.id);

        const [{ data: connData }, { data: rqData }] = await Promise.all([
          supabase
            .from("route_connections")
            .select("*")
            .in("from_route_id", routeIds)
            .order("sort_order", { ascending: true }),
          supabase
            .from("route_questions")
            .select("route_id")
            .in("route_id", routeIds),
        ]);

        setConnections((connData ?? []) as RouteConnection[]);

        const counts: Record<string, number> = {};
        for (const rq of rqData ?? []) {
          counts[rq.route_id] = (counts[rq.route_id] ?? 0) + 1;
        }
        setQuestionCounts(counts);
        setLoadingRoutes(false);
      });
  }, [selectedChannelId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">フロービュー</h1>
      </div>

      {!selectedChannelId ? (
        <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center">
          <p className="text-muted-foreground">チャンネルを選択してください</p>
        </div>
      ) : loadingRoutes ? (
        <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center">
          <p className="text-muted-foreground">ルートを読み込み中...</p>
        </div>
      ) : routes.length === 0 ? (
        <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center">
          <p className="text-muted-foreground">
            このチャンネルにルートがありません
          </p>
        </div>
      ) : (
        <RouteFlowCanvas
          routes={routes}
          connections={connections}
          questionCounts={questionCounts}
        />
      )}
    </div>
  );
}
