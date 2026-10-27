import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClientLink } from "@/components/shared/client-link";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/shared/filters";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientDisplayName } from "@/lib/client-name";
import { QUOTE_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { clientOptions } from "@/server/clients";
import { listQuotes, QUOTE_SORTS } from "@/server/quotes";

export const metadata: Metadata = { title: "Wyceny" };

type SP = { q?: string; status?: string; klient?: string; sort?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [quotes, clients] = await Promise.all([
    listQuotes({ q: sp.q, status: sp.status, clientId: sp.klient, sort: sp.sort }),
    clientOptions(),
  ]);
  const filtered = Boolean(sp.q || sp.status || sp.klient);
  const sum = quotes.reduce((s, q) => s + q.netTotal, 0);

  return (
    <>
      <PageHeader
        title="Wyceny"
        description="Oferty dla klientów z pozycjami, podglądem i PDF."
        actions={
          <Button asChild>
            <Link href="/wyceny/nowa">
              <Plus data-icon="inline-start" />
              Nowa wycena
            </Link>
          </Button>
        }
      />
      <FiltersBar className="mb-4">
        <SearchFilter placeholder="Szukaj: numer, tytuł, klient" />
        <SelectFilter name="status" label="Status" allLabel="Wszystkie statusy" options={QUOTE_STATUS.list} />
        <SelectFilter name="klient" label="Klient" allLabel="Wszyscy klienci" options={clients.map((c) => ({ value: c.id, label: c.label }))} />
        <SelectFilter name="sort" label="Sortowanie" options={QUOTE_SORTS} defaultValue="date_desc" />
      </FiltersBar>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={filtered ? "Brak wycen spełniających kryteria" : "Nie masz jeszcze wycen"}
            description={filtered ? "Zmień lub wyczyść filtry." : "Przygotuj pierwszą wycenę dla klienta."}
            action={
              !filtered && (
                <Button asChild size="sm">
                  <Link href="/wyceny/nowa">Nowa wycena</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Numer</TableHead>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Wystawiono</TableHead>
                    <TableHead>Ważna do</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="pr-5 text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="pl-5 font-mono text-xs">
                        <Link href={`/wyceny/${q.id}`} className="hover:text-primary hover:underline">
                          {q.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-60">
                        <Link href={`/wyceny/${q.id}`} className="block truncate font-medium hover:text-primary">
                          {q.title}
                        </Link>
                        {q.order && <p className="text-xs text-muted-foreground">Zlecenie {q.order.number}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-44">
                          <ClientLink client={q.client} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(q.issueDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(q.validUntil)}</TableCell>
                      <TableCell>
                        <StatusBadge defs={QUOTE_STATUS} value={q.status} />
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">{formatMoney(q.netTotal)}</TableCell>
                      <TableCell className="tabular pr-5 text-right text-muted-foreground">{formatMoney(q.grossTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y lg:hidden">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/wyceny/${q.id}`} className="block px-4 py-3 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{q.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {q.number} · {clientDisplayName(q.client)}
                        </p>
                      </div>
                      <p className="tabular shrink-0 text-sm font-medium">{formatMoney(q.netTotal)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge defs={QUOTE_STATUS} value={q.status} />
                      ważna do {formatDate(q.validUntil)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              {quotes.length} wycen, łącznie {formatMoney(sum)} netto.
            </p>
          </>
        )}
      </div>
    </>
  );
}
