import type { Metadata } from "next";
import { FiltersBar, SearchFilter, SelectFilter } from "@/components/shared/filters";
import { PageHeader } from "@/components/shared/page-header";
import { TaskList, type TaskItem } from "@/components/tasks/task-list";
import { clientDisplayName } from "@/lib/client-name";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { diffInDays, formatDate, toISODate, today } from "@/lib/dates";
import { clientOptions } from "@/server/clients";
import { orderOptions } from "@/server/orders";
import { getTask, listTasks, TASK_DUE_FILTERS, TASK_SORTS, type TaskRow } from "@/server/tasks";

export const metadata: Metadata = { title: "Zadania" };

type SP = { q?: string; status?: string; priorytet?: string; termin?: string; sort?: string; zadanie?: string; nowe?: string; klient?: string; zlecenie?: string };

const STATUS_OPTIONS = [{ value: "open", label: "Niezakończone" }, { value: "all", label: "Wszystkie" }, ...TASK_STATUS.list];

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [tasks, clients, orders, opened] = await Promise.all([
    listTasks({ q: sp.q, status: sp.status, priority: sp.priorytet, due: sp.termin, sort: sp.sort }),
    clientOptions(),
    orderOptions(),
    sp.zadanie ? getTask(sp.zadanie) : null,
  ]);
  const now = today();
  const toItem = (t: TaskRow): TaskItem => {
    const days = t.dueDate ? diffInDays(t.dueDate, now) : null;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.dueDate ? toISODate(t.dueDate) : null,
      dueLabel: t.dueDate
        ? `${formatDate(t.dueDate)}${days === 0 ? " (dziś)" : days! < 0 && t.status !== "DONE" ? ` (zaległe ${-days!} d.)` : ""}`
        : null,
      overdue: days !== null && days < 0 && t.status !== "DONE",
      isToday: days === 0,
      priority: t.priority,
      status: t.status,
      client: t.client ? { id: t.client.id, label: clientDisplayName(t.client) } : null,
      order: t.order,
      clientId: t.clientId,
      orderId: t.orderId,
    };
  };
  const orderOpts = orders.map((o) => ({ id: o.id, label: `${o.number} · ${o.title}`, clientId: o.clientId }));
  const prefillOrder = orders.find((o) => o.id === sp.zlecenie);
  const newDefaults =
    sp.nowe === "1"
      ? {
          title: "",
          description: "",
          dueDate: "",
          priority: "NORMAL" as const,
          status: "TODO" as const,
          clientId: prefillOrder?.clientId ?? (clients.some((c) => c.id === sp.klient) ? sp.klient! : ""),
          orderId: prefillOrder?.id ?? "",
        }
      : null;
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "DONE").length;

  return (
    <>
      <PageHeader
        title="Zadania"
        description={overdue ? `Masz ${overdue} zaległych zadań. Zaległe są wyróżnione na czerwono.` : "Lista rzeczy do zrobienia, powiązanych z klientami i zleceniami."}
      />
      <FiltersBar className="mb-4">
        <SearchFilter placeholder="Szukaj w zadaniach" />
        <SelectFilter name="status" label="Status" options={STATUS_OPTIONS} defaultValue="open" />
        <SelectFilter name="priorytet" label="Priorytet" allLabel="Każdy priorytet" options={TASK_PRIORITY.list} />
        <SelectFilter name="termin" label="Termin" allLabel="Dowolny termin" options={TASK_DUE_FILTERS} />
        <SelectFilter name="sort" label="Sortowanie" options={TASK_SORTS} defaultValue="due" />
      </FiltersBar>
      <TaskList
        key={`${sp.zadanie ?? ""}-${sp.nowe ?? ""}`}
        tasks={tasks.map(toItem)}
        clients={clients}
        orders={orderOpts}
        openTask={opened ? toItem(opened) : null}
        newDefaults={newDefaults}
        filtered={Boolean(sp.q || sp.priorytet || sp.termin || (sp.status && sp.status !== "open"))}
      />
    </>
  );
}
