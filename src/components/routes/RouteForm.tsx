"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Route, RouteQuestion, RouteConnection, Question, LineChannel, DisplayConditionGroup, ConditionRule } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ArrowRight } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---- types used locally ----
interface RouteQItem {
  _key: string; // local key for react
  question_id: string;
  sort_order: number;
  question?: Question;
}

interface ConnItem {
  _key: string;
  to_route_id: string;
  conditions: DisplayConditionGroup[];
  sort_order: number;
}

const OPERATORS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "in", label: "含む" },
  { value: "not_in", label: "含まない" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "exists", label: "回答あり" },
  { value: "not_exists", label: "未回答" },
];

function SortableQRow({
  item,
  onRemove,
}: {
  item: RouteQItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._key });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 rounded border bg-card p-2"
    >
      <button className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 font-mono text-sm">
        {item.question?.question_key ?? item.question_id}
      </span>
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {item.question?.content ?? ""}
      </span>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

interface RouteFormProps {
  route?: Route & { route_questions?: RouteQuestion[]; route_connections?: RouteConnection[] };
  allQuestions: Question[];
  allRoutes: Route[];
  allChannels: Pick<LineChannel, "id" | "name">[];
}

export function RouteForm({ route, allQuestions, allRoutes, allChannels }: RouteFormProps) {
  const router = useRouter();
  const isEdit = !!route;

  const [name, setName] = useState(route?.name ?? "");
  const [description, setDescription] = useState(route?.description ?? "");
  const [sortOrder, setSortOrder] = useState(route?.sort_order ?? 0);
  const [channelId, setChannelId] = useState(route?.channel_id ?? "");
  const [saving, setSaving] = useState(false);

  // Question list
  const [qItems, setQItems] = useState<RouteQItem[]>(
    (route?.route_questions ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((rq) => ({
        _key: rq.id ?? `${rq.question_id}`,
        question_id: rq.question_id,
        sort_order: rq.sort_order,
        question: allQuestions.find((q) => q.id === rq.question_id),
      }))
  );
  const [addQId, setAddQId] = useState("");

  // Connections
  const [connections, setConnections] = useState<ConnItem[]>(
    (route?.route_connections ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        _key: c.id,
        to_route_id: c.to_route_id,
        conditions: c.conditions ?? [],
        sort_order: c.sort_order,
      }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleQDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = qItems.findIndex((i) => i._key === active.id);
    const newIdx = qItems.findIndex((i) => i._key === over.id);
    setQItems(arrayMove(qItems, oldIdx, newIdx));
  }

  function addQuestion() {
    if (!addQId || qItems.some((i) => i.question_id === addQId)) return;
    const q = allQuestions.find((q) => q.id === addQId);
    setQItems((prev) => [
      ...prev,
      { _key: `new-${Date.now()}`, question_id: addQId, sort_order: prev.length, question: q },
    ]);
    setAddQId("");
  }

  function addConnection() {
    setConnections((prev) => [
      ...prev,
      { _key: `conn-${Date.now()}`, to_route_id: "", conditions: [], sort_order: prev.length },
    ]);
  }

  function updateConn(idx: number, patch: Partial<ConnItem>) {
    setConnections((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeConn(idx: number) {
    setConnections((prev) => prev.filter((_, i) => i !== idx));
  }

  // Condition group helpers
  function addConditionGroup(connIdx: number) {
    const c = connections[connIdx];
    updateConn(connIdx, {
      conditions: [...c.conditions, { rules: [{ question_key: "", operator: "eq", value: "" }], logic: "and" }],
    });
  }

  function removeConditionGroup(connIdx: number, groupIdx: number) {
    const c = connections[connIdx];
    updateConn(connIdx, { conditions: c.conditions.filter((_, i) => i !== groupIdx) });
  }

  function addRule(connIdx: number, groupIdx: number) {
    const c = connections[connIdx];
    const newGroups = c.conditions.map((g, i) =>
      i === groupIdx ? { ...g, rules: [...g.rules, { question_key: "", operator: "eq", value: "" }] } : g
    );
    updateConn(connIdx, { conditions: newGroups });
  }

  function removeRule(connIdx: number, groupIdx: number, ruleIdx: number) {
    const c = connections[connIdx];
    const newGroups = c.conditions.map((g, i) =>
      i === groupIdx ? { ...g, rules: g.rules.filter((_, ri) => ri !== ruleIdx) } : g
    );
    updateConn(connIdx, { conditions: newGroups });
  }

  function updateRule(connIdx: number, groupIdx: number, ruleIdx: number, patch: Partial<ConditionRule>) {
    const c = connections[connIdx];
    const newGroups = c.conditions.map((g, gi) =>
      gi === groupIdx
        ? {
            ...g,
            rules: g.rules.map((r, ri) => (ri === ruleIdx ? { ...r, ...patch } : r)),
          }
        : g
    );
    updateConn(connIdx, { conditions: newGroups });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("名前は必須です"); return; }
    if (!channelId) { alert("チャンネルを選択してください"); return; }
    setSaving(true);
    const supabase = createClient();

    try {
      let routeId: string;

      if (isEdit && route) {
        await supabase.from("routes").update({ name, description: description || null, sort_order: sortOrder, updated_at: new Date().toISOString() }).eq("id", route.id);
        routeId = route.id;
        // Delete existing route_questions and route_connections, then re-insert
        await supabase.from("route_questions").delete().eq("route_id", routeId);
        await supabase.from("route_connections").delete().eq("from_route_id", routeId);
      } else {
        const { data, error } = await supabase
          .from("routes")
          .insert({ name, description: description || null, sort_order: sortOrder, channel_id: channelId })
          .select("id")
          .single();
        if (error || !data) { alert("作成に失敗しました: " + error?.message); setSaving(false); return; }
        routeId = data.id;
      }

      // Insert route_questions
      if (qItems.length > 0) {
        await supabase.from("route_questions").insert(
          qItems.map((item, idx) => ({ route_id: routeId, question_id: item.question_id, sort_order: idx }))
        );
      }

      // Insert route_connections
      const validConns = connections.filter((c) => c.to_route_id);
      if (validConns.length > 0) {
        await supabase.from("route_connections").insert(
          validConns.map((c, idx) => ({
            from_route_id: routeId,
            to_route_id: c.to_route_id,
            conditions: c.conditions,
            sort_order: idx,
          }))
        );
      }

      router.push("/routes");
      router.refresh();
    } catch {
      alert("保存中にエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  const channelQuestions = allQuestions.filter((q) => !channelId || q.line_channel_id === channelId);
  const availableQuestions = channelQuestions.filter((q) => !qItems.some((i) => i.question_id === q.id));
  const otherRoutes = allRoutes.filter((r) => r.id !== route?.id && (!channelId || r.channel_id === channelId));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input placeholder="軽傷ルート" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>表示順</Label>
              <Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LINEチャンネル *</Label>
              <Select value={channelId} onValueChange={setChannelId} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="チャンネルを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {allChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Input placeholder="ルートの説明..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question list */}
      <Card>
        <CardHeader><CardTitle>質問リスト</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQDragEnd}>
            <SortableContext items={qItems.map((i) => i._key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {qItems.map((item) => (
                  <SortableQRow
                    key={item._key}
                    item={item}
                    onRemove={() => setQItems((prev) => prev.filter((i) => i._key !== item._key))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {qItems.length === 0 && (
            <p className="text-sm text-muted-foreground">質問がありません。下から追加してください。</p>
          )}
          <div className="flex gap-2">
            <Select value={addQId} onValueChange={setAddQId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="追加する質問を選択..." />
              </SelectTrigger>
              <SelectContent>
                {availableQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    <span className="font-mono">{q.question_key}</span>
                    <span className="ml-2 text-muted-foreground truncate">{q.content}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={addQuestion} disabled={!addQId}>
              <Plus className="mr-1 h-4 w-4" />追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Route connections */}
      <Card>
        <CardHeader><CardTitle>次のルートへの接続</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            このルートの最後の質問が回答されたあと、条件に基づいて次のルートへ進みます。<br />
            条件なし（空）= 無条件（フォールバック）。複数ある場合は上から順に評価されます。
          </p>
          {connections.map((conn, connIdx) => (
            <div key={conn._key} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={conn.to_route_id}
                    onValueChange={(v) => updateConn(connIdx, { to_route_id: v })}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="遷移先ルートを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {otherRoutes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {conn.conditions.length === 0 && (
                    <Badge variant="secondary" className="text-xs">無条件（フォールバック）</Badge>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeConn(connIdx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {/* Condition groups */}
              {conn.conditions.map((group, groupIdx) => (
                <div key={groupIdx} className="ml-6 space-y-2 rounded border border-dashed p-2">
                  <div className="flex items-center justify-between">
                    <Select
                      value={group.logic}
                      onValueChange={(v) => {
                        const newGroups = conn.conditions.map((g, i) =>
                          i === groupIdx ? { ...g, logic: v as "and" | "or" } : g
                        );
                        updateConn(connIdx, { conditions: newGroups });
                      }}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="and">AND</SelectItem>
                        <SelectItem value="or">OR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeConditionGroup(connIdx, groupIdx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {group.rules.map((rule, ruleIdx) => (
                    <div key={ruleIdx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                      <Input
                        className="font-mono text-xs h-8"
                        placeholder="質問キー"
                        value={rule.question_key}
                        onChange={(e) => updateRule(connIdx, groupIdx, ruleIdx, { question_key: e.target.value })}
                      />
                      <Select
                        value={rule.operator}
                        onValueChange={(v) => updateRule(connIdx, groupIdx, ruleIdx, { operator: v })}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="text-xs h-8"
                        placeholder="値"
                        value={typeof rule.value === "string" ? rule.value : ""}
                        onChange={(e) => updateRule(connIdx, groupIdx, ruleIdx, { value: e.target.value })}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(connIdx, groupIdx, ruleIdx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => addRule(connIdx, groupIdx)}>
                    <Plus className="mr-1 h-3 w-3" />ルール追加
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="ml-6" onClick={() => addConditionGroup(connIdx)}>
                <Plus className="mr-1 h-3 w-3" />条件グループ追加
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addConnection}>
            <Plus className="mr-2 h-4 w-4" />接続を追加
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "保存中..." : isEdit ? "更新" : "作成"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/routes")}>キャンセル</Button>
      </div>
    </form>
  );
}
