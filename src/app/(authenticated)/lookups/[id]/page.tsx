"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LookupTable, LookupEntry } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, Settings, X, Upload } from "lucide-react";
import Link from "next/link";

interface EditColumn {
  original: string;
  current: string;
}

export default function LookupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [table, setTable] = useState<LookupTable | null>(null);
  const [entries, setEntries] = useState<LookupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState<Record<string, string>>({});
  const [newResultValue, setNewResultValue] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editKeyColumns, setEditKeyColumns] = useState<EditColumn[]>([]);
  const [saving, setSaving] = useState(false);

  // CSV import state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{
    keyColumns: string[];
    resultColumn: string;
    rows: Array<{ key_values: Record<string, string>; result_value: number }>;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [tableResult, entriesResult] = await Promise.all([
      supabase.from("lookup_tables").select("*").eq("id", id).single(),
      supabase
        .from("lookup_entries")
        .select("*")
        .eq("lookup_table_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (tableResult.data) setTable(tableResult.data as LookupTable);
    if (entriesResult.data) setEntries(entriesResult.data as LookupEntry[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openEdit() {
    if (!table) return;
    setEditName(table.table_name);
    setEditDescription(table.description ?? "");
    setEditKeyColumns(
      (table.key_columns ?? []).map((col) => ({ original: col, current: col }))
    );
    setEditDialogOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!table) return;
    setSaving(true);

    const newKeyColumns = editKeyColumns.map((c) => c.current).filter(Boolean);

    // Build rename map: original -> current (only changed ones)
    const renameMap: Record<string, string> = {};
    for (const col of editKeyColumns) {
      if (col.original && col.current && col.original !== col.current) {
        renameMap[col.original] = col.current;
      }
    }

    const supabase = createClient();

    // Update the table metadata
    const { error: tableError } = await supabase
      .from("lookup_tables")
      .update({
        table_name: editName,
        description: editDescription || null,
        key_columns: newKeyColumns,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (tableError) {
      alert("更新に失敗しました: " + tableError.message);
      setSaving(false);
      return;
    }

    // Migrate entries if any columns were renamed
    if (Object.keys(renameMap).length > 0) {
      const updatedEntries = entries.map((entry) => {
        const newKeyValues: Record<string, string> = {};
        for (const [k, v] of Object.entries(entry.key_values)) {
          const newKey = renameMap[k] ?? k;
          newKeyValues[newKey] = v;
        }
        return { id: entry.id, key_values: newKeyValues };
      });

      for (const entry of updatedEntries) {
        await supabase
          .from("lookup_entries")
          .update({ key_values: entry.key_values })
          .eq("id", entry.id);
      }

      setEntries((prev) =>
        prev.map((entry) => {
          const updated = updatedEntries.find((u) => u.id === entry.id);
          return updated ? { ...entry, key_values: updated.key_values } : entry;
        })
      );
    }

    setTable((prev) =>
      prev
        ? {
            ...prev,
            table_name: editName,
            description: editDescription || null,
            key_columns: newKeyColumns,
          }
        : prev
    );
    setNewEntry({});
    setEditDialogOpen(false);
    setSaving(false);
  }

  async function handleAddEntry() {
    if (!table) return;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("lookup_entries")
      .insert({
        lookup_table_id: id,
        key_values: newEntry,
        result_value: parseFloat(newResultValue),
      })
      .select()
      .single();

    if (error) {
      alert("追加に失敗しました: " + error.message);
      return;
    }

    if (data) {
      setEntries((prev) => [...prev, data as LookupEntry]);
    }
    setNewEntry({});
    setNewResultValue("");
  }

  async function handleDeleteEntry(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    const supabase = createClient();
    await supabase.from("lookup_entries").delete().eq("id", entryId);
  }

  function parseCSV(text: string) {
    const lines = text
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return { errors: ["CSVにデータ行がありません"], keyColumns: [], resultColumn: "", rows: [] };
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    if (headers.length < 2) {
      return { errors: ["CSVに少なくとも2列（キー列 + 結果値列）が必要です"], keyColumns: [], resultColumn: "", rows: [] };
    }
    const keyColumns = headers.slice(0, -1);
    const resultColumn = headers[headers.length - 1];
    const rows: Array<{ key_values: Record<string, string>; result_value: number }> = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) {
        errors.push(`行 ${i + 1}: 列数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
        continue;
      }
      const resultNum = parseFloat(values[values.length - 1]);
      if (isNaN(resultNum)) {
        errors.push(`行 ${i + 1}: 結果値が数値ではありません（"${values[values.length - 1]}"）`);
        continue;
      }
      const key_values: Record<string, string> = {};
      keyColumns.forEach((col, idx) => {
        key_values[col] = values[idx];
      });
      rows.push({ key_values, result_value: resultNum });
    }
    return { keyColumns, resultColumn, rows, errors };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvPreview(parseCSV(text));
      setCsvDialogOpen(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  }

  async function handleImport() {
    if (!csvPreview || csvPreview.rows.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    const toInsert = csvPreview.rows.map((row) => ({
      lookup_table_id: id,
      key_values: row.key_values,
      result_value: row.result_value,
    }));
    const chunkSize = 500;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const { error } = await supabase.from("lookup_entries").insert(toInsert.slice(i, i + chunkSize));
      if (error) {
        alert("インポートに失敗しました: " + error.message);
        setImporting(false);
        return;
      }
    }
    setCsvDialogOpen(false);
    setCsvPreview(null);
    setImporting(false);
    fetchData();
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!table) {
    router.push("/lookups");
    return null;
  }

  const keyColumns = table.key_columns ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/lookups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{table.table_name}</h1>
          {table.description && (
            <p className="text-sm text-muted-foreground">
              {table.description}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          CSVインポート
        </Button>
        <Button variant="outline" size="icon" onClick={openEdit}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">キーカラム:</span>
        {keyColumns.map((col) => (
          <Badge key={col} variant="outline">
            {col}
          </Badge>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>テーブル設定を編集</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lt-name">テーブル名</Label>
              <Input
                id="lt-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-desc">説明（任意）</Label>
              <Textarea
                id="lt-desc"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>キーカラム</Label>
              <div className="space-y-2">
                {editKeyColumns.map((col, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      required
                      value={col.current}
                      onChange={(e) =>
                        setEditKeyColumns((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, current: e.target.value } : c
                          )
                        )
                      }
                      className="font-mono text-sm"
                      placeholder="カラム名"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditKeyColumns((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditKeyColumns((prev) => [
                      ...prev,
                      { original: "", current: "" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  カラムを追加
                </Button>
              </div>
              {editKeyColumns.some((c) => c.original && c.original !== c.current) && (
                <p className="text-xs text-amber-600">
                  カラム名を変更すると、既存エントリのキーも自動的に更新されます。
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中..." : "更新"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV import preview dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={(open) => !open && setCsvDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSVインポートのプレビュー</DialogTitle>
          </DialogHeader>
          {csvPreview && (
            <div className="space-y-4">
              {csvPreview.errors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-1">
                  <p className="font-medium">以下の行にエラーがあります（スキップされます）：</p>
                  {csvPreview.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
              {csvPreview.rows.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {csvPreview.rows.length} 件のエントリをインポートします。
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {csvPreview.keyColumns.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                          <TableHead>{csvPreview.resultColumn}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.rows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {csvPreview.keyColumns.map((col) => (
                              <TableCell key={col} className="font-mono text-sm">
                                {row.key_values[col]}
                              </TableCell>
                            ))}
                            <TableCell className="font-mono text-sm">
                              {row.result_value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {csvPreview.rows.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ...他 {csvPreview.rows.length - 10} 件（先頭10件を表示）
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleImport} disabled={importing}>
                      {importing ? "インポート中..." : "インポート実行"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>
                    閉じる
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            {keyColumns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
            <TableHead>結果値</TableHead>
            <TableHead className="w-16">削除</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              {keyColumns.map((col) => (
                <TableCell key={col} className="font-mono text-sm">
                  {entry.key_values[col] ?? "-"}
                </TableCell>
              ))}
              <TableCell className="font-mono text-sm">
                {entry.result_value}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* New entry input row */}
          <TableRow>
            {keyColumns.map((col) => (
              <TableCell key={col}>
                <Input
                  placeholder={col}
                  value={newEntry[col] ?? ""}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      [col]: e.target.value,
                    }))
                  }
                  className="font-mono text-sm"
                />
              </TableCell>
            ))}
            <TableCell>
              <Input
                type="number"
                step="any"
                placeholder="結果値"
                value={newResultValue}
                onChange={(e) => setNewResultValue(e.target.value)}
                className="font-mono text-sm"
              />
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddEntry}
                disabled={
                  !newResultValue ||
                  keyColumns.some((col) => !newEntry[col])
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {entries.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          エントリがありません。上のフォームから追加してください。
        </p>
      )}
    </div>
  );
}
