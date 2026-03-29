"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Formula } from "@/types/database";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useChannel } from "@/contexts/channel-context";

export default function FormulasPage() {
  const { selectedChannelId } = useChannel();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFormulas = useCallback(async () => {
    if (!selectedChannelId) {
      setFormulas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("formulas")
      .select("*")
      .eq("line_channel_id", selectedChannelId)
      .order("display_order", { ascending: true });
    if (data) setFormulas(data as Formula[]);
    setLoading(false);
  }, [selectedChannelId]);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  async function handleDelete(id: string) {
    if (!confirm("この計算式を削除しますか？")) return;
    setFormulas((prev) => prev.filter((f) => f.id !== id));
    const supabase = createClient();
    await supabase.from("formulas").delete().eq("id", id);
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">計算式管理</h1>
        <Link href={`/formulas/new?channel=${selectedChannelId}`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規計算式
          </Button>
        </Link>
      </div>
      {formulas.length === 0 ? (
        <p className="text-muted-foreground">計算式がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>順序</TableHead>
              <TableHead>名前</TableHead>
              <TableHead>数式</TableHead>
              <TableHead>結果ラベル</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formulas.map((formula) => (
              <TableRow key={formula.id}>
                <TableCell>{formula.display_order}</TableCell>
                <TableCell className="font-mono text-sm">
                  {formula.name}
                </TableCell>
                <TableCell className="max-w-xs truncate font-mono text-sm text-muted-foreground">
                  {formula.expression}
                </TableCell>
                <TableCell>{formula.result_label ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={formula.is_active ? "default" : "secondary"}>
                    {formula.is_active ? "有効" : "無効"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/formulas/${formula.id}`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(formula.id)}
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
