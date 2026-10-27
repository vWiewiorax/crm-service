"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveQuoteAction } from "@/actions/quotes";
import { applyServerErrors, FormSection, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { QUOTE_STATUS, UNITS, VAT_RATES, type VatRate } from "@/lib/constants";
import { formatMoney, formatVat } from "@/lib/format";
import { documentTotals, lineNet, parseMoney, parseQuantity } from "@/lib/money";
import { quoteSchema, type QuoteFormValues, type QuoteInput } from "@/lib/validation/schemas";

const UNIT_OPTIONS = UNITS.map((u) => ({ value: u, label: u }));

export function QuoteForm({
  id,
  defaults,
  clients,
  defaultVat,
}: {
  id?: string;
  defaults: QuoteFormValues;
  clients: { id: string; label: string }[];
  defaultVat: VatRate;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<QuoteFormValues, unknown, QuoteInput>({ resolver: zodResolver(quoteSchema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const parsed = items.map((it) => ({
    quantity: parseQuantity(it?.quantity ?? "") ?? 0,
    unitPriceNet: parseMoney(it?.unitPriceNet ?? "") ?? 0,
    vatRate: it?.vatRate ?? defaultVat,
  }));
  const totals = documentTotals(parsed);
  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveQuoteAction(id ?? null, form.getValues());
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/wyceny/${res.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <FormSection title="Wycena" description="Numer wyceny nadawany jest automatycznie przy zapisie.">
        <TextField control={form.control} name="title" label="Tytuł" required className="sm:col-span-2" />
        <SelectField
          control={form.control}
          name="clientId"
          label="Klient"
          required
          options={clients.map((c) => ({ value: c.id, label: c.label }))}
          placeholder="Wybierz klienta"
        />
        <SelectField control={form.control} name="status" label="Status" required options={QUOTE_STATUS.list} />
        <TextField control={form.control} name="issueDate" label="Data wystawienia" type="date" required />
        <TextField control={form.control} name="validUntil" label="Ważna do" type="date" required />
        <TextareaField control={form.control} name="description" label="Opis (widoczny na dokumencie)" className="sm:col-span-2" />
      </FormSection>

      <section className="border-b py-6 first:pt-0">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pozycje</h2>
            <p className="text-sm text-muted-foreground">Sumy przeliczają się automatycznie po każdej zmianie.</p>
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
                <TextField control={form.control} name={`items.${i}.name`} label="Nazwa" required className="sm:col-span-12 lg:col-span-4" />
                <TextField control={form.control} name={`items.${i}.quantity`} label="Ilość" required inputMode="decimal" className="sm:col-span-3 lg:col-span-1" />
                <SelectField control={form.control} name={`items.${i}.unit`} label="Jednostka" required options={UNIT_OPTIONS} className="sm:col-span-3 lg:col-span-2" />
                <TextField control={form.control} name={`items.${i}.unitPriceNet`} label="Cena netto" required inputMode="decimal" suffix="zł" className="sm:col-span-3 lg:col-span-2" />
                <SelectField control={form.control} name={`items.${i}.vatRate`} label="VAT" required options={VAT_RATES.list} className="sm:col-span-3 lg:col-span-1" />
                <div className="flex flex-col justify-end sm:col-span-12 lg:col-span-2">
                  <span className="text-xs text-muted-foreground">Wartość netto</span>
                  <span className="tabular py-2 text-right text-sm font-semibold lg:text-left">{formatMoney(lineNet(parsed[i] ?? { quantity: 0, unitPriceNet: 0 }))}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {itemsError && <p className="mt-2 text-sm text-destructive">{itemsError}</p>}
        <div className="mt-4 ml-auto w-full max-w-sm rounded-lg border bg-card p-4 text-sm" aria-live="polite">
          {totals.breakdown.map((b) => (
            <div key={b.rate} className="flex justify-between text-xs text-muted-foreground">
              <span>Stawka {formatVat(b.rate)}: netto {formatMoney(b.net)}</span>
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
            <span>Brutto</span>
            <span className="tabular">{formatMoney(totals.gross)}</span>
          </div>
        </div>
      </section>

      <FormSection title="Uwagi" description="Np. warunki realizacji. Widoczne na dokumencie.">
        <TextareaField control={form.control} name="notes" label="Uwagi" className="sm:col-span-2" rows={3} />
      </FormSection>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Anuluj
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {id ? "Zapisz zmiany" : "Utwórz wycenę"}
        </Button>
      </div>
    </form>
  );
}
