import { notFound } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionResult, answersResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("*, line_user:line_users(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("answers")
      .select("*, question:questions(question_key, content)")
      .eq("session_id", id)
      .order("answered_at", { ascending: true }),
  ]);

  if (!sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data as any;
  const answers = (answersResult.data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">セッション詳細</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ユーザー情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">表示名: </span>
              {session.line_user?.display_name ?? "不明"}
            </div>
            <div>
              <span className="text-muted-foreground">LINE ID: </span>
              <span className="font-mono">
                {session.line_user?.line_user_id ?? "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>セッション情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">ステータス: </span>
              <Badge
                variant={STATUS_VARIANTS[session.status] ?? "secondary"}
              >
                {STATUS_LABELS[session.status] ?? session.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">開始: </span>
              {new Date(session.started_at).toLocaleString("ja-JP")}
            </div>
            {session.completed_at && (
              <div>
                <span className="text-muted-foreground">完了: </span>
                {new Date(session.completed_at).toLocaleString("ja-JP")}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">回答数: </span>
              {answers.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>回答一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">回答なし</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>質問キー</TableHead>
                  <TableHead>質問内容</TableHead>
                  <TableHead>回答</TableHead>
                  <TableHead>回答日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answers.map((answer: any) => (
                  <TableRow key={answer.id}>
                    <TableCell className="font-mono text-sm">
                      {answer.question?.question_key ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {answer.question?.content ?? "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {answer.answer_value}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(answer.answered_at).toLocaleString("ja-JP")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {session.result && (
        <Card>
          <CardHeader>
            <CardTitle>計算結果</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>項目</TableHead>
                  <TableHead>金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(session.result).map(
                  ([key, val]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>{val.label ?? key}</TableCell>
                      <TableCell className="font-mono font-bold">
                        {val.formatted ?? val.value ?? "-"}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
