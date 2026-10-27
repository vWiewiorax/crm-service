import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Ustawienia" description="Dane firmy, wartości domyślne i numeracja dokumentów. Zapisywane w bazie danych." />
      <SettingsForm
        defaults={{
          companyName: s.companyName,
          ownerName: s.ownerName ?? "",
          address: s.address ?? "",
          nip: s.nip ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          bankAccount: s.bankAccount ?? "",
          defaultVatRate: s.defaultVatRate as "23",
          paymentTermDays: String(s.paymentTermDays),
          quoteValidityDays: String(s.quoteValidityDays),
          orderNumberPrefix: s.orderNumberPrefix,
          quoteNumberPrefix: s.quoteNumberPrefix,
          numberPadding: String(s.numberPadding),
          serviceCategories: s.serviceCategories.join("\n"),
        }}
      />
    </>
  );
}
