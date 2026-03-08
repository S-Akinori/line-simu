import type { Node, Edge } from "@xyflow/react";
import type { Question } from "@/types/database";

export interface QuestionNodeData extends Record<string, unknown> {
  question: Question;
}

export function buildGraphData(questions: Question[]): {
  nodes: Node<QuestionNodeData>[];
  edges: Edge[];
} {
  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  // Build question_key -> id map for resolving condition targets
  const keyToId = new Map<string, string>(
    sorted.map((q) => [q.question_key, q.id])
  );

  const nodes: Node<QuestionNodeData>[] = sorted.map((q) => ({
    id: q.id,
    type: "questionNode",
    position: { x: 0, y: 0 },
    data: { question: q },
  }));

  const edges: Edge[] = [];

  sorted.forEach((q, i) => {
    // Condition edges
    q.conditions.forEach((cond) => {
      const targetId = keyToId.get(cond.next_question_key);
      if (!targetId) return;
      edges.push({
        id: `cond-${q.id}-${cond.id}`,
        source: q.id,
        target: targetId,
        type: "conditionEdge",
        label: cond.description || "条件分岐",
        style: { stroke: "#f59e0b" },
        data: { label: cond.description || "条件分岐" },
      });
    });

    // Default flow edge to next question by sort_order
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      // Skip if next question is already a condition target from this question
      const isConditionTarget = q.conditions.some(
        (c) => c.next_question_key === next.question_key
      );
      if (!isConditionTarget) {
        edges.push({
          id: `default-${q.id}-${next.id}`,
          source: q.id,
          target: next.id,
          type: "default",
          style: { stroke: "#94a3b8", strokeDasharray: "5 5" },
        });
      }
    }
  });

  return { nodes, edges };
}
