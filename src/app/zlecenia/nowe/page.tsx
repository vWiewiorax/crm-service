import type { Metadata } from "next";
import Link from "next/link";
import { OrderForm } from "@/components/orders/order-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import type { VatRate } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { clientOptions } from "@/server/clients";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Nowe zlecenie" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ klient?: string }> }) {
  const { klient } = await searchParams;
  const [clients, settings] = await Promise.all([clientOptions(), getSettings()]);
  return (
    <>
      <PageHeader title="Nowe zlecenie" back={{ href: "/zlecenia", label: "Zlecenia" }} />
      {clients.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            title="Najpierw dodaj klienta"
            description="Każde zlecenie musi być przypisane do klienta."
            action={
              <Button asChild size="sm">
                <Link href="/klienci/nowy">Dodaj klienta</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <OrderForm
          clients={clients}
          categories={settings.serviceCategories}
          defaults={{
            title: "",
            description: "",
            clientId: clients.some((c) => c.id === klient) ? klient! : "",
            category: settings.serviceCategories[0] ?? "",
            createdDate: todayISO(),
            dueDate: "",
            status: "NEW",
            netAmount: "",
            vatRate: settings.defaultVatRate as VatRate,
            paymentStatus: "UNPAID",
            paidAmount: "",
            internalNotes: "",
          }}
        />
      )}
    </>
  );
}
