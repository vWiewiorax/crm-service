"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import { formatMonth } from "@/lib/dates";
import type { Tone } from "@/lib/constants";
import { CHART, TONE_HEX } from "./colors";

type Series = { key: string; label: string; color: string };

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label ? formatMonth(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular font-medium text-foreground">{formatMoney(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/** Wykres kwot w podziale na miesiące. Kwoty w groszach. */
export function MonthlyMoneyChart({
  data,
  series,
  height = 260,
}: {
  data: Record<string, number | string>[];
  series: Series[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Wykres kwot według miesięcy">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(v: string) => formatMonth(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyShort(v)}
            tickLine={false}
            axisLine={false}
            width={84}
            tick={{ fill: CHART.axis, fontSize: 12 }}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(44,74,138,0.06)" }} />
          {series.length > 1 && (
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          )}
          {series.map((s) => (
            <Bar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Poziomy wykres słupkowy z kolorami statusów. */
export function StatusBarChart({
  data,
  valueKey,
  money,
  height,
}: {
  data: { label: string; tone: Tone; [k: string]: string | number }[];
  valueKey: string;
  money?: boolean;
  height?: number;
}) {
  const h = height ?? Math.max(180, data.length * 36);
  return (
    <div style={{ height: h }} className="w-full" role="img" aria-label="Wykres według statusu">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickFormatter={(v: number) => (money ? formatMoneyShort(v) : String(v))}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART.axis, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(44,74,138,0.06)" }}
            formatter={(v) => [money ? formatMoney(Number(v)) : String(v), money ? "Wartość netto" : "Liczba zleceń"]}
            contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: "#e2e8f0" }}
          />
          <Bar isAnimationActive={false} dataKey={valueKey} radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.label} fill={TONE_HEX[d.tone]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
