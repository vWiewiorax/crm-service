"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { rescheduleAction } from "@/actions/calendar";
import { TONE_HEX } from "@/components/charts/colors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EventFormValues } from "@/lib/validation/schemas";
import { EventDialog } from "./event-dialog";

export type CalItem = {
  key: string;
  id: string;
  kind: "order" | "visit" | "task" | "reminder";
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  subtitle: string | null;
  statusLabel: string | null;
  done: boolean;
  href: string | null;
  event?: { type: string; location: string | null; notes: string | null; clientId: string | null; orderId: string | null };
};

type Kind = { value: CalItem["kind"]; label: string; tone: Tone };

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const dayFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "UTC" });
const fmtLong = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));

export function CalendarView({
  view,
  title,
  days,
  monthKey,
  todayIso,
  items,
  kinds,
  prevHref,
  nextHref,
  todayHref,
  monthHref,
  weekHref,
  clients,
  orders,
}: {
  view: "month" | "week";
  title: string;
  days: string[];
  monthKey: string;
  todayIso: string;
  items: CalItem[];
  kinds: readonly Kind[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
  monthHref: string;
  weekHref: string;
  clients: { id: string; label: string }[];
  orders: { id: string; label: string; clientId: string }[];
}) {
  const [active, setActive] = useState<Set<string>>(() => new Set(kinds.map((k) => k.value)));
  const [selected, setSelected] = useState<CalItem | null>(null);
  const [eventDialog, setEventDialog] = useState<{ id: string | null; defaults: EventFormValues } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(items, (state, m: { key: string; date: string }) =>
    state.map((i) => (i.key === m.key ? { ...i, date: m.date } : i)),
  );
  const toneOf = (k: CalItem["kind"]) => TONE_HEX[kinds.find((x) => x.value === k)?.tone ?? "neutral"];
  const visible = optimistic.filter((i) => active.has(i.kind));
  const byDay = new Map<string, CalItem[]>();
  for (const i of visible) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);

  const reschedule = (item: CalItem, date: string) => {
    if (date === item.date) return;
    startTransition(async () => {
      move({ key: item.key, date });
      const kind = item.kind === "visit" || item.kind === "reminder" ? "event" : item.kind;
      const res = await rescheduleAction({ kind, id: item.id, date });
      if (res.ok) toast.success(`${res.message}: ${fmtLong(date)}`);
      else toast.error(res.error);
    });
  };
  const newEvent = (date: string) =>
    setEventDialog({
      id: null,
      defaults: { type: "VISIT", title: "", date, startTime: "", endTime: "", location: "", notes: "", clientId: "", orderId: "" },
    });

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon-sm" aria-label="Poprzedni okres">
            <Link href={prevHref}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon-sm" aria-label="Następny okres">
            <Link href={nextHref}>
              <ChevronRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={todayHref}>Dziś</Link>
          </Button>
          <h2 className={cn("ml-2 text-base font-semibold", view === "month" && "capitalize")}>{title}</h2>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Widok kalendarza">
            <Link href={monthHref} className={cn("rounded-md px-3 py-1 text-sm", view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              Miesiąc
            </Link>
            <Link href={weekHref} className={cn("rounded-md px-3 py-1 text-sm", view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              Tydzień
            </Link>
          </div>
          <Button size="sm" onClick={() => newEvent(days.includes(todayIso) ? todayIso : days[0])}>
            <Plus data-icon="inline-start" />
            Nowe wydarzenie
          </Button>
        </div>
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 border-b px-4 py-3">
        <legend className="sr-only">Typy wydarzeń</legend>
        {kinds.map((k) => (
          <label key={k.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={active.has(k.value)}
              onCheckedChange={(v) =>
                setActive((s) => {
                  const n = new Set(s);
                  if (v) n.add(k.value);
                  else n.delete(k.value);
                  return n;
                })
              }
            />
            <span className="size-2.5 rounded-full" style={{ background: TONE_HEX[k.tone] }} />
            {k.label}
          </label>
        ))}
        <span className="ml-auto hidden text-xs text-muted-foreground md:inline">Przeciągnij element na inny dzień, aby zmienić termin.</span>
      </fieldset>

      <div className="hidden grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground sm:grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-1 sm:grid-cols-7", view === "week" && "sm:min-h-[420px]")}>
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const outside = view === "month" && !d.startsWith(monthKey);
          if (view === "month" && list.length === 0 && outside) {
            return <div key={d} className="hidden min-h-24 border-r border-b bg-muted/30 sm:block" aria-hidden />;
          }
          return (
            <div
              key={d}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(d);
              }}
              onDragLeave={() => setDragOver((x) => (x === d ? null : x))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const item = optimistic.find((i) => i.key === e.dataTransfer.getData("text/plain"));
                if (item) reschedule(item, d);
              }}
              className={cn(
                "group border-b p-1.5 sm:min-h-24 sm:border-r",
                outside && "bg-muted/30",
                dragOver === d && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
                view === "month" && list.length === 0 && "hidden sm:block",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <span
                  className={cn(
                    "text-xs",
                    outside ? "text-muted-foreground/60" : "text-muted-foreground",
                    d === todayIso && "flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  <span className="sm:hidden">{fmtLong(d)}</span>
                  <span className="hidden sm:inline">{Number(d.slice(8))}</span>
                </span>
                <button
                  type="button"
                  onClick={() => newEvent(d)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted focus:opacity-100"
                  aria-label={`Dodaj wydarzenie ${fmtLong(d)}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <ul className="space-y-1">
                {list.map((i) => (
                  <li key={i.key}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", i.key)}
                      onClick={() => setSelected(i)}
                      className={cn(
                        "w-full cursor-grab truncate rounded-md border-l-[3px] bg-muted/60 px-1.5 py-1 text-left text-xs hover:bg-muted active:cursor-grabbing",
                        i.done && "text-muted-foreground line-through opacity-70",
                      )}
                      style={{ borderLeftColor: toneOf(i.kind) }}
                      title={i.title}
                    >
                      {i.startTime && <span className="tabular mr-1 font-medium">{i.startTime}</span>}
                      {i.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Brak wydarzeń w tym okresie dla wybranych typów.</p>}

      <ItemDialog
        item={selected}
        kinds={kinds}
        onClose={() => setSelected(null)}
        onReschedule={(item, date) => {
          reschedule(item, date);
          setSelected(null);
        }}
        onEdit={(item) => {
          setSelected(null);
          setEventDialog({
            id: item.id,
            defaults: {
              type: item.event!.type as EventFormValues["type"],
              title: item.title,
              date: item.date,
              startTime: item.startTime ?? "",
              endTime: item.endTime ?? "",
              location: item.event!.location ?? "",
              notes: item.event!.notes ?? "",
              clientId: item.event!.clientId ?? "",
              orderId: item.event!.orderId ?? "",
            },
          });
        }}
      />
      <EventDialog
        open={eventDialog !== null}
        onOpenChange={(v) => !v && setEventDialog(null)}
        id={eventDialog?.id ?? null}
        defaults={eventDialog?.defaults ?? { type: "VISIT", title: "", date: todayIso, startTime: "", endTime: "", location: "", notes: "", clientId: "", orderId: "" }}
        clients={clients}
        orders={orders}
      />
    </div>
  );
}

function ItemDialog({
  item,
  kinds,
  onClose,
  onReschedule,
  onEdit,
}: {
  item: CalItem | null;
  kinds: readonly Kind[];
  onClose: () => void;
  onReschedule: (item: CalItem, date: string) => void;
  onEdit: (item: CalItem) => void;
}) {
  const [date, setDate] = useState("");
  const kind = kinds.find((k) => k.value === item?.kind);
  const taskHref = item?.kind === "task" ? `/zadania?zadanie=${item.id}` : null;
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(v) => {
        if (!v) onClose();
        else setDate(item?.date ?? "");
      }}
    >
      <DialogContent>
        {item && (
          <>
            <DialogHeader>
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: TONE_HEX[kind?.tone ?? "neutral"] }} />
                {kind?.label}
              </p>
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>
                {fmtLong(item.date)}
                {item.startTime && `, ${item.startTime}${item.endTime ? `-${item.endTime}` : ""}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 text-sm">
              {item.subtitle && <p>{item.subtitle}</p>}
              {item.statusLabel && <p className="text-muted-foreground">{item.statusLabel}</p>}
              {item.event?.notes && <p className="whitespace-pre-line text-muted-foreground">{item.event.notes}</p>}
            </div>
            <form
              className="flex items-end gap-2 border-t pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (date) onReschedule(item, date);
              }}
            >
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="resched">{item.kind === "order" ? "Zmień termin realizacji" : "Zmień datę"}</Label>
                <Input id="resched" type="date" value={date || item.date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button type="submit" variant="outline" disabled={!date || date === item.date}>
                Zapisz termin
              </Button>
            </form>
            <DialogFooter>
              {item.event && (
                <Button variant="outline" onClick={() => onEdit(item)}>
                  <Pencil data-icon="inline-start" />
                  Edytuj
                </Button>
              )}
              {(taskHref ?? item.href) && (
                <Button asChild>
                  <Link href={taskHref ?? item.href!}>
                    <ExternalLink data-icon="inline-start" />
                    {item.kind === "order" ? "Otwórz zlecenie" : item.kind === "task" ? "Otwórz zadanie" : "Otwórz powiązany rekord"}
                  </Link>
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
