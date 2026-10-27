"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { deleteEventAction, saveEventAction } from "@/actions/calendar";
import { applyServerErrors, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EVENT_TYPE } from "@/lib/constants";
import { eventSchema, type EventFormValues, type EventInput } from "@/lib/validation/schemas";

type Opt = { id: string; label: string };
type OrderOpt = Opt & { clientId: string };

export function EventDialog({
  open,
  onOpenChange,
  id,
  defaults,
  clients,
  orders,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  id: string | null;
  defaults: EventFormValues;
  clients: Opt[];
  orders: OrderOpt[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? "Edycja wydarzenia" : "Nowe wydarzenie"}</DialogTitle>
          <DialogDescription>Wizyta u klienta lub przypomnienie. Zapisywane tylko w tej aplikacji.</DialogDescription>
        </DialogHeader>
        {open && <EventForm key={id ?? "new"} id={id} defaults={defaults} clients={clients} orders={orders} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({ id, defaults, clients, orders, onDone }: { id: string | null; defaults: EventFormValues; clients: Opt[]; orders: OrderOpt[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const form = useForm<EventFormValues, unknown, EventInput>({ resolver: zodResolver(eventSchema), defaultValues: defaults });
  const clientId = useWatch({ control: form.control, name: "clientId" });
  const visibleOrders = clientId ? orders.filter((o) => o.clientId === clientId) : orders;
  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const values = form.getValues();
      const order = orders.find((o) => o.id === values.orderId);
      if (order && !values.clientId) values.clientId = order.clientId;
      const res = await saveEventAction(id, values);
      if (!res.ok) {
        applyServerErrors(form.setError, res);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onDone();
    }),
  );
  const remove = () =>
    startTransition(async () => {
      if (!id) return;
      const res = await deleteEventAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      onDone();
    });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField control={form.control} name="type" label="Typ" required options={EVENT_TYPE.list} />
        <TextField control={form.control} name="title" label="Tytuł" required className="sm:col-span-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField control={form.control} name="date" label="Data" type="date" required />
        <TextField control={form.control} name="startTime" label="Od (opcjonalnie)" type="time" />
        <TextField control={form.control} name="endTime" label="Do (opcjonalnie)" type="time" />
      </div>
      <TextField control={form.control} name="location" label="Miejsce" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField control={form.control} name="clientId" label="Klient" emptyOption="Bez klienta" options={clients.map((c) => ({ value: c.id, label: c.label }))} />
        <SelectField control={form.control} name="orderId" label="Zlecenie" emptyOption="Bez zlecenia" options={visibleOrders.map((o) => ({ value: o.id, label: o.label }))} />
      </div>
      <TextareaField control={form.control} name="notes" label="Notatki" rows={2} />
      <DialogFooter className="gap-2 sm:justify-between">
        {id ? (
          armed ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-destructive">Usunąć wydarzenie?</span>
              <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={pending}>
                Tak, usuń
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setArmed(false)}>
                Nie
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setArmed(true)} disabled={pending}>
              <Trash2 data-icon="inline-start" />
              Usuń
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Anuluj
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            Zapisz
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
