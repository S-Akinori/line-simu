"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { LookupTable } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function LookupsPage() {
  const [tables, setTables] = useState<LookupTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newKeyColumns, setNewKeyColumns] = useState("");

  const fetchTables = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("lookup_tables")
      .select("*")
      .order("table_name", { ascending: true });
    if (data) setTables(data as LookupTable[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  async function handleCreate() {
    const supabase = createClient();
    const keyColumns = newKeyColumns
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("lookup_tables").insert({
      table_name: newName,
      description: newDescription || null,
      key_columns: keyColumns,
    });

    if (error) {
      alert("作成に失敗しました: " + error.message);
      return;
    }

    setNewName("");
    setNewDescription("");
    setNewKeyColumns("");
    setDialogOpen(false);
    fetchTables();
  }

  async function handleDelete(id: string) {
    if (!confirm("このルックアップテーブルを削除しますか？関連するエントリもすべて削除されます。")) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    const supabase = createClient();
    await supabase.from("lookup_tables").delete().eq("id", id);
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ルックアップテーブル</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規テーブル
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規ルックアップテーブル</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>テーブル名</Label>
                <Input
                  placeholder="consolation_money_table"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  placeholder="テーブルの説明..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>キーカラム (カンマ区切り)</Label>
                <Input
                  placeholder="injury_grade, hospitalization_months"
                  value={newKeyColumns}
                  onChange={(e) => setNewKeyColumns(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={!newName}>
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-3">
        <p className="font-medium">ルックアップテーブルとは</p>
        <p className="text-muted-foreground">
          複数のキー条件の組み合わせから数値（結果値）を引くための参照テーブルです。
          例：「等級」×「入院月数」→「慰謝料額（円）」
        </p>
        <div className="space-y-1">
          <p className="font-medium">CSVインポート</p>
          <p className="text-muted-foreground">
            テーブルの詳細ページから「CSVインポート」ボタンでエントリを一括登録できます。
            最終列が結果値、それ以外の列がキーとして扱われます。
          </p>
          <pre className="mt-1 rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
{`injury_grade,hospitalization_months,result_value
1,1,500000
1,2,600000`}
          </pre>
        </div>
        <div className="space-y-2">
          <p className="font-medium">計算式での参照方法</p>
          <p className="text-muted-foreground">
            計算式管理で変数のソースに「ルックアップ」を選び、テーブル名とキーマッピング（JSON）を指定します。
          </p>
          <p className="font-medium text-xs mt-1">キーマッピングの書き方</p>
          <p className="text-muted-foreground">
            <code className="rounded bg-muted px-1">テーブルのキー列名</code>
            {" → "}
            <code className="rounded bg-muted px-1">質問キー名</code>
            の形式で指定します。実行時にその質問への回答値がキーとして使われます。
          </p>
          <pre className="rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
{`{"injury_grade": "injury_grade_answer", "hospitalization_months": "hosp_months"}`}
          </pre>
          <p className="font-medium text-xs mt-1">回答値の変換（任意）</p>
          <p className="text-muted-foreground">
            変換式を指定すると、回答値を加工してからルックアップのキーとして使えます。
            変換式では <code className="rounded bg-muted px-1">x</code> が回答値（数値）を表します。
            使える関数: <code className="rounded bg-muted px-1">floor</code>、<code className="rounded bg-muted px-1">ceil</code>、<code className="rounded bg-muted px-1">round</code>、<code className="rounded bg-muted px-1">int</code>、<code className="rounded bg-muted px-1">abs</code>
          </p>
          <pre className="rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
{`# 入院日数を月数（切り捨て）に変換してルックアップ
変換式: floor(x / 30)`}
          </pre>
          <p className="font-medium text-xs mt-1">実行時のフロー（例）</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>ユーザーが <code className="rounded bg-muted px-1">hosp_days</code> に <code className="rounded bg-muted px-1">95</code>（日）と回答</li>
            <li>変換式 <code className="rounded bg-muted px-1">floor(x / 30)</code> により <code className="rounded bg-muted px-1">3</code>（月）に変換</li>
            <li>キーマッピングにより <code className="rounded bg-muted px-1">{"hospitalization_months: \"3\""}</code> としてルックアップを検索</li>
            <li>一致するエントリの結果値を取得し、変数に代入</li>
          </ol>
          <p className="text-muted-foreground text-xs">
            ⚠️ CSVに登録したキー値と照合値は文字列の完全一致です。変換結果が整数の場合は自動的に整数文字列（例: <code className="rounded bg-muted px-1">3</code>）で照合されます。
          </p>
        </div>
      </div>

      {tables.length === 0 ? (
        <p className="text-muted-foreground">
          ルックアップテーブルがありません。
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>テーブル名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>キーカラム</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table) => (
              <TableRow key={table.id}>
                <TableCell className="font-mono text-sm">
                  {table.table_name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {table.description ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(table.key_columns ?? []).map((col) => (
                      <Badge key={col} variant="outline">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/lookups/${table.id}`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(table.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
