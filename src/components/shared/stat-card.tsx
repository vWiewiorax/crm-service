import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACCENTS = {
  navy: "bg-[oklch(0.95_0.025_263)] text-[oklch(0.33_0.09_263)]",
  blue: "bg-sky-50 text-sky-700",
  orange: "bg-orange-50 text-orange-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "navy",
  href,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
  href?: string;
  emphasize?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors",
        href && "hover:border-primary/30 hover:bg-accent/30",
        emphasize && "border-red-200 bg-red-50/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", ACCENTS[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn("tabular text-2xl font-semibold tracking-tight", emphasize ? "text-red-700" : "text-foreground")}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
      {body}
    </Link>
  ) : (
    body
  );
}
