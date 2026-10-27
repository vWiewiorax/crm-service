import "server-only";
import { db } from "@/lib/db";
import { ORDER_STATUS, TASK_PRIORITY, type Tone } from "@/lib/constants";
import { toISODate } from "@/lib/dates";
import type { EventInput } from "@/lib/validation/schemas";
import { clientDisplayName } from "./clients";
import { DomainError } from "./errors";

export const CALENDAR_KINDS = [
  { value: "order", label: "Terminy zleceń", tone: "navy" },
  { value: "visit", label: "Wizyty", tone: "violet" },
  { value: "task", label: "Zadania", tone: "orange" },
  { value: "reminder", label: "Przypomnienia", tone: "blue" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];
export type CalendarKind = (typeof CALENDAR_KINDS)[number]["value"];

export type CalendarItem = {
  key: string;
  id: string;
  kind: CalendarKind;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  subtitle: string | null;
  statusLabel: string | null;
  done: boolean;
  href: string | null;
  // pola do edycji wydarzeń w oknie dialogowym
  event?: {
    type: string;
    location: string | null;
    notes: string | null;
    clientId: string | null;
    orderId: string | null;
  };
  task?: {
    description: string | null;
    priority: string;
    status: string;
    clientId: string | null;
    orderId: string | null;
  };
};

export async function getCalendarItems(from: Date, to: Date): Promise<CalendarItem[]> {
  const clientSelect = { select: { name: true, companyName: true, type: true } } as const;
  const [orders, tasks, events] = await Promise.all([
    db.order.findMany({
      where: { dueDate: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      include: { client: clientSelect },
    }),
    db.task.findMany({
      where: { dueDate: { gte: from, lte: to } },
      include: { client: clientSelect, order: { select: { number: true } } },
    }),
    db.calendarEvent.findMany({
      where: { date: { gte: from, lte: to } },
      include: { client: clientSelect, order: { select: { number: true } } },
    }),
  ]);

  const items: CalendarItem[] = [
    ...orders.map<CalendarItem>((o) => ({
      key: `order-${o.id}`,
      id: o.id,
      kind: "order",
      title: `${o.number} · ${o.title}`,
      date: toISODate(o.dueDate!),
      startTime: null,
      endTime: null,
      subtitle: clientDisplayName(o.client),
      statusLabel: ORDER_STATUS.map[o.status as keyof typeof ORDER_STATUS.map]?.label ?? o.status,
      done: o.status === "COMPLETED",
      href: `/zlecenia/${o.id}`,
    })),
    ...tasks.map<CalendarItem>((t) => ({
      key: `task-${t.id}`,
      id: t.id,
      kind: "task",
      title: t.title,
      date: toISODate(t.dueDate!),
      startTime: null,
      endTime: null,
      subtitle: [t.order?.number, t.client ? clientDisplayName(t.client) : null].filter(Boolean).join(" · ") || null,
      statusLabel: `Priorytet: ${TASK_PRIORITY.map[t.priority as keyof typeof TASK_PRIORITY.map]?.label ?? t.priority}`,
      done: t.status === "DONE",
      href: t.orderId ? `/zlecenia/${t.orderId}` : null,
      task: {
        description: t.description,
        priority: t.priority,
        status: t.status,
        clientId: t.clientId,
        orderId: t.orderId,
      },
    })),
    ...events.map<CalendarItem>((e) => ({
      key: `event-${e.id}`,
      id: e.id,
      kind: e.type === "VISIT" ? "visit" : "reminder",
      title: e.title,
      date: toISODate(e.date),
      startTime: e.startTime,
      endTime: e.endTime,
      subtitle: [e.order?.number, e.client ? clientDisplayName(e.client) : null].filter(Boolean).join(" · ") || null,
      statusLabel: e.location,
      done: false,
      href: e.orderId ? `/zlecenia/${e.orderId}` : e.clientId ? `/klienci/${e.clientId}` : null,
      event: { type: e.type, location: e.location, notes: e.notes, clientId: e.clientId, orderId: e.orderId },
    })),
  ];
  return items.sort((a, b) =>
    a.date === b.date ? (a.startTime ?? "99").localeCompare(b.startTime ?? "99") : a.date.localeCompare(b.date),
  );
}

async function resolveRelations(input: EventInput) {
  let clientId = input.clientId;
  if (input.orderId) {
    const order = await db.order.findUnique({ where: { id: input.orderId }, select: { clientId: true } });
    if (!order) throw new DomainError("Wybrane zlecenie nie istnieje.");
    if (clientId && clientId !== order.clientId) throw new DomainError("Wybrane zlecenie należy do innego klienta.");
    clientId = order.clientId;
  }
  return { ...input, clientId };
}

export async function createEvent(input: EventInput) {
  return db.calendarEvent.create({ data: await resolveRelations(input) });
}

export async function updateEvent(id: string, input: EventInput) {
  return db.calendarEvent.update({ where: { id }, data: await resolveRelations(input) });
}

export async function deleteEvent(id: string) {
  await db.calendarEvent.delete({ where: { id } });
}

export async function reschedule(kind: "order" | "task" | "event", id: string, date: Date) {
  if (kind === "order") {
    const order = await db.order.findUnique({ where: { id }, select: { createdDate: true } });
    if (!order) throw new DomainError("Zlecenie nie istnieje.");
    if (date < order.createdDate) {
      throw new DomainError("Termin realizacji nie może być wcześniejszy niż data utworzenia zlecenia.");
    }
    return db.order.update({ where: { id }, data: { dueDate: date } });
  }
  if (kind === "task") return db.task.update({ where: { id }, data: { dueDate: date } });
  return db.calendarEvent.update({ where: { id }, data: { date } });
}
