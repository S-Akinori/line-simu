import type { Node, Edge } from "@xyflow/react";
import type { Route, RouteConnection } from "@/types/database";
import type { RouteNodeData } from "./RouteNode";

export function buildRouteGraphData(
  routes: Route[],
  connections: RouteConnection[],
  questionCounts: Record<string, number>
): { nodes: Node<RouteNodeData>[]; edges: Edge[] } {
  const sorted = [...routes].sort((a, b) => a.sort_order - b.sort_order);

  const nodes: Node<RouteNodeData>[] = sorted.map((route, i) => ({
    id: route.id,
    type: "routeNode",
    position: { x: 0, y: 0 },
    data: {
      name: route.name,
      description: route.description,
      questionCount: questionCounts[route.id] ?? 0,
      isFirst: i === 0,
    },
  }));

  const edges: Edge[] = connections.map((conn) => {
    const hasConditions =
      Array.isArray(conn.conditions) && conn.conditions.length > 0;
    const label = hasConditions ? "条件あり" : "直接";
    const color = hasConditions ? "#f59e0b" : "#94a3b8";

    return {
      id: conn.id,
      source: conn.from_route_id,
      target: conn.to_route_id,
      type: hasConditions ? "conditionEdge" : "default",
      label: hasConditions ? label : undefined,
      animated: !hasConditions,
      style: { stroke: color, strokeWidth: 2 },
      data: { label },
    };
  });

  return { nodes, edges };
}
