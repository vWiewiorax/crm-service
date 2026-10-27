export type Tone = "neutral" | "navy" | "blue" | "orange" | "green" | "red" | "violet";

type StatusDef<K extends string> = { value: K; label: string; tone: Tone };

function defs<K extends string>(list: StatusDef<K>[]) {
  const map = Object.fromEntries(list.map((d) => [d.value, d])) as Record<K, StatusDef<K>>;
  const values = list.map((d) => d.value) as [K, ...K[]];
  return { list, map, values };
}

export const ORDER_STATUS = defs([
  { value: "NEW", label: "Nowe", tone: "blue" },
  { value: "TO_QUOTE", label: "Do wyceny", tone: "orange" },
  { value: "AWAITING_ACCEPTANCE", label: "Oczekuje na akceptację", tone: "orange" },
  { value: "PLANNED", label: "Zaplanowane", tone: "violet" },
  { value: "IN_PROGRESS", label: "W realizacji", tone: "navy" },
  { value: "COMPLETED", label: "Zakończone", tone: "green" },
  { value: "CANCELLED", label: "Anulowane", tone: "neutral" },
]);
export type OrderStatus = (typeof ORDER_STATUS.values)[number];

/** Zlecenia w toku (bez nowych zapytań, zakończonych i anulowanych). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "TO_QUOTE",
  "AWAITING_ACCEPTANCE",
  "PLANNED",
  "IN_PROGRESS",
];
/** Zlecenia, które nie są jeszcze zamknięte. */
export const OPEN_ORDER_STATUSES: OrderStatus[] = ["NEW", ...ACTIVE_ORDER_STATUSES];

export const PAYMENT_STATUS = defs([
  { value: "UNPAID", label: "Nieopłacone", tone: "orange" },
  { value: "PARTIAL", label: "Częściowo opłacone", tone: "blue" },
  { value: "PAID", label: "Opłacone", tone: "green" },
]);
export type PaymentStatus = (typeof PAYMENT_STATUS.values)[number];

export const QUOTE_STATUS = defs([
  { value: "DRAFT", label: "Robocza", tone: "neutral" },
  { value: "SENT", label: "Wysłana", tone: "orange" },
  { value: "ACCEPTED", label: "Zaakceptowana", tone: "green" },
  { value: "REJECTED", label: "Odrzucona", tone: "red" },
  { value: "EXPIRED", label: "Wygasła", tone: "neutral" },
]);
export type QuoteStatus = (typeof QUOTE_STATUS.values)[number];

export const TASK_STATUS = defs([
  { value: "TODO", label: "Do zrobienia", tone: "orange" },
  { value: "IN_PROGRESS", label: "W trakcie", tone: "navy" },
  { value: "DONE", label: "Zakończone", tone: "green" },
]);
export type TaskStatus = (typeof TASK_STATUS.values)[number];

export const TASK_PRIORITY = defs([
  { value: "LOW", label: "Niski", tone: "neutral" },
  { value: "NORMAL", label: "Normalny", tone: "blue" },
  { value: "HIGH", label: "Wysoki", tone: "red" },
]);
export type TaskPriority = (typeof TASK_PRIORITY.values)[number];

export const CLIENT_TYPE = defs([
  { value: "PRIVATE", label: "Osoba prywatna", tone: "neutral" },
  { value: "COMPANY", label: "Firma", tone: "navy" },
]);
export type ClientType = (typeof CLIENT_TYPE.values)[number];

export const EVENT_TYPE = defs([
  { value: "VISIT", label: "Wizyta", tone: "violet" },
  { value: "REMINDER", label: "Przypomnienie", tone: "orange" },
]);
export type EventType = (typeof EVENT_TYPE.values)[number];

export const VAT_RATES = defs([
  { value: "23", label: "23%", tone: "neutral" },
  { value: "8", label: "8%", tone: "neutral" },
  { value: "5", label: "5%", tone: "neutral" },
  { value: "0", label: "0%", tone: "neutral" },
  { value: "zw", label: "zw.", tone: "neutral" },
]);
export type VatRate = (typeof VAT_RATES.values)[number];

export const UNITS = ["szt.", "usł.", "godz.", "m", "m²", "kpl.", "km"] as const;
