import { BadgeCheck, ClipboardList, FileText, Info, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CHART } from "@/components/charts/colors";
import { MonthlyMoneyChart, StatusBarChart } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, fromISODate, toISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { defaultReportRange, getReport } from "@/server/analytics";

export const metadata: Metadata = { title: "Raporty" };

const isIso = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(fromISODate(v).getTime());

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ od?: string; do?: string }> }) {
  const sp = await searchParams;
  const def = defaultReportRange();
  let from = isIso(sp.od) ? fromISODate(sp.od!) : def.from;
  let to = isIso(sp.do) ? fromISODate(sp.do!) : def.to;
  const swapped = from > to;
  if (swapped) [from, to] = [to, from];
  const r = await getReport(from, to);
  const s = r.summary;
  const hasSeries = r.series.some((p) => p.revenue || p.paid || p.ordersValue);

  return (
    <>
      <PageHeader title="Raporty" description={`Okres: ${formatDate(from)} - ${formatDate(to)}`} />

      <form method="get" className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="od">Od</Label>
          <Input id="od" name="od" type="date" defaultValue={toISODate(from)} className="sm:w-44" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="do">Do</Label>
          <Input id="do" name="do" type="date" defaultValue={toISODate(to)} className="sm:w-44" />
        </div>
        <Button type="submit">Pokaż</Button>
        <Button asChild variant="ghost">
          <Link href="/raporty">Od początku roku</Link>
        </Button>
        {swapped && <p className="text-sm text-orange-700">Zamieniono daty miejscami (początek był po końcu).</p>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Wartość zleceń (netto)" value={formatMoney(s.ordersValue)} hint={`${s.ordersCount} zleceń utworzonych w okresie, bez anulowanych`} icon={ClipboardList} />
        <StatCard label="Przychód z zakończonych (netto)" value={formatMoney(s.revenue)} hint="Zlecenia zakończone w okresie" icon={TrendingUp} accent="green" />
        <StatCard label="Wpłaty (brutto)" value={formatMoney(s.paid)} hint="Kwoty faktycznie otrzymane w okresie" icon={Wallet} accent="blue" />
        <StatCard label="Zakończone zlecenia" value={s.completedCount} hint="Liczba w wybranym okresie" icon={BadgeCheck} accent="green" />
        <StatCard label="Otwarte wyceny (netto)" value={formatMoney(s.openQuotesValue)} hint={`${s.openQuotesCount} robocze i wysłane, stan bieżący`} icon={FileText} accent="orange" href="/wyceny?status=SENT" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <SectionCard title="Przychód i wpłaty według miesięcy" description="Przychód: netto z zakończonych zleceń. Wpłaty: brutto otrzymane. Wartość zleceń: netto zleceń utworzonych w miesiącu." className="xl:col-span-3">
          {hasSeries ? (
            <MonthlyMoneyChart
              data={r.series}
              series={[
                { key: "ordersValue", label: "Wartość zleceń (netto)", color: CHART.slate },
                { key: "revenue", label: "Przychód (netto)", color: CHART.navy },
                { key: "paid", label: "Wpłaty (brutto)", color: CHART.green },
              ]}
            />
          ) : (
            <EmptyState icon={TrendingUp} title="Brak danych w tym okresie" description="Zmień zakres dat." />
          )}
        </SectionCard>
        <SectionCard title="Wartość zleceń według statusu" description="Netto, zlecenia utworzone w okresie" className="xl:col-span-2">
          {r.byStatus.some((b) => b.count) ? (
            <StatusBarChart data={r.byStatus} valueKey="value" money />
          ) : (
            <EmptyState icon={ClipboardList} title="Brak zleceń w tym okresie" />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Najczęściej wybierane kategorie usług" bodyClassName="p-0">
          {r.categories.length ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">Kategoria</th>
                  <th className="px-3 py-2 text-right font-medium">Zleceń</th>
                  <th className="px-5 py-2 text-right font-medium">Wartość netto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.categories.map((c) => (
                  <tr key={c.category}>
                    <td className="px-5 py-2.5">{c.category}</td>
                    <td className="tabular px-3 py-2.5 text-right">{c.count}</td>
                    <td className="tabular px-5 py-2.5 text-right">{formatMoney(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon={ClipboardList} title="Brak danych" />
          )}
        </SectionCard>
        <SectionCard title="Klienci według wartości współpracy" description="Zlecenia utworzone w okresie, bez anulowanych" bodyClassName="p-0">
          {r.clients.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2 font-medium">Klient</th>
                    <th className="px-3 py-2 text-right font-medium">Zleceń</th>
                    <th className="px-3 py-2 text-right font-medium">Wartość netto</th>
                    <th className="px-3 py-2 text-right font-medium">Zakończone</th>
                    <th className="px-5 py-2 text-right font-medium">Wpłaty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.clients.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-2.5">
                        <Link href={`/klienci/${c.id}`} className="hover:text-primary hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{c.count}</td>
                      <td className="tabular px-3 py-2.5 text-right font-medium">{formatMoney(c.value)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{formatMoney(c.completedValue)}</td>
                      <td className="tabular px-5 py-2.5 text-right">{formatMoney(c.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="Brak danych" />
          )}
        </SectionCard>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Zestawienia mają charakter poglądowy i służą do zarządzania firmą. Nie są ewidencją księgową, rejestrem VAT ani podstawą do rozliczeń podatkowych.
      </p>
    </>
  );
}
