import { useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useFamily, useFamilyPersons, useFamilyRelationships, useUserFamilyRole } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { TreeVisualization, type TreeVisualizationHandle } from "@/components/TreeVisualization";
import { PersonProfileCard } from "@/components/PersonProfileCard";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { FamilySettingsDialog } from "@/components/FamilySettingsDialog";
import { MemberManagement } from "@/components/MemberManagement";
import { BranchList } from "@/components/BranchList";
import type { Branch } from "@/types/family";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TreePine, Search, X, GitBranch } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tables } from "@/integrations/supabase/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function FamilyTree() {
  const { familyId } = useParams<{ familyId: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: family, isLoading: loadingFamily } = useFamily(familyId);
  const { data: persons = [] } = useFamilyPersons(familyId);
  const { data: relationships = [] } = useFamilyRelationships(familyId);
  const { data: userRole } = useUserFamilyRole(familyId);
  const treeRef = useRef<TreeVisualizationHandle>(null);

  const [selectedPerson, setSelectedPerson] = useState<Tables<"persons"> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [generationFilter, setGenerationFilter] = useState<number | null>(null);

  // Strict generation map: anchored to the founding root, propagated via
  // parent->child links downward. Spouses inherit their partner's generation.
  const generationMap = useMemo(() => {
    const gen = new Map<string, number>();
    if (persons.length === 0) return gen;

    const childrenOf = new Map<string, Set<string>>();
    const parentsOf = new Map<string, Set<string>>();
    const spousesOf = new Map<string, Set<string>>();

    for (const r of relationships) {
      if (r.relationship_type === "parent") {
        if (!childrenOf.has(r.person_id)) childrenOf.set(r.person_id, new Set());
        childrenOf.get(r.person_id)!.add(r.related_person_id);
        if (!parentsOf.has(r.related_person_id)) parentsOf.set(r.related_person_id, new Set());
        parentsOf.get(r.related_person_id)!.add(r.person_id);
      } else if (r.relationship_type === "spouse") {
        if (!spousesOf.has(r.person_id)) spousesOf.set(r.person_id, new Set());
        spousesOf.get(r.person_id)!.add(r.related_person_id);
        if (!spousesOf.has(r.related_person_id)) spousesOf.set(r.related_person_id, new Set());
        spousesOf.get(r.related_person_id)!.add(r.person_id);
      }
    }

    // Candidate roots: persons with no parents in the tree AND not married-in.
    const rootCandidates = persons.filter(
      (p) => !p.married_in && !(parentsOf.get(p.id)?.size)
    );

    const descendantCount = (id: string): number => {
      const seen = new Set<string>();
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const k of childrenOf.get(cur) || []) {
          if (!seen.has(k)) { seen.add(k); stack.push(k); }
        }
      }
      return seen.size;
    };

    const sortedRoots = [...rootCandidates].sort((a, b) => {
      const dc = descendantCount(b.id) - descendantCount(a.id);
      if (dc !== 0) return dc;
      const ba = a.birth_date || "9999";
      const bb = b.birth_date || "9999";
      if (ba !== bb) return ba.localeCompare(bb);
      return (a.created_at || "").localeCompare(b.created_at || "");
    });

    const foundingRoot = sortedRoots[0] || persons[0];

    // BFS downward from founding root: parent's gen + 1 for each child.
    const queue: string[] = [foundingRoot.id];
    gen.set(foundingRoot.id, 1);
    for (const sp of spousesOf.get(foundingRoot.id) || []) {
      if (!gen.has(sp)) { gen.set(sp, 1); queue.push(sp); }
    }

    while (queue.length) {
      const cur = queue.shift()!;
      const curGen = gen.get(cur)!;
      for (const k of childrenOf.get(cur) || []) {
        if (gen.has(k)) continue;
        gen.set(k, curGen + 1);
        queue.push(k);
        for (const sp of spousesOf.get(k) || []) {
          if (!gen.has(sp)) { gen.set(sp, curGen + 1); queue.push(sp); }
        }
      }
    }

    // Fallback for disconnected persons: inherit via spouse, else default to 1.
    for (const p of persons) {
      if (gen.has(p.id)) continue;
      const sp = [...(spousesOf.get(p.id) || [])].find((s) => gen.has(s));
      gen.set(p.id, sp ? gen.get(sp)! : 1);
    }

    return gen;
  }, [persons, relationships]);

  // Compute branches
  const branches = useMemo<Branch[]>(() => {
    const result: Branch[] = [];
    const usedPersonIds = new Set<string>();

    // 1. Spouse pairs with children
    const spouseRels = relationships.filter((r) => r.relationship_type === "spouse");
    for (const rel of spouseRels) {
      const p1 = persons.find((p) => p.id === rel.person_id);
      const p2 = persons.find((p) => p.id === rel.related_person_id);
      if (!p1 || !p2) continue;

      // Find shared children (both are parents of the same child)
      const p1Children = new Set(
        relationships
          .filter((r) => r.relationship_type === "parent" && r.person_id === p1.id)
          .map((r) => r.related_person_id)
      );
      const sharedChildren = relationships
        .filter((r) => r.relationship_type === "parent" && r.person_id === p2.id && p1Children.has(r.related_person_id))
        .map((r) => r.related_person_id);

      const childCount = new Set(sharedChildren).size;
      if (childCount === 0) continue;

      const primary = p1.married_in ? p2 : p1;
      const secondary = primary.id === p1.id ? p2 : p1;

      result.push({
        id: `${primary.id}-${secondary.id}`,
        persons: [primary, secondary],
        childCount,
        primaryPersonId: primary.id,
        generation: generationMap.get(primary.id) || 1,
      });

      usedPersonIds.add(p1.id);
      usedPersonIds.add(p2.id);
    }

    // 2. Single parents (have children but not already in a spouse branch)
    const parentRels = relationships.filter((r) => r.relationship_type === "parent");
    const parentChildMap = new Map<string, Set<string>>();
    for (const r of parentRels) {
      if (!parentChildMap.has(r.person_id)) parentChildMap.set(r.person_id, new Set());
      parentChildMap.get(r.person_id)!.add(r.related_person_id);
    }

    for (const [parentId, children] of parentChildMap) {
      if (usedPersonIds.has(parentId)) continue;
      const person = persons.find((p) => p.id === parentId);
      if (!person) continue;

      result.push({
        id: parentId,
        persons: [person, undefined],
        childCount: children.size,
        primaryPersonId: parentId,
        generation: generationMap.get(parentId) || 1,
      });
    }

    // Sort by generation (oldest first), then by birth date
    result.sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      const da = a.persons[0].birth_date || "9999";
      const db = b.persons[0].birth_date || "9999";
      return da.localeCompare(db);
    });

    return result;
  }, [persons, relationships, generationMap]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return persons.filter((p) => {
      const full = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
      return full.includes(q);
    }).slice(0, 8);
  }, [searchQuery, persons]);

  const handleSelectResult = (person: Tables<"persons">) => {
    setSearchOpen(false);
    setSearchQuery("");
    treeRef.current?.focusPerson(person.id);
    setTimeout(() => setSelectedPerson(person), 650);
  };

  const handleSelectBranch = (branch: Branch) => {
    if (isMobile) setBranchesOpen(false);
    // Focus on both spouse nodes if it's a couple branch
    const personIds = branch.persons.filter(Boolean).map(p => p!.id);
    treeRef.current?.focusPersons(personIds);
  };

  const canEdit = userRole === "admin" || userRole === "editor";
  const isAdmin = userRole === "admin";

  const getParents = useCallback((personId: string) => {
    const parentIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.related_person_id === personId)
      .map((r) => r.person_id);
    return persons.filter((p) => parentIds.includes(p.id));
  }, [relationships, persons]);

  const getChildren = useCallback((personId: string) => {
    const childIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.person_id === personId)
      .map((r) => r.related_person_id);
    return persons.filter((p) => childIds.includes(p.id));
  }, [relationships, persons]);

  const getSpouses = useCallback((personId: string) => {
    const spouseIds = relationships
      .filter((r) => r.relationship_type === "spouse" && (r.person_id === personId || r.related_person_id === personId))
      .map((r) => (r.person_id === personId ? r.related_person_id : r.person_id));
    return persons.filter((p) => spouseIds.includes(p.id));
  }, [relationships, persons]);

  const getSiblings = useCallback((personId: string) => {
    const parentIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.related_person_id === personId)
      .map((r) => r.person_id);
    if (parentIds.length === 0) return [];
    const siblingIds = new Set<string>();
    relationships
      .filter((r) => r.relationship_type === "parent" && parentIds.includes(r.person_id) && r.related_person_id !== personId)
      .forEach((r) => siblingIds.add(r.related_person_id));
    return persons.filter((p) => siblingIds.has(p.id));
  }, [relationships, persons]);

  // Available generations (sorted) + highlighted set for filtering
  const availableGenerations = useMemo(() => {
    const s = new Set<number>();
    for (const g of generationMap.values()) s.add(g);
    return Array.from(s).sort((a, b) => a - b);
  }, [generationMap]);

  const highlightedPersonIds = useMemo(() => {
    if (generationFilter === null) return null;
    const ids = new Set<string>();
    for (const [id, g] of generationMap) {
      if (g === generationFilter) ids.add(id);
    }
    return ids;
  }, [generationMap, generationFilter]);

  if (loadingFamily) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center">
          <TreePine className="mb-4 h-16 w-16 text-muted-foreground/50" />
          <h2 className="font-display text-xl">Family not found</h2>
        </div>
      </div>
    );
  }

  const branchListContent = (
    <BranchList
      branches={branches}
      onSelectBranch={handleSelectBranch}
      onClose={() => setBranchesOpen(false)}
    />
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-2 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold truncate sm:text-lg">{family.name}</h1>
            <p className="text-xs text-muted-foreground">
              {persons.length} {persons.length === 1 ? "person" : "people"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant={branchesOpen ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setBranchesOpen(!branchesOpen)}
            title="Family branches"
            aria-label="Toggle family branches panel"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
            aria-label="Search family members"
          >
            <Search className="h-4 w-4" />
          </Button>
          {canEdit && <AddPersonDialog familyId={family.id} existingPersons={persons} />}
          {isAdmin && <FamilySettingsDialog family={family} />}
          {isAdmin && <MemberManagement familyId={family.id} isAdmin={isAdmin} />}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="relative border-b px-2 py-2 sm:px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search family members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mx-2 mt-1 rounded-md border bg-popover shadow-lg sm:mx-4">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                  onClick={() => handleSelectResult(p)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.first_name.charAt(0)}{(p.last_name || "").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.first_name} {p.last_name || ""}</p>
                    {p.birth_date && <p className="text-xs text-muted-foreground">{p.birth_date}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 z-50 mx-2 mt-1 rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg sm:mx-4">
              No members found
            </div>
          )}
        </div>
      )}

      {/* Generation filter chips */}
      {availableGenerations.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b px-2 py-2 sm:px-4">
          <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">Filter:</span>
          <button
            onClick={() => setGenerationFilter(null)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              generationFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            All
          </button>
          {availableGenerations.map((g) => (
            <button
              key={g}
              onClick={() => setGenerationFilter(generationFilter === g ? null : g)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                generationFilter === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              Gen {g}
            </button>
          ))}
        </div>
      )}

      {/* Tree + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && branchesOpen && (
          <div className="w-[320px] shrink-0 border-r bg-background">
            {branchListContent}
          </div>
        )}

        {/* Mobile sheet */}
        {isMobile && (
          <Sheet open={branchesOpen} onOpenChange={setBranchesOpen}>
            <SheetContent side="left" className="w-[320px] p-0">
              <SheetTitle className="sr-only">Family Branches</SheetTitle>
              {branchListContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Tree canvas */}
        <div className="flex-1">
          <ErrorBoundary fallback={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Failed to render the family tree. Try refreshing.</p>
            </div>
          }>
            <TreeVisualization
              ref={treeRef}
              persons={persons}
              relationships={relationships}
              onPersonClick={setSelectedPerson}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Person profile dialog */}
      <PersonProfileCard
        person={selectedPerson}
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        parents={selectedPerson ? getParents(selectedPerson.id) : []}
        children={selectedPerson ? getChildren(selectedPerson.id) : []}
        spouses={selectedPerson ? getSpouses(selectedPerson.id) : []}
        siblings={selectedPerson ? getSiblings(selectedPerson.id) : []}
        isAuthenticated={!!user}
        canEdit={canEdit}
        isAdmin={isAdmin}
        existingPersons={persons}
        relationships={relationships}
        familyId={familyId || ""}
        onNavigateToPerson={(p) => {
          setSelectedPerson(null);
          treeRef.current?.focusPerson(p.id);
          setTimeout(() => setSelectedPerson(p), 650);
        }}
      />
    </div>
  );
}
