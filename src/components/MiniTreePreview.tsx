import { useMemo } from "react";
import { getSubTreeMembers } from "@/hooks/useSubTrees";
import type { Tables } from "@/integrations/supabase/types";

interface MiniTreePreviewProps {
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  rootAId: string;
  rootBId: string | null;
  height?: number;
}

/**
 * Non-interactive SVG preview of a sub-tree.
 * Renders one row per generation (root couple, then children, grandchildren...).
 */
export function MiniTreePreview({ persons, relationships, rootAId, rootBId, height = 120 }: MiniTreePreviewProps) {
  const { rows, width } = useMemo(() => {
    const { members, generations } = getSubTreeMembers(persons, relationships, rootAId, rootBId);
    const byGen = new Map<number, Tables<"persons">[]>();
    for (const p of members) {
      const g = generations.get(p.id) ?? 0;
      if (!byGen.has(g)) byGen.set(g, []);
      byGen.get(g)!.push(p);
    }
    const rows = [...byGen.entries()].sort((a, b) => a[0] - b[0]).map(([, ppl]) => ppl);
    const maxRow = Math.max(1, ...rows.map((r) => r.length));
    return { rows, width: Math.max(240, maxRow * 34) };
  }, [persons, relationships, rootAId, rootBId]);

  const rowHeight = rows.length > 0 ? height / rows.length : height;
  const nodeR = Math.min(12, rowHeight / 3);

  const nodeColor = (p: Tables<"persons">) => {
    if (p.gender === "male") return "hsl(var(--tree-male))";
    if (p.gender === "female") return "hsl(var(--tree-female))";
    return "hsl(var(--tree-other))";
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* connection lines from each parent row down to its immediate children row */}
      {rows.map((row, i) => {
        if (i === 0) return null;
        const parentRow = rows[i - 1];
        const py = (i - 0.5) * rowHeight;
        const cy = (i + 0.5) * rowHeight;
        const midY = (py + cy) / 2;
        return (
          <g key={`links-${i}`} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.4" strokeWidth={1} fill="none">
            {row.map((_, ci) => {
              const cx = ((ci + 0.5) / row.length) * width;
              const px = ((Math.floor(ci * parentRow.length / row.length) + 0.5) / parentRow.length) * width;
              return (
                <path key={ci} d={`M${px},${py} L${px},${midY} L${cx},${midY} L${cx},${cy}`} />
              );
            })}
          </g>
        );
      })}
      {rows.map((row, i) => (
        <g key={i}>
          {row.map((p, ci) => {
            const cx = ((ci + 0.5) / row.length) * width;
            const cy = (i + 0.5) * rowHeight;
            return (
              <g key={p.id}>
                <circle cx={cx} cy={cy} r={nodeR} fill={nodeColor(p)} opacity={0.85} />
                <text
                  x={cx}
                  y={cy + nodeR + 8}
                  textAnchor="middle"
                  fontSize={8}
                  fill="hsl(var(--foreground))"
                  className="pointer-events-none"
                >
                  {p.first_name.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
