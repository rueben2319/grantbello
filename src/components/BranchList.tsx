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

function PersonAvatar({ person, className = "" }: { person: Tables<"persons">; className?: string }) {
  const initials = `${person.first_name.charAt(0)}${(person.last_name || "").charAt(0)}`;
  const genderBg =
    person.gender === "male"
      ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
      : person.gender === "female"
        ? "bg-pink-500/20 text-pink-700 dark:text-pink-300"
        : "bg-teal-500/20 text-teal-700 dark:text-teal-300";

  return (
    <Avatar className={`h-9 w-9 border-2 border-background ${className}`}>
      {person.photo_url && <AvatarImage src={person.photo_url} alt={person.first_name} />}
      <AvatarFallback className={`text-xs font-bold ${genderBg}`}>{initials}</AvatarFallback>
    </Avatar>
  );
}

function BranchLabel({ branch }: { branch: Branch }) {
  const [p1, p2] = branch.persons;
  if (p2) {
    const sharedLast = p1.last_name && p1.last_name === p2.last_name ? ` ${p1.last_name}` : "";
    const label = sharedLast
      ? `${p1.first_name} & ${p2.first_name}${sharedLast}`
      : `${p1.first_name} ${p1.last_name || ""} & ${p2.first_name} ${p2.last_name || ""}`;
    return <span className="font-medium text-sm truncate">{label.trim()}</span>;
  }
  return (
    <span className="font-medium text-sm truncate">
      {p1.first_name} {p1.last_name || ""}
    </span>
  );
}

function GenerationLabel({ gen }: { gen: number }) {
  const labels: { [key: number]: string } = {
    1: "Gen 1",
    2: "Gen 2",
    3: "Gen 3",
    4: "Gen 4",
    5: "Gen 5",
  };
  return <span className="text-xs text-muted-foreground whitespace-nowrap">{labels[gen] || `Gen ${gen}`}</span>;
}

export function BranchList({ branches, onSelectBranch, onClose }: BranchListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="h-4 w-4 text-primary shrink-0" />
          <h2 className="font-display text-sm font-bold truncate">Family Branches</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
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
          <div className="p-3 space-y-2">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => onSelectBranch(branch)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent group"
              >
                {/* Avatars */}
                <div className="flex shrink-0 -space-x-2 pt-0.5">
                  <PersonAvatar person={branch.persons[0]} />
                  {branch.persons[1] && <PersonAvatar person={branch.persons[1]} />}
                </div>

                {/* Text - flex-1 for proper overflow handling */}
                <div className="min-w-0 flex-1">
                  <BranchLabel branch={branch} />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Baby className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {branch.childCount} {branch.childCount === 1 ? "child" : "children"}
                    </span>
                  </div>
                </div>

                {/* Generation Badge - right aligned, no shrink */}
                <div className="flex items-center justify-center h-7 px-2 rounded-md bg-primary/10 text-primary shrink-0">
                  <GenerationLabel gen={branch.generation} />
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
