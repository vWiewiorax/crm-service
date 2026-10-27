/**
 * Konwencja: pola "dateOnly" (terminy, daty dokumentów) przechowujemy jako północ UTC danego dnia
 * i formatujemy w strefie UTC. Bieżący dzień liczony jest w strefie Europe/Warsaw.
 */
export const APP_TIME_ZONE = "Europe/Warsaw";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const longDateFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pl-PL", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", month: "short", year: "numeric" });
const monthLongFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "UTC", month: "long", year: "numeric" });

/** Dzisiejsza data (YYYY-MM-DD) w strefie Europe/Warsaw. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** Dzień (YYYY-MM-DD) w strefie Europe/Warsaw dla dowolnego znacznika czasu. */
export function localDayISO(date: Date): string {
  return todayISO(date);
}

export function today(now: Date = new Date()): Date {
  return fromISODate(todayISO(now));
}

export function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = fromISODate(value);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** Poniedziałek tygodnia, w którym jest data. */
export function startOfWeek(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return addDays(date, -day);
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function formatDate(date: Date | null | undefined): string {
  return date ? dateFmt.format(date) : "-";
}

export function formatLongDate(date: Date | null | undefined): string {
  return date ? longDateFmt.format(date) : "-";
}

export function formatDateTime(date: Date | null | undefined): string {
  return date ? dateTimeFmt.format(date) : "-";
}

export function formatMonth(key: string): string {
  return monthFmt.format(fromISODate(`${key}-01`));
}

export function formatMonthLong(date: Date): string {
  return monthLongFmt.format(date);
}

export function diffInDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}
