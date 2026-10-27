"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveSettingsAction } from "@/actions/settings";
import { applyServerErrors, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { VAT_RATES } from "@/lib/constants";
import { formatDocumentNumber } from "@/lib/numbering-format";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation/schemas";

type Parsed = import("zod").output<typeof settingsSchema>;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-6 first:pt-0 last:border-0 lg:grid-cols-[240px_1fr] lg:gap-8">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export function SettingsForm({ defaults }: { defaults: SettingsFormValues }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsFormValues, unknown, Parsed>({ resolver: zodResolver(settingsSchema), defaultValues: defaults });
  const [orderPrefix, quotePrefix, invoicePrefix, padding] = useWatch({
    control: form.control,
    name: ["orderNumberPrefix", "quoteNumberPrefix", "invoiceNumberPrefix", "numberPadding"],
  });
  const pad = Math.min(6, Math.max(3, Number(padding) || 4));
  const year = new Date().getFullYear();

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveSettingsAction(form.getValues());
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      form.reset(form.getValues());
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <Section title="Dane firmy" description="Widoczne w panelu i na dokumentach wycen.">
        <TextField control={form.control} name="companyName" label="Nazwa firmy" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="ownerName" label="Właściciel" />
          <TextField control={form.control} name="nip" label="NIP" inputMode="numeric" />
        </div>
        <TextareaField control={form.control} name="address" label="Adres" rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="email" label="E-mail kontaktowy" type="email" />
          <TextField control={form.control} name="phone" label="Telefon" type="tel" />
        </div>
        <TextField control={form.control} name="bankAccount" label="Numer rachunku" description="Pokazywany w stopce wyceny." />
      </Section>
      <Section title="Rozliczenia" description="Wartości domyślne dla nowych zleceń i wycen.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField control={form.control} name="defaultVatRate" label="Domyślna stawka VAT" required options={VAT_RATES.list} />
          <div className="grid gap-2">
            <span className="text-sm font-medium">Waluta</span>
            <p className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">PLN (złoty polski)</p>
          </div>
          <TextField control={form.control} name="paymentTermDays" label="Termin płatności" inputMode="numeric" suffix="dni" required />
          <TextField control={form.control} name="quoteValidityDays" label="Ważność wyceny" inputMode="numeric" suffix="dni" required />
        </div>
      </Section>
      <Section title="Numeracja dokumentów" description="Numery nadaje serwer przy zapisie. Zmiana prefiksu dotyczy tylko nowych dokumentów.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField control={form.control} name="orderNumberPrefix" label="Prefiks zleceń" required />
          <TextField control={form.control} name="quoteNumberPrefix" label="Prefiks wycen" required />
          <TextField control={form.control} name="invoiceNumberPrefix" label="Prefiks faktur" required />
          <TextField control={form.control} name="numberPadding" label="Liczba cyfr" inputMode="numeric" required />
        </div>
        <p className="text-sm text-muted-foreground">
          Przykład: <span className="font-mono text-foreground">{formatDocumentNumber(orderPrefix || "ZL", year, 1, pad)}</span>,{" "}
          <span className="font-mono text-foreground">{formatDocumentNumber(quotePrefix || "WYC", year, 1, pad)}</span>,{" "}
          <span className="font-mono text-foreground">{formatDocumentNumber(invoicePrefix || "FV", year, 1, pad)}</span>
        </p>
      </Section>
      <Section title="Kategorie usług" description="Jedna kategoria w wierszu. Używane w zleceniach i raportach.">
        <TextareaField control={form.control} name="serviceCategories" label="Kategorie" rows={7} />
      </Section>
      <div className="flex justify-end border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Zapisz ustawienia
        </Button>
      </div>
    </form>
  );
}
