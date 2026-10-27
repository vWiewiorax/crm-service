import { vatPercent } from "./money";

const currencyFmt = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
});
const compactFmt = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 });

export function formatMoney(grosze: number): string {
  return currencyFmt.format(grosze / 100);
}

export function formatMoneyShort(grosze: number): string {
  return compactFmt.format(Math.round(grosze / 100));
}

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export function formatVat(rate: string): string {
  return rate === "zw" ? "zw." : `${vatPercent(rate)}%`;
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
