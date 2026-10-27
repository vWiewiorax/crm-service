import "server-only";
import { clientDisplayName } from "@/lib/client-name";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CLIENT_TYPE, ORDER_STATUS, QUOTE_STATUS } from "@/lib/constants";
import type { ClientInput } from "@/lib/validation/schemas";
import { DomainError } from "./errors";

export const CLIENT_SORTS = [
  { value: "name", label: "Nazwa A-Z" },
  { value: "created_desc", label: "Ostatnio dodani" },
  { value: "value_desc", label: "Wartość zleceń" },
] as const;

export type ClientFilters = { q?: string; type?: string; sort?: string };

export { clientDisplayName };

/** Wartość zleceń klienta: suma netto wszystkich zleceń poza anulowanymi. */
export function ordersValue(orders: { netAmount: number; status: string }[]) {
  return orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.netAmount, 0);
}

export async function listClients(f: ClientFilters) {
  const and: Prisma.ClientWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { companyName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { nip: { contains: q.replace(/[\s-]/g, "") } },
        { address: { contains: q } },
      ],
    });
  }
  if (f.type && (CLIENT_TYPE.values as string[]).includes(f.type)) and.push({ type: f.type });

  const clients = await db.client.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: f.sort === "created_desc" ? { createdAt: "desc" } : { name: "asc" },
    include: { orders: { select: { netAmount: true, status: true, createdDate: true } } },
  });
  const rows = clients.map(({ orders, ...c }) => ({
    ...c,
    displayName: clientDisplayName(c),
    ordersCount: orders.length,
    ordersValue: ordersValue(orders),
    lastOrderDate: orders.reduce<Date | null>((d, o) => (!d || o.createdDate > d ? o.createdDate : d), null),
  }));
  if (f.sort === "value_desc") rows.sort((a, b) => b.ordersValue - a.ordersValue);
  else if (f.sort !== "created_desc") rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "pl"));
  return rows;
}

export async function getClient(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdDate: "desc" }, include: { statusHistory: true } },
      quotes: { orderBy: { issueDate: "desc" } },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }] },
    },
  });
  if (!client) return null;

  const completed = client.orders.filter((o) => o.status === "COMPLETED");
  const stats = {
    ordersCount: client.orders.length,
    ordersValue: ordersValue(client.orders),
    completedValue: completed.reduce((s, o) => s + o.netAmount, 0),
    paidAmount: client.orders.reduce((s, o) => s + o.paidAmount, 0),
    quotesCount: client.quotes.length,
  };

  type TimelineEntry = { date: Date; title: string; description?: string; href: string };
  const timeline: TimelineEntry[] = [];
  for (const o of client.orders) {
    for (const h of o.statusHistory) {
      timeline.push({
        date: h.changedAt,
        title: h.fromStatus
          ? `${o.number}: ${ORDER_STATUS.map[h.fromStatus as keyof typeof ORDER_STATUS.map]?.label ?? h.fromStatus} → ${ORDER_STATUS.map[h.toStatus as keyof typeof ORDER_STATUS.map]?.label ?? h.toStatus}`
          : `Nowe zlecenie ${o.number}`,
        description: h.fromStatus ? (h.note ?? o.title) : o.title,
        href: `/zlecenia/${o.id}`,
      });
    }
  }
  for (const q of client.quotes) {
    timeline.push({ date: q.createdAt, title: `Wycena ${q.number}`, description: q.title, href: `/wyceny/${q.id}` });
    if (q.decidedAt) {
      timeline.push({
        date: q.decidedAt,
        title: `Wycena ${q.number}: ${QUOTE_STATUS.map[q.status as keyof typeof QUOTE_STATUS.map]?.label ?? q.status}`,
        description: q.title,
        href: `/wyceny/${q.id}`,
      });
    }
  }
  timeline.push({ date: client.createdAt, title: "Dodanie klienta do bazy", href: `/klienci/${client.id}` });
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { ...client, displayName: clientDisplayName(client), stats, timeline };
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export async function createClient(input: ClientInput) {
  return db.client.create({ data: input });
}

export async function updateClient(id: string, input: ClientInput) {
  return db.client.update({ where: { id }, data: input });
}

export async function deleteClient(id: string) {
  const counts = await db.client.findUnique({
    where: { id },
    select: { _count: { select: { orders: true, quotes: true } } },
  });
  if (!counts) throw new DomainError("Klient nie istnieje lub został usunięty.");
  if (counts._count.orders > 0 || counts._count.quotes > 0) {
    throw new DomainError(
      "Nie można usunąć klienta, który ma zlecenia lub wyceny. Usuń je najpierw albo pozostaw klienta w bazie.",
    );
  }
  await db.client.delete({ where: { id } });
}

export async function clientOptions() {
  const clients = await db.client.findMany({ select: { id: true, name: true, companyName: true, type: true } });
  return clients
    .map((c) => ({ id: c.id, label: clientDisplayName(c), sublabel: c.type === "COMPANY" ? c.name : undefined }))
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));
}
export type ClientOption = Awaited<ReturnType<typeof clientOptions>>[number];
