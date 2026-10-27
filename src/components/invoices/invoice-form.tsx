"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveInvoiceAction } from "@/actions/invoices";
import { applyServerErrors, FormSection, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD, UNITS, VAT_RATES, type VatRate } from "@/lib/constants";
import { formatMoney, formatVat } from "@/lib/format";
import { documentTotals, lineNet, parseMoney, parseQuantity } from "@/lib/money";
import { invoiceSchema, type InvoiceFormValues, type InvoiceInput } from "@/lib/validation/schemas";

const UNIT_OPTIONS = UNITS.map((u) => ({ value: u, label: u }));

export function InvoiceForm({
  id,
  defaults,
  clients,
  defaultVat,
  orderLabel,
}: {
  id?: string;
  defaults: InvoiceFormValues;
  clients: { id: string; label: string }[];
  defaultVat: VatRate;
  orderLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<InvoiceFormValues, unknown, InvoiceInput>({ resolver: zodResolver(invoiceSchema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const parsed = items.map((it) => ({
    quantity: parseQuantity(it?.quantity ?? "") ?? 0,
    unitPriceNet: parseMoney(it?.unitPriceNet ?? "") ?? 0,
    vatRate: it?.vatRate ?? defaultVat,
  }));
  const totals = documentTotals(parsed);
  const hasExempt = parsed.some((p) => p.vatRate === "zw");
  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveInvoiceAction(id ?? null, form.getValues());
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/faktury/${res.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <FormSection
        title="Faktura VAT"
        description={
          orderLabel
            ? `Dane przeniesione ze zlecenia ${orderLabel}. Numer faktury nadawany jest automatycznie przy zapisie.`
            : "Numer faktury nadawany jest automatycznie przy zapisie. Dane sprzedawcy pochodzą z ustawień."
        }
      >
        <SelectField
          control={form.control}
          name="clientId"
          label="Nabywca"
          required
          options={clients.map((c) => ({ value: c.id, label: c.label }))}
          placeholder="Wybierz klienta"
          disabled={Boolean(orderLabel)}
        />
        <SelectField control={form.control} name="paymentMethod" label="Forma płatności" required options={PAYMENT_METHOD.list} />
        <TextField control={form.control} name="issueDate" label="Data wystawienia" type="date" required />
        <TextField control={form.control} name="saleDate" label="Data sprzedaży / wykonania usługi" type="date" required />
        <TextField control={form.control} name="dueDate" label="Termin płatności" type="date" required />
        <TextField control={form.control} name="placeOfIssue" label="Miejsce wystawienia" />
      </FormSection>

      <section className="border-b py-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pozycje</h2>
            <p className="text-sm text-muted-foreground">Sumy i VAT przeliczają się automatycznie.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", quantity: "1", unit: "usł.", unitPriceNet: "", vatRate: defaultVat })}
            disabled={fields.length >= 50}
          >
            <Plus data-icon="inline-start" />
            Dodaj pozycję
          </Button>
        </div>
        <ol className="space-y-3">
          {fields.map((f, i) => (
            <li key={f.id} className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pozycja {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  aria-label={`Usuń pozycję ${i + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-12">
                <TextField control={form.control} name={`items.${i}.name`} label="Nazwa towaru lub usługi" required className="sm:col-span-12 lg:col-span-4" />
                <TextField control={form.control} name={`items.${i}.quantity`} label="Ilość" required inputMode="decimal" className="sm:col-span-3 lg:col-span-1" />
                <SelectField control={form.control} name={`items.${i}.unit`} label="Jednostka" required options={UNIT_OPTIONS} className="sm:col-span-3 lg:col-span-2" />
                <TextField control={form.control} name={`items.${i}.unitPriceNet`} label="Cena netto" required inputMode="decimal" suffix="zł" className="sm:col-span-3 lg:col-span-2" />
                <SelectField control={form.control} name={`items.${i}.vatRate`} label="VAT" required options={VAT_RATES.list} className="sm:col-span-3 lg:col-span-1" />
                <div className="flex flex-col justify-end sm:col-span-12 lg:col-span-2">
                  <span className="text-xs text-muted-foreground">Wartość netto</span>
                  <span className="tabular py-2 text-right text-sm font-semibold lg:text-left">
                    {formatMoney(lineNet(parsed[i] ?? { quantity: 0, unitPriceNet: 0 }))}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {itemsError && <p className="mt-2 text-sm text-destructive">{itemsError}</p>}
        <div className="mt-4 ml-auto w-full max-w-sm rounded-lg border bg-card p-4 text-sm" aria-live="polite">
          {totals.breakdown.map((b) => (
            <div key={b.rate} className="flex justify-between text-xs text-muted-foreground">
              <span>
                Stawka {formatVat(b.rate)}: netto {formatMoney(b.net)}
              </span>
              <span className="tabular">VAT {formatMoney(b.vat)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-2">
            <span>Razem netto</span>
            <span className="tabular font-medium">{formatMoney(totals.net)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT</span>
            <span className="tabular">{formatMoney(totals.vat)}</span>
          </div>
          <div className="mt-1 flex justify-between text-base font-semibold">
            <span>Do zapłaty</span>
            <span className="tabular">{formatMoney(totals.gross)}</span>
          </div>
        </div>
      </section>

      <FormSection title="Dodatkowe informacje" description="Uwagi trafiają na fakturę i do pliku KSeF (maksymalnie 256 znaków).">
        {hasExempt && (
          <TextField
            control={form.control}
            name="vatExemptionBasis"
            label="Podstawa zwolnienia z VAT"
            required
            placeholder="np. przepis ustawy o VAT"
            className="sm:col-span-2"
          />
        )}
        <TextareaField control={form.control} name="notes" label="Uwagi" className="sm:col-span-2" rows={2} />
      </FormSection>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Anuluj
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {id ? "Zapisz zmiany" : "Wystaw fakturę"}
        </Button>
      </div>
    </form>
  );
}
