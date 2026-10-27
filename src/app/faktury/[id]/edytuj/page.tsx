import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/shared/page-header";
import type { PaymentMethod, VatRate } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { moneyToInput } from "@/lib/money";
import { clientOptions } from "@/server/clients";
import { getInvoice, isInvoiceLocked } from "@/server/invoices";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Edycja faktury" };

export default async function EditInvoicePage({ params }: PageProps<"/faktury/[id]/edytuj">) {
  const { id } = await params;
  const [inv, clients, settings] = await Promise.all([getInvoice(id), clientOptions(), getSettings()]);
  if (!inv) notFound();
  if (isInvoiceLocked(inv.ksefStatus)) redirect(`/faktury/${inv.id}`);
  return (
    <>
      <PageHeader title={`Edycja faktury ${inv.number}`} back={{ href: `/faktury/${inv.id}`, label: inv.number }} />
      <InvoiceForm
        id={inv.id}
        clients={clients}
        defaultVat={settings.defaultVatRate as VatRate}
        orderLabel={inv.order?.number ?? null}
        defaults={{
          clientId: inv.clientId,
          orderId: inv.orderId ?? "",
          issueDate: toISODate(inv.issueDate),
          saleDate: toISODate(inv.saleDate),
          dueDate: toISODate(inv.dueDate),
          placeOfIssue: inv.placeOfIssue ?? "",
          paymentMethod: inv.paymentMethod as PaymentMethod,
          vatExemptionBasis: inv.vatExemptionBasis ?? "",
          notes: inv.notes ?? "",
          items: inv.items.map((i) => ({
            name: i.name,
            quantity: String(i.quantity).replace(".", ","),
            unit: i.unit,
            unitPriceNet: moneyToInput(i.unitPriceNet),
            vatRate: i.vatRate as VatRate,
          })),
        }}
      />
    </>
  );
}
