import { ClipboardList, FilePlus2, FileText, History, ListChecks, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteClientAction } from "@/actions/clients";
import { DeleteButton } from "@/components/shared/confirm-action";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DetailList, SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CLIENT_TYPE, ORDER_STATUS, PAYMENT_STATUS, QUOTE_STATUS, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { formatNip } from "@/lib/nip";
import { getClient } from "@/server/clients";
import { BadgeCheck, Wallet } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/klienci/[id]">): Promise<Metadata> {
  const c = await getClient((await params).id);
  return { title: c?.displayName ?? "Klient" };
}

export default async function ClientPage({ params }: PageProps<"/klienci/[id]">) {
  const { id } = await params;
  const c = await getClient(id);
  if (!c) notFound();
  const canDelete = c.orders.length === 0 && c.quotes.length === 0;

  return (
    <>
      <PageHeader
        back={{ href: "/klienci", label: "Klienci" }}
        title={c.displayName}
        meta={<StatusBadge defs={CLIENT_TYPE} value={c.type} />}
        description={`Klient od ${formatDate(c.createdAt)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/wyceny/nowa?klient=${c.id}`}>
                <FilePlus2 data-icon="inline-start" />
                Nowa wycena
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/zlecenia/nowe?klient=${c.id}`}>
                <Plus data-icon="inline-start" />
                Nowe zlecenie
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/klienci/${c.id}/edytuj`}>
                <Pencil data-icon="inline-start" />
                Edytuj
              </Link>
            </Button>
            {canDelete && (
              <DeleteButton
                id={c.id}
                action={deleteClientAction}
                title="Usunąć klienta?"
                description={`Klient „${c.displayName}” zostanie trwale usunięty. Powiązane zadania i wydarzenia pozostaną, ale stracą przypisanie do klienta.`}
                redirectTo="/klienci"
              />
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Łączna wartość zleceń" value={formatMoney(c.stats.ordersValue)} hint={`${c.stats.ordersCount} zleceń, netto, bez anulowanych`} icon={ClipboardList} />
        <StatCard label="Przychód z zakończonych" value={formatMoney(c.stats.completedValue)} hint="Netto, zlecenia zakończone" icon={BadgeCheck} accent="green" />
        <StatCard label="Otrzymane wpłaty" value={formatMoney(c.stats.paidAmount)} hint="Brutto, faktycznie wpłacone" icon={Wallet} accent="blue" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Zlecenia" description={`${c.orders.length} łącznie`} bodyClassName="p-0">
            {c.orders.length === 0 ? (
              <EmptyState compact icon={ClipboardList} title="Brak zleceń" description="Utwórz pierwsze zlecenie dla tego klienta." />
            ) : (
              <ul className="divide-y">
                {c.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/zlecenia/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.number} · utworzone {formatDate(o.createdDate)}
                          {o.dueDate && ` · termin ${formatDate(o.dueDate)}`}
                        </p>
                      </div>
                      <StatusBadge defs={PAYMENT_STATUS} value={o.paymentStatus} className="hidden sm:inline-flex" />
                      <StatusBadge defs={ORDER_STATUS} value={o.status} />
                      <span className="tabular w-28 text-right text-sm font-medium">{formatMoney(o.netAmount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Wyceny" bodyClassName="p-0">
            {c.quotes.length === 0 ? (
              <EmptyState compact icon={FileText} title="Brak wycen" />
            ) : (
              <ul className="divide-y">
                {c.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/wyceny/${q.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.number} · {formatDate(q.issueDate)}
                        </p>
                      </div>
                      <StatusBadge defs={QUOTE_STATUS} value={q.status} />
                      <span className="tabular w-28 text-right text-sm font-medium">{formatMoney(q.netTotal)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Historia współpracy" bodyClassName="p-0">
            <ol className="relative px-5 py-4">
              {c.timeline.slice(0, 30).map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-px bg-border group-last:hidden" />
                  <span className="relative mt-1 size-3.5 shrink-0 rounded-full border-2 border-primary/60 bg-card" />
                  <div className="min-w-0">
                    <Link href={e.href} className="text-sm font-medium hover:text-primary hover:underline">
                      {e.title}
                    </Link>
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.date)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Dane klienta">
            <DetailList
              items={[
                { label: c.type === "COMPANY" ? "Osoba kontaktowa" : "Imię i nazwisko", value: c.name },
                ...(c.type === "COMPANY"
                  ? [
                      { label: "Firma", value: c.companyName },
                      { label: "NIP", value: c.nip ? formatNip(c.nip) : null },
                    ]
                  : []),
              ]}
            />
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <ContactRow icon={Mail} value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
              <ContactRow icon={Phone} value={c.phone} href={c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : undefined} />
              <ContactRow icon={MapPin} value={c.address} />
            </div>
          </SectionCard>
          <SectionCard title="Notatki">
            {c.notes ? (
              <p className="text-sm whitespace-pre-line">{c.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Brak notatek.</p>
            )}
          </SectionCard>
          <SectionCard
            title="Zadania"
            bodyClassName="p-0"
            action={
              <Link href={`/zadania?nowe=1&klient=${c.id}`} className="text-xs font-medium text-primary hover:underline">
                Dodaj
              </Link>
            }
          >
            {c.tasks.length === 0 ? (
              <EmptyState compact icon={ListChecks} title="Brak zadań" />
            ) : (
              <ul className="divide-y">
                {c.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/zadania?zadanie=${t.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className={t.status === "DONE" ? "truncate text-sm text-muted-foreground line-through" : "truncate text-sm"}>
                          {t.title}
                        </p>
                        {t.dueDate && <p className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</p>}
                      </div>
                      <StatusBadge defs={TASK_STATUS} value={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          {!canDelete && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <History className="size-3.5 shrink-0" />
              Klienta z zleceniami lub wycenami nie można usunąć, aby zachować spójność historii.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ContactRow({ icon: Icon, value, href }: { icon: typeof Mail; value: string | null; href?: string }) {
  return (
    <p className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      {value ? (
        href ? (
          <a href={href} className="break-all hover:text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="whitespace-pre-line">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </p>
  );
}
