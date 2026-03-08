"use client";

import "@xyflow/react/dist/style.css";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";

import { buildGraphData, type QuestionNodeData } from "./build-graph";
import { getLayoutedElements } from "@/lib/dagre-layout";
import { QuestionNode } from "./QuestionNode";
import { ConditionEdge } from "./ConditionEdge";
import type { Question } from "@/types/database";

// Module-scope: prevents unmount/remount on every render
const nodeTypes = { questionNode: QuestionNode };
const edgeTypes = { conditionEdge: ConditionEdge };

interface FlowCanvasProps {
  questions: Question[];
}

export function FlowCanvas({ questions }: FlowCanvasProps) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<QuestionNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (questions.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: rawNodes, edges: rawEdges } = buildGraphData(questions);
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      getLayoutedElements(rawNodes, rawEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [questions, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = (_, node: Node) => {
    router.push(`/questions/${node.id}`);
  };

  return (
    <div className="h-[calc(100vh-180px)] w-full rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
