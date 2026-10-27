import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { addDays, today } from "@/lib/dates";
import type { TaskInput } from "@/lib/validation/schemas";
import { DomainError } from "./errors";

export const TASK_DUE_FILTERS = [
  { value: "overdue", label: "Zaległe" },
  { value: "today", label: "Dziś" },
  { value: "week", label: "Najbliższe 7 dni" },
  { value: "none", label: "Bez terminu" },
] as const;

export const TASK_SORTS = [
  { value: "due", label: "Termin" },
  { value: "priority", label: "Priorytet" },
  { value: "created", label: "Ostatnio dodane" },
] as const;

export type TaskFilters = { status?: string; priority?: string; due?: string; sort?: string; q?: string };

export function overdueTaskWhere(now = today()): Prisma.TaskWhereInput {
  return { status: { not: "DONE" }, dueDate: { lt: now } };
}

const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

export async function listTasks(f: TaskFilters) {
  const and: Prisma.TaskWhereInput[] = [];
  const now = today();
  const status = f.status ?? "open";
  if (status === "open") and.push({ status: { not: "DONE" } });
  else if ((TASK_STATUS.values as string[]).includes(status)) and.push({ status });
  if (f.priority && (TASK_PRIORITY.values as string[]).includes(f.priority)) and.push({ priority: f.priority });
  if (f.q?.trim()) and.push({ OR: [{ title: { contains: f.q.trim() } }, { description: { contains: f.q.trim() } }] });
  switch (f.due) {
    case "overdue":
      and.push(overdueTaskWhere(now));
      break;
    case "today":
      and.push({ dueDate: now });
      break;
    case "week":
      and.push({ dueDate: { gte: now, lte: addDays(now, 7) } });
      break;
    case "none":
      and.push({ dueDate: null });
      break;
  }
  const tasks = await db.task.findMany({
    where: and.length ? { AND: and } : {},
    include: {
      client: { select: { id: true, name: true, companyName: true, type: true } },
      order: { select: { id: true, number: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (f.sort === "created") return tasks;
  const dueValue = (d: Date | null) => (d ? d.getTime() : Number.MAX_SAFE_INTEGER);
  return [...tasks].sort((a, b) => {
    if ((a.status === "DONE") !== (b.status === "DONE")) return a.status === "DONE" ? 1 : -1;
    if (f.sort === "priority") {
      const p = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      return p !== 0 ? p : dueValue(a.dueDate) - dueValue(b.dueDate);
    }
    const d = dueValue(a.dueDate) - dueValue(b.dueDate);
    return d !== 0 ? d : PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}
export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

async function validateRelations(input: TaskInput) {
  let clientId = input.clientId;
  if (input.orderId) {
    const order = await db.order.findUnique({ where: { id: input.orderId }, select: { clientId: true } });
    if (!order) throw new DomainError("Wybrane zlecenie nie istnieje.");
    if (clientId && clientId !== order.clientId) {
      throw new DomainError("Wybrane zlecenie należy do innego klienta.");
    }
    clientId = order.clientId;
  }
  if (clientId) {
    const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new DomainError("Wybrany klient nie istnieje.");
  }
  return { ...input, clientId };
}

export async function createTask(input: TaskInput) {
  const data = await validateRelations(input);
  return db.task.create({ data: { ...data, completedAt: data.status === "DONE" ? new Date() : null } });
}

export async function updateTask(id: string, input: TaskInput) {
  const data = await validateRelations(input);
  const current = await db.task.findUnique({ where: { id } });
  if (!current) throw new DomainError("Zadanie nie istnieje lub zostało usunięte.");
  return db.task.update({
    where: { id },
    data: {
      ...data,
      completedAt: data.status === "DONE" ? (current.completedAt ?? new Date()) : null,
    },
  });
}

export async function setTaskDone(id: string, done: boolean) {
  return db.task.update({
    where: { id },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  });
}

export async function deleteTask(id: string) {
  await db.task.delete({ where: { id } });
}

export async function getTask(id: string) {
  return db.task.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, companyName: true, type: true } },
      order: { select: { id: true, number: true, title: true } },
    },
  });
}
