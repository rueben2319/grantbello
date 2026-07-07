import { useMyFamilies, useFamilyPersons, useFamilyRelationships, useFamilyMembers } from "@/hooks/useFamily";
import { useFamilySubTrees } from "@/hooks/useSubTrees";
import { CreateFamilyDialog } from "@/components/CreateFamilyDialog";
import { FamilyCard } from "@/components/FamilyCard";
import { SubTreeCard } from "@/components/SubTreeCard";
import { Navbar } from "@/components/Navbar";
import { TreePine } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface FamilySubTreeSectionProps {
  family: Tables<"families"> & { role: string };
}

function FamilySubTreeSection({ family }: FamilySubTreeSectionProps) {
  const { data: subTrees = [] } = useFamilySubTrees(family.id);
  const { data: persons = [] } = useFamilyPersons(family.id);
  const { data: relationships = [] } = useFamilyRelationships(family.id);
  const { data: members = [] } = useFamilyMembers(family.id);

  const adminNameFor = (userId: string | null) => {
    if (!userId) return null;
    const m = members.find(
      (mm: { user_id: string; profiles: { display_name: string | null } | null }) => mm.user_id === userId
    );
    return m?.profiles?.display_name ?? null;
  };

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{family.name}</h2>
        <span className="text-xs text-muted-foreground capitalize">{family.role}</span>
      </div>
      {subTrees.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6">
          <FamilyCard family={family} showRole />
          <p className="mt-3 text-xs text-muted-foreground">
            No sub-trees yet — open the tree and use "Sub-trees" to confirm suggested branches.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subTrees.map((s) => (
            <SubTreeCard
              key={s.id}
              subTree={s}
              familyName={family.name}
              persons={persons}
              relationships={relationships}
              adminName={adminNameFor(s.admin_user_id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { data: families, isLoading } = useMyFamilies();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My Family Trees</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Manage your families and their sub-trees
            </p>
          </div>
          <CreateFamilyDialog />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : families?.length ? (
          <div className="space-y-10">
            {families.map((f) => (
              <FamilySubTreeSection key={f.id} family={f} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TreePine className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="font-display text-xl font-semibold">No family trees yet</h2>
            <p className="mb-6 text-muted-foreground">Create your first family tree to get started</p>
            <CreateFamilyDialog />
          </div>
        )}
      </main>
    </div>
  );
}
