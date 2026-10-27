import { Download, FileCode, FileText, Pencil, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteInvoiceAction } from "@/actions/invoices";
import { RefreshKsefButton, SendToKsefButton } from "@/components/invoices/invoice-actions";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { DeleteButton } from "@/components/shared/confirm-action";
import { PageHeader } from "@/components/shared/page-header";
import { DetailList, SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { KSEF_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { getInvoice, isInvoiceLocked } from "@/server/invoices";

export async function generateMetadata({ params }: PageProps<"/faktury/[id]">): Promise<Metadata> {
  const inv = await getInvoice((await params).id);
  return { title: inv ? `Faktura ${inv.number}` : "Faktura" };
}

export default async function InvoicePage({ params }: PageProps<"/faktury/[id]">) {
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) notFound();
  const locked = isInvoiceLocked(inv.ksefStatus);
  const canSend = !locked;

  return (
    <>
      <PageHeader
        back={{ href: "/faktury", label: "Faktury" }}
        title={`Faktura ${inv.number}`}
        meta={<StatusBadge defs={KSEF_STATUS} value={inv.ksefStatus} />}
        description={
          <>
            <Link href={`/klienci/${inv.clientId}`} className="hover:text-primary hover:underline">
              {inv.buyerName}
            </Link>
            {inv.order && (
              <>
                {" · "}
                <Link href={`/zlecenia/${inv.order.id}`} className="hover:text-primary hover:underline">
                  Zlecenie {inv.order.number}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/faktury/${inv.id}/pdf`} target="_blank" rel="noopener">
                <FileText data-icon="inline-start" />
                Otwórz PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/faktury/${inv.id}/pdf?pobierz=1`}>
                <Download data-icon="inline-start" />
                Pobierz PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/faktury/${inv.id}/xml`}>
                <FileCode data-icon="inline-start" />
                XML FA(3)
              </a>
            </Button>
            {!locked && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/faktury/${inv.id}/edytuj`}>
                  <Pencil data-icon="inline-start" />
                  Edytuj
                </Link>
              </Button>
            )}
            {!locked && (
              <DeleteButton
                id={inv.id}
                action={deleteInvoiceAction}
                title={`Usunąć fakturę ${inv.number}?`}
                description="Faktura i jej pozycje zostaną trwale usunięte. Tej operacji nie można cofnąć."
                redirectTo="/faktury"
              />
            )}
          </>
        }
      />

      <SectionCard
        className="mb-6"
        title="KSeF (środowisko testowe)"
        description="Wysyłka trafia wyłącznie do testowego KSeF Ministerstwa Finansów. Nie wywołuje skutków podatkowych. Używaj tylko fikcyjnych danych."
        action={
          <div className="flex flex-wrap gap-2">
            {canSend && <SendToKsefButton id={inv.id} number={inv.number} resend={inv.ksefStatus !== "NOT_SENT"} />}
            {inv.ksefStatus === "PROCESSING" && inv.ksefInvoiceRef && <RefreshKsefButton id={inv.id} />}
            {inv.ksefStatus === "ACCEPTED" && !inv.upoXml && <RefreshKsefButton id={inv.id} label="Pobierz UPO" />}
            {inv.upoXml && (
              <Button asChild size="sm" variant="outline">
                <a href={`/faktury/${inv.id}/upo`}>
                  <ShieldCheck data-icon="inline-start" />
                  Pobierz UPO
                </a>
              </Button>
            )}
          </div>
        }
      >
        <DetailList
          items={[
            { label: "Status", value: <StatusBadge defs={KSEF_STATUS} value={inv.ksefStatus} /> },
            { label: "Numer KSeF", value: inv.ksefNumber ? <span className="font-mono text-xs">{inv.ksefNumber}</span> : null },
            { label: "Komunikat", value: inv.ksefStatusDescription },
            { label: "Wysłano", value: inv.ksefSentAt ? formatDateTime(inv.ksefSentAt) : null },
            { label: "Nr referencyjny", value: inv.ksefInvoiceRef ? <span className="font-mono text-xs">{inv.ksefInvoiceRef}</span> : null },
            { label: "UPO", value: inv.upoXml ? "Pobrane" : inv.ksefStatus === "ACCEPTED" ? "Jeszcze niedostępne" : null },
          ]}
        />
      </SectionCard>

      <InvoiceDocument invoice={inv} />
    </>
  );
}
