import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { formatNip } from "@/lib/nip";
import { getClient } from "@/server/clients";

export const metadata: Metadata = { title: "Edycja klienta" };

export default async function EditClientPage({ params }: PageProps<"/klienci/[id]/edytuj">) {
  const { id } = await params;
  const c = await getClient(id);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={`Edycja: ${c.displayName}`} back={{ href: `/klienci/${c.id}`, label: c.displayName }} />
      <ClientForm
        id={c.id}
        defaults={{
          type: c.type as "PRIVATE" | "COMPANY",
          name: c.name,
          companyName: c.companyName ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          address: c.address ?? "",
          nip: c.nip ? formatNip(c.nip) : "",
          notes: c.notes ?? "",
        }}
      />
    </>
  );
}
