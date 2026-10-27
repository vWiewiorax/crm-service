"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { deleteTaskAction, saveTaskAction } from "@/actions/tasks";
import { applyServerErrors, SelectField, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { taskSchema, type TaskFormValues, type TaskInput } from "@/lib/validation/schemas";

export type Option = { id: string; label: string };
export type OrderOption = { id: string; label: string; clientId: string };

export function TaskDialog({
  open,
  onOpenChange,
  id,
  defaults,
  clients,
  orders,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  defaults: TaskFormValues;
  clients: Option[];
  orders: OrderOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? "Edycja zadania" : "Nowe zadanie"}</DialogTitle>
          <DialogDescription>Zadania z terminem pojawiają się w kalendarzu i na dashboardzie.</DialogDescription>
        </DialogHeader>
        {open && <TaskForm key={id ?? "new"} id={id} defaults={defaults} clients={clients} orders={orders} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  id,
  defaults,
  clients,
  orders,
  onDone,
}: {
  id: string | null;
  defaults: TaskFormValues;
  clients: Option[];
  orders: OrderOption[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<TaskFormValues, unknown, TaskInput>({ resolver: zodResolver(taskSchema), defaultValues: defaults });
  const clientId = useWatch({ control: form.control, name: "clientId" });
  const visibleOrders = clientId ? orders.filter((o) => o.clientId === clientId) : orders;

  const onSubmit = form.handleSubmit(() =>
    startTransition(async () => {
      const values = form.getValues();
      const order = orders.find((o) => o.id === values.orderId);
      if (order && !values.clientId) values.clientId = order.clientId;
      const res = await saveTaskAction(id, values);
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
      const res = await deleteTaskAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      onDone();
    });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <TextField control={form.control} name="title" label="Tytuł" required />
      <TextareaField control={form.control} name="description" label="Opis" rows={3} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField control={form.control} name="dueDate" label="Termin" type="date" />
        <SelectField control={form.control} name="priority" label="Priorytet" required options={TASK_PRIORITY.list} />
        <SelectField control={form.control} name="status" label="Status" required options={TASK_STATUS.list} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          control={form.control}
          name="clientId"
          label="Klient (opcjonalnie)"
          emptyOption="Bez klienta"
          options={clients.map((c) => ({ value: c.id, label: c.label }))}
        />
        <SelectField
          control={form.control}
          name="orderId"
          label="Zlecenie (opcjonalnie)"
          emptyOption="Bez zlecenia"
          options={visibleOrders.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        {id ? (
          <ConfirmDelete onConfirm={remove} disabled={pending} />
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Anuluj
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {id ? "Zapisz" : "Dodaj zadanie"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function ConfirmDelete({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  return (
    <ConfirmInline onConfirm={onConfirm} disabled={disabled}>
      <Trash2 data-icon="inline-start" />
      Usuń zadanie
    </ConfirmInline>
  );
}


function ConfirmInline({ onConfirm, disabled, children }: { onConfirm: () => void; disabled: boolean; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <Button type="button" variant="ghost" className="text-destructive" onClick={() => setArmed(true)} disabled={disabled}>
        {children}
      </Button>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-destructive">Na pewno usunąć?</span>
      <Button type="button" size="sm" variant="destructive" onClick={onConfirm} disabled={disabled}>
        Tak, usuń
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setArmed(false)} disabled={disabled}>
        Nie
      </Button>
    </div>
  );
}
