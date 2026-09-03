"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { fetchSchemeList, type SchemeListItem } from "@/lib/data/mfapi";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 50;

export function FundSearch({
  selected,
  onSelect,
}: {
  selected: SchemeListItem | null;
  onSelect: (scheme: SchemeListItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [schemes, setSchemes] = React.useState<SchemeListItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function ensureLoaded() {
    if (schemes || loading) return;
    setLoading(true);
    setError(null);
    fetchSchemeList()
      .then((list) => setSchemes(list))
      .catch(() => setError("Couldn't reach the fund database. Check your connection and try again."))
      .finally(() => setLoading(false));
  }

  const results = React.useMemo(() => {
    if (!schemes || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const matches: SchemeListItem[] = [];
    for (const s of schemes) {
      if (s.schemeName.toLowerCase().includes(q)) {
        matches.push(s);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [schemes, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) ensureLoaded();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto w-full justify-between gap-2 px-3 py-2.5 font-normal"
        >
          <span className="flex min-w-0 items-center gap-2 text-left">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.schemeName : "Search for a mutual fund"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="e.g. Parag Parikh Flexi Cap" value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading the fund list…
              </div>
            )}
            {error && <div className="px-3 py-4 text-sm text-destructive">{error}</div>}
            {!loading && !error && query.trim().length < 2 && (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            )}
            {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No matching funds.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((s) => (
                  <CommandItem
                    key={s.schemeCode}
                    value={String(s.schemeCode)}
                    onSelect={() => {
                      onSelect(s);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        selected?.schemeCode === s.schemeCode ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{s.schemeName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
