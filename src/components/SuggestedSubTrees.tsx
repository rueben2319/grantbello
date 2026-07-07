import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitFork, Check, Trash2, UserCog } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  suggestSubTreeRoots,
  useCreateSubTree,
  useDeleteSubTree,
  useFamilySubTrees,
} from "@/hooks/useSubTrees";
import { AssignSubAdminDialog } from "@/components/AssignSubAdminDialog";
import type { Tables } from "@/integrations/supabase/types";

interface SuggestedSubTreesProps {
  familyId: string;
  persons: Tables<"persons">[];
  relationships: Tables<"relationships">[];
}

export function SuggestedSubTrees({ familyId, persons, relationships }: SuggestedSubTreesProps) {
  const [open, setOpen] = useState(false);
  const { data: subTrees = [] } = useFamilySubTrees(familyId);
  const createSubTree = useCreateSubTree();
  const deleteSubTree = useDeleteSubTree();

  const suggestions = useMemo(
    () => suggestSubTreeRoots(persons, relationships, subTrees),
    [persons, relationships, subTrees]
  );

  const nameOf = (p?: Tables<"persons">) =>
    p ? `${p.first_name} ${p.last_name ?? ""}`.trim() : "?";

  const confirm = async (s: { rootA: Tables<"persons">; rootB?: Tables<"persons">; childCount: number }) => {
    try {
      await createSubTree.mutateAsync({
        family_id: familyId,
        root_person_a_id: s.rootA.id,
        root_person_b_id: s.rootB?.id ?? null,
        label: null,
        admin_user_id: null,
      });
      toast.success("Sub-tree confirmed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSubTree.mutateAsync({ id, familyId });
      toast.success("Sub-tree removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Sub-trees" aria-label="Manage sub-trees">
          <GitFork className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Sub-Trees</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Confirmed sub-trees ({subTrees.length})</h3>
            {subTrees.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet. Confirm a suggestion below.</p>
            ) : (
              <div className="space-y-2">
                {subTrees.map((s) => {
                  const a = persons.find((p) => p.id === s.root_person_a_id);
                  const b = s.root_person_b_id ? persons.find((p) => p.id === s.root_person_b_id) : null;
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {nameOf(a)}{b ? ` & ${nameOf(b)}` : ""}
                        </p>
                        {s.admin_user_id ? (
                          <Badge variant="secondary" className="mt-1 text-xs gap-1">
                            <UserCog className="h-3 w-3" /> Has sub-admin
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No sub-admin assigned</span>
                        )}
                      </div>
                      <AssignSubAdminDialog subTree={s} familyId={familyId} />
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)} title="Remove sub-tree">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Suggested ({suggestions.length})</h3>
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Every candidate is already confirmed.</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {nameOf(s.rootA)}{s.rootB ? ` & ${nameOf(s.rootB)}` : ""}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {s.childCount} child{s.childCount === 1 ? "" : "ren"}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => confirm(s)} className="gap-1">
                      <Check className="h-3 w-3" /> Confirm
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
