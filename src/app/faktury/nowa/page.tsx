import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import type { VatRate } from "@/lib/constants";
import { addDays, toISODate, today } from "@/lib/dates";
import { moneyToInput } from "@/lib/money";
import { isValidNip } from "@/lib/nip";
import { clientOptions } from "@/server/clients";
import { invoiceDraftFromOrder } from "@/server/invoices";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Nowa faktura" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ zlecenie?: string; klient?: string }> }) {
  const { zlecenie, klient } = await searchParams;
  const [clients, settings, draft] = await Promise.all([
    clientOptions(),
    getSettings(),
    zlecenie ? invoiceDraftFromOrder(zlecenie) : Promise.resolve(null),
  ]);
  const vat = settings.defaultVatRate as VatRate;
  const now = today();
  const sellerReady = Boolean(settings.nip && isValidNip(settings.nip) && settings.address?.trim());
  const clientId = draft?.clientId ?? (clients.some((c) => c.id === klient) ? klient! : "");

  return (
    <>
      <PageHeader
        title="Nowa faktura"
        back={draft ? { href: `/zlecenia/${draft.orderId}`, label: `Zlecenie ${draft.orderNumber}` } : { href: "/faktury", label: "Faktury" }}
      />
      {!sellerReady ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            title="Uzupełnij dane firmy"
            description="Do wystawienia faktury potrzebny jest poprawny NIP i adres firmy w ustawieniach."
            action={
              <Button asChild size="sm">
                <Link href="/ustawienia">Przejdź do ustawień</Link>
              </Button>
            }
          />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            title="Najpierw dodaj klienta"
            description="Faktura musi mieć nabywcę."
            action={
              <Button asChild size="sm">
                <Link href="/klienci/nowy">Dodaj klienta</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <InvoiceForm
          clients={clients}
          defaultVat={vat}
          orderLabel={draft?.orderNumber ?? null}
          defaults={{
            clientId,
            orderId: draft?.orderId ?? "",
            issueDate: toISODate(now),
            saleDate: toISODate(draft?.completedAt ?? now),
            dueDate: toISODate(addDays(now, settings.paymentTermDays)),
            placeOfIssue: "",
            paymentMethod: "TRANSFER",
            vatExemptionBasis: "",
            notes: "",
            items: draft
              ? draft.items.map((i) => ({
                  name: i.name,
                  quantity: String(i.quantity).replace(".", ","),
                  unit: i.unit,
                  unitPriceNet: moneyToInput(i.unitPriceNet),
                  vatRate: i.vatRate as VatRate,
                }))
              : [{ name: "", quantity: "1", unit: "usł.", unitPriceNet: "", vatRate: vat }],
          }}
        />
      )}
    </>
  );
}
