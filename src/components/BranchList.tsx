import type { Tables } from "@/integrations/supabase/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, GitBranch, Baby } from "lucide-react";

export interface Branch {
  id: string;
  persons: [Tables<"persons">, Tables<"persons">?];
  childCount: number;
  primaryPersonId: string;
  generation: number;
}

interface BranchListProps {
  branches: Branch[];
  onSelectBranch: (branch: Branch) => void;
  onClose: () => void;
}

function getGenderClasses(gender: string | null) {
  if (gender === "male") return "bg-tree-male/20 text-tree-male";
  if (gender === "female") return "bg-tree-female/20 text-tree-female";
  return "bg-tree-other/20 text-tree-other";
}

function PersonAvatar({ person, className = "" }: { person: Tables<"persons">; className?: string }) {
  const initials = `${person.first_name.charAt(0)}${(person.middle_name || "").charAt(0)}${(person.last_name || "").charAt(0)}`;
  const genderClasses = getGenderClasses(person.gender);

  return (
    <Avatar className={`h-9 w-9 border-2 border-background ${className}`}>
      {person.photo_url && <AvatarImage src={person.photo_url} alt={person.first_name} />}
      <AvatarFallback className={`text-xs font-bold ${genderClasses}`}>{initials}</AvatarFallback>
    </Avatar>
  );
}

function getInitials(person: Tables<"persons">) {
  const f = person.first_name?.charAt(0) || "";
  const m = (person.middle_name || "").charAt(0);
  return m ? `${f}.${m}.` : `${f}.`;
}

function BranchLabel({ branch }: { branch: Branch }) {
  const [p1, p2] = branch.persons;
  const i1 = getInitials(p1);
  if (p2) {
    const i2 = getInitials(p2);
    const sharedLast = p1.last_name && p1.last_name === p2.last_name;
    if (sharedLast) {
      return <span className="font-medium text-sm truncate">{i1} &amp; {i2} {p1.last_name}</span>;
    }
    return <span className="font-medium text-sm truncate">{i1} {p1.last_name || ""} &amp; {i2} {p2.last_name || ""}</span>;
  }
  return (
    <span className="font-medium text-sm truncate">
      {i1} {p1.last_name || ""}
    </span>
  );
}

const ORDINALS = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
function ordinal(n: number) {
  return ORDINALS[n] || `${n}th`;
}

export function BranchList({ branches, onSelectBranch, onClose }: BranchListProps) {
  // Group branches by generation
  const grouped = branches.reduce<Map<number, Branch[]>>((acc, b) => {
    if (!acc.has(b.generation)) acc.set(b.generation, []);
    acc.get(b.generation)!.push(b);
    return acc;
  }, new Map());
  const generations = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="h-4 w-4 text-primary shrink-0" />
          <h2 className="font-display text-sm font-bold truncate">Family Branches</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} aria-label="Close branches panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 overflow-hidden">
        {branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <GitBranch className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No family branches yet</p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {generations.map((gen) => {
              const items = grouped.get(gen)!;
              return (
                <section key={gen} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                      {gen}
                    </div>
                    <h3 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {ordinal(gen)} Generation
                    </h3>
                    <span className="text-[10px] text-muted-foreground/70">
                      · {items.length} {items.length === 1 ? "family" : "families"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => onSelectBranch(branch)}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent group border border-transparent hover:border-border"
                      >
                        <div className="flex shrink-0 -space-x-2 pt-0.5">
                          <PersonAvatar person={branch.persons[0]} />
                          {branch.persons[1] && <PersonAvatar person={branch.persons[1]} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <BranchLabel branch={branch} />
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Baby className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {branch.childCount} {branch.childCount === 1 ? "child" : "children"}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
