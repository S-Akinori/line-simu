"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useChannel } from "@/contexts/channel-context";

interface RouteOption { id: string; name: string; }
interface QuestionOption { id: string; question_key: string; content: string; }
interface ResultConfig {
  id: string;
  line_channel_id: string;
  name: string;
  trigger_route_id: string | null;
  intro_message: string;
  body_template: string | null;
  closing_message: string | null;
  display_order: number;
  is_active: boolean;
  condition: ConditionGroup[] | null;
}

type ConditionRule = { question_key: string; operator: string; value: string };
type ConditionGroup = { logic: "and" | "or"; rules: ConditionRule[] };

const OPERATORS = [
  { value: "eq", label: "等しい (=)" },
  { value: "neq", label: "等しくない (!=)" },
  { value: "in", label: "含まれる (in)" },
  { value: "not_in", label: "含まれない (not in)" },
  { value: "gt", label: "より大きい (>)" },
  { value: "gte", label: "以上 (>=)" },
  { value: "lt", label: "より小さい (<)" },
  { value: "lte", label: "以下 (<=)" },
  { value: "exists", label: "回答あり" },
  { value: "not_exists", label: "回答なし" },
];

const EMPTY_FORM = {
  name: "",
  trigger_route_id: null as string | null,
  intro_message: "シミュレーション結果をお知らせします。",
  body_template: "",
  closing_message: "",
  display_order: 0,
  is_active: true,
};
type FormState = typeof EMPTY_FORM;

const EMPTY_RULE: ConditionRule = { question_key: "", operator: "eq", value: "" };

