"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useChannel } from "@/contexts/channel-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const STATUS_LABELS: Record<string, string> = {
  in_progress: "進行中",
  completed: "完了",
  abandoned: "離脱",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  in_progress: "default",
  completed: "secondary",
  abandoned: "destructive",
};

interface SessionRow {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  line_user: { display_name: string | null } | null;
  answer_count: number;
}

export default function SessionsPage() {
  const { channels, selectedChannelId } = useChannel();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);

  // グローバル選択が確定したら初回のみフィルタに反映
  useEffect(() => {
    if (selectedChannelId && channelFilter === "all") {
      setChannelFilter(selectedChannelId);
    }
  }, [selectedChannelId]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Resolve user IDs for selected channel
    let userIdFilter: string[] | null = null;
    if (channelFilter !== "all") {
      const { data: users } = await supabase
        .from("line_users")
        .select("id")
        .eq("line_channel_id", channelFilter);
      userIdFilter = users?.map((u) => u.id) ?? [];
    }

    let query = supabase
      .from("sessions")
      .select("id, status, started_at, completed_at, line_user:line_users(display_name)")
      .order("started_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (userIdFilter !== null) {
      if (userIdFilter.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }
      query = query.in("line_user_id", userIdFilter);
    }

    const [sessionsResult, questionsResult] = await Promise.all([
      query,
      supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    setTotalQuestions(questionsResult.count ?? 0);

    if (sessionsResult.data) {
      const sessionIds = sessionsResult.data.map((s: any) => s.id);
      const { data: answers } = await supabase
        .from("answers")
        .select("session_id")
        .in("session_id", sessionIds);

      const countMap = new Map<string, number>();
      if (answers) {
        for (const a of answers) {
          countMap.set(a.session_id, (countMap.get(a.session_id) ?? 0) + 1);
        }
      }

      setSessions(
        sessionsResult.data.map((s: any) => ({
          ...s,
          answer_count: countMap.get(s.id) ?? 0,
        }))
      );
    }
    setLoading(false);
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = search
    ? sessions.filter((s) =>
        s.line_user?.display_name
          ?.toLowerCase()
          .includes(search.toLowerCase())
      )
    : sessions;

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">セッション管理</h1>

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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="in_progress">進行中</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="abandoned">離脱</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="ユーザー名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filteredSessions.length === 0 ? (
        <p className="text-muted-foreground">セッションがありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ユーザー</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead>開始日時</TableHead>
              <TableHead>完了日時</TableHead>
              <TableHead className="w-16">詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  {session.line_user?.display_name ?? "不明"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANTS[session.status] ?? "secondary"}
                  >
                    {STATUS_LABELS[session.status] ?? session.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {session.answer_count}/{totalQuestions}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(session.started_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell className="text-sm">
                  {session.completed_at
                    ? new Date(session.completed_at).toLocaleString("ja-JP")
                    : "-"}
                </TableCell>
                <TableCell>
                  <Link href={`/sessions/${session.id}`}>
                    <Button variant="outline" size="sm">
                      詳細
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
