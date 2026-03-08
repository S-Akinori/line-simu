"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Question } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, GripVertical, Pencil, Trash2, Shield } from "lucide-react";
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

function SortableRow({
  question,
  isGate,
  onToggleActive,
  onDelete,
}: {
  question: Question;
  isGate: boolean;
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
      <Link href={`/questions/${question.id}`}>
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

export default function QuestionsPage() {
  const [channels, setChannels] = useState<{id: string; name: string}[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("line_channels")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setChannels(data);
          setSelectedChannelId(data[0].id);
        }
      });
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!selectedChannelId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("line_channel_id", selectedChannelId)
      .order("sort_order", { ascending: true });
    if (data) setQuestions(data as Question[]);
    setLoading(false);
  }, [selectedChannelId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);

    // Optimistic update
    setQuestions(reordered);

    // Persist new sort_order values
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

  // Compute gate questions: first question by sort_order for each group_name
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
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">質問管理</h1>
          <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="アカウントを選択" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link href={`/questions/new?channel=${selectedChannelId}`}>
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
