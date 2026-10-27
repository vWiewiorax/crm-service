import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/quotes/quote-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import type { VatRate } from "@/lib/constants";
import { addDays, toISODate, today } from "@/lib/dates";
import { clientOptions } from "@/server/clients";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Nowa wycena" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ klient?: string }> }) {
  const { klient } = await searchParams;
  const [clients, settings] = await Promise.all([clientOptions(), getSettings()]);
  const vat = settings.defaultVatRate as VatRate;
  const now = today();
  return (
    <>
      <PageHeader title="Nowa wycena" back={{ href: "/wyceny", label: "Wyceny" }} />
      {clients.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            title="Najpierw dodaj klienta"
            description="Wycena musi być przypisana do klienta."
            action={
              <Button asChild size="sm">
                <Link href="/klienci/nowy">Dodaj klienta</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <QuoteForm
          clients={clients}
          defaultVat={vat}
          defaults={{
            clientId: clients.some((c) => c.id === klient) ? klient! : "",
            title: "",
            description: "",
            issueDate: toISODate(now),
            validUntil: toISODate(addDays(now, settings.quoteValidityDays)),
            status: "DRAFT",
            notes: "",
            items: [{ name: "", quantity: "1", unit: "usł.", unitPriceNet: "", vatRate: vat }],
          }}
        />
      )}
    </>
  );
}