export default function ResultConfigsPage() {
  const { selectedChannelId } = useChannel();
  const [configs, setConfigs] = useState<ResultConfig[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [questions, setQuestions] = useState<QuestionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!selectedChannelId) { setConfigs([]); setRoutes([]); setQuestions([]); return; }
    setLoading(true);
    Promise.all([
      supabase.from("result_display_configs").select("*")
        .eq("line_channel_id", selectedChannelId).order("display_order"),
      supabase.from("routes").select("id, name")
        .eq("channel_id", selectedChannelId).order("sort_order"),
      supabase.from("questions").select("id, question_key, content")
        .eq("line_channel_id", selectedChannelId).eq("is_active", true).order("sort_order"),
    ]).then(([configRes, routeRes, questionRes]) => {
      setConfigs(configRes.data ?? []);
      setRoutes(routeRes.data ?? []);
      setQuestions(questionRes.data ?? []);
      setLoading(false);
    });
  }, [selectedChannelId]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setConditionGroups([]);
    setDialogOpen(true);
  }

  function openEdit(config: ResultConfig) {
    setEditId(config.id);
    setForm({
      name: config.name,
      trigger_route_id: config.trigger_route_id,
      intro_message: config.intro_message,
      body_template: config.body_template ?? "",
      closing_message: config.closing_message ?? "",
      display_order: config.display_order,
      is_active: config.is_active,
    });
    setConditionGroups(config.condition ?? []);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChannelId) return;
    setSaving(true);
    const data = {
      line_channel_id: selectedChannelId,
      name: form.name,
      trigger_route_id: form.trigger_route_id || null,
      intro_message: form.intro_message,
      body_template: form.body_template || null,
      closing_message: form.closing_message || null,
      display_order: form.display_order,
      is_active: form.is_active,
      condition: conditionGroups.length > 0 ? conditionGroups : null,
      updated_at: new Date().toISOString(),
    };
    if (editId) {
      const { error } = await supabase.from("result_display_configs").update(data).eq("id", editId);
      if (error) { alert("更新に失敗しました: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("result_display_configs").insert(data);
      if (error) { alert("作成に失敗しました: " + error.message); setSaving(false); return; }
    }
    setDialogOpen(false);
    const { data: updated } = await supabase.from("result_display_configs").select("*")
      .eq("line_channel_id", selectedChannelId).order("display_order");
    setConfigs(updated ?? []);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("この設定を削除しますか？")) return;
    await supabase.from("result_display_configs").delete().eq("id", id);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  function getTriggerLabel(config: ResultConfig) {
    if (!config.trigger_route_id) return "フロー終了時";
    const r = routes.find((r) => r.id === config.trigger_route_id);
    return r ? `ルート完了: ${r.name}` : "不明なルート";
  }

  // --- condition group helpers ---
  function addGroup() {
    setConditionGroups([...conditionGroups, { logic: "and", rules: [{ ...EMPTY_RULE }] }]);
  }
  function removeGroup(gi: number) {
    setConditionGroups(conditionGroups.filter((_, i) => i !== gi));
  }
  function setGroupLogic(gi: number, logic: "and" | "or") {
    setConditionGroups(conditionGroups.map((g, i) => i === gi ? { ...g, logic } : g));
  }
  function addRule(gi: number) {
    setConditionGroups(conditionGroups.map((g, i) =>
      i === gi ? { ...g, rules: [...g.rules, { ...EMPTY_RULE }] } : g
    ));
  }
  function removeRule(gi: number, ri: number) {
    setConditionGroups(conditionGroups.map((g, i) =>
      i === gi ? { ...g, rules: g.rules.filter((_, j) => j !== ri) } : g
    ));
  }
  function setRule(gi: number, ri: number, field: keyof ConditionRule, value: string) {
    setConditionGroups(conditionGroups.map((g, i) =>
      i === gi ? {
        ...g,
        rules: g.rules.map((r, j) => j === ri ? { ...r, [field]: value } : r),
      } : g
    ));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">結果表示設定</h1>
          <p className="text-sm text-muted-foreground mt-1">
            計算結果を表示するタイミングとメッセージを設定します
          </p>
        </div>
        <Button onClick={openCreate} disabled={!selectedChannelId}>
          <Plus className="mr-2 h-4 w-4" />
          設定を追加
        </Button>
      </div>


      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "設定を編集" : "設定を追加"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rc-name">設定名</Label>
              <Input id="rc-name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="最終結果表示" />
            </div>

            <div className="space-y-2">
              <Label>表示タイミング</Label>
              <Select
                value={form.trigger_route_id ?? "__end__"}
                onValueChange={(v) =>
                  setForm({ ...form, trigger_route_id: v === "__end__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="フロー終了時（デフォルト）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__end__">フロー終了時（デフォルト）</SelectItem>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      ルート完了: {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                選択したルートの最後の質問に回答した直後に結果を表示します。未選択 = フロー全体の終了時。
              </p>
            </div>

            {/* Condition section */}
            <div className="space-y-2">
              <Label>表示条件（任意）</Label>
              <p className="text-xs text-muted-foreground">
                設定すると、条件を満たす場合のみこのメッセージが表示されます。
                複数グループを設定した場合はいずれか一つを満たせば表示されます（グループ間 OR）。
              </p>
              {conditionGroups.map((group, gi) => (
                <div key={gi} className="rounded-md border border-dashed p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">ルール間ロジック:</span>
                      <Select value={group.logic} onValueChange={(v) => setGroupLogic(gi, v as "and" | "or")}>
                        <SelectTrigger className="w-20 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeGroup(gi)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  {group.rules.map((rule, ri) => (
                    <div key={ri} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">質問キー</Label>
                        <Select value={rule.question_key}
                          onValueChange={(v) => setRule(gi, ri, "question_key", v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="質問を選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            {questions.map((q) => (
                              <SelectItem key={q.id} value={q.question_key} className="text-xs">
                                {q.question_key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">演算子</Label>
                        <Select value={rule.operator}
                          onValueChange={(v) => setRule(gi, ri, "operator", v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">値</Label>
                        <Input className="h-8 text-xs" placeholder="比較値"
                          value={rule.value}
                          onChange={(e) => setRule(gi, ri, "value", e.target.value)} />
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        className="h-8 w-8" onClick={() => removeRule(gi, ri)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => addRule(gi)}>
                    <Plus className="h-3 w-3 mr-1" />ルールを追加
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                <Plus className="h-3 w-3 mr-1" />条件グループを追加
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-intro">冒頭メッセージ</Label>
              <Textarea id="rc-intro" required rows={2} value={form.intro_message}
                onChange={(e) => setForm({ ...form, intro_message: e.target.value })}
                placeholder="シミュレーション結果をお知らせします。" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-body">本文テンプレート（任意）</Label>
              <Textarea id="rc-body" rows={5} value={form.body_template ?? ""}
                onChange={(e) => setForm({ ...form, body_template: e.target.value })}
                placeholder={"入通院慰謝料: {nyutsuin_isharyo}\n後遺症慰謝料: {kouisho_isharyo}\n\n合計: {total}"} />
              <p className="text-xs text-muted-foreground">
                {"計算式名を {formula_name} の形式で埋め込めます。"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-closing">締めメッセージ（任意）</Label>
              <Textarea id="rc-closing" rows={2} value={form.closing_message ?? ""}
                onChange={(e) => setForm({ ...form, closing_message: e.target.value })}
                placeholder="ご不明な点はご相談ください。" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc-order">表示順</Label>
              <Input id="rc-order" type="number" value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>有効</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中..." : editId ? "更新" : "作成"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>結果表示設定一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedChannelId ? (
            <p className="text-sm text-muted-foreground py-4">チャンネルを選択してください</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground py-4">読み込み中...</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              設定がありません。「設定を追加」から作成してください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>設定名</TableHead>
                  <TableHead>表示タイミング</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="text-sm">{getTriggerLabel(config)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {config.condition && config.condition.length > 0 ? "あり" : "なし"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.is_active ? "default" : "outline"}>
                        {config.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(config)}>
                          <Pencil className="h-3 w-3 mr-1" />編集
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />削除
                        </Button>
                      </div>
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
