import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniTreePreview } from "@/components/MiniTreePreview";
import { getSubTreeMembers, type SubTree } from "@/hooks/useSubTrees";
import { UserCog, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface SubTreeCardProps {
  subTree: SubTree;
  familyName: string;
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
  adminName?: string | null;
}

export function SubTreeCard({ subTree, familyName, persons, relationships, adminName }: SubTreeCardProps) {
  const a = persons.find((p) => p.id === subTree.root_person_a_id);
  const b = subTree.root_person_b_id ? persons.find((p) => p.id === subTree.root_person_b_id) : null;

  const { members } = getSubTreeMembers(persons, relationships, subTree.root_person_a_id, subTree.root_person_b_id);
  const descendantCount = Math.max(0, members.length - (b ? 2 : 1));

  const title =
    subTree.label ??
    (b
      ? `${a?.first_name ?? "?"} & ${b.first_name} ${b.last_name ?? ""}`.trim()
      : `${a?.first_name ?? "?"} ${a?.last_name ?? ""}`.trim());

  return (
    <Link to={`/family/${subTree.family_id}?focus=${encodeURIComponent(subTree.root_person_a_id)}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
        <div className="h-32 bg-muted/30 border-b">
          {a ? (
            <MiniTreePreview
              persons={persons}
              relationships={relationships}
              rootAId={subTree.root_person_a_id}
              rootBId={subTree.root_person_b_id}
              height={128}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Root missing</div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground truncate">{familyName}</p>
          <h3 className="font-display font-semibold group-hover:text-primary transition-colors truncate">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Users className="h-3 w-3" /> {descendantCount} descendant{descendantCount === 1 ? "" : "s"}
            </Badge>
            {adminName ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <UserCog className="h-3 w-3" /> {adminName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">No sub-admin</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
