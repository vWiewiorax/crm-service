"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveClientAction } from "@/actions/clients";
import { applyServerErrors, FormSection, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { CLIENT_TYPE } from "@/lib/constants";
import { clientSchema, type ClientFormValues, type ClientInput } from "@/lib/validation/schemas";

export function ClientForm({ id, defaults }: { id?: string; defaults?: Partial<ClientFormValues> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ClientFormValues, unknown, ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "PRIVATE",
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      nip: "",
      notes: "",
      ...defaults,
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const res = await saveClientAction(id ?? null, form.getValues());
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/klienci/${res.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-xl border bg-card p-5 shadow-xs sm:p-6">
      <FormSection title="Podstawowe dane" description="Pola oznaczone * są wymagane.">
        <SelectField control={form.control} name="type" label="Typ klienta" options={CLIENT_TYPE.list} required />
        <TextField
          control={form.control}
          name="name"
          label={type === "COMPANY" ? "Osoba kontaktowa" : "Imię i nazwisko"}
          required
          autoComplete="off"
        />
        {type === "COMPANY" && (
          <>
            <TextField control={form.control} name="companyName" label="Nazwa firmy" required />
            <TextField
              control={form.control}
              name="nip"
              label="NIP"
              inputMode="numeric"
              placeholder="np. 123-456-32-18"
              description="Opcjonalnie. Sprawdzamy sumę kontrolną."
            />
          </>
        )}
      </FormSection>
      <FormSection title="Kontakt" description="Wszystkie pola opcjonalne.">
        <TextField control={form.control} name="email" label="E-mail" type="email" autoComplete="off" />
        <TextField control={form.control} name="phone" label="Telefon" type="tel" placeholder="+48 600 000 000" />
        <TextField control={form.control} name="address" label="Adres" className="sm:col-span-2" />
      </FormSection>
      <FormSection title="Notatki" description="Widoczne tylko dla Ciebie.">
        <TextareaField control={form.control} name="notes" label="Notatki" className="sm:col-span-2" rows={4} />
      </FormSection>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Anuluj
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {id ? "Zapisz zmiany" : "Dodaj klienta"}
        </Button>
      </div>
    </form>
  );
}
