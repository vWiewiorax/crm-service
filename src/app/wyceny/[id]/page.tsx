import { ClipboardList, Download, FileText, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuoteAction } from "@/actions/quotes";
import { ConvertQuoteDialog, QuoteStatusSelect } from "@/components/quotes/quote-actions";
import { QuoteDocument } from "@/components/quotes/quote-document";
import { DeleteButton } from "@/components/shared/confirm-action";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS, QUOTE_STATUS } from "@/lib/constants";
import { clientDisplayName } from "@/lib/client-name";
import { getQuote } from "@/server/quotes";
import { getSettings } from "@/server/settings";

export async function generateMetadata({ params }: PageProps<"/wyceny/[id]">): Promise<Metadata> {
  const q = await getQuote((await params).id);
  return { title: q ? `Wycena ${q.number}` : "Wycena" };
}

export default async function QuotePage({ params }: PageProps<"/wyceny/[id]">) {
  const { id } = await params;
  const [q, settings] = await Promise.all([getQuote(id), getSettings()]);
  if (!q) notFound();

  return (
    <>
      <PageHeader
        back={{ href: "/wyceny", label: "Wyceny" }}
        title={q.title}
        meta={<StatusBadge defs={QUOTE_STATUS} value={q.status} />}
        description={
          <>
            <span className="font-mono">{q.number}</span> ·{" "}
            <Link href={`/klienci/${q.clientId}`} className="hover:text-primary hover:underline">
              {clientDisplayName(q.client)}
            </Link>
          </>
        }
        actions={
          <>
            <QuoteStatusSelect id={q.id} status={q.status} />
            <Button asChild variant="outline" size="sm">
              <a href={`/wyceny/${q.id}/pdf`} target="_blank" rel="noopener">
                <FileText data-icon="inline-start" />
                Otwórz PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/wyceny/${q.id}/pdf?pobierz=1`}>
                <Download data-icon="inline-start" />
                Pobierz PDF
              </a>
            </Button>
            {!q.order && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/wyceny/${q.id}/edytuj`}>
                  <Pencil data-icon="inline-start" />
                  Edytuj
                </Link>
              </Button>
            )}
            {q.status === "ACCEPTED" && !q.order && (
              <ConvertQuoteDialog
                quoteId={q.id}
                number={q.number}
                netTotal={q.netTotal}
                itemsCount={q.items.length}
                categories={settings.serviceCategories}
              />
            )}
            {!q.order && (
              <DeleteButton
                id={q.id}
                action={deleteQuoteAction}
                title={`Usunąć wycenę ${q.number}?`}
                description="Wycena i jej pozycje zostaną trwale usunięte. Tej operacji nie można cofnąć."
                redirectTo="/wyceny"
              />
            )}
          </>
        }
      />

      {q.order ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <ClipboardList className="size-4" />
          Z tej wyceny utworzono zlecenie
          <Link href={`/zlecenia/${q.order.id}`} className="font-semibold underline">
            {q.order.number}
          </Link>
          <StatusBadge defs={ORDER_STATUS} value={q.order.status} />
          <span className="text-emerald-800/80">Wycena jest zablokowana do edycji, aby zachować zgodność ze zleceniem.</span>
        </div>
      ) : q.status !== "ACCEPTED" ? (
        <p className="mb-6 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Zlecenie z wyceny można utworzyć po zmianie statusu na „Zaakceptowana”. Pozycje nie są przenoszone automatycznie.
        </p>
      ) : null}

      <QuoteDocument quote={q} company={settings} />
    </>
  );
}
