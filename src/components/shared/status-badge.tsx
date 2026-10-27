import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  navy: "bg-[oklch(0.95_0.025_263)] text-[oklch(0.33_0.09_263)] border-[oklch(0.88_0.04_263)]",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  orange: "bg-orange-50 text-orange-800 border-orange-200",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-slate-400",
  navy: "bg-[oklch(0.38_0.11_263)]",
  blue: "bg-sky-500",
  orange: "bg-orange-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
};

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

type Defs = { map: Record<string, { label: string; tone: Tone }> };

export function StatusBadge({ defs, value, className }: { defs: Defs; value: string; className?: string }) {
  const def = defs.map[value];
  if (!def) return <ToneBadge tone="neutral">{value}</ToneBadge>;
  return (
    <ToneBadge tone={def.tone} className={className}>
      {def.label}
    </ToneBadge>
  );
}
