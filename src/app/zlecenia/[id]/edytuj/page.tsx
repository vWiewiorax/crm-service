import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/shared/page-header";
import type { OrderStatus, PaymentStatus, VatRate } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import { moneyToInput } from "@/lib/money";
import { clientOptions } from "@/server/clients";
import { getOrder } from "@/server/orders";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Edycja zlecenia" };

export default async function EditOrderPage({ params }: PageProps<"/zlecenia/[id]/edytuj">) {
  const { id } = await params;
  const [o, clients, settings] = await Promise.all([getOrder(id), clientOptions(), getSettings()]);
  if (!o) notFound();
  return (
    <>
      <PageHeader title={`Edycja zlecenia ${o.number}`} back={{ href: `/zlecenia/${o.id}`, label: o.number }} />
      <OrderForm
        id={o.id}
        clients={clients}
        categories={settings.serviceCategories}
        defaults={{
          title: o.title,
          description: o.description ?? "",
          clientId: o.clientId,
          category: o.category,
          createdDate: toISODate(o.createdDate),
          dueDate: o.dueDate ? toISODate(o.dueDate) : "",
          status: o.status as OrderStatus,
          netAmount: moneyToInput(o.netAmount),
          vatRate: o.vatRate as VatRate,
          paymentStatus: o.paymentStatus as PaymentStatus,
          paidAmount: o.paymentStatus === "PARTIAL" ? moneyToInput(o.paidAmount) : "",
          internalNotes: o.internalNotes ?? "",
        }}
      />
    </>
  );
}
