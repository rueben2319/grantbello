import { useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useFamily, useFamilyPersons, useFamilyRelationships, useUserFamilyRole } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { TreeVisualization, type TreeVisualizationHandle } from "@/components/TreeVisualization";
import { PersonProfileCard } from "@/components/PersonProfileCard";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { FamilySettingsDialog } from "@/components/FamilySettingsDialog";
import { MemberManagement } from "@/components/MemberManagement";
import { BranchList, type Branch } from "@/components/BranchList";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TreePine, Search, X, GitBranch } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tables } from "@/integrations/supabase/types";

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
      });
    }

    // Sort by birth date (oldest first), nulls last
    result.sort((a, b) => {
      const da = a.persons[0].birth_date || "9999";
      const db = b.persons[0].birth_date || "9999";
      return da.localeCompare(db);
    });

    return result;
  }, [persons, relationships]);

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
    treeRef.current?.focusPerson(branch.primaryPersonId);
  };

  const canEdit = userRole === "admin" || userRole === "editor";
  const isAdmin = userRole === "admin";

  const getParents = (personId: string) => {
    const parentIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.related_person_id === personId)
      .map((r) => r.person_id);
    return persons.filter((p) => parentIds.includes(p.id));
  };

  const getChildren = (personId: string) => {
    const childIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.person_id === personId)
      .map((r) => r.related_person_id);
    return persons.filter((p) => childIds.includes(p.id));
  };

  const getSpouses = (personId: string) => {
    const spouseIds = relationships
      .filter((r) => r.relationship_type === "spouse" && (r.person_id === personId || r.related_person_id === personId))
      .map((r) => (r.person_id === personId ? r.related_person_id : r.person_id));
    return persons.filter((p) => spouseIds.includes(p.id));
  };

  const getSiblings = (personId: string) => {
    const parentIds = relationships
      .filter((r) => r.relationship_type === "parent" && r.related_person_id === personId)
      .map((r) => r.person_id);
    if (parentIds.length === 0) return [];
    const siblingIds = new Set<string>();
    relationships
      .filter((r) => r.relationship_type === "parent" && parentIds.includes(r.person_id) && r.related_person_id !== personId)
      .forEach((r) => siblingIds.add(r.related_person_id));
    return persons.filter((p) => siblingIds.has(p.id));
  };

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
          >
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}>
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

      {/* Tree + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && branchesOpen && (
          <div className="w-[280px] shrink-0 border-r bg-background">
            {branchListContent}
          </div>
        )}

        {/* Mobile sheet */}
        {isMobile && (
          <Sheet open={branchesOpen} onOpenChange={setBranchesOpen}>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Family Branches</SheetTitle>
              {branchListContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Tree canvas */}
        <div className="flex-1">
          <TreeVisualization
            ref={treeRef}
            persons={persons}
            relationships={relationships}
            onPersonClick={setSelectedPerson}
          />
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
