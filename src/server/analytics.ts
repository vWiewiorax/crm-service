import "server-only";
import { db } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES, OPEN_ORDER_STATUSES, ORDER_STATUS } from "@/lib/constants";
import { addMonths, fromISODate, localDayISO, startOfMonth, today } from "@/lib/dates";
import { clientDisplayName, ordersValue } from "./clients";
import { overdueOrderWhere } from "./orders";
import { OPEN_QUOTE_STATUSES, syncQuoteExpiry } from "./quotes";
import { overdueTaskWhere } from "./tasks";

/**
 * Definicje używane w dashboardzie i raportach:
 * - "Przychód (zakończone)" = suma netto zleceń o statusie Zakończone, wg miesiąca zakończenia.
 * - "Wpłaty" = kwoty brutto faktycznie oznaczone jako wpłacone, wg daty wpłaty.
 * - "Wartość zleceń" = suma netto zleceń (bez anulowanych), wg daty utworzenia zlecenia.
 * To zestawienia zarządcze, a nie ewidencja księgowa.
 */

export type MonthPoint = { month: string; revenue: number; paid: number; ordersValue: number };

function monthKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) keys.push(d.toISOString().slice(0, 7));
  return keys;
}

async function openQuotesValue() {
  await syncQuoteExpiry();
  const agg = await db.quote.aggregate({
    where: { status: { in: OPEN_QUOTE_STATUSES } },
    _sum: { netTotal: true },
    _count: true,
  });
  return { value: agg._sum.netTotal ?? 0, count: agg._count };
}

async function monthlySeries(from: Date, to: Date): Promise<MonthPoint[]> {
  const toExclusiveIso = localDayISO(to);
  const fromIso = localDayISO(from);
  const [completed, paid, created] = await Promise.all([
    db.order.findMany({
      where: { status: "COMPLETED", completedAt: { not: null } },
      select: { completedAt: true, netAmount: true },
    }),
    db.order.findMany({ where: { paidAt: { not: null }, paidAmount: { gt: 0 } }, select: { paidAt: true, paidAmount: true } }),
    db.order.findMany({
      where: { status: { not: "CANCELLED" }, createdDate: { gte: from, lte: to } },
      select: { createdDate: true, netAmount: true },
    }),
  ]);
  const keys = monthKeys(from, to);
  const map = new Map(keys.map((k) => [k, { month: k, revenue: 0, paid: 0, ordersValue: 0 }]));
  const inRange = (iso: string) => iso >= fromIso && iso <= toExclusiveIso;
  for (const o of completed) {
    const iso = localDayISO(o.completedAt!);
    if (inRange(iso)) map.get(iso.slice(0, 7))!.revenue += o.netAmount;
  }
  for (const o of paid) {
    const iso = localDayISO(o.paidAt!);
    if (inRange(iso)) map.get(iso.slice(0, 7))!.paid += o.paidAmount;
  }
  for (const o of created) {
    const iso = o.createdDate.toISOString().slice(0, 10);
    map.get(iso.slice(0, 7))!.ordersValue += o.netAmount;
  }
  return [...map.values()];
}

