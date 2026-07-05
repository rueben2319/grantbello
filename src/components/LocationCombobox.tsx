import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface LocationComboboxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface NominatimHit {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

function formatHit(h: NominatimHit): string {
  const a = h.address ?? {};
  const city = a.city || a.town || a.village || a.municipality || a.hamlet || a.county || "";
  const parts = [city, a.state, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : h.display_name;
}

export function LocationCombobox({ value, onChange, placeholder = "Start typing a city..." }: LocationComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, headers: { "Accept-Language": navigator.language || "en" } }
        );
        const data: NominatimHit[] = await res.json();
        const seen = new Set<string>();
        const formatted = data.map(formatHit).filter((s) => {
          if (!s || seen.has(s)) return false;
          seen.add(s);
          return true;
        });
        setResults(formatted);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-8"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search city, state, country..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Searching...
              </div>
            )}
            {!loading && results.length === 0 && query.trim().length >= 2 && (
              <CommandEmpty>No matches</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((r) => (
                <CommandItem
                  key={r}
                  value={r}
                  onSelect={() => {
                    onChange(r);
                    setQuery(r);
                    setOpen(false);
                  }}
                >
                  <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                  {r}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
