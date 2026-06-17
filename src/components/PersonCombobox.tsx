import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PersonComboboxProps {
  persons: Tables<"persons">[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

function fullName(p: Tables<"persons">) {
  return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ");
}

function initials(p: Tables<"persons">) {
  return `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase();
}

function PersonRow({ p }: { p: Tables<"persons"> }) {
  const dates = [p.birth_date, p.death_date].filter(Boolean).join(" – ");
  return (
    <div className="flex items-center gap-2 min-w-0">
      {p.photo_url ? (
        <img src={p.photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
          {initials(p)}
        </span>
      )}
      <div className="flex flex-col min-w-0">
        <span className="truncate text-sm">{fullName(p)}</span>
        {dates && <span className="truncate text-[10px] text-muted-foreground">{dates}</span>}
      </div>
    </div>
  );
}

export function PersonCombobox({ persons, value, onChange, placeholder = "Select person" }: PersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => persons.find((p) => p.id === value), [persons, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-1.5 px-2 font-normal"
        >
          {selected ? (
            <PersonRow p={selected} />
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name..." />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            <CommandGroup>
              {persons.map((p) => {
                const searchable = `${fullName(p)} ${p.birth_date ?? ""} ${p.death_date ?? ""}`;
                return (
                  <CommandItem
                    key={p.id}
                    value={searchable}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <PersonRow p={p} />
                    <Check className={cn("h-4 w-4 shrink-0", value === p.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