export async function getDashboard() {
  const now = today();
  const monthStart = startOfMonth(now);
  const sixMonthsAgo = addMonths(monthStart, -5);
  const currentMonth = now.toISOString().slice(0, 7);

  const [activeOrders, newInquiries, quotes, overdueTasksCount, series, statusGroups] = await Promise.all([
    db.order.count({ where: { status: { in: ACTIVE_ORDER_STATUSES } } }),
    db.order.count({ where: { status: "NEW" } }),
    openQuotesValue(),
    db.task.count({ where: overdueTaskWhere(now) }),
    monthlySeries(sixMonthsAgo, now),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const revenueThisMonth = series.find((p) => p.month === currentMonth)?.revenue ?? 0;
  const revenueSixMonths = series.reduce((s, p) => s + p.revenue, 0);

  const ordersByStatus = ORDER_STATUS.list.map((s) => ({
    status: s.value,
    label: s.label,
    tone: s.tone,
    count: statusGroups.find((g) => g.status === s.value)?._count ?? 0,
  }));

  const clientSelect = { select: { name: true, companyName: true, type: true } } as const;
  const [overdueOrders, pendingQuotes, tasksToday, overdueTasks, ordersWithoutDue, recentOrders] = await Promise.all([
    db.order.findMany({
      where: overdueOrderWhere(now),
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { client: clientSelect },
    }),
    db.quote.findMany({
      where: { status: "SENT" },
      orderBy: { validUntil: "asc" },
      take: 6,
      include: { client: clientSelect },
    }),
    db.task.findMany({
      where: { status: { not: "DONE" }, dueDate: now },
      orderBy: { priority: "asc" },
      take: 6,
      include: { client: clientSelect },
    }),
    db.task.findMany({
      where: overdueTaskWhere(now),
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { client: clientSelect },
    }),
    db.order.findMany({
      where: { dueDate: null, status: { in: OPEN_ORDER_STATUSES } },
      orderBy: { createdDate: "asc" },
      take: 6,
      include: { client: clientSelect },
    }),
    db.order.findMany({ orderBy: { updatedAt: "desc" }, take: 8, include: { client: clientSelect } }),
  ]);

  return {
    kpi: {
      activeOrders,
      newInquiries,
      openQuotesValue: quotes.value,
      openQuotesCount: quotes.count,
      revenueThisMonth,
      revenueSixMonths,
      overdueTasks: overdueTasksCount,
    },
    series,
    ordersByStatus,
    attention: {
      overdueOrders: overdueOrders.map((o) => ({ ...o, clientName: clientDisplayName(o.client) })),
      pendingQuotes: pendingQuotes.map((q) => ({ ...q, clientName: clientDisplayName(q.client) })),
      tasksToday: tasksToday.map((t) => ({ ...t, clientName: t.client ? clientDisplayName(t.client) : null })),
      overdueTasks: overdueTasks.map((t) => ({ ...t, clientName: t.client ? clientDisplayName(t.client) : null })),
      ordersWithoutDue: ordersWithoutDue.map((o) => ({ ...o, clientName: clientDisplayName(o.client) })),
    },
    recentOrders: recentOrders.map((o) => ({ ...o, clientName: clientDisplayName(o.client) })),
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export function defaultReportRange(now = today()) {
  return { from: fromISODate(`${now.getUTCFullYear()}-01-01`), to: now };
}

export async function getReport(from: Date, to: Date) {
  const [series, quotes, orders, completedOrders, paidOrders] = await Promise.all([
    monthlySeries(from, to),
    openQuotesValue(),
    db.order.findMany({
      where: { createdDate: { gte: from, lte: to } },
      select: {
        status: true,
        netAmount: true,
        category: true,
        clientId: true,
        paidAmount: true,
        client: { select: { id: true, name: true, companyName: true, type: true } },
      },
    }),
    db.order.findMany({
      where: { status: "COMPLETED", completedAt: { not: null } },
      select: { completedAt: true, netAmount: true },
    }),
    db.order.findMany({ where: { paidAt: { not: null } }, select: { paidAt: true, paidAmount: true } }),
  ]);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  const inRange = (d: Date) => {
    const iso = localDayISO(d);
    return iso >= fromIso && iso <= toIso;
  };
  const completedInRange = completedOrders.filter((o) => inRange(o.completedAt!));
  const revenue = completedInRange.reduce((s, o) => s + o.netAmount, 0);
  const paid = paidOrders.filter((o) => inRange(o.paidAt!)).reduce((s, o) => s + o.paidAmount, 0);

  const byStatus = ORDER_STATUS.list.map((s) => {
    const list = orders.filter((o) => o.status === s.value);
    return { status: s.value, label: s.label, tone: s.tone, count: list.length, value: list.reduce((a, o) => a + o.netAmount, 0) };
  });

  const nonCancelled = orders.filter((o) => o.status !== "CANCELLED");
  const categoryMap = new Map<string, { category: string; count: number; value: number }>();
  for (const o of nonCancelled) {
    const row = categoryMap.get(o.category) ?? { category: o.category, count: 0, value: 0 };
    row.count += 1;
    row.value += o.netAmount;
    categoryMap.set(o.category, row);
  }
  const categories = [...categoryMap.values()].sort((a, b) => b.count - a.count || b.value - a.value);

  const clientMap = new Map<
    string,
    { id: string; name: string; count: number; value: number; completedValue: number; paid: number }
  >();
  for (const o of nonCancelled) {
    const row = clientMap.get(o.clientId) ?? {
      id: o.clientId,
      name: clientDisplayName(o.client),
      count: 0,
      value: 0,
      completedValue: 0,
      paid: 0,
    };
    row.count += 1;
    row.value += o.netAmount;
    if (o.status === "COMPLETED") row.completedValue += o.netAmount;
    row.paid += o.paidAmount;
    clientMap.set(o.clientId, row);
  }
  const clients = [...clientMap.values()].sort((a, b) => b.value - a.value);

  return {
    summary: {
      ordersValue: ordersValue(orders),
      ordersCount: nonCancelled.length,
      revenue,
      completedCount: completedInRange.length,
      paid,
      openQuotesValue: quotes.value,
      openQuotesCount: quotes.count,
    },
    series,
    byStatus,
    categories,
    clients,
  };
}
export type ReportData = Awaited<ReturnType<typeof getReport>>;
