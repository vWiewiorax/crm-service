import { Plus, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/shared/filters";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KSEF_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { clientOptions } from "@/server/clients";
import { INVOICE_SORTS, listInvoices } from "@/server/invoices";

export const metadata: Metadata = { title: "Faktury" };

type SP = { q?: string; ksef?: string; klient?: string; sort?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [invoices, clients] = await Promise.all([
    listInvoices({ q: sp.q, ksef: sp.ksef, clientId: sp.klient, sort: sp.sort }),
    clientOptions(),
  ]);
  const filtered = Boolean(sp.q || sp.ksef || sp.klient);
  const sum = invoices.reduce((s, i) => s + i.grossTotal, 0);

  return (
    <>
      <PageHeader
        title="Faktury"
        description="Faktury VAT z plikiem FA(3) i wysyłką do testowego KSeF."
        actions={
          <Button asChild>
            <Link href="/faktury/nowa">
              <Plus data-icon="inline-start" />
              Nowa faktura
            </Link>
          </Button>
        }
      />
      <FiltersBar className="mb-4">
        <SearchFilter placeholder="Szukaj: numer, nabywca, numer KSeF" />
        <SelectFilter name="ksef" label="Status KSeF" allLabel="Wszystkie statusy" options={KSEF_STATUS.list} />
        <SelectFilter name="klient" label="Nabywca" allLabel="Wszyscy nabywcy" options={clients.map((c) => ({ value: c.id, label: c.label }))} />
        <SelectFilter name="sort" label="Sortowanie" options={INVOICE_SORTS} defaultValue="date_desc" />
      </FiltersBar>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filtered ? "Brak faktur spełniających kryteria" : "Nie masz jeszcze faktur"}
            description={filtered ? "Zmień lub wyczyść filtry." : "Wystaw fakturę ręcznie albo ze strony zlecenia."}
            action={
              !filtered && (
                <Button asChild size="sm">
                  <Link href="/faktury/nowa">Nowa faktura</Link>
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
                    <TableHead>Nabywca</TableHead>
                    <TableHead>Wystawiono</TableHead>
                    <TableHead>Termin płatności</TableHead>
                    <TableHead>KSeF</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="pr-5 text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-5 font-mono text-xs">
                        <Link href={`/faktury/${i.id}`} className="hover:text-primary hover:underline">
                          {i.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-60">
                        <Link href={`/faktury/${i.id}`} className="block truncate font-medium hover:text-primary">
                          {i.buyerName}
                        </Link>
                        {i.order && <p className="text-xs text-muted-foreground">Zlecenie {i.order.number}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.issueDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(i.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge defs={KSEF_STATUS} value={i.ksefStatus} />
                      </TableCell>
                      <TableCell className="tabular text-right">{formatMoney(i.netTotal)}</TableCell>
                      <TableCell className="tabular pr-5 text-right font-medium">{formatMoney(i.grossTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y lg:hidden">
              {invoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/faktury/${i.id}`} className="block px-4 py-3 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.buyerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {i.number} · {formatDate(i.issueDate)}
                        </p>
                      </div>
                      <p className="tabular shrink-0 text-sm font-medium">{formatMoney(i.grossTotal)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge defs={KSEF_STATUS} value={i.ksefStatus} />
                      termin {formatDate(i.dueDate)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              {invoices.length} faktur, łącznie {formatMoney(sum)} brutto.
            </p>
          </>
        )}
      </div>
    </>
  );
}
