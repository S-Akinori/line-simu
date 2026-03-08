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

const TYPE_LABELS: Record<string, string> = {
  session_completed: "セッション完了",
  session_abandoned: "セッション離脱",
  user_inactive: "ユーザー非アクティブ",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "保留中",
  sent: "送信済み",
  failed: "失敗",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  sent: "default",
  failed: "destructive",
};

interface NotificationRow {
  id: string;
  notification_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  line_user: { display_name: string | null } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("admin_notifications")
      .select("id, notification_type, status, sent_at, created_at, error_message, line_user:line_users(display_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (typeFilter !== "all") {
      query = query.eq("notification_type", typeFilter);
    }

    const { data } = await query;
    if (data) setNotifications(data as unknown as NotificationRow[]);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">通知ログ</h1>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="session_completed">セッション完了</SelectItem>
          <SelectItem value="session_abandoned">セッション離脱</SelectItem>
          <SelectItem value="user_inactive">非アクティブ</SelectItem>
        </SelectContent>
      </Select>

      {notifications.length === 0 ? (
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
            {notifications.map((notif) => (
              <TableRow key={notif.id}>
                <TableCell className="text-sm">
                  {TYPE_LABELS[notif.notification_type] ??
                    notif.notification_type}
                </TableCell>
                <TableCell>
                  {notif.line_user?.display_name ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANTS[notif.status] ?? "secondary"}
                  >
                    {STATUS_LABELS[notif.status] ?? notif.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {notif.sent_at
                    ? new Date(notif.sent_at).toLocaleString("ja-JP")
                    : "-"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-destructive">
                  {notif.error_message ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
