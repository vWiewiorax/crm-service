"use client";

import { ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setTaskDoneAction } from "@/actions/tasks";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TaskFormValues } from "@/lib/validation/schemas";
import { TaskDialog, type Option, type OrderOption } from "./task-dialog";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueLabel: string | null;
  overdue: boolean;
  isToday: boolean;
  priority: string;
  status: string;
  client: { id: string; label: string } | null;
  order: { id: string; number: string; title: string } | null;
  clientId: string | null;
  orderId: string | null;
};

export function TaskList({
  tasks,
  clients,
  orders,
  openTask,
  newDefaults,
  filtered,
}: {
  tasks: TaskItem[];
  clients: Option[];
  orders: OrderOption[];
  openTask: TaskItem | null;
  newDefaults: TaskFormValues | null;
  filtered: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const blank: TaskFormValues = { title: "", description: "", dueDate: "", priority: "NORMAL", status: "TODO", clientId: "", orderId: "" };
  const [dialog, setDialog] = useState<{ id: string | null; defaults: TaskFormValues } | null>(
    openTask ? { id: openTask.id, defaults: toForm(openTask) } : newDefaults ? { id: null, defaults: newDefaults } : null,
  );
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, status: change.done ? "DONE" : "TODO" } : t)),
  );
  const [, startTransition] = useTransition();

  const close = () => {
    setDialog(null);
    if (params.has("zadanie") || params.has("nowe")) {
      const next = new URLSearchParams(params);
      ["zadanie", "nowe", "klient", "zlecenie"].forEach((k) => next.delete(k));
      router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  };
  const toggle = (t: TaskItem, done: boolean) =>
    startTransition(async () => {
      setOptimistic({ id: t.id, done });
      const res = await setTaskDoneAction(t.id, done);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDialog({ id: null, defaults: blank })}>
          <Plus data-icon="inline-start" />
          Nowe zadanie
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {optimistic.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={filtered ? "Brak zadań spełniających kryteria" : "Brak otwartych zadań"}
            description={filtered ? "Zmień lub wyczyść filtry." : "Dodaj zadanie, aby niczego nie przeoczyć."}
          />
        ) : (
          <ul className="divide-y">
            {optimistic.map((t) => {
              const done = t.status === "DONE";
              return (
                <li key={t.id} className={cn("flex items-start gap-3 px-4 py-3 sm:px-5", t.overdue && !done && "bg-red-50/60")}>
                  <Checkbox
                    checked={done}
                    onCheckedChange={(v) => toggle(t, v === true)}
                    aria-label={done ? `Oznacz „${t.title}” jako niezakończone` : `Oznacz „${t.title}” jako zakończone`}
                    className="mt-0.5 size-5"
                  />
                  <button
                    type="button"
                    onClick={() => setDialog({ id: t.id, defaults: toForm(t) })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{t.title}</p>
                    {t.description && <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>}
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span className={cn(t.overdue && !done && "font-medium text-red-700", t.isToday && !done && "font-medium text-orange-700")}>
                        {t.dueLabel ?? "Bez terminu"}
                      </span>
                      {t.client && <span>{t.client.label}</span>}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    {t.order && (
                      <Link href={`/zlecenia/${t.order.id}`} className="hidden font-mono text-xs text-primary hover:underline md:inline">
                        {t.order.number}
                      </Link>
                    )}
                    <StatusBadge defs={TASK_PRIORITY} value={t.priority} />
                    <StatusBadge defs={TASK_STATUS} value={t.status} className="hidden sm:inline-flex" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <TaskDialog
        open={dialog !== null}
        onOpenChange={(v) => !v && close()}
        id={dialog?.id ?? null}
        defaults={dialog?.defaults ?? blank}
        clients={clients}
        orders={orders}
      />
    </>
  );
}

function toForm(t: TaskItem): TaskFormValues {
  return {
    title: t.title,
    description: t.description ?? "",
    dueDate: t.dueDate ?? "",
    priority: t.priority as TaskFormValues["priority"],
    status: t.status as TaskFormValues["status"],
    clientId: t.clientId ?? "",
    orderId: t.orderId ?? "",
  };
}
