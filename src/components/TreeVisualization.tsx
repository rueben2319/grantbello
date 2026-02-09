import { useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import type { Tables } from "@/integrations/supabase/types";

interface TreeNode {
  id: string;
  name: string;
  gender: string | null;
  person: Tables<"persons">;
  children: TreeNode[];
}

interface TreeVisualizationProps {
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  onPersonClick: (person: Tables<"persons">) => void;
}

export function TreeVisualization({ persons, relationships, onPersonClick }: TreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const treeData = useMemo(() => {
    if (!persons.length) return null;

    // Build parent-child map
    const childToParents = new Map<string, string[]>();
    const parentToChildren = new Map<string, string[]>();

    relationships.forEach((r) => {
      if (r.relationship_type === "parent") {
        // person_id is parent of related_person_id
        const kids = parentToChildren.get(r.person_id) || [];
        kids.push(r.related_person_id);
        parentToChildren.set(r.person_id, kids);

        const parents = childToParents.get(r.related_person_id) || [];
        parents.push(r.person_id);
        childToParents.set(r.related_person_id, parents);
      }
    });

    // Find root persons (those without parents)
    const roots = persons.filter((p) => !childToParents.has(p.id));
    if (roots.length === 0 && persons.length > 0) {
      // fallback: use first person
      roots.push(persons[0]);
    }

    const personMap = new Map(persons.map((p) => [p.id, p]));

    const buildNode = (personId: string, visited: Set<string>): TreeNode | null => {
      if (visited.has(personId)) return null;
      visited.add(personId);
      const person = personMap.get(personId);
      if (!person) return null;

      const childIds = parentToChildren.get(personId) || [];
      const children = childIds
        .map((cid) => buildNode(cid, visited))
        .filter(Boolean) as TreeNode[];

      return {
        id: person.id,
        name: `${person.first_name} ${person.last_name || ""}`.trim(),
        gender: person.gender,
        person,
        children,
      };
    };

    // Build forest from roots
    const visited = new Set<string>();
    const rootNodes = roots.map((r) => buildNode(r.id, visited)).filter(Boolean) as TreeNode[];

    // Add orphan persons
    persons.forEach((p) => {
      if (!visited.has(p.id)) {
        rootNodes.push({
          id: p.id,
          name: `${p.first_name} ${p.last_name || ""}`.trim(),
          gender: p.gender,
          person: p,
          children: [],
        });
      }
    });

    if (rootNodes.length === 0) return null;
    if (rootNodes.length === 1) return rootNodes[0];

    // Virtual root
    return {
      id: "__root__",
      name: "",
      gender: null,
      person: null as any,
      children: rootNodes,
    };
  }, [persons, relationships]);

  const renderTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const root = d3.hierarchy(treeData);
    const nodeCount = root.descendants().length;
    const treeWidth = Math.max(width, nodeCount * 120);
    const treeHeight = Math.max(height - 100, root.height * 140 + 100);

    const treeLayout = d3.tree<TreeNode>().size([treeWidth - 100, treeHeight]);
    treeLayout(root);

    // Center the tree
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 - treeWidth / 2 + 50, 50)
      .scale(Math.min(1, width / treeWidth));
    svg.call(zoom.transform, initialTransform);

    // Skip virtual root links
    const links = root.links().filter((l) => l.source.data.id !== "__root__");

    // Draw links
    g.selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) => {
        return `M${d.source.x},${d.source.y + 30}
                C${d.source.x},${(d.source.y! + d.target.y!) / 2}
                 ${d.target.x},${(d.source.y! + d.target.y!) / 2}
                 ${d.target.x},${d.target.y! - 30}`;
      })
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--tree-line))")
      .attr("stroke-width", 2);

    // Draw spouse connections
    const spouseRels = relationships.filter((r) => r.relationship_type === "spouse");
    const nodeMap = new Map(root.descendants().map((n) => [n.data.id, n]));

    spouseRels.forEach((r) => {
      const n1 = nodeMap.get(r.person_id);
      const n2 = nodeMap.get(r.related_person_id);
      if (n1 && n2) {
        g.append("line")
          .attr("x1", n1.x!)
          .attr("y1", n1.y!)
          .attr("x2", n2.x!)
          .attr("y2", n2.y!)
          .attr("stroke", "hsl(var(--primary))")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.6);
      }
    });

    // Draw nodes (skip virtual root)
    const nodes = root.descendants().filter((n) => n.data.id !== "__root__");

    const nodeGroups = g.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        if (d.data.person) onPersonClick(d.data.person);
      });

    // Node circles
    nodeGroups.append("circle")
      .attr("r", 28)
      .attr("fill", (d) => {
        if (d.data.gender === "male") return "hsl(var(--tree-node-male))";
        if (d.data.gender === "female") return "hsl(var(--tree-node-female))";
        return "hsl(var(--tree-node-other))";
      })
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 3);

    // Initials
    nodeGroups.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("font-family", "Space Grotesk, sans-serif")
      .text((d) => {
        const parts = d.data.name.split(" ");
        return parts.map((p) => p.charAt(0)).slice(0, 2).join("").toUpperCase();
      });

    // Name labels
    nodeGroups.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "48px")
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text((d) => d.data.name.length > 18 ? d.data.name.slice(0, 16) + "…" : d.data.name);

  }, [treeData, relationships, onPersonClick]);

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
