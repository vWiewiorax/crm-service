"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveOrderAction } from "@/actions/orders";
import { applyServerErrors, FormSection, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS, PAYMENT_STATUS, VAT_RATES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { parseMoney, totalsFromNet } from "@/lib/money";
import { orderSchema, type OrderFormValues, type OrderInput } from "@/lib/validation/schemas";

export function OrderForm({
  id,
  defaults,
  clients,
  categories,
}: {
  id?: string;
  defaults: OrderFormValues;
  clients: { id: string; label: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<OrderFormValues, unknown, OrderInput>({ resolver: zodResolver(orderSchema), defaultValues: defaults });
  const [net, vat, payment] = useWatch({ control: form.control, name: ["netAmount", "vatRate", "paymentStatus"] });
  const netValue = parseMoney(net ?? "");
  const totals = netValue !== null ? totalsFromNet(netValue, vat) : null;
  const categoryOptions = [...new Set([...categories, defaults.category].filter(Boolean))].map((c) => ({ value: c, label: c }));

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveOrderAction(id ?? null, form.getValues());
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/zlecenia/${res.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <FormSection title="Zlecenie" description="Numer zlecenia nadawany jest automatycznie przy zapisie.">
        <TextField control={form.control} name="title" label="Tytuł zlecenia" required className="sm:col-span-2" />
        <SelectField
          control={form.control}
          name="clientId"
          label="Klient"
          required
          options={clients.map((c) => ({ value: c.id, label: c.label }))}
          placeholder={clients.length ? "Wybierz klienta" : "Najpierw dodaj klienta"}
        />
        <SelectField control={form.control} name="category" label="Kategoria usługi" required options={categoryOptions} />
        <TextareaField control={form.control} name="description" label="Opis usługi" className="sm:col-span-2" />
      </FormSection>
      <FormSection title="Status i terminy">
        <SelectField control={form.control} name="status" label="Status" required options={ORDER_STATUS.list} />
        <div className="hidden sm:block" />
        <TextField control={form.control} name="createdDate" label="Data utworzenia" type="date" required />
        <TextField control={form.control} name="dueDate" label="Planowany termin realizacji" type="date" />
      </FormSection>
      <FormSection title="Kwota i płatność" description="Kwota netto. VAT i brutto liczone automatycznie.">
        <TextField control={form.control} name="netAmount" label="Kwota netto" required inputMode="decimal" suffix="zł" placeholder="0,00" />
        <SelectField control={form.control} name="vatRate" label="Stawka VAT" required options={VAT_RATES.list} />
        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm sm:col-span-2" aria-live="polite">
          {totals ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                VAT: <strong className="tabular">{formatMoney(totals.vat)}</strong>
              </span>
              <span>
                Brutto: <strong className="tabular">{formatMoney(totals.gross)}</strong>
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Wpisz kwotę netto, aby zobaczyć VAT i brutto.</span>
          )}
        </div>
        <SelectField control={form.control} name="paymentStatus" label="Status płatności" required options={PAYMENT_STATUS.list} />
        {payment === "PARTIAL" && (
          <TextField
            control={form.control}
            name="paidAmount"
            label="Wpłacona kwota (brutto)"
            required
            inputMode="decimal"
            suffix="zł"
          />
        )}
      </FormSection>
      <FormSection title="Notatki wewnętrzne" description="Nie pojawiają się na dokumentach.">
        <TextareaField control={form.control} name="internalNotes" label="Notatki" className="sm:col-span-2" rows={3} />
      </FormSection>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Anuluj
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {id ? "Zapisz zmiany" : "Utwórz zlecenie"}
        </Button>
      </div>
    </form>
  );
}
