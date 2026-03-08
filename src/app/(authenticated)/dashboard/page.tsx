import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Activity, CheckCircle } from "lucide-react";
import { CompletionChart } from "@/components/dashboard/CompletionChart";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [usersResult, activeResult, completedResult, totalSessionsResult, recentResult] =
    await Promise.all([
      supabase
        .from("line_users")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("sessions")
        .select("*, line_user:line_users(display_name)")
        .order("started_at", { ascending: false })
        .limit(10),
    ]);

  const totalUsers = usersResult.count ?? 0;
  const activeSessions = activeResult.count ?? 0;
  const completedSessions = completedResult.count ?? 0;
  const totalSessions = totalSessionsResult.count ?? 0;
  const completionRate =
    totalSessions > 0
      ? ((completedSessions / totalSessions) * 100).toFixed(1)
      : "0.0";
  const recentSessions = recentResult.data ?? [];

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              アクティブセッション
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <CompletionChart />

      <Card>
        <CardHeader>
          <CardTitle>最近のセッション</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              セッションがありません。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>開始日時</TableHead>
                  <TableHead>完了日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session: any) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {session.line_user?.display_name ?? "不明"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_VARIANTS[session.status] ?? "secondary"
                        }
                      >
                        {STATUS_LABELS[session.status] ?? session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(session.started_at).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.completed_at
                        ? new Date(session.completed_at).toLocaleString(
                            "ja-JP"
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
