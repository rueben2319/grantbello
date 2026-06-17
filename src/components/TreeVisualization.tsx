import { useEffect, useRef, useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import * as d3 from "d3";
import type { Tables } from "@/integrations/supabase/types";

interface CoupleNode {
  type: "couple";
  id: string;
  persons: Tables<"persons">[];
  primaryIndex: number; // which person in the couple is the blood-relative (0 or 1)
  isDivorced: boolean;
  isWidowed: boolean;
  children: LayoutNode[];
}

interface SingleNode {
  type: "single";
  id: string;
  person: Tables<"persons">;
  children: LayoutNode[];
}

type LayoutNode = CoupleNode | SingleNode;

export interface TreeVisualizationHandle {
  focusPerson: (personId: string) => void;
  focusPersons: (personIds: string[]) => void;
}

interface TreeVisualizationProps {
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  onPersonClick: (person: Tables<"persons">) => void;
  highlightedPersonIds?: Set<string> | null;
}

export const TreeVisualization = forwardRef<TreeVisualizationHandle, TreeVisualizationProps>(function TreeVisualization({ persons, relationships, onPersonClick, highlightedPersonIds }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const personPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const layoutData = useMemo(() => {
    if (!persons.length) return null;

    const personMap = new Map(persons.map((p) => [p.id, p]));

    // Build parent-child and spouse maps
    const parentToChildren = new Map<string, Set<string>>();
    const childToParents = new Map<string, Set<string>>();

    interface SpouseConnection {
      spouseId: string;
      relationshipId: string;
      isDivorced: boolean;
      isWidowed: boolean;
    }
    const spouseMap = new Map<string, Set<SpouseConnection>>();

    relationships.forEach((r) => {
      if (r.relationship_type === "parent") {
        if (!parentToChildren.has(r.person_id)) parentToChildren.set(r.person_id, new Set());
        parentToChildren.get(r.person_id)!.add(r.related_person_id);
        if (!childToParents.has(r.related_person_id)) childToParents.set(r.related_person_id, new Set());
        childToParents.get(r.related_person_id)!.add(r.person_id);
      } else if (r.relationship_type === "spouse") {
        const p1 = personMap.get(r.person_id);
        const p2 = personMap.get(r.related_person_id);
        if (!p1 || !p2) return;

        const isDivorced = !!r.is_divorced;
        const isWidowed = !!(p1.death_date || p2.death_date);

        if (!spouseMap.has(r.person_id)) spouseMap.set(r.person_id, new Set());
        spouseMap.get(r.person_id)!.add({
          spouseId: r.related_person_id,
          relationshipId: r.id,
          isDivorced,
          isWidowed,
        });

        if (!spouseMap.has(r.related_person_id)) spouseMap.set(r.related_person_id, new Set());
        spouseMap.get(r.related_person_id)!.add({
          spouseId: r.person_id,
          relationshipId: r.id,
          isDivorced,
          isWidowed,
        });
      }
    });

    // Find shared children between two persons
    const getSharedChildren = (a: string, b: string): string[] => {
      const aKids = parentToChildren.get(a) || new Set();
      const bKids = parentToChildren.get(b) || new Set();
      return [...aKids].filter((k) => bKids.has(k));
    };

    const sortByBirthDate = (a: string, b: string) => {
      const pa = personMap.get(a);
      const pb = personMap.get(b);
      const da = pa?.birth_date ? new Date(pa.birth_date).getTime() : Infinity;
      const db = pb?.birth_date ? new Date(pb.birth_date).getTime() : Infinity;
      return da - db;
    };

    const globalVisitedCouples = new Set<string>();
    const globallyVisitedPeopleIds = new Set<string>();

    const buildSubtrees = (personId: string, visitedPeople: Set<string>): LayoutNode[] => {
      if (visitedPeople.has(personId)) return [];
      const newVisited = new Set(visitedPeople);
      newVisited.add(personId);

      const person = personMap.get(personId);
      if (!person) return [];

      globallyVisitedPeopleIds.add(personId);

      const spouses = Array.from(spouseMap.get(personId) || []);

      if (spouses.length === 0) {
        // Single parent or single person
        const childIds = parentToChildren.get(personId) || new Set();
        const sortedChildIds = [...childIds].sort(sortByBirthDate);
        const children = sortedChildIds.flatMap((cid) => buildSubtrees(cid, newVisited));

        return [{
          type: "single",
          id: personId,
          person,
          children,
        }];
      }

      // Person has spouses. For each spouse, create a couple node.
      const nodes: LayoutNode[] = [];

      for (const spouseInfo of spouses) {
        const spouse = personMap.get(spouseInfo.spouseId);
        if (!spouse) continue;

        globallyVisitedPeopleIds.add(spouseInfo.spouseId);

        // Track globally visited couples to render them exactly once
        const coupleKey = [personId, spouseInfo.spouseId].sort().join("_");
        if (globalVisitedCouples.has(coupleKey)) continue;
        globalVisitedCouples.add(coupleKey);

        // Shared children of this couple
        const sharedChildIds = getSharedChildren(personId, spouseInfo.spouseId);
        const sortedChildIds = [...sharedChildIds].sort(sortByBirthDate);
        const children = sortedChildIds.flatMap((cid) => buildSubtrees(cid, newVisited));

        nodes.push({
          type: "couple",
          id: coupleKey,
          persons: [person, spouse],
          primaryIndex: 0, // personId is the blood-relative ancestor here
          isDivorced: spouseInfo.isDivorced,
          isWidowed: spouseInfo.isWidowed,
          children,
        });
      }

      // Exclusive children of this person (with an unknown spouse / not in DB)
      const allSpouseIds = spouses.map((s) => s.spouseId);
      const exclusiveChildIds = [...(parentToChildren.get(personId) || [])].filter((cid) => {
        const childParents = childToParents.get(cid) || new Set();
        return !allSpouseIds.some((sid) => childParents.has(sid));
      });

      if (exclusiveChildIds.length > 0) {
        const sortedExclusiveIds = exclusiveChildIds.sort(sortByBirthDate);
        const children = sortedExclusiveIds.flatMap((cid) => buildSubtrees(cid, newVisited));
        nodes.push({
          type: "single",
          id: `${personId}_exclusive`,
          person,
          children,
        });
      }

      return nodes;
    };

    const rootNodes: LayoutNode[] = [];
    const roots = persons.filter((p) => !childToParents.has(p.id) && !p.married_in);
    if (roots.length === 0 && persons.length > 0) roots.push(persons[0]);

    const visitedPeople = new Set<string>();

    for (const r of roots) {
      const subtrees = buildSubtrees(r.id, visitedPeople);
      rootNodes.push(...subtrees);
    }

    // Orphans / Unvisited people
    persons.forEach((p) => {
      if (!globallyVisitedPeopleIds.has(p.id)) {
        rootNodes.push({
          type: "single",
          id: p.id,
          person: p,
          children: []
        });
        globallyVisitedPeopleIds.add(p.id);
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
    const COUPLE_GAP = 130; // distance between couple nodes center-to-center
    const H_SPACING = 140;
    const V_SPACING = 140;

    interface PositionedPerson {
      x: number;
      y: number;
      person: Tables<"persons">;
      marriedIn?: boolean;
      deceased?: boolean;
      birthOrder?: number; // 1-based order among siblings
      siblingCount?: number;
    }

    interface PositionedLink {
      parentX: number;
      parentY: number;
      childX: number;
      childY: number;
    }

    interface PositionedCoupleLine {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isDivorced?: boolean;
      isWidowed?: boolean;
    }

    const posPersons: PositionedPerson[] = [];
    const posLinks: PositionedLink[] = [];
    const posCoupleLines: PositionedCoupleLine[] = [];

    // Recursive layout: returns the width of the subtree
    const layoutNode = (
      node: LayoutNode,
      x: number,
      y: number,
      birthOrder?: number,
      siblingCount?: number
    ): { width: number; anchorX: number } => {
      if (node.type === "couple") {
        const [p1, p2] = node.persons;

        // Layout children first to determine width
        let childrenWidth = 0;
        const childLayouts: { width: number; anchorX: number }[] = [];
        const childXStarts: number[] = [];

        if (node.children.length > 0) {
          let cx = x;
          const childCount = node.children.length;
          node.children.forEach((child, i) => {
            childXStarts.push(cx);
            const cl = layoutNode(
              child,
              cx,
              y + V_SPACING,
              childCount > 1 ? i + 1 : undefined,
              childCount > 1 ? childCount : undefined
            );
            childLayouts.push(cl);
            cx += cl.width + H_SPACING;
          });
          childrenWidth = cx - H_SPACING - x;
        }

        const coupleWidth = COUPLE_GAP;
        const totalWidth = Math.max(coupleWidth, childrenWidth);
        const centerX = x + totalWidth / 2;

        const p1x = centerX - COUPLE_GAP / 2;
        const p2x = centerX + COUPLE_GAP / 2;

        posPersons.push({
          x: p1x,
          y,
          person: p1,
          marriedIn: !!p1.married_in,
          deceased: !!p1.death_date,
          birthOrder: node.primaryIndex === 0 ? birthOrder : undefined,
          siblingCount: node.primaryIndex === 0 ? siblingCount : undefined,
        });
        posPersons.push({
          x: p2x,
          y,
          person: p2,
          marriedIn: !!p2.married_in,
          deceased: !!p2.death_date,
          birthOrder: node.primaryIndex === 1 ? birthOrder : undefined,
          siblingCount: node.primaryIndex === 1 ? siblingCount : undefined,
        });

        posCoupleLines.push({
          x1: p1x + NODE_R,
          y1: y,
          x2: p2x - NODE_R,
          y2: y,
          isDivorced: node.isDivorced,
          isWidowed: node.isWidowed,
        });

        // Links from couple midpoint to children
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

        // anchorX points to the primary (blood-relative) person so parent links target them
        const primaryX = node.primaryIndex === 0 ? p1x : p2x;
        return { width: totalWidth, anchorX: primaryX };
      } else {
        // Single node
        const person = node.person;

        let childrenWidth = 0;
        const childLayouts: { width: number; anchorX: number }[] = [];
        const childXStarts: number[] = [];

        if (node.children.length > 0) {
          let cx = x;
          const childCount = node.children.length;
          node.children.forEach((child, i) => {
            childXStarts.push(cx);
            const cl = layoutNode(
              child,
              cx,
              y + V_SPACING,
              childCount > 1 ? i + 1 : undefined,
              childCount > 1 ? childCount : undefined
            );
            childLayouts.push(cl);
            cx += cl.width + H_SPACING;
          });
          childrenWidth = cx - H_SPACING - x;
        }

        const totalWidth = Math.max(NODE_R * 2, childrenWidth);
        const centerX = x + totalWidth / 2;

        posPersons.push({
          x: centerX,
          y,
          person,
          deceased: !!person.death_date,
          birthOrder,
          siblingCount,
        });

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

    // Find the bounding box of root-level persons (first generation) to focus on them
    const rootPersons = posPersons.filter((pp) => pp.y === 60);
    if (rootPersons.length > 0) {
      const minX = Math.min(...rootPersons.map((p) => p.x)) - NODE_R * 2;
      const maxX = Math.max(...rootPersons.map((p) => p.x)) + NODE_R * 2;
      const rootWidth = maxX - minX;
      const rootCenterX = (minX + maxX) / 2;

      // Scale to fit root generation nicely, with some breathing room
      const targetScale = Math.min(1.2, (width * 0.7) / Math.max(rootWidth, 1));
      const clampedScale = Math.max(0.4, Math.min(targetScale, 1.2));

      const initialTransform = d3.zoomIdentity
        .translate(width / 2 - rootCenterX * clampedScale, height * 0.15 - 60 * clampedScale)
        .scale(clampedScale);
      svg.call(zoom.transform, initialTransform);
    } else {
      // Fallback: center entire tree
      const initialTransform = d3.zoomIdentity
        .translate(Math.max(0, width / 2 - totalTreeWidth / 2), 20)
        .scale(Math.min(1, width / totalTreeWidth));
      svg.call(zoom.transform, initialTransform);
    }

    const isFiltering = !!(highlightedPersonIds && highlightedPersonIds.size > 0);
    const isHighlighted = (id: string) => !isFiltering || highlightedPersonIds!.has(id);
    const DIM_OPACITY = 0.12;

    // Draw couple lines
    posCoupleLines.forEach((cl) => {
      let strokeColor = "hsl(var(--primary))";
      let dashArray = "6,4";
      let opacity = isFiltering ? 0.15 : 0.7;

      if (cl.isDivorced) {
        strokeColor = "hsl(var(--destructive))";
        dashArray = "3,3";
        opacity = isFiltering ? 0.15 : 0.6;
      } else if (cl.isWidowed) {
        strokeColor = "hsl(var(--muted-foreground))";
        dashArray = "6,4";
        opacity = isFiltering ? 0.15 : 0.6;
      }

      g.append("line")
        .attr("x1", cl.x1).attr("y1", cl.y1)
        .attr("x2", cl.x2).attr("y2", cl.y2)
        .attr("stroke", strokeColor)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", dashArray)
        .attr("opacity", opacity);

      // Add a small label status chip in the center of the couple line
      if (cl.isDivorced || cl.isWidowed) {
        const midX = (cl.x1 + cl.x2) / 2;
        const midY = cl.y1;
        const labelText = cl.isDivorced ? "Divorced" : "Widowed";

        const textG = g.append("g")
          .attr("opacity", opacity);

        // Chip Background
        textG.append("rect")
          .attr("x", midX - 25)
          .attr("y", midY - 8)
          .attr("width", 50)
          .attr("height", 15)
          .attr("rx", 7.5)
          .attr("fill", cl.isDivorced ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--muted) / 0.4)")
          .attr("stroke", strokeColor)
          .attr("stroke-width", 1);

        // Chip Text
        textG.append("text")
          .attr("x", midX)
          .attr("y", midY + 3)
          .attr("text-anchor", "middle")
          .attr("fill", cl.isDivorced ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))")
          .attr("font-size", "8px")
          .attr("font-family", "Inter, sans-serif")
          .attr("font-weight", "bold")
          .text(labelText);
      }
    });

    // Draw links
    posLinks.forEach((l) => {
      g.append("path")
        .attr("d", `M${l.parentX},${l.parentY} C${l.parentX},${(l.parentY + l.childY) / 2} ${l.childX},${(l.parentY + l.childY) / 2} ${l.childX},${l.childY}`)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--tree-line))")
        .attr("stroke-width", 2)
        .attr("opacity", isFiltering ? 0.2 : 1);
    });

    // Draw nodes
    posPersons.forEach((pp) => {
      const baseOpacity = pp.deceased ? 0.6 : 1;
      const opacity = isHighlighted(pp.person.id) ? baseOpacity : DIM_OPACITY;
      const nodeG = g.append("g")
        .attr("transform", `translate(${pp.x},${pp.y})`)
        .style("cursor", "pointer")
        .style("opacity", opacity)
        .on("click", () => onPersonClick(pp.person));

      const hasPhoto = !!pp.person.photo_url;

      if (hasPhoto) {
        // Clip path for circular photo
        const clipId = `clip-${pp.person.id.replace(/-/g, "")}`;
        const defs = nodeG.append("defs");
        defs.append("clipPath")
          .attr("id", clipId)
          .append("circle")
          .attr("r", NODE_R)
          .attr("cx", 0)
          .attr("cy", 0);

        // Background circle (shows while image loads / as border)
        nodeG.append("circle")
          .attr("r", NODE_R)
          .attr("fill", () => {
            if (pp.person.gender === "male") return "hsl(var(--tree-node-male))";
            if (pp.person.gender === "female") return "hsl(var(--tree-node-female))";
            return "hsl(var(--tree-node-other))";
          })
          .attr("stroke", pp.marriedIn ? "hsl(var(--primary))" : "hsl(var(--background))")
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", pp.marriedIn ? "5,3" : "none");

        // Photo image
        nodeG.append("image")
          .attr("href", pp.person.photo_url!)
          .attr("x", -NODE_R)
          .attr("y", -NODE_R)
          .attr("width", NODE_R * 2)
          .attr("height", NODE_R * 2)
          .attr("clip-path", `url(#${clipId})`)
          .attr("preserveAspectRatio", "xMidYMid slice");

        // Border ring on top
        nodeG.append("circle")
          .attr("r", NODE_R)
          .attr("fill", "none")
          .attr("stroke", pp.marriedIn ? "hsl(var(--primary))" : "hsl(var(--background))")
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", pp.marriedIn ? "5,3" : "none");
      } else {
        nodeG.append("circle")
          .attr("r", NODE_R)
          .attr("fill", () => {
            if (pp.person.gender === "male") return "hsl(var(--tree-node-male))";
            if (pp.person.gender === "female") return "hsl(var(--tree-node-female))";
            return "hsl(var(--tree-node-other))";
          })
          .attr("stroke", pp.marriedIn ? "hsl(var(--primary))" : "hsl(var(--background))")
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", pp.marriedIn ? "5,3" : "none");

        const nameParts = [pp.person.first_name, pp.person.middle_name, pp.person.last_name].filter(Boolean);
        const initials = nameParts.map((p) => p!.charAt(0)).slice(0, 2).join("").toUpperCase();

        nodeG.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", "white")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("font-family", "Space Grotesk, sans-serif")
          .text(initials);
      }

      // Deceased indicator - small cross icon
      if (pp.deceased) {
        nodeG.append("text")
          .attr("text-anchor", "middle")
          .attr("x", NODE_R - 4)
          .attr("y", -NODE_R + 12)
          .attr("fill", "hsl(var(--destructive))")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .text("✝");
      }

      const name = [pp.person.first_name, pp.person.middle_name, pp.person.last_name].filter(Boolean).join(" ");
      nodeG.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "48px")
        .attr("fill", pp.deceased ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))")
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .text(name.length > 18 ? name.slice(0, 16) + "…" : name);

      // Birth order label
      if (pp.birthOrder) {
        const ordinal = pp.birthOrder === 1 ? "1st" : pp.birthOrder === 2 ? "2nd" : pp.birthOrder === 3 ? "3rd" : `${pp.birthOrder}th`;
        nodeG.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "62px")
          .attr("fill", "hsl(var(--muted-foreground))")
          .attr("font-size", "9px")
          .attr("font-family", "Inter, sans-serif")
          .text(ordinal + " born");
      }
    });

    // Store person positions for external focus
    personPositionsRef.current = new Map(posPersons.map((pp) => [pp.person.id, { x: pp.x, y: pp.y }]));

    // Store zoom ref for external use
    zoomRef.current = zoom;

  }, [layoutData, onPersonClick, highlightedPersonIds]);

  const focusOnPositions = useCallback((positions: { x: number; y: number }[]) => {
    if (!positions.length || !svgRef.current || !containerRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Scale to fit all positions with padding
    const spanX = maxX - minX + 120;
    const spanY = maxY - minY + 120;
    const scale = positions.length === 1
      ? 1.5
      : Math.min(1.5, width / Math.max(spanX, 1), height / Math.max(spanY, 1));

    const transform = d3.zoomIdentity
      .translate(width / 2 - centerX * scale, height / 2 - centerY * scale)
      .scale(scale);
    svg.transition().duration(600).call(zoomRef.current!.transform, transform);

    // Flash highlight on all positions
    const g = svg.select("g");
    positions.forEach(pos => {
      const ring = g.append("circle")
        .attr("cx", pos.x).attr("cy", pos.y).attr("r", 38)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--primary))")
        .attr("stroke-width", 4)
        .attr("opacity", 1);
      ring.transition().duration(1500).attr("r", 50).attr("opacity", 0).remove();
    });
  }, []);

  useImperativeHandle(ref, () => ({
    focusPerson: (personId: string) => {
      const pos = personPositionsRef.current.get(personId);
      if (!pos) return;
      focusOnPositions([pos]);
    },
    focusPersons: (personIds: string[]) => {
      const positions = personIds
        .map(id => personPositionsRef.current.get(id))
        .filter(Boolean) as { x: number; y: number }[];
      if (positions.length === 0) return;
      focusOnPositions(positions);
    },
  }), [focusOnPositions]);

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
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg ref={svgRef} className="h-full w-full" />
      {/* Legend - collapsible on mobile */}
      <details className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 rounded-lg border bg-background/90 px-3 py-2 sm:px-4 sm:py-3 text-xs shadow-md backdrop-blur-sm group open:pb-3">
        <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center gap-1 select-none">
          <span className="transition-transform group-open:rotate-90">▶</span> Legend
        </summary>
        <div className="mt-2 flex flex-col gap-1.5 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded-full border-2 border-dashed border-primary" />
            <span>Married into family</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-destructive font-bold">✝</span>
            <span>Deceased</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground italic">1st born</span>
            <span>Birth order among siblings</span>
          </div>
        </div>
      </details>
    </div>
  );
});
