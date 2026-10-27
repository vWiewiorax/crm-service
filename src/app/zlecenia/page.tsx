import { ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClientLink } from "@/components/shared/client-link";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/shared/filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, today } from "@/lib/dates";
import { clientDisplayName } from "@/lib/client-name";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clientOptions } from "@/server/clients";
import { listOrders, ORDER_DUE_FILTERS, ORDER_SORTS, ORDERS_PAGE_SIZE } from "@/server/orders";

export const metadata: Metadata = { title: "Zlecenia" };

type SP = { q?: string; status?: string; klient?: string; termin?: string; sort?: string; strona?: string };

const STATUS_OPTIONS = [
  { value: "aktywne", label: "Aktywne (w toku)" },
  { value: "otwarte", label: "Otwarte (bez zakończonych i anulowanych)" },
  ...ORDER_STATUS.list,
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [result, clients] = await Promise.all([
    listOrders({ q: sp.q, status: sp.status, clientId: sp.klient, due: sp.termin, sort: sp.sort, page: Number(sp.strona) || 1 }),
    clientOptions(),
  ]);
  const now = today();
  const filtered = Boolean(sp.q || sp.status || sp.klient || sp.termin);
  const isOverdue = (o: (typeof result.orders)[number]) =>
    o.dueDate && o.dueDate < now && !["COMPLETED", "CANCELLED"].includes(o.status);

  return (
    <>
      <PageHeader
        title="Zlecenia"
        description="Wszystkie zlecenia z terminami, statusem i płatnościami."
        actions={
          <Button asChild>
            <Link href="/zlecenia/nowe">
              <Plus data-icon="inline-start" />
              Nowe zlecenie
            </Link>
          </Button>
        }
      />
      <FiltersBar className="mb-4">
        <SearchFilter placeholder="Szukaj: numer, tytuł, klient" />
        <SelectFilter name="status" label="Status" allLabel="Wszystkie statusy" options={STATUS_OPTIONS} />
        <SelectFilter name="klient" label="Klient" allLabel="Wszyscy klienci" options={clients.map((c) => ({ value: c.id, label: c.label }))} />
        <SelectFilter name="termin" label="Termin" allLabel="Dowolny termin" options={ORDER_DUE_FILTERS} />
        <SelectFilter name="sort" label="Sortowanie" options={ORDER_SORTS} defaultValue="created_desc" />
      </FiltersBar>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {result.orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={filtered ? "Brak zleceń spełniających kryteria" : "Nie masz jeszcze zleceń"}
            description={filtered ? "Zmień lub wyczyść filtry." : "Utwórz pierwsze zlecenie lub przekształć zaakceptowaną wycenę."}
            action={
              !filtered && (
                <Button asChild size="sm">
                  <Link href="/zlecenia/nowe">Nowe zlecenie</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Numer</TableHead>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Utworzono</TableHead>
                    <TableHead>Termin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="pr-5">Płatność</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="pl-5 font-mono text-xs">
                        <Link href={`/zlecenia/${o.id}`} className="hover:text-primary hover:underline">
                          {o.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-60">
                        <Link href={`/zlecenia/${o.id}`} className="block truncate font-medium hover:text-primary">
                          {o.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{o.category}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-44">
                          <ClientLink client={o.client} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdDate)}</TableCell>
                      <TableCell className={cn("text-sm", isOverdue(o) && "font-medium text-red-700")}>
                        {o.dueDate ? formatDate(o.dueDate) : <span className="text-muted-foreground">brak</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge defs={ORDER_STATUS} value={o.status} />
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">{formatMoney(o.netAmount)}</TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge defs={PAYMENT_STATUS} value={o.paymentStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y xl:hidden">
              {result.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/zlecenia/${o.id}`} className="block px-4 py-3 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{o.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.number} · {clientDisplayName(o.client)}
                        </p>
                      </div>
                      <p className="tabular shrink-0 text-sm font-medium">{formatMoney(o.netAmount)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <StatusBadge defs={ORDER_STATUS} value={o.status} />
                      <StatusBadge defs={PAYMENT_STATUS} value={o.paymentStatus} />
                      <span className={cn("text-muted-foreground", isOverdue(o) && "font-medium text-red-700")}>
                        {o.dueDate ? `termin ${formatDate(o.dueDate)}` : "bez terminu"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={ORDERS_PAGE_SIZE}
          basePath="/zlecenia"
          params={{ q: sp.q, status: sp.status, klient: sp.klient, termin: sp.termin, sort: sp.sort }}
        />
      </div>
    </>
  );
}
