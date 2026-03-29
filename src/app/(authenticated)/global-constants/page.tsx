"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GlobalConstant } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

const EMPTY_FORM = { name: "", value: "", description: "", is_active: true };

export default function GlobalConstantsPage() {
  const [constants, setConstants] = useState<GlobalConstant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalConstant | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchConstants = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: profile }] = await Promise.all([
      supabase.from("global_constants").select("*").order("name", { ascending: true }),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { data: null };
        return supabase.from("profiles").select("role").eq("id", user.id).single();
      }),
    ]);
    if (data) setConstants(data as GlobalConstant[]);
    if (profile?.role === "super_admin") setIsSuperAdmin(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConstants();
  }, [fetchConstants]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(c: GlobalConstant) {
    setEditing(c);
    setForm({
      name: c.name,
      value: String(c.value),
      description: c.description ?? "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      value: Number(form.value),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase
        .from("global_constants")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) { alert("更新に失敗しました: " + error.message); return; }
    } else {
      const { error } = await supabase.from("global_constants").insert(payload);
      if (error) { alert("作成に失敗しました: " + error.message); return; }
    }

    setDialogOpen(false);
    fetchConstants();
  }

  async function handleDelete(id: string) {
    if (!confirm("このグローバル定数を削除しますか？")) return;
    setConstants((prev) => prev.filter((c) => c.id !== id));
    const supabase = createClient();
    await supabase.from("global_constants").delete().eq("id", id);
  }

  async function toggleActive(c: GlobalConstant) {
    const supabase = createClient();
    await supabase
      .from("global_constants")
      .update({ is_active: !c.is_active, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    setConstants((prev) =>
      prev.map((item) =>
        item.id === c.id ? { ...item, is_active: !c.is_active } : item
      )
    );
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">グローバル定数</h1>
        {isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新規定数
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
        <p className="font-medium">グローバル定数とは</p>
        <p className="text-muted-foreground">
          すべての計算式から自動的に参照できる名前付き数値定数です。
          計算式の変数として宣言しなくても、式の中で直接名前を使えます。
          計算式側で同名の変数が定義された場合は、そちらが優先されます。
        </p>
        <p className="text-xs font-mono bg-muted rounded px-2 py-1 text-foreground">
          例: base_daily = 4300 を登録 → 式に <code>base_daily * hospitalization_days</code> と書くだけで使える
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "定数を編集" : "新規グローバル定数"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前（識別子）</Label>
              <Input
                className="font-mono"
                placeholder="base_daily_amount"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground">
                計算式内でそのまま使える英数字とアンダースコアの識別子
              </p>
            </div>
            <div className="space-y-2">
              <Label>値</Label>
              <Input
                type="number"
                step="any"
                placeholder="4300"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>説明（任意）</Label>
              <Input
                placeholder="入通院慰謝料の基礎日額（弁護士基準）"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>有効</Label>
            </div>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || form.value === ""}
            >
              {editing ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {constants.length === 0 ? (
        <p className="text-muted-foreground">グローバル定数がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>値</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="w-20">有効</TableHead>
              {isSuperAdmin && <TableHead className="w-20">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {constants.map((c) => (
              <TableRow key={c.id} className={c.is_active ? "" : "opacity-50"}>
                <TableCell className="font-mono text-sm">{c.name}</TableCell>
                <TableCell className="font-mono text-sm">
                  {c.value.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.description ?? "-"}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={() => isSuperAdmin && toggleActive(c)}
                    disabled={!isSuperAdmin}
                  />
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
