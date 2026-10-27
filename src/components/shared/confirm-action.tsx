"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/** Przycisk usuwania z obowiązkowym potwierdzeniem w oknie dialogowym. */
export function DeleteButton({
  id,
  action,
  title,
  description,
  redirectTo,
  label = "Usuń",
  size = "sm",
  iconOnly,
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  title: string;
  description: string;
  redirectTo?: string;
  label?: string;
  size?: "sm" | "default" | "icon-sm";
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      const res = await action(id);
      if (!res.ok) {
        toast.error(res.error);
        setOpen(false);
        return;
      }
      toast.success(res.message ?? "Usunięto");
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
    });
  return (
    <AlertDialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon-sm" aria-label={label} className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        ) : (
          <Button variant="destructive" size={size}>
            <Trash2 data-icon="inline-start" />
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Anuluj</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending} className="bg-destructive text-white hover:bg-destructive/90">
            {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Tak, usuń
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
