import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function ConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = (data?.label as string) ?? "条件分岐";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "#f59e0b", strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-medium text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
