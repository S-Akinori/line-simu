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

import { buildRouteGraphData } from "./build-route-graph";
import { getLayoutedElements } from "@/lib/dagre-layout";
import { RouteNode, type RouteNodeData } from "./RouteNode";
import { ConditionEdge } from "./ConditionEdge";
import type { Route, RouteConnection } from "@/types/database";

const nodeTypes = { routeNode: RouteNode };
const edgeTypes = { conditionEdge: ConditionEdge };

interface RouteFlowCanvasProps {
  routes: Route[];
  connections: RouteConnection[];
  questionCounts: Record<string, number>;
}

export function RouteFlowCanvas({
  routes,
  connections,
  questionCounts,
}: RouteFlowCanvasProps) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RouteNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (routes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: rawNodes, edges: rawEdges } = buildRouteGraphData(
      routes,
      connections,
      questionCounts
    );
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      getLayoutedElements(rawNodes, rawEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [routes, connections, questionCounts, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = (_, node: Node) => {
    router.push(`/routes/${node.id}`);
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
