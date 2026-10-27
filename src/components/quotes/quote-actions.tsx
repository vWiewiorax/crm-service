"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeQuoteStatusAction, convertQuoteAction } from "@/actions/quotes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUOTE_STATUS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

export function QuoteStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          const res = await changeQuoteStatusAction(id, v);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
    >
      <SelectTrigger size="sm" className="w-44" aria-label="Status wyceny">
        {pending ? <Loader2 className="animate-spin" /> : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUOTE_STATUS.list.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ConvertQuoteDialog({
  quoteId,
  number,
  netTotal,
  itemsCount,
  categories,
}: {
  quoteId: string;
  number: string;
  netTotal: number;
  itemsCount: number;
  categories: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await convertQuoteAction({ quoteId, category, dueDate });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setOpen(false);
      router.push(`/zlecenia/${res.data.id}`);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ArrowRightLeft data-icon="inline-start" />
          Utwórz zlecenie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utworzyć zlecenie z wyceny {number}?</DialogTitle>
          <DialogDescription>
            Do nowego zlecenia zostaną przeniesione: klient, tytuł, opis, {itemsCount} pozycji i kwota {formatMoney(netTotal)} netto.
            Z jednej wyceny można utworzyć tylko jedno zlecenie.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="conv-cat">Kategoria usługi</FieldLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="conv-cat" className="w-full">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="conv-due">Planowany termin realizacji (opcjonalnie)</FieldLabel>
            <Input id="conv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Anuluj
          </Button>
          <Button onClick={submit} disabled={pending || !category}>
            {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Utwórz zlecenie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
