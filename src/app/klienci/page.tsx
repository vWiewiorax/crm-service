import { Building2, Plus, User, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/shared/filters";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENT_TYPE } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { CLIENT_SORTS, listClients } from "@/server/clients";

export const metadata: Metadata = { title: "Klienci" };

type SP = { q?: string; typ?: string; sort?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const clients = await listClients({ q: sp.q, type: sp.typ, sort: sp.sort });
  const filtered = Boolean(sp.q || sp.typ);

  return (
    <>
      <PageHeader
        title="Klienci"
        description="Baza klientów z historią współpracy i wartością zleceń."
        actions={
          <Button asChild>
            <Link href="/klienci/nowy">
              <Plus data-icon="inline-start" />
              Dodaj klienta
            </Link>
          </Button>
        }
      />
      <FiltersBar className="mb-4">
        <SearchFilter placeholder="Szukaj: nazwa, e-mail, telefon, NIP" />
        <SelectFilter name="typ" label="Typ klienta" allLabel="Wszyscy klienci" options={CLIENT_TYPE.list} />
        <SelectFilter name="sort" label="Sortowanie" options={CLIENT_SORTS} defaultValue="name" />
      </FiltersBar>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? "Brak klientów spełniających kryteria" : "Nie masz jeszcze klientów"}
            description={filtered ? "Zmień lub wyczyść filtry." : "Dodaj pierwszego klienta, aby tworzyć dla niego zlecenia i wyceny."}
            action={
              !filtered && (
                <Button asChild size="sm">
                  <Link href="/klienci/nowy">Dodaj klienta</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Klient</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead className="text-right">Zlecenia</TableHead>
                    <TableHead className="text-right">Wartość zleceń</TableHead>
                    <TableHead className="pr-5">Dodano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id} className="relative">
                      <TableCell className="max-w-72 pl-5">
                        <Link href={`/klienci/${c.id}`} className="font-medium after:absolute after:inset-0 hover:text-primary">
                          {c.displayName}
                        </Link>
                        {c.type === "COMPANY" && <p className="truncate text-xs text-muted-foreground">{c.name}</p>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge defs={CLIENT_TYPE} value={c.type} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="truncate">{c.email ?? <span className="text-muted-foreground">-</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                      </TableCell>
                      <TableCell className="tabular text-right">{c.ordersCount}</TableCell>
                      <TableCell className="tabular text-right font-medium">{formatMoney(c.ordersValue)}</TableCell>
                      <TableCell className="pr-5 text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {clients.map((c) => {
                const Icon = c.type === "COMPANY" ? Building2 : User;
                return (
                  <li key={c.id}>
                    <Link href={`/klienci/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.phone ?? c.email ?? "Brak danych kontaktowych"}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="tabular font-medium">{formatMoney(c.ordersValue)}</p>
                        <p className="text-muted-foreground">{c.ordersCount} zl.</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              {clients.length} {clients.length === 1 ? "klient" : "klientów"}. Wartość zleceń = suma netto zleceń bez anulowanych.
            </p>
          </>
        )}
      </div>
    </>
  );
}
