"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all";

type Ctx = { get: (k: string) => string; update: (changes: Record<string, string | null>) => void; pending: boolean };
const FiltersContext = createContext<Ctx | null>(null);

function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("FiltersBar missing");
  return ctx;
}

/** Pasek filtrów zapisujący stan w parametrach URL (linki można odświeżać i udostępniać). */
export function FiltersBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "" || v === ALL) next.delete(k);
      else next.set(k, v);
    }
    if (!("strona" in changes)) next.delete("strona");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const hasFilters = [...sp.keys()].some((k) => k !== "strona" && k !== "widok" && k !== "data");
  return (
    <FiltersContext.Provider value={{ get: (k) => sp.get(k) ?? "", update, pending }}>
      <div role="search" className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
        {children}
        <div className="flex items-center gap-2 sm:ml-auto">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Ładowanie" />}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            >
              <X data-icon="inline-start" />
              Wyczyść filtry
            </Button>
          )}
        </div>
      </div>
    </FiltersContext.Provider>
  );
}

export function SearchFilter({ name = "q", placeholder }: { name?: string; placeholder: string }) {
  const { get, update } = useFilters();
  const current = get(name);
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(current);
  useEffect(() => {
    if (current !== lastSent.current) {
      lastSent.current = current;
      setValue(current);
    }
  }, [current]);
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        className="bg-card pl-8"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            lastSent.current = v.trim();
            update({ [name]: v.trim() || null });
          }, 300);
        }}
      />
    </div>
  );
}

export function SelectFilter({
  name,
  label,
  options,
  allLabel,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  allLabel?: string;
  defaultValue?: string;
  className?: string;
}) {
  const { get, update } = useFilters();
  const value = get(name) || defaultValue || ALL;
  return (
    <Select value={value} onValueChange={(v) => update({ [name]: v === defaultValue ? null : v })}>
      <SelectTrigger aria-label={label} className={cn("w-full bg-card sm:w-auto sm:min-w-44", className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
