import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFamily, useFamilyPersons, useFamilyRelationships, useUserFamilyRole } from "@/hooks/useFamily";
import { useAuth } from "@/contexts/AuthContext";
import { TreeVisualization } from "@/components/TreeVisualization";
import { PersonProfileCard } from "@/components/PersonProfileCard";
import { AddPersonDialog } from "@/components/AddPersonDialog";
import { FamilySettingsDialog } from "@/components/FamilySettingsDialog";
import { MemberManagement } from "@/components/MemberManagement";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TreePine } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function FamilyTree() {
  const { familyId } = useParams<{ familyId: string }>();
  const { user } = useAuth();
  const { data: family, isLoading: loadingFamily } = useFamily(familyId);
  const { data: persons = [] } = useFamilyPersons(familyId);
  const { data: relationships = [] } = useFamilyRelationships(familyId);
  const { data: userRole } = useUserFamilyRole(familyId);

  const [selectedPerson, setSelectedPerson] = useState<Tables<"persons"> | null>(null);

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
          <Button asChild variant="link" className="mt-2">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-2 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to={user ? "/dashboard" : "/browse"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold truncate sm:text-lg">{family.name}</h1>
            <p className="text-xs text-muted-foreground">
              {persons.length} {persons.length === 1 ? "person" : "people"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {canEdit && <AddPersonDialog familyId={family.id} existingPersons={persons} />}
          {isAdmin && <FamilySettingsDialog family={family} />}
          {isAdmin && <MemberManagement familyId={family.id} isAdmin={isAdmin} />}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1">
        <TreeVisualization
          persons={persons}
          relationships={relationships}
          onPersonClick={setSelectedPerson}
        />
      </div>

      {/* Person profile dialog */}
      <PersonProfileCard
        person={selectedPerson}
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        parents={selectedPerson ? getParents(selectedPerson.id) : []}
        children={selectedPerson ? getChildren(selectedPerson.id) : []}
        spouses={selectedPerson ? getSpouses(selectedPerson.id) : []}
        isAuthenticated={!!user}
        canEdit={canEdit}
        isAdmin={isAdmin}
        existingPersons={persons}
        relationships={relationships}
        familyId={familyId || ""}
      />
    </div>
  );
}
