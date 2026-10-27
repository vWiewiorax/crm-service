import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteForm } from "@/components/quotes/quote-form";
import { PageHeader } from "@/components/shared/page-header";
import type { QuoteStatus, VatRate } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { moneyToInput } from "@/lib/money";
import { clientOptions } from "@/server/clients";
import { getQuote } from "@/server/quotes";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Edycja wyceny" };

export default async function EditQuotePage({ params }: PageProps<"/wyceny/[id]/edytuj">) {
  const { id } = await params;
  const [q, clients, settings] = await Promise.all([getQuote(id), clientOptions(), getSettings()]);
  if (!q) notFound();
  return (
    <>
      <PageHeader title={`Edycja wyceny ${q.number}`} back={{ href: `/wyceny/${q.id}`, label: q.number }} />
      <QuoteForm
        id={q.id}
        clients={clients}
        defaultVat={settings.defaultVatRate as VatRate}
        defaults={{
          clientId: q.clientId,
          title: q.title,
          description: q.description ?? "",
          issueDate: toISODate(q.issueDate),
          validUntil: toISODate(q.validUntil),
          status: q.status as QuoteStatus,
          notes: q.notes ?? "",
          items: q.items.map((it) => ({
            name: it.name,
            quantity: String(it.quantity).replace(".", ","),
            unit: it.unit,
            unitPriceNet: moneyToInput(it.unitPriceNet),
            vatRate: it.vatRate as VatRate,
          })),
        }}
      />
    </>
  );
}
