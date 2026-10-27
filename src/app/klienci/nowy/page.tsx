import type { Metadata } from "next";
import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Nowy klient" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Nowy klient" back={{ href: "/klienci", label: "Klienci" }} />
      <ClientForm />
    </>
  );
}
