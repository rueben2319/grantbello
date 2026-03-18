import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditPersonDialog } from "@/components/EditPersonDialog";
import { useDeletePerson } from "@/hooks/useFamily";
import { Pencil, Trash2, Users, Heart, Baby, Calendar, ChevronRight, ArrowLeftRight, UserRound } from "lucide-react";
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
  siblings?: Tables<"persons">[];
  isAuthenticated: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
  existingPersons?: Tables<"persons">[];
  relationships?: Tables<"relationships">[];
  familyId?: string;
  onNavigateToPerson?: (person: Tables<"persons">) => void;
}

function getGenderClasses(gender: string | null) {
  if (gender === "male") return "bg-tree-male/20 text-tree-male";
  if (gender === "female") return "bg-tree-female/20 text-tree-female";
  return "bg-tree-other/20 text-tree-other";
}

function getGenderFallbackBg(gender: string | null) {
  if (gender === "male") return "bg-tree-male";
  if (gender === "female") return "bg-tree-female";
  return "bg-tree-other";
}

function getGradientClass(gender: string | null) {
  if (gender === "male") return "bg-gradient-to-br from-tree-male to-tree-male/70";
  if (gender === "female") return "bg-gradient-to-br from-tree-female to-tree-female/70";
  return "bg-gradient-to-br from-tree-other to-tree-other/70";
}

function formatFullName(person: Tables<"persons">) {
  const parts = [person.first_name];
  if (person.middle_name) parts.push(person.middle_name);
  if (person.last_name) parts.push(person.last_name);
  return parts.join(" ");
}

function RelationshipChip({ person, onClick }: { person: Tables<"persons">; onClick?: () => void }) {
  const genderClasses = getGenderClasses(person.gender);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent group"
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={person.photo_url || ""} />
        <AvatarFallback className={`${genderClasses} text-xs font-bold`}>
          {person.first_name.charAt(0)}{(person.last_name || "").charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium flex-1 truncate">{formatFullName(person)}</span>
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

export function PersonProfileCard({ person, open, onClose, parents, children: kids, spouses, siblings = [], isAuthenticated, canEdit, isAdmin, existingPersons = [], relationships = [], familyId = "", onNavigateToPerson }: PersonProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const deletePerson = useDeletePerson();

  if (!person) return null;

  const gradientClass = getGradientClass(person.gender);
  const genderFallbackBg = getGenderFallbackBg(person.gender);
  const hasRelationships = parents.length > 0 || spouses.length > 0 || kids.length > 0 || siblings.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl">
          {/* Hero Banner */}
          <div className={`relative ${gradientClass} h-28 rounded-t-xl`}>
            {canEdit && (
              <div className="absolute top-3 right-10 flex items-center gap-1 z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20">
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

          {/* Avatar overlapping banner */}
          <div className="flex justify-center -mt-12 relative z-10">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={person.photo_url || ""} />
              <AvatarFallback className={`${genderFallbackBg} text-xl font-bold text-white`}>
                {person.first_name.charAt(0)}{person.last_name?.charAt(0) || ""}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name & metadata */}
          <div className="text-center px-6 pt-3 pb-1">
            <h2 className="font-display text-xl font-bold tracking-tight">
              {formatFullName(person)}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="capitalize text-xs">{person.gender}</Badge>
              {isAuthenticated && person.birth_date && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(person.birth_date), "MMM d, yyyy")}
                </Badge>
              )}
              {isAuthenticated && person.death_date && (
                <Badge variant="secondary" className="text-xs gap-1 bg-muted/80">
                  † {format(new Date(person.death_date), "MMM d, yyyy")}
                </Badge>
              )}
            </div>
          </div>

          {/* Bio */}
          {isAuthenticated && person.bio && (
            <div className="px-6 pt-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm italic text-muted-foreground leading-relaxed">"{person.bio}"</p>
              </div>
            </div>
          )}

          {/* Relationships */}
          {hasRelationships && (
            <div className="px-6 pt-4 pb-2">
              <Separator className="mb-4" />

              {parents.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parents</span>
                  </div>
                  {parents.map((p) => (
                    <RelationshipChip key={p.id} person={p} onClick={onNavigateToPerson ? () => onNavigateToPerson(p) : undefined} />
                  ))}
                </div>
              )}

              {spouses.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spouse(s)</span>
                  </div>
                  {spouses.map((s) => (
                    <RelationshipChip key={s.id} person={s} onClick={onNavigateToPerson ? () => onNavigateToPerson(s) : undefined} />
                  ))}
                </div>
              )}

              {siblings.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Siblings</span>
                  </div>
                  {siblings.map((s) => (
                    <RelationshipChip key={s.id} person={s} onClick={onNavigateToPerson ? () => onNavigateToPerson(s) : undefined} />
                  ))}
                </div>
              )}

              {kids.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <Baby className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Children</span>
                  </div>
                  {kids.map((c) => (
                    <RelationshipChip key={c.id} person={c} onClick={onNavigateToPerson ? () => onNavigateToPerson(c) : undefined} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-4 pt-1">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {person.married_in && (
                <div className="flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>Married into family</span>
                </div>
              )}
              <span className="ml-auto">Updated {format(new Date(person.updated_at), "MMM d, yyyy")}</span>
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
