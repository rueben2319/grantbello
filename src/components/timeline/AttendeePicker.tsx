import { useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendeePickerProps {
  persons: Tables<"persons">[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AttendeePicker({ persons, selectedIds, onChange }: AttendeePickerProps) {
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => persons.filter((p) => selectedIds.includes(p.id)),
    [persons, selectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons.slice(0, 30);
    return persons.filter((p) =>
      `${p.first_name} ${p.last_name ?? ""}`.toLowerCase().includes(q)
    );
  }, [persons, query]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {p.first_name} {p.last_name ?? ""}
              <button type="button" onClick={() => toggle(p.id)} aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search family members..."
          className="pl-8"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {filtered.length === 0 && (
          <p className="p-3 text-center text-sm text-muted-foreground">No matches</p>
        )}
        {filtered.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/40 transition-colors",
                isSelected && "bg-accent/30"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {p.first_name.charAt(0)}{(p.last_name || "").charAt(0)}
                </span>
                {p.first_name} {p.last_name ?? ""}
              </span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
