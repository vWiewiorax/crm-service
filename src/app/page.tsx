import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  FileClock,
  Inbox,
  ListTodo,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CHART } from "@/components/charts/colors";
import { MonthlyMoneyChart, StatusBarChart } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { ORDER_STATUS, TASK_PRIORITY } from "@/lib/constants";
import { diffInDays, formatDate, formatDateTime, formatLongDate, today } from "@/lib/dates";
import { formatMoney, pluralize } from "@/lib/format";
import { getDashboard } from "@/server/analytics";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboard();
  const now = today();
  const { kpi, attention } = data;
  const hasRevenue = data.series.some((p) => p.revenue > 0 || p.paid > 0);
  const hasOrders = data.ordersByStatus.some((s) => s.count > 0);
  const attentionCount =
    attention.overdueOrders.length +
    attention.pendingQuotes.length +
    attention.tasksToday.length +
    attention.overdueTasks.length +
    attention.ordersWithoutDue.length;

  return (
    <>
      <PageHeader title="Dashboard" description={`Sytuacja firmy na dzień ${formatLongDate(now)}.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Aktywne zlecenia"
          value={kpi.activeOrders}
          hint="Do wyceny, oczekujące, zaplanowane i w realizacji"
          icon={ClipboardList}
          href="/zlecenia?status=aktywne"
        />
        <StatCard
          label="Nowe zapytania"
          value={kpi.newInquiries}
          hint="Zlecenia o statusie Nowe"
          icon={Inbox}
          accent="blue"
          href="/zlecenia?status=NEW"
        />
        <StatCard
          label="Otwarte wyceny"
          value={formatMoney(kpi.openQuotesValue)}
          hint={`${kpi.openQuotesCount} ${pluralize(kpi.openQuotesCount, "wycena", "wyceny", "wycen")} roboczych i wysłanych (netto)`}
          icon={FileClock}
          accent="orange"
          href="/wyceny?status=SENT"
        />
        <StatCard
          label="Przychód w tym miesiącu"
          value={formatMoney(kpi.revenueThisMonth)}
          hint={`Zakończone zlecenia, netto. 6 mies.: ${formatMoney(kpi.revenueSixMonths)}`}
          icon={BadgeCheck}
          accent="green"
          href="/raporty"
        />
        <StatCard
          label="Zaległe zadania"
          value={kpi.overdueTasks}
          hint={kpi.overdueTasks > 0 ? "Termin minął, zadanie niezakończone" : "Brak zaległości"}
          icon={AlertTriangle}
          accent={kpi.overdueTasks > 0 ? "red" : "neutral"}
          emphasize={kpi.overdueTasks > 0}
          href="/zadania?termin=overdue"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          title="Przychód według miesięcy"
          description="Netto z zakończonych zleceń (wg daty zakończenia) oraz faktycznie otrzymane wpłaty brutto, ostatnie 6 miesięcy"
        >
          {hasRevenue ? (
            <MonthlyMoneyChart
              data={data.series}
              series={[
                { key: "revenue", label: "Przychód (netto)", color: CHART.navy },
                { key: "paid", label: "Wpłaty (brutto)", color: CHART.green },
              ]}
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="Brak przychodu w ostatnich miesiącach"
              description="Wykres pojawi się po oznaczeniu pierwszych zleceń jako zakończone."
            />
          )}
        </SectionCard>
        <SectionCard className="xl:col-span-2" title="Zlecenia według statusu" description="Liczba wszystkich zleceń w bazie">
          {hasOrders ? (
            <StatusBarChart data={data.ordersByStatus} valueKey="count" />
          ) : (
            <EmptyState icon={ClipboardList} title="Brak zleceń" description="Dodaj pierwsze zlecenie, aby zobaczyć zestawienie." />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <SectionCard
          className="xl:col-span-3"
          title="Wymaga uwagi"
          description={attentionCount ? "Kliknij pozycję, aby przejść do rekordu" : undefined}
          bodyClassName="p-0"
        >
          {attentionCount === 0 ? (
            <EmptyState icon={BadgeCheck} title="Wszystko pod kontrolą" description="Brak zaległych terminów i spraw oczekujących." />
          ) : (
            <div className="divide-y">
              <AttentionGroup title="Zaległe zadania" tone="red" count={attention.overdueTasks.length}>
                {attention.overdueTasks.map((t) => (
                  <AttentionRow
                    key={t.id}
                    href={`/zadania?zadanie=${t.id}`}
                    title={t.title}
                    subtitle={t.clientName ?? "Zadanie wewnętrzne"}
                    right={<span className="text-red-700">{overdueLabel(t.dueDate!, now)}</span>}
                  />
                ))}
              </AttentionGroup>
              <AttentionGroup title="Zlecenia po terminie" tone="red" count={attention.overdueOrders.length}>
                {attention.overdueOrders.map((o) => (
                  <AttentionRow
                    key={o.id}
                    href={`/zlecenia/${o.id}`}
                    title={`${o.number} · ${o.title}`}
                    subtitle={o.clientName}
                    right={<span className="text-red-700">{overdueLabel(o.dueDate!, now)}</span>}
                  />
                ))}
              </AttentionGroup>
              <AttentionGroup title="Zadania na dziś" tone="orange" count={attention.tasksToday.length}>
                {attention.tasksToday.map((t) => (
                  <AttentionRow
                    key={t.id}
                    href={`/zadania?zadanie=${t.id}`}
                    title={t.title}
                    subtitle={t.clientName ?? "Zadanie wewnętrzne"}
                    right={<StatusBadge defs={TASK_PRIORITY} value={t.priority} />}
                  />
                ))}
              </AttentionGroup>
              <AttentionGroup title="Wyceny czekające na decyzję klienta" tone="orange" count={attention.pendingQuotes.length}>
                {attention.pendingQuotes.map((q) => (
                  <AttentionRow
                    key={q.id}
                    href={`/wyceny/${q.id}`}
                    title={`${q.number} · ${q.title}`}
                    subtitle={`${q.clientName} · ${formatMoney(q.netTotal)} netto`}
                    right={<span className="text-muted-foreground">ważna do {formatDate(q.validUntil)}</span>}
                  />
                ))}
              </AttentionGroup>
              <AttentionGroup title="Zlecenia bez terminu realizacji" tone="neutral" count={attention.ordersWithoutDue.length}>
                {attention.ordersWithoutDue.map((o) => (
                  <AttentionRow
                    key={o.id}
                    href={`/zlecenia/${o.id}`}
                    title={`${o.number} · ${o.title}`}
                    subtitle={o.clientName}
                    right={<StatusBadge defs={ORDER_STATUS} value={o.status} />}
                  />
                ))}
              </AttentionGroup>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="xl:col-span-2"
          title="Ostatnia aktywność"
          description="Ostatnio utworzone i zmienione zlecenia"
          action={
            <Link href="/zlecenia" className="text-xs font-medium text-primary hover:underline">
              Wszystkie
            </Link>
          }
          bodyClassName="p-0"
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState compact icon={CalendarClock} title="Brak aktywności" />
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((o) => {
                const isNew = o.updatedAt.getTime() - o.createdAt.getTime() < 60_000;
                return (
                  <li key={o.id}>
                    <Link href={`/zlecenia/${o.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.number} · {o.clientName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {isNew ? "Utworzono" : "Zmieniono"} {formatDateTime(o.updatedAt)}
                        </p>
                      </div>
                      <StatusBadge defs={ORDER_STATUS} value={o.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
      <ListTodoHint />
    </>
  );
}

function overdueLabel(due: Date, now: Date) {
  const days = diffInDays(now, due);
  return `${days} ${pluralize(days, "dzień", "dni", "dni")} po terminie`;
}

function AttentionGroup({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: "red" | "orange" | "neutral";
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-5 py-1.5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        <ToneBadge tone={tone} className="h-5 px-2">
          {count}
        </ToneBadge>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function AttentionRow({
  href,
  title,
  subtitle,
  right,
}: {
  href: string;
  title: string;
  subtitle: string;
  right: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-2 hover:bg-muted/50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="shrink-0 text-xs">{right}</div>
      </Link>
    </li>
  );
}

function ListTodoHint() {
  return (
    <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
      <ListTodo className="size-3.5" />
      Przychód liczony jest z zakończonych zleceń (netto). To zestawienie zarządcze, nie ewidencja księgowa.
    </p>
  );
}
