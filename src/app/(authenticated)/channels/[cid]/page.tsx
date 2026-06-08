"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Question, Route, RouteConnection, Formula, StepDeliveryConfig } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, GripVertical, Pencil, Trash2, Shield, GitBranch, ArrowLeft,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const RouteFlowCanvas = dynamic(
  () =>
    import("@/components/flow/RouteFlowCanvas").then(
      (m) => m.RouteFlowCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    ),
  }
);

// ─── Constants ───────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  image_carousel: "カルーセル",
  button: "ボタン",
  free_text: "自由入力",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  image_carousel: "default",
  button: "secondary",
  free_text: "outline",
};

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

const TRIGGER_LABELS: Record<string, string> = {
  inactivity: "非アクティブ",
  session_start: "セッション開始",
  specific_question: "特定質問",
  registration_delay: "登録後",
};

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

const TAB_OPTIONS = [
  { value: "questions", label: "質問" },
  { value: "routes", label: "ルート" },
  { value: "flow", label: "フロー" },
  { value: "formulas", label: "計算式" },
  { value: "result-configs", label: "結果表示" },
  { value: "sessions", label: "セッション" },
  { value: "delivery", label: "ステップ配信" },
] as const;

// ─── Sortable Row (Questions) ────────────────────────────

function SortableRow({
  question,
  isGate,
  channelId,
  onToggleActive,
  onDelete,
}: {
  question: Question;
  isGate: boolean;
  channelId: string;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const conditionCount = question.conditions?.length ?? 0;
  const hasDisplayConditions = (question.display_conditions?.length ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-8 text-center text-sm text-muted-foreground">
        {question.sort_order}
      </span>
      <Badge variant={TYPE_VARIANTS[question.question_type] ?? "default"}>
        {TYPE_LABELS[question.question_type] ?? question.question_type}
      </Badge>
      <span className="w-40 truncate font-mono text-sm">
        {question.question_key}
      </span>
      <span className="flex-1 truncate text-sm">{question.content}</span>
      {isGate && hasDisplayConditions && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Shield className="h-3 w-3" />
          ゲート
        </Badge>
      )}
      {conditionCount > 0 && (
        <Badge variant="outline" className="text-xs">
          条件 {conditionCount}
        </Badge>
      )}
      <Switch
        checked={question.is_active}
        onCheckedChange={(checked) => onToggleActive(question.id, checked)}
      />
      <Link href={`/channels/${channelId}/questions/${question.id}`}>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(question.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// ─── Questions Tab ───────────────────────────────────────

function QuestionsTab({ channelId }: { channelId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("line_channel_id", channelId)
      .order("sort_order", { ascending: true });
    if (data) setQuestions(data as Question[]);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);

    setQuestions(reordered);

    const supabase = createClient();
    const updates = reordered.map((q, i) => ({
      id: q.id,
      sort_order: i,
    }));

    for (const update of updates) {
      await supabase
        .from("questions")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_active: active } : q))
    );
    const supabase = createClient();
    await supabase.from("questions").update({ is_active: active }).eq("id", id);
  }

  async function handleDelete(id: string) {
    if (!confirm("この質問を削除しますか？")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    const supabase = createClient();
    await supabase.from("questions").delete().eq("id", id);
  }

  const gateIds = new Set<string>();
  const seenGroups = new Set<string>();
  for (const q of questions) {
    if (q.group_name && !seenGroups.has(q.group_name)) {
      seenGroups.add(q.group_name);
      gateIds.add(q.id);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">質問管理</h2>
        <Link href={`/channels/${channelId}/questions/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規質問
          </Button>
        </Link>
      </div>
      {questions.length === 0 ? (
        <p className="text-muted-foreground">質問がありません。</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {questions.map((question, i) => {
                const prevGroup = i > 0 ? questions[i - 1].group_name : null;
                const showGroupHeader =
                  question.group_name &&
                  question.group_name !== prevGroup;
                return (
                  <div key={question.id}>
                    {showGroupHeader && (
                      <div className="flex items-center gap-2 pt-2 pb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {question.group_name}
                        </span>
                        <div className="flex-1 border-t" />
                      </div>
                    )}
                    <SortableRow
                      question={question}
                      isGate={gateIds.has(question.id)}
                      channelId={channelId}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Routes Tab ──────────────────────────────────────────

function RoutesTab({ channelId }: { channelId: string }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("routes")
      .select("*")
      .eq("channel_id", channelId)
      .order("sort_order", { ascending: true });
    if (data) setRoutes(data as Route[]);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  async function handleDelete(id: string) {
    if (!confirm("このルートを削除しますか？")) return;
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    const supabase = createClient();
    await supabase.from("routes").delete().eq("id", id);
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ルート管理</h2>
        <Link href={`/channels/${channelId}/routes/new`}>
          <Button><Plus className="mr-2 h-4 w-4" />新規ルート</Button>
        </Link>
      </div>
      <div className="rounded-md border text-sm">
        <div className="grid grid-cols-[2fr_3fr_1fr_auto] gap-4 border-b bg-muted/50 px-4 py-2 font-medium">
          <span>名前</span><span>説明</span><span>表示順</span><span></span>
        </div>
        {routes.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground">ルートがありません。</p>
        ) : routes.map((route) => (
          <div key={route.id} className="grid grid-cols-[2fr_3fr_1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-0">
            <span className="flex items-center gap-2 font-medium">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              {route.name}
            </span>
            <span className="truncate text-muted-foreground">{route.description ?? "—"}</span>
            <Badge variant="outline">{route.sort_order}</Badge>
            <div className="flex gap-1">
              <Link href={`/channels/${channelId}/routes/${route.id}`}>
                <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(route.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Flow Tab ────────────────────────────────────────────

function FlowTab({ channelId }: { channelId: string }) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [connections, setConnections] = useState<RouteConnection[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    setLoadingRoutes(true);
    const supabase = createClient();

    supabase
      .from("routes")
      .select("*")
      .eq("channel_id", channelId)
      .order("sort_order", { ascending: true })
      .then(async ({ data: routeData }) => {
        const fetchedRoutes = (routeData ?? []) as Route[];
        setRoutes(fetchedRoutes);

        if (fetchedRoutes.length === 0) {
          setConnections([]);
          setQuestionCounts({});
          setLoadingRoutes(false);
          return;
        }

        const routeIds = fetchedRoutes.map((r) => r.id);

        const [{ data: connData }, { data: rqData }] = await Promise.all([
          supabase
            .from("route_connections")
            .select("*")
            .in("from_route_id", routeIds)
            .order("sort_order", { ascending: true }),
          supabase
            .from("route_questions")
            .select("route_id")
            .in("route_id", routeIds),
        ]);

        setConnections((connData ?? []) as RouteConnection[]);

        const counts: Record<string, number> = {};
        for (const rq of rqData ?? []) {
          counts[rq.route_id] = (counts[rq.route_id] ?? 0) + 1;
        }
        setQuestionCounts(counts);
        setLoadingRoutes(false);
      });
  }, [channelId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">フロービュー</h2>
      </div>

      {loadingRoutes ? (
        <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center">
          <p className="text-muted-foreground">ルートを読み込み中...</p>
        </div>
      ) : routes.length === 0 ? (
        <div className="h-[calc(100vh-180px)] w-full rounded-lg border flex items-center justify-center">
          <p className="text-muted-foreground">
            このチャンネルにルートがありません
          </p>
        </div>
      ) : (
        <RouteFlowCanvas
          routes={routes}
          connections={connections}
          questionCounts={questionCounts}
        />
      )}
    </div>
  );
}

// ─── Formulas Tab ────────────────────────────────────────

function FormulasTab({ channelId }: { channelId: string }) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("formulas")
      .select("*")
      .eq("line_channel_id", channelId)
      .order("display_order", { ascending: true });
    if (data) setFormulas(data as Formula[]);
    setLoading(false);
  }, [channelId]);

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
        <h2 className="text-xl font-bold">計算式管理</h2>
        <Link href={`/channels/${channelId}/formulas/new`}>
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
                    <Link href={`/channels/${channelId}/formulas/${formula.id}`}>
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

// ─── Result Configs Tab ──────────────────────────────────

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

const EMPTY_RC_FORM = {
  name: "",
  trigger_route_id: null as string | null,
  intro_message: "シミュレーション結果をお知らせします。",
  body_template: "",
  closing_message: "",
  display_order: 0,
  is_active: true,
};
type RcFormState = typeof EMPTY_RC_FORM;

const EMPTY_RULE: ConditionRule = { question_key: "", operator: "eq", value: "" };

function ResultConfigsTab({ channelId }: { channelId: string }) {
  const [configs, setConfigs] = useState<ResultConfig[]>([]);
  const [rcRoutes, setRcRoutes] = useState<RouteOption[]>([]);
  const [rcQuestions, setRcQuestions] = useState<QuestionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RcFormState>(EMPTY_RC_FORM);
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("result_display_configs").select("*")
        .eq("line_channel_id", channelId).order("display_order"),
      supabase.from("routes").select("id, name")
        .eq("channel_id", channelId).order("sort_order"),
      supabase.from("questions").select("id, question_key, content")
        .eq("line_channel_id", channelId).eq("is_active", true).order("sort_order"),
    ]).then(([configRes, routeRes, questionRes]) => {
      setConfigs(configRes.data ?? []);
      setRcRoutes(routeRes.data ?? []);
      setRcQuestions(questionRes.data ?? []);
      setLoading(false);
    });
  }, [channelId]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_RC_FORM);
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
    setSaving(true);
    const data = {
      line_channel_id: channelId,
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
      .eq("line_channel_id", channelId).order("display_order");
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
    const r = rcRoutes.find((r) => r.id === config.trigger_route_id);
    return r ? `ルート完了: ${r.name}` : "不明なルート";
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">結果表示設定</h2>
          <p className="text-sm text-muted-foreground mt-1">
            計算結果を表示するタイミングとメッセージを設定します
          </p>
        </div>
        <Button onClick={openCreate}>
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
                  {rcRoutes.map((r) => (
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
                            {rcQuestions.map((q) => (
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
          {loading ? (
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

// ─── Sessions Tab ────────────────────────────────────────

interface SessionRow {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  line_user: { display_name: string | null } | null;
  answer_count: number;
}

function SessionsTab({ channelId }: { channelId: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Resolve user IDs for selected channel
    const { data: users } = await supabase
      .from("line_users")
      .select("id")
      .eq("line_channel_id", channelId);
    const userIdFilter = users?.map((u) => u.id) ?? [];

    if (userIdFilter.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("sessions")
      .select("id, status, started_at, completed_at, line_user:line_users(display_name)")
      .order("started_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    query = query.in("line_user_id", userIdFilter);

    const [sessionsResult, questionsResult] = await Promise.all([
      query,
      supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("line_channel_id", channelId),
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
  }, [statusFilter, channelId]);

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
      <h2 className="text-xl font-bold">セッション管理</h2>

      <div className="flex flex-wrap gap-3">
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
                  <Link href={`/channels/${channelId}/sessions/${session.id}`}>
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

// ─── Delivery Tab ────────────────────────────────────────

function hoursToDisplayDays(hours: number): string {
  return String(Math.round(hours / 24));
}

function displayDaysToHours(days: string): number {
  return parseFloat(days) * 24;
}

type DeliveryFormState = {
  name: string;
  trigger: string;
  delay_hours: string;
  delay_days: string;
  max_sends: string;
  message_template: string;
  is_active: boolean;
};

const EMPTY_DELIVERY_FORM: DeliveryFormState = {
  name: "",
  trigger: "inactivity",
  delay_hours: "24",
  delay_days: "3",
  max_sends: "1",
  message_template: "",
  is_active: true,
};

function DeliveryTab({ channelId }: { channelId: string }) {
  const [configs, setConfigs] = useState<StepDeliveryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DeliveryFormState>(EMPTY_DELIVERY_FORM);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("step_delivery_configs")
      .select("*")
      .eq("line_channel_id", channelId)
      .order("created_at", { ascending: true });
    if (data) setConfigs(data as StepDeliveryConfig[]);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_DELIVERY_FORM });
    setDialogOpen(true);
  }

  function openEdit(config: StepDeliveryConfig) {
    setEditId(config.id);
    setForm({
      name: config.name,
      trigger: config.trigger,
      delay_hours: String(config.delay_hours),
      delay_days:
        config.trigger === "registration_delay"
          ? hoursToDisplayDays(config.delay_hours)
          : "3",
      max_sends: String(config.max_sends),
      message_template: config.message_template,
      is_active: config.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const supabase = createClient();
    const isRegistration = form.trigger === "registration_delay";
    const payload = {
      line_channel_id: channelId,
      name: form.name,
      trigger: form.trigger,
      delay_hours: isRegistration
        ? displayDaysToHours(form.delay_days)
        : parseFloat(form.delay_hours),
      max_sends: parseInt(form.max_sends),
      message_template: form.message_template,
      is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase
        .from("step_delivery_configs")
        .update(payload)
        .eq("id", editId);
      if (error) {
        alert("更新に失敗しました: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("step_delivery_configs")
        .insert(payload);
      if (error) {
        alert("作成に失敗しました: " + error.message);
        return;
      }
    }

    setDialogOpen(false);
    fetchConfigs();
  }

  async function handleDelete(id: string) {
    if (!confirm("この配信設定を削除しますか？")) return;
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    const supabase = createClient();
    await supabase.from("step_delivery_configs").delete().eq("id", id);
  }

  function formatDelay(config: StepDeliveryConfig): string {
    if (config.trigger === "registration_delay") {
      const days = Math.round(config.delay_hours / 24);
      return `登録後${days}日`;
    }
    return `${config.delay_hours}時間`;
  }

  const isRegistration = form.trigger === "registration_delay";
  const canSave = !!form.name && !!form.message_template;

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ステップ配信設定</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規設定
        </Button>
      </div>

      {configs.length === 0 ? (
        <p className="text-muted-foreground">配信設定がありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>トリガー</TableHead>
              <TableHead>タイミング</TableHead>
              <TableHead>最大送信</TableHead>
              <TableHead>メッセージ</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {TRIGGER_LABELS[config.trigger] ?? config.trigger}
                  </Badge>
                </TableCell>
                <TableCell>{formatDelay(config)}</TableCell>
                <TableCell>{config.max_sends}</TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {config.message_template}
                </TableCell>
                <TableCell>
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "有効" : "無効"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "配信設定を編集" : "新規配信設定"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>トリガータイプ</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, trigger: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inactivity">非アクティブ</SelectItem>
                  <SelectItem value="session_start">セッション開始</SelectItem>
                  <SelectItem value="specific_question">特定質問</SelectItem>
                  <SelectItem value="registration_delay">
                    登録後（日数指定）
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isRegistration ? (
              <>
                <div className="space-y-2">
                  <Label>登録からの日数</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="w-28"
                      value={form.delay_days}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          delay_days: e.target.value,
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">日後に送信</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    友だち追加から指定した日数が経過したユーザーに1回だけ送信します。
                  </p>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>遅延 (時間)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={form.delay_hours}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        delay_hours: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大送信回数</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.max_sends}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_sends: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>メッセージテンプレート</Label>
              <Textarea
                placeholder={
                  isRegistration
                    ? "{{display_name}}さん、ご登録ありがとうございます！..."
                    : "{{display_name}}さん、まだ回答が完了していません..."
                }
                value={form.message_template}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    message_template: e.target.value,
                  }))
                }
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  使用できる変数（クリックで挿入）:
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { key: "display_name", label: "ユーザー名" },
                    { key: "channel_name", label: "アカウント名" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/80"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          message_template:
                            prev.message_template + `{{${key}}}`,
                        }))
                      }
                    >
                      {`{{${key}}}`}
                      <span className="ml-1 text-muted-foreground">
                        ({label})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label>有効</Label>
            </div>

            <Button onClick={handleSave} disabled={!canSave}>
              {editId ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────

export default function ChannelDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = params.cid as string;
  const currentTab = searchParams.get("tab") ?? "questions";

  const [channelName, setChannelName] = useState<string>("");
  const [loadingChannel, setLoadingChannel] = useState(true);

  useEffect(() => {
    async function fetchChannel() {
      const supabase = createClient();
      const { data } = await supabase
        .from("line_channels")
        .select("name")
        .eq("id", cid)
        .single();
      if (data) setChannelName(data.name);
      setLoadingChannel(false);
    }
    fetchChannel();
  }, [cid]);

  function handleTabChange(value: string) {
    router.push(`/channels/${cid}?tab=${value}`);
  }

  if (loadingChannel) {
    return <p className="text-muted-foreground p-6">読み込み中...</p>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/channels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{channelName}</h1>
          <p className="text-sm text-muted-foreground">チャンネル管理</p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start">
          {TAB_OPTIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="questions">
          <QuestionsTab channelId={cid} />
        </TabsContent>

        <TabsContent value="routes">
          <RoutesTab channelId={cid} />
        </TabsContent>

        <TabsContent value="flow">
          <FlowTab channelId={cid} />
        </TabsContent>

        <TabsContent value="formulas">
          <FormulasTab channelId={cid} />
        </TabsContent>

        <TabsContent value="result-configs">
          <ResultConfigsTab channelId={cid} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab channelId={cid} />
        </TabsContent>

        <TabsContent value="delivery">
          <DeliveryTab channelId={cid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
