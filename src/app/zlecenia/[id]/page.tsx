import { CalendarDays, FileText, History, ListChecks, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOrderAction } from "@/actions/orders";
import { OrderStatusDialog } from "@/components/orders/status-dialog";
import { ClientLink } from "@/components/shared/client-link";
import { DeleteButton } from "@/components/shared/confirm-action";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DetailList, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE, ORDER_STATUS, PAYMENT_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime, today } from "@/lib/dates";
import { formatMoney, formatNumber, formatVat } from "@/lib/format";
import { lineNet, totalsFromNet } from "@/lib/money";
import { formatNip } from "@/lib/nip";
import { cn } from "@/lib/utils";
import { getOrder } from "@/server/orders";

export async function generateMetadata({ params }: PageProps<"/zlecenia/[id]">): Promise<Metadata> {
  const o = await getOrder((await params).id);
  return { title: o ? `${o.number} ${o.title}` : "Zlecenie" };
}

export default async function OrderPage({ params }: PageProps<"/zlecenia/[id]">) {
  const { id } = await params;
  const o = await getOrder(id);
  if (!o) notFound();
  const totals = totalsFromNet(o.netAmount, o.vatRate);
  const now = today();
  const overdue = o.dueDate && o.dueDate < now && !["COMPLETED", "CANCELLED"].includes(o.status);
  const statusLabel = (s: string | null) => (s ? (ORDER_STATUS.map[s as keyof typeof ORDER_STATUS.map]?.label ?? s) : "");

  return (
    <>
      <PageHeader
        back={{ href: "/zlecenia", label: "Zlecenia" }}
        title={o.title}
        meta={<StatusBadge defs={ORDER_STATUS} value={o.status} />}
        description={
          <>
            <span className="font-mono">{o.number}</span> · {o.category}
          </>
        }
        actions={
          <>
            <OrderStatusDialog orderId={o.id} current={o.status} />
            <Button asChild size="sm">
              <Link href={`/zlecenia/${o.id}/edytuj`}>
                <Pencil data-icon="inline-start" />
                Edytuj
              </Link>
            </Button>
            <DeleteButton
              id={o.id}
              action={deleteOrderAction}
              title={`Usunąć zlecenie ${o.number}?`}
              description="Zlecenie, jego pozycje i historia statusów zostaną trwale usunięte. Powiązane zadania pozostaną bez przypisanego zlecenia. Tej operacji nie można cofnąć."
              redirectTo="/zlecenia"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Opis usługi">
            {o.description ? <p className="text-sm whitespace-pre-line">{o.description}</p> : <p className="text-sm text-muted-foreground">Brak opisu.</p>}
            {o.items.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pozycja</th>
                      <th className="px-3 py-2 text-right font-medium">Ilość</th>
                      <th className="px-3 py-2 text-right font-medium">Cena netto</th>
                      <th className="px-3 py-2 text-right font-medium">VAT</th>
                      <th className="px-3 py-2 text-right font-medium">Wartość netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {o.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="tabular px-3 py-2 text-right">
                          {formatNumber(it.quantity)} {it.unit}
                        </td>
                        <td className="tabular px-3 py-2 text-right">{formatMoney(it.unitPriceNet)}</td>
                        <td className="px-3 py-2 text-right">{formatVat(it.vatRate)}</td>
                        <td className="tabular px-3 py-2 text-right font-medium">{formatMoney(lineNet(it))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {o.quote && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                Utworzone z wyceny
                <Link href={`/wyceny/${o.quote.id}`} className="font-medium text-primary hover:underline">
                  {o.quote.number}
                </Link>
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Powiązane zadania"
            bodyClassName="p-0"
            action={
              <Link href={`/zadania?nowe=1&zlecenie=${o.id}`} className="text-xs font-medium text-primary hover:underline">
                Dodaj zadanie
              </Link>
            }
          >
            {o.tasks.length === 0 ? (
              <EmptyState compact icon={ListChecks} title="Brak zadań" description="Dodaj zadanie, np. zakup materiałów lub telefon do klienta." />
            ) : (
              <ul className="divide-y">
                {o.tasks.map((t) => {
                  const late = t.dueDate && t.dueDate < now && t.status !== "DONE";
                  return (
                    <li key={t.id}>
                      <Link href={`/zadania?zadanie=${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</p>
                          <p className={cn("text-xs text-muted-foreground", late && "font-medium text-red-700")}>
                            {t.dueDate ? `Termin ${formatDate(t.dueDate)}${late ? " (zaległe)" : ""}` : "Bez terminu"}
                          </p>
                        </div>
                        <StatusBadge defs={TASK_PRIORITY} value={t.priority} className="hidden sm:inline-flex" />
                        <StatusBadge defs={TASK_STATUS} value={t.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {o.events.length > 0 && (
            <SectionCard title="Wizyty i przypomnienia" bodyClassName="p-0">
              <ul className="divide-y">
                {o.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(e.date)}
                        {e.startTime && `, ${e.startTime}${e.endTime ? `-${e.endTime}` : ""}`}
                      </p>
                    </div>
                    <StatusBadge defs={EVENT_TYPE} value={e.type} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Historia zmian statusu" bodyClassName="px-5 py-4">
            <ol>
              {o.statusHistory.map((h) => (
                <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      {h.fromStatus ? (
                        <>
                          {statusLabel(h.fromStatus)} <span className="text-muted-foreground">→</span>{" "}
                          <strong className="font-medium">{statusLabel(h.toStatus)}</strong>
                        </>
                      ) : (
                        <>
                          Utworzono ze statusem <strong className="font-medium">{statusLabel(h.toStatus)}</strong>
                        </>
                      )}
                    </p>
                    {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.changedAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Kwota">
            <DetailList
              items={[
                { label: "Netto", value: <span className="tabular font-medium">{formatMoney(o.netAmount)}</span> },
                { label: `VAT (${formatVat(o.vatRate)})`, value: <span className="tabular">{formatMoney(totals.vat)}</span> },
                { label: "Brutto", value: <span className="tabular font-semibold">{formatMoney(totals.gross)}</span> },
                { label: "Płatność", value: <StatusBadge defs={PAYMENT_STATUS} value={o.paymentStatus} /> },
                { label: "Wpłacono", value: <span className="tabular">{formatMoney(o.paidAmount)}</span> },
                ...(o.paidAt ? [{ label: "Data wpłaty", value: formatDate(o.paidAt) }] : []),
                ...(o.paymentStatus !== "PAID" ? [{ label: "Pozostało", value: <span className="tabular">{formatMoney(Math.max(0, totals.gross - o.paidAmount))}</span> }] : []),
              ]}
            />
          </SectionCard>
          <SectionCard title="Terminy">
            <DetailList
              items={[
                { label: "Utworzono", value: formatDate(o.createdDate) },
                {
                  label: "Termin realizacji",
                  value: o.dueDate ? (
                    <span className={cn(overdue && "font-medium text-red-700")}>
                      {formatDate(o.dueDate)}
                      {overdue && " (po terminie)"}
                    </span>
                  ) : (
                    <span className="text-orange-700">nie ustalono</span>
                  ),
                },
                ...(o.completedAt ? [{ label: "Zakończono", value: formatDate(o.completedAt) }] : []),
                { label: "Ostatnia zmiana", value: formatDateTime(o.updatedAt) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Klient">
            <p className="mb-3 text-sm font-medium">
              <ClientLink client={o.client} />
            </p>
            <DetailList
              items={[
                ...(o.client.type === "COMPANY" ? [{ label: "Kontakt", value: o.client.name }, { label: "NIP", value: o.client.nip ? formatNip(o.client.nip) : null }] : []),
                { label: "Telefon", value: o.client.phone },
                { label: "E-mail", value: o.client.email },
                { label: "Adres", value: o.client.address },
              ]}
            />
          </SectionCard>
          <SectionCard title="Notatki wewnętrzne">
            {o.internalNotes ? <p className="text-sm whitespace-pre-line">{o.internalNotes}</p> : <p className="text-sm text-muted-foreground">Brak notatek.</p>}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
