"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeOrderStatusAction } from "@/actions/orders";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS } from "@/lib/constants";

export function OrderStatusDialog({ orderId, current }: { orderId: string; current: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = () =>
    startTransition(async () => {
      const res = await changeOrderStatusAction({ orderId, status, note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setNote("");
      setOpen(false);
    });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setStatus(current);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw data-icon="inline-start" />
          Zmień status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zmiana statusu zlecenia</DialogTitle>
          <DialogDescription>Zmiana zostanie zapisana w historii zlecenia.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="new-status">Nowy status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="new-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS.list.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="status-note">Notatka (opcjonalnie)</FieldLabel>
            <Textarea id="status-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Anuluj
          </Button>
          <Button onClick={submit} disabled={pending || status === current}>
            {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Zapisz status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
