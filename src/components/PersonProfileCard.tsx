import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPersonDialog } from "@/components/EditPersonDialog";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface PersonProfileCardProps {
  person: Tables<"persons"> | null;
  open: boolean;
  onClose: () => void;
  parents: Tables<"persons">[];
  children: Tables<"persons">[];
  spouses: Tables<"persons">[];
  isAuthenticated: boolean;
  canEdit?: boolean;
  existingPersons?: Tables<"persons">[];
  relationships?: Tables<"relationships">[];
  familyId?: string;
}

export function PersonProfileCard({ person, open, onClose, parents, children: kids, spouses, isAuthenticated, canEdit, existingPersons = [], relationships = [], familyId = "" }: PersonProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  if (!person) return null;

  const genderColor = person.gender === "male" ? "bg-tree-male" : person.gender === "female" ? "bg-tree-female" : "bg-tree-other";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">
                {person.first_name} {person.last_name}
              </DialogTitle>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={person.photo_url || ""} />
                <AvatarFallback className={`${genderColor} text-lg font-bold text-primary-foreground`}>
                  {person.first_name.charAt(0)}{person.last_name?.charAt(0) || ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <Badge variant="outline" className="capitalize mb-2">{person.gender}</Badge>
                {isAuthenticated && person.birth_date && (
                  <p className="text-sm text-muted-foreground">
                    Born: {format(new Date(person.birth_date), "MMM d, yyyy")}
                  </p>
                )}
                {isAuthenticated && person.death_date && (
                  <p className="text-sm text-muted-foreground">
                    Died: {format(new Date(person.death_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>

            {isAuthenticated && person.bio && (
              <div>
                <h4 className="mb-1 font-display font-semibold text-sm">Bio</h4>
                <p className="text-sm text-muted-foreground">{person.bio}</p>
              </div>
            )}

            <div className="space-y-2">
              {parents.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold text-sm">Parents</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parents.map((p) => (
                      <Badge key={p.id} variant="secondary">{p.first_name} {p.last_name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {spouses.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold text-sm">Spouse(s)</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {spouses.map((s) => (
                      <Badge key={s.id} variant="secondary">{s.first_name} {s.last_name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {kids.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold text-sm">Children</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {kids.map((c) => (
                      <Badge key={c.id} variant="secondary">{c.first_name} {c.last_name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <EditPersonDialog
          person={person}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          existingPersons={existingPersons}
          relationships={relationships}
          familyId={familyId}
        />
      )}
    </>
  );
}
