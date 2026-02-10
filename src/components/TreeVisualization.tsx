import { useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import type { Tables } from "@/integrations/supabase/types";

interface CoupleNode {
  type: "couple";
  id: string;
  persons: Tables<"persons">[];
  children: LayoutNode[];
}

interface SingleNode {
  type: "single";
  id: string;
  person: Tables<"persons">;
  children: LayoutNode[];
}

type LayoutNode = CoupleNode | SingleNode;

interface TreeVisualizationProps {
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  onPersonClick: (person: Tables<"persons">) => void;
}

export function TreeVisualization({ persons, relationships, onPersonClick }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const layoutData = useMemo(() => {
    if (!persons.length) return null;

    const personMap = new Map(persons.map((p) => [p.id, p]));

    // Build parent-child and spouse maps
    const parentToChildren = new Map<string, Set<string>>();
    const childToParents = new Map<string, Set<string>>();
    const spouseMap = new Map<string, Set<string>>();

    relationships.forEach((r) => {
      if (r.relationship_type === "parent") {
        if (!parentToChildren.has(r.person_id)) parentToChildren.set(r.person_id, new Set());
        parentToChildren.get(r.person_id)!.add(r.related_person_id);
        if (!childToParents.has(r.related_person_id)) childToParents.set(r.related_person_id, new Set());
        childToParents.get(r.related_person_id)!.add(r.person_id);
      } else if (r.relationship_type === "spouse") {
        if (!spouseMap.has(r.person_id)) spouseMap.set(r.person_id, new Set());
        spouseMap.get(r.person_id)!.add(r.related_person_id);
        if (!spouseMap.has(r.related_person_id)) spouseMap.set(r.related_person_id, new Set());
        spouseMap.get(r.related_person_id)!.add(r.person_id);
      }
    });

    // Find shared children between two persons
    const getSharedChildren = (a: string, b: string): string[] => {
      const aKids = parentToChildren.get(a) || new Set();
      const bKids = parentToChildren.get(b) || new Set();
      return [...aKids].filter((k) => bKids.has(k));
    };

    // Group into couples or singles, building a tree
    const visited = new Set<string>();

    const buildNode = (personId: string): LayoutNode | null => {
      if (visited.has(personId)) return null;
      const person = personMap.get(personId);
      if (!person) return null;

      // Check if this person has a spouse we haven't visited
      const spouses = spouseMap.get(personId) || new Set();
      let coupleSpouseId: string | null = null;
      for (const sid of spouses) {
        if (!visited.has(sid) && personMap.has(sid)) {
          coupleSpouseId = sid;
          break;
        }
      }

      if (coupleSpouseId) {
        visited.add(personId);
        visited.add(coupleSpouseId);
        const spouse = personMap.get(coupleSpouseId)!;

        // Shared children come from between the couple
        const sharedChildIds = getSharedChildren(personId, coupleSpouseId);
        // Exclusive children of each
        const p1Kids = [...(parentToChildren.get(personId) || [])].filter((k) => !sharedChildIds.includes(k));
        const p2Kids = [...(parentToChildren.get(coupleSpouseId) || [])].filter((k) => !sharedChildIds.includes(k));

        const allChildIds = [...new Set([...sharedChildIds, ...p1Kids, ...p2Kids])];
        const children = allChildIds.map((cid) => buildNode(cid)).filter(Boolean) as LayoutNode[];

        return {
          type: "couple",
          id: `${personId}_${coupleSpouseId}`,
          persons: [person, spouse],
          children,
        };
      } else {
        visited.add(personId);
        const kidIds = [...(parentToChildren.get(personId) || [])];
        const children = kidIds.map((cid) => buildNode(cid)).filter(Boolean) as LayoutNode[];

        return {
          type: "single",
          id: personId,
          person,
          children,
        };
      }
    };

    // Find roots (no parents)
    const roots = persons.filter((p) => !childToParents.has(p.id));
    if (roots.length === 0 && persons.length > 0) roots.push(persons[0]);

    const rootNodes: LayoutNode[] = [];
    for (const r of roots) {
      const node = buildNode(r.id);
      if (node) rootNodes.push(node);
    }

    // Orphans
    persons.forEach((p) => {
      if (!visited.has(p.id)) {
        rootNodes.push({ type: "single", id: p.id, person: p, children: [] });
        visited.add(p.id);
      }
    });

    return rootNodes;
  }, [persons, relationships]);

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !layoutData || !layoutData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Layout constants
    const NODE_R = 28;
    const COUPLE_GAP = 70; // distance between couple nodes center-to-center
    const H_SPACING = 140;
    const V_SPACING = 140;

    interface PositionedPerson {
      x: number;
      y: number;
      person: Tables<"persons">;
    }

    interface PositionedLink {
      parentX: number;
      parentY: number;
      childX: number;
      childY: number;
    }

    interface PositionedCoupleLine {
      x1: number; y1: number; x2: number; y2: number;
    }

    const posPersons: PositionedPerson[] = [];
    const posLinks: PositionedLink[] = [];
    const posCoupleLines: PositionedCoupleLine[] = [];

    // Recursive layout: returns the width of the subtree
    const layoutNode = (node: LayoutNode, x: number, y: number): { width: number; anchorX: number } => {
      if (node.type === "couple") {
        const [p1, p2] = node.persons;

        // Layout children first to determine width
        let childrenWidth = 0;
        const childLayouts: { width: number; anchorX: number }[] = [];
        const childXStarts: number[] = [];

        if (node.children.length > 0) {
          let cx = x;
          for (const child of node.children) {
            childXStarts.push(cx);
            const cl = layoutNode(child, cx, y + V_SPACING);
            childLayouts.push(cl);
            cx += cl.width + H_SPACING;
          }
          childrenWidth = cx - H_SPACING - x;
        }

        const coupleWidth = COUPLE_GAP;
        const totalWidth = Math.max(coupleWidth, childrenWidth);
        const centerX = x + totalWidth / 2;

        const p1x = centerX - COUPLE_GAP / 2;
        const p2x = centerX + COUPLE_GAP / 2;

        posPersons.push({ x: p1x, y, person: p1 });
        posPersons.push({ x: p2x, y, person: p2 });
        posCoupleLines.push({ x1: p1x + NODE_R, y1: y, x2: p2x - NODE_R, y2: y });

        // Links from midpoint to children
        const midX = centerX;
        node.children.forEach((child, i) => {
          const childAnchorX = childLayouts[i]?.anchorX ?? (childXStarts[i] + (childLayouts[i]?.width ?? 0) / 2);
          posLinks.push({
            parentX: midX,
            parentY: y + NODE_R,
            childX: childAnchorX,
            childY: y + V_SPACING - NODE_R,
          });
        });

        return { width: totalWidth, anchorX: centerX };
      } else {
        // Single node
        const person = node.person;

        let childrenWidth = 0;
        const childLayouts: { width: number; anchorX: number }[] = [];
        const childXStarts: number[] = [];

        if (node.children.length > 0) {
          let cx = x;
          for (const child of node.children) {
            childXStarts.push(cx);
            const cl = layoutNode(child, cx, y + V_SPACING);
            childLayouts.push(cl);
            cx += cl.width + H_SPACING;
          }
          childrenWidth = cx - H_SPACING - x;
        }

        const totalWidth = Math.max(NODE_R * 2, childrenWidth);
        const centerX = x + totalWidth / 2;

        posPersons.push({ x: centerX, y, person });

        node.children.forEach((child, i) => {
          const childAnchorX = childLayouts[i]?.anchorX ?? (childXStarts[i] + (childLayouts[i]?.width ?? 0) / 2);
          posLinks.push({
            parentX: centerX,
            parentY: y + NODE_R,
            childX: childAnchorX,
            childY: y + V_SPACING - NODE_R,
          });
        });

        return { width: totalWidth, anchorX: centerX };
      }
    };

    // Layout all roots side by side
    let startX = 50;
    for (const root of layoutData) {
      const result = layoutNode(root, startX, 60);
      startX += result.width + H_SPACING;
    }

    const totalTreeWidth = startX;

    // Center tree
    const initialTransform = d3.zoomIdentity
      .translate(Math.max(0, width / 2 - totalTreeWidth / 2), 20)
      .scale(Math.min(1, width / totalTreeWidth));
    svg.call(zoom.transform, initialTransform);

    // Draw couple lines
    posCoupleLines.forEach((cl) => {
      g.append("line")
        .attr("x1", cl.x1).attr("y1", cl.y1)
        .attr("x2", cl.x2).attr("y2", cl.y2)
        .attr("stroke", "hsl(var(--primary))")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.7);
    });

    // Draw links
    posLinks.forEach((l) => {
      g.append("path")
        .attr("d", `M${l.parentX},${l.parentY} C${l.parentX},${(l.parentY + l.childY) / 2} ${l.childX},${(l.parentY + l.childY) / 2} ${l.childX},${l.childY}`)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--tree-line))")
        .attr("stroke-width", 2);
    });

    // Draw nodes
    posPersons.forEach((pp) => {
      const nodeG = g.append("g")
        .attr("transform", `translate(${pp.x},${pp.y})`)
        .style("cursor", "pointer")
        .on("click", () => onPersonClick(pp.person));

      nodeG.append("circle")
        .attr("r", NODE_R)
        .attr("fill", () => {
          if (pp.person.gender === "male") return "hsl(var(--tree-node-male))";
          if (pp.person.gender === "female") return "hsl(var(--tree-node-female))";
          return "hsl(var(--tree-node-other))";
        })
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", 3);

      const name = `${pp.person.first_name} ${pp.person.last_name || ""}`.trim();
      const initials = name.split(" ").map((p) => p.charAt(0)).slice(0, 2).join("").toUpperCase();

      nodeG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("font-family", "Space Grotesk, sans-serif")
        .text(initials);

      nodeG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "48px")
        .attr("fill", "hsl(var(--foreground))")
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .text(name.length > 18 ? name.slice(0, 16) + "…" : name);
    });

  }, [layoutData, onPersonClick]);

  useEffect(() => {
    renderTree();
    const handleResize = () => renderTree();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderTree]);

  if (!persons.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>No persons in this family tree yet. Add someone to get started!</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  );
}
