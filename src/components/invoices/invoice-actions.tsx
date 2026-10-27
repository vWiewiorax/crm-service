"use client";

import { Loader2, RefreshCw, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { refreshKsefStatusAction, sendInvoiceToKsefAction } from "@/actions/invoices";
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

export function SendToKsefButton({ id, number, resend }: { id: string; number: string; resend?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const send = () =>
    startTransition(async () => {
      const res = await sendInvoiceToKsefAction(id);
      setOpen(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.status === "ACCEPTED") toast.success(res.message);
      else if (res.data.status === "PROCESSING") toast.info(res.message);
      else toast.error(res.message);
    });
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Send data-icon="inline-start" />
          {resend ? "Wyślij ponownie do KSeF" : "Wyślij do KSeF (test)"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wysłać fakturę {number} do testowego KSeF?</DialogTitle>
          <DialogDescription>
            Faktura zostanie zapisana w formacie FA(3) i przesłana do środowiska testowego Ministerstwa Finansów
            (api-test.ksef.mf.gov.pl). Środowisko testowe nie wywołuje skutków podatkowych, a jego dane są widoczne dla
            innych testujących, dlatego używaj wyłącznie fikcyjnych danych. Po przyjęciu przez KSeF faktury nie można
            edytować ani usunąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Anuluj
          </Button>
          <Button onClick={send} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            {pending ? "Wysyłanie..." : "Wyślij"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefreshKsefButton({ id, label = "Odśwież status" }: { id: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await refreshKsefStatusAction(id);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
      {label}
    </Button>
  );
}
