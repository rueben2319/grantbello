import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditPersonDialog } from "@/components/EditPersonDialog";
import { useDeletePerson } from "@/hooks/useFamily";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
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
  isAdmin?: boolean;
  existingPersons?: Tables<"persons">[];
  relationships?: Tables<"relationships">[];
  familyId?: string;
}

export function PersonProfileCard({ person, open, onClose, parents, children: kids, spouses, isAuthenticated, canEdit, isAdmin, existingPersons = [], relationships = [], familyId = "" }: PersonProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const deletePerson = useDeletePerson();

  if (!person) return null;

  const genderColor = person.gender === "male" ? "bg-tree-male" : person.gender === "female" ? "bg-tree-female" : "bg-tree-other";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">
                {person.first_name} {person.last_name}
              </DialogTitle>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {person.first_name} {person.last_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this person and all their relationships from the family tree. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              deletePerson.mutate(
                                { id: person.id, familyId },
                                {
                                  onSuccess: () => {
                                    toast.success(`${person.first_name} has been removed`);
                                    onClose();
                                  },
                                  onError: (err) => toast.error(err.message),
                                }
                              );
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
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
