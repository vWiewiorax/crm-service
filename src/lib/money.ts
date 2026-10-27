import type { VatRate } from "./constants";

/**
 * Jedyne miejsce z logiką obliczeń kwot. Wszystkie kwoty w groszach (liczby całkowite).
 */

export function vatPercent(rate: string): number {
  if (rate === "zw") return 0;
  const n = Number(rate);
  return Number.isFinite(n) ? n : 0;
}

export function vatFromNet(net: number, rate: string): number {
  return Math.round((net * vatPercent(rate)) / 100);
}

export type Totals = { net: number; vat: number; gross: number };

export function totalsFromNet(net: number, rate: string): Totals {
  const vat = vatFromNet(net, rate);
  return { net, vat, gross: net + vat };
}

export type LineInput = { quantity: number; unitPriceNet: number; vatRate: string };

export function lineNet(line: Pick<LineInput, "quantity" | "unitPriceNet">): number {
  return Math.round(line.quantity * line.unitPriceNet);
}

export type VatBreakdownRow = { rate: string; net: number; vat: number; gross: number };

/**
 * Sumy dokumentu: netto pozycji sumowane w grupach stawek VAT, VAT liczony od sumy w grupie
 * (tak jak w zestawieniu stawek na dokumentach sprzedażowych).
 */
export function documentTotals(lines: LineInput[]): Totals & { breakdown: VatBreakdownRow[] } {
  const groups = new Map<string, number>();
  for (const line of lines) {
    groups.set(line.vatRate, (groups.get(line.vatRate) ?? 0) + lineNet(line));
  }
  const breakdown: VatBreakdownRow[] = [...groups.entries()]
    .map(([rate, net]) => ({ rate, ...totalsFromNet(net, rate) }))
    .sort((a, b) => vatPercent(b.rate) - vatPercent(a.rate));
  const net = breakdown.reduce((s, r) => s + r.net, 0);
  const vat = breakdown.reduce((s, r) => s + r.vat, 0);
  return { net, vat, gross: net + vat, breakdown };
}

/** Dominująca stawka VAT dokumentu (wg wartości netto) - używana przy konwersji wyceny na zlecenie. */
export function dominantVatRate(lines: LineInput[], fallback: VatRate | string = "23"): string {
  const { breakdown } = documentTotals(lines);
  if (breakdown.length === 0) return fallback;
  return [...breakdown].sort((a, b) => b.net - a.net)[0].rate;
}

/** "1 234,56" / "1234.5" -> 123456 groszy. Zwraca null dla niepoprawnych wartości. */
export function parseMoney(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0]/g, "").replace(/zł$/i, "").replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [zl, gr = ""] = normalized.split(".");
  return Number(zl) * 100 + Number(gr.padEnd(2, "0"));
}

/** 123456 -> "1234,56" (wartość do pola formularza). */
export function moneyToInput(grosze: number): string {
  return (grosze / 100).toFixed(2).replace(".", ",");
}

export function parseQuantity(input: string): number | null {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  return Number(normalized);
}
