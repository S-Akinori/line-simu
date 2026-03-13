"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type LogType =
  | "session_completed"
  | "session_abandoned"
  | "user_inactive"
  | "step_delivery";

interface LogRow {
  id: string;
  log_type: LogType;
  type_label: string;
  status: "sent" | "pending" | "failed";
  sent_at: string;
  error_message: string | null;
  user_display_name: string | null;
}

interface ChannelOption {
  id: string;
  name: string;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "すべてのタイプ" },
  { value: "session_completed", label: "セッション完了" },
  { value: "session_abandoned", label: "セッション離脱" },
  { value: "user_inactive", label: "非アクティブ" },
  { value: "step_delivery", label: "ステップ配信" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "保留中",
  sent: "送信済み",
  failed: "失敗",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> =
  {
    pending: "secondary",
    sent: "default",
    failed: "destructive",
  };

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function NotificationsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("line_channels")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setChannels(data);
      });
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Resolve LINE user IDs for selected channel
    let userIdFilter: string[] | null = null;
    if (channelFilter !== "all") {
      const { data: users } = await supabase
        .from("line_users")
        .select("id")
        .eq("line_channel_id", channelFilter);
      userIdFilter = users?.map((u) => u.id) ?? [];
    }

    if (userIdFilter !== null && userIdFilter.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const showNotifications =
      typeFilter === "all" || typeFilter !== "step_delivery";
    const showStepDelivery =
      typeFilter === "all" || typeFilter === "step_delivery";

    // ---- admin_notifications ----
    let notifRows: LogRow[] = [];
    if (showNotifications) {
      let q = supabase
        .from("admin_notifications")
        .select(
          "id, notification_type, status, sent_at, created_at, error_message, line_user:line_users(display_name)"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (
        typeFilter !== "all" &&
        typeFilter !== "step_delivery"
      ) {
        q = q.eq("notification_type", typeFilter);
      }
      if (userIdFilter !== null) {
        q = q.in("line_user_id", userIdFilter);
      }

      const { data } = await q;
      if (data) {
        notifRows = (data as any[]).map((n) => ({
          id: n.id,
          log_type: n.notification_type as LogType,
          type_label: {
            session_completed: "セッション完了",
            session_abandoned: "セッション離脱",
            user_inactive: "非アクティブ",
          }[n.notification_type as string] ?? n.notification_type,
          status: n.status,
          sent_at: n.sent_at ?? n.created_at,
          error_message: n.error_message ?? null,
          user_display_name: n.line_user?.display_name ?? null,
        }));
      }
    }

    // ---- step_delivery_sends ----
    let stepRows: LogRow[] = [];
    if (showStepDelivery) {
      let q = supabase
        .from("step_delivery_sends")
        .select(
          "id, sent_at, line_user:line_users(display_name), config:step_delivery_configs(name)"
        )
        .order("sent_at", { ascending: false })
        .limit(200);

      if (userIdFilter !== null) {
        q = q.in("line_user_id", userIdFilter);
      }

      const { data } = await q;
      if (data) {
        stepRows = (data as any[]).map((s) => ({
          id: s.id,
          log_type: "step_delivery" as LogType,
          type_label: `ステップ配信: ${s.config?.name ?? "-"}`,
          status: "sent" as const,
          sent_at: s.sent_at,
          error_message: null,
          user_display_name: s.line_user?.display_name ?? null,
        }));
      }
    }

    // Merge and sort by sent_at desc
    const merged = [...notifRows, ...stepRows].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );

    setLogs(merged.slice(0, 200));
    setLoading(false);
  }, [typeFilter, channelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">通知ログ</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="アカウントで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのアカウント</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>
                {ch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground">通知がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイプ</TableHead>
              <TableHead>ユーザー</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>送信日時</TableHead>
              <TableHead>エラー</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm">{row.type_label}</TableCell>
                <TableCell>{row.user_display_name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[row.status] ?? "secondary"}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(row.sent_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-destructive">
                  {row.error_message ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
