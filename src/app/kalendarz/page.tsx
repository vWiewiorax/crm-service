import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageHeader } from "@/components/shared/page-header";
import { addDays, addMonths, fromISODate, startOfMonth, toISODate, today } from "@/lib/dates";
import { CALENDAR_KINDS, getCalendarItems } from "@/server/calendar";
import { clientOptions } from "@/server/clients";
import { orderOptions } from "@/server/orders";

export const metadata: Metadata = { title: "Kalendarz" };

const monthFmt = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" });

function mondayOf(d: Date) {
  return addDays(d, -((d.getUTCDay() + 6) % 7));
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ widok?: string; data?: string }> }) {
  const sp = await searchParams;
  const view = sp.widok === "tydzien" ? "week" : "month";
  const now = today();
  const anchor = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) && !Number.isNaN(fromISODate(sp.data).getTime()) ? fromISODate(sp.data) : now;

  let from: Date, to: Date, prev: Date, next: Date, title: string;
  if (view === "week") {
    from = mondayOf(anchor);
    to = addDays(from, 6);
    prev = addDays(from, -7);
    next = addDays(from, 7);
    title = `${shortFmt.format(from)} - ${shortFmt.format(to)} ${to.getUTCFullYear()}`;
  } else {
    const first = startOfMonth(anchor);
    from = mondayOf(first);
    to = addDays(mondayOf(addDays(addMonths(first, 1), -1)), 6);
    prev = addMonths(first, -1);
    next = addMonths(first, 1);
    title = monthFmt.format(first);
  }
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(toISODate(d));
  const [items, clients, orders] = await Promise.all([getCalendarItems(from, to), clientOptions(), orderOptions()]);
  const widok = view === "week" ? "tydzien" : "miesiac";
  const href = (date: Date, w = widok) => `/kalendarz?widok=${w}&data=${toISODate(date)}`;

  return (
    <>
      <PageHeader title="Kalendarz" description="Terminy zleceń, wizyty, zadania i przypomnienia z bazy aplikacji. Bez synchronizacji z kalendarzami zewnętrznymi." />
      <CalendarView
        key={`${view}-${days[0]}`}
        view={view}
        title={title}
        days={days}
        monthKey={toISODate(startOfMonth(anchor)).slice(0, 7)}
        todayIso={toISODate(now)}
        items={items}
        kinds={CALENDAR_KINDS}
        prevHref={href(prev)}
        nextHref={href(next)}
        todayHref={href(now)}
        monthHref={href(anchor, "miesiac")}
        weekHref={href(anchor, "tydzien")}
        clients={clients}
        orders={orders.map((o) => ({ id: o.id, label: `${o.number} · ${o.title}`, clientId: o.clientId }))}
      />
    </>
  );
}
