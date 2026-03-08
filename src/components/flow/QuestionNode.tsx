"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/types/database";

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

export interface QuestionNodeData extends Record<string, unknown> {
  question: Question;
}

function QuestionNodeComponent({ data }: NodeProps) {
  const question = data.question as Question;
  const contentPreview =
    question.content.length > 40
      ? question.content.slice(0, 40) + "..."
      : question.content;

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm min-w-[200px] max-w-[220px] p-3 space-y-1.5 ${
        !question.is_active ? "opacity-50" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-xs text-muted-foreground truncate">
          {question.question_key}
        </span>
        <Badge
          variant={TYPE_VARIANTS[question.question_type] ?? "default"}
          className="text-[10px] shrink-0"
        >
          {TYPE_LABELS[question.question_type] ?? question.question_type}
        </Badge>
      </div>
      <p className="text-sm leading-snug">{contentPreview}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const QuestionNode = memo(QuestionNodeComponent);
