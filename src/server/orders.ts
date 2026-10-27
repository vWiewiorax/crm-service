import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES, OPEN_ORDER_STATUSES, ORDER_STATUS, type OrderStatus, type PaymentStatus } from "@/lib/constants";
import { addDays, today } from "@/lib/dates";
import { totalsFromNet } from "@/lib/money";
import type { OrderInput } from "@/lib/validation/schemas";
import { DomainError } from "./errors";
import { nextDocumentNumber, withNumberRetry } from "./numbering";

export const ORDERS_PAGE_SIZE = 15;

export const ORDER_DUE_FILTERS = [
  { value: "overdue", label: "Po terminie" },
  { value: "today", label: "Dziś" },
  { value: "week", label: "Najbliższe 7 dni" },
  { value: "month", label: "Najbliższe 30 dni" },
  { value: "none", label: "Bez terminu" },
] as const;

export const ORDER_SORTS = [
  { value: "created_desc", label: "Data utworzenia: najnowsze" },
  { value: "created_asc", label: "Data utworzenia: najstarsze" },
  { value: "due_asc", label: "Termin: najbliższy" },
  { value: "amount_desc", label: "Kwota: najwyższa" },
  { value: "amount_asc", label: "Kwota: najniższa" },
] as const;

export type OrderFilters = {
  q?: string;
  status?: string;
  clientId?: string;
  due?: string;
  sort?: string;
  page?: number;
};

export function overdueOrderWhere(now = today()): Prisma.OrderWhereInput {
  return { dueDate: { lt: now }, status: { in: OPEN_ORDER_STATUSES } };
}

function buildWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { number: { contains: q } },
        { title: { contains: q } },
        { client: { name: { contains: q } } },
        { client: { companyName: { contains: q } } },
      ],
    });
  }
  if (f.status === "aktywne") and.push({ status: { in: ACTIVE_ORDER_STATUSES } });
  else if (f.status === "otwarte") and.push({ status: { in: OPEN_ORDER_STATUSES } });
  else if (f.status && (ORDER_STATUS.values as string[]).includes(f.status)) and.push({ status: f.status });
  if (f.clientId) and.push({ clientId: f.clientId });
  const now = today();
  switch (f.due) {
    case "overdue":
      and.push(overdueOrderWhere(now));
      break;
    case "today":
      and.push({ dueDate: now });
      break;
    case "week":
      and.push({ dueDate: { gte: now, lte: addDays(now, 7) } });
      break;
    case "month":
      and.push({ dueDate: { gte: now, lte: addDays(now, 30) } });
      break;
    case "none":
      and.push({ dueDate: null });
      break;
  }
  return and.length ? { AND: and } : {};
}

function buildOrderBy(sort?: string): Prisma.OrderOrderByWithRelationInput[] {
  switch (sort) {
    case "created_asc":
      return [{ createdDate: "asc" }, { number: "asc" }];
    case "due_asc":
      return [{ dueDate: { sort: "asc", nulls: "last" } }, { number: "asc" }];
    case "amount_desc":
      return [{ netAmount: "desc" }];
    case "amount_asc":
      return [{ netAmount: "asc" }];
    default:
      return [{ createdDate: "desc" }, { number: "desc" }];
  }
}

export async function listOrders(filters: OrderFilters) {
  const where = buildWhere(filters);
  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const orders = await db.order.findMany({
    where,
    orderBy: buildOrderBy(filters.sort),
    skip: (page - 1) * ORDERS_PAGE_SIZE,
    take: ORDERS_PAGE_SIZE,
    include: { client: { select: { id: true, name: true, companyName: true, type: true } } },
  });
  return { orders, total, page, pageCount };
}

export async function getOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: { orderBy: { position: "asc" } },
      statusHistory: { orderBy: { changedAt: "desc" } },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }] },
      events: { orderBy: { date: "asc" } },
      quote: { select: { id: true, number: true, title: true } },
    },
  });
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

type PaymentFields = { paymentStatus: PaymentStatus; paidAmount: number; paidAt: Date | null };

/** Kwota wpłacona wynika ze statusu płatności (PAID = pełna kwota brutto). */
export function derivePayment(
  input: { netAmount: number; vatRate: string; paymentStatus: PaymentStatus; paidAmount: number },
  previous?: { paymentStatus: string; paidAt: Date | null },
  now: Date = new Date(),
): PaymentFields {
  const { gross } = totalsFromNet(input.netAmount, input.vatRate);
  if (input.paymentStatus === "UNPAID") return { paymentStatus: "UNPAID", paidAmount: 0, paidAt: null };
  const keepDate = previous && previous.paymentStatus === input.paymentStatus ? previous.paidAt : null;
  if (input.paymentStatus === "PAID") return { paymentStatus: "PAID", paidAmount: gross, paidAt: keepDate ?? now };
  return { paymentStatus: "PARTIAL", paidAmount: Math.min(input.paidAmount, gross), paidAt: keepDate ?? now };
}

function completedAtFor(status: OrderStatus, previous?: { status: string; completedAt: Date | null }, now = new Date()) {
  if (status !== "COMPLETED") return null;
  return previous?.status === "COMPLETED" && previous.completedAt ? previous.completedAt : now;
}

export async function createOrder(input: OrderInput) {
  return withNumberRetry(() =>
    db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
      if (!client) throw new DomainError("Wybrany klient nie istnieje.");
      const number = await nextDocumentNumber(tx, "order", input.createdDate.getUTCFullYear());
      return tx.order.create({
        data: {
          ...input,
          number,
          ...derivePayment(input),
          completedAt: completedAtFor(input.status),
          statusHistory: { create: { fromStatus: null, toStatus: input.status, note: "Utworzenie zlecenia" } },
        },
      });
    }),
  );
}

export async function updateOrder(id: string, input: OrderInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new DomainError("Zlecenie nie istnieje lub zostało usunięte.");
    const client = await tx.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
    if (!client) throw new DomainError("Wybrany klient nie istnieje.");
    const statusChanged = current.status !== input.status;
    return tx.order.update({
      where: { id },
      data: {
        ...input,
        ...derivePayment(input, current),
        completedAt: completedAtFor(input.status, current),
        ...(statusChanged && {
          statusHistory: { create: { fromStatus: current.status, toStatus: input.status, note: "Edycja zlecenia" } },
        }),
      },
    });
  });
}

export async function changeOrderStatus(id: string, status: OrderStatus, note: string | null) {
  return db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new DomainError("Zlecenie nie istnieje lub zostało usunięte.");
    if (current.status === status) throw new DomainError("Zlecenie ma już ten status.");
    return tx.order.update({
      where: { id },
      data: {
        status,
        completedAt: completedAtFor(status, current),
        statusHistory: { create: { fromStatus: current.status, toStatus: status, note } },
      },
    });
  });
}

export async function deleteOrder(id: string) {
  await db.order.delete({ where: { id } });
}

export async function orderOptions() {
  return db.order.findMany({
    orderBy: { createdDate: "desc" },
    select: { id: true, number: true, title: true, clientId: true, status: true },
  });
}
