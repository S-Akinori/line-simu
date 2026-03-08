"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";

export interface RouteNodeData extends Record<string, unknown> {
  name: string;
  description: string | null;
  questionCount: number;
  isFirst: boolean;
}

function RouteNodeComponent({ data }: NodeProps) {
  const { name, description, questionCount, isFirst } = data as RouteNodeData;
  const desc =
    description && description.length > 50
      ? description.slice(0, 50) + "..."
      : description;

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-md min-w-[200px] max-w-[240px] p-4 space-y-2 ${
        isFirst ? "border-blue-500" : "border-slate-200"
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm leading-tight flex-1">{name}</span>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {questionCount}問
        </Badge>
      </div>
      {desc && (
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      )}
      {isFirst && (
        <span className="inline-block text-[10px] text-blue-600 font-medium">
          ▶ 開始ルート
        </span>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const RouteNode = memo(RouteNodeComponent);
