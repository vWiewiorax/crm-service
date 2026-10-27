import { z } from "zod";
import {
  CLIENT_TYPE,
  EVENT_TYPE,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  QUOTE_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  VAT_RATES,
} from "../constants";
import { totalsFromNet } from "../money";
import { isValidNip, normalizeNip } from "../nip";
import {
  dateField,
  intField,
  moneyField,
  optionalDateField,
  optionalEmail,
  optionalId,
  optionalMoneyField,
  optionalPhone,
  optionalText,
  quantityField,
  requiredId,
  requiredText,
  timeField,
} from "./common";

const optionalNip = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidNip(v), "Nieprawidłowy NIP (sprawdź 10 cyfr i sumę kontrolną)")
  .transform((v) => (v === "" ? null : normalizeNip(v)));

// ---------- Klient ----------
export const clientSchema = z
  .object({
    type: z.enum(CLIENT_TYPE.values),
    name: requiredText("Nazwa lub imię i nazwisko", 160),
    companyName: optionalText(200),
    email: optionalEmail,
    phone: optionalPhone,
    address: optionalText(300),
    nip: optionalNip,
    notes: optionalText(4000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "COMPANY" && !v.companyName) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Podaj nazwę firmy" });
    }
  })
  .transform((v) => (v.type === "PRIVATE" ? { ...v, companyName: null, nip: null } : v));
export type ClientFormValues = z.input<typeof clientSchema>;
export type ClientInput = z.output<typeof clientSchema>;

// ---------- Zlecenie ----------
export const orderSchema = z
  .object({
    title: requiredText("Tytuł", 200),
    description: optionalText(5000),
    clientId: requiredId("Wybierz klienta"),
    category: requiredText("Kategoria", 100),
    createdDate: dateField("Data utworzenia"),
    dueDate: optionalDateField("Termin realizacji"),
    status: z.enum(ORDER_STATUS.values),
    netAmount: moneyField("Kwota netto"),
    vatRate: z.enum(VAT_RATES.values),
    paymentStatus: z.enum(PAYMENT_STATUS.values),
    paidAmount: optionalMoneyField("Wpłacona kwota"),
    internalNotes: optionalText(5000),
  })
  .superRefine((v, ctx) => {
    if (v.dueDate && v.dueDate < v.createdDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Termin realizacji nie może być wcześniejszy niż data utworzenia",
      });
    }
    if (v.paymentStatus === "PARTIAL") {
      const { gross } = totalsFromNet(v.netAmount, v.vatRate);
      if (v.paidAmount <= 0 || v.paidAmount >= gross) {
        ctx.addIssue({
          code: "custom",
          path: ["paidAmount"],
          message: "Przy częściowej płatności podaj kwotę większą od 0 i mniejszą od kwoty brutto",
        });
      }
    }
  });
export type OrderFormValues = z.input<typeof orderSchema>;
export type OrderInput = z.output<typeof orderSchema>;

export const orderStatusChangeSchema = z.object({
  orderId: requiredId("Brak zlecenia"),
  status: z.enum(ORDER_STATUS.values),
  note: optionalText(500),
});

// ---------- Wycena ----------
export const quoteItemSchema = z.object({
  name: requiredText("Nazwa pozycji", 200),
  quantity: quantityField,
  unit: requiredText("Jednostka", 20),
  unitPriceNet: moneyField("Cena netto"),
  vatRate: z.enum(VAT_RATES.values),
});

export const quoteSchema = z
  .object({
    clientId: requiredId("Wybierz klienta"),
    title: requiredText("Tytuł", 200),
    description: optionalText(5000),
    issueDate: dateField("Data wystawienia"),
    validUntil: dateField("Termin ważności"),
    status: z.enum(QUOTE_STATUS.values),
    notes: optionalText(3000),
    items: z.array(quoteItemSchema).min(1, "Dodaj co najmniej jedną pozycję").max(50, "Maksymalnie 50 pozycji"),
  })
  .superRefine((v, ctx) => {
    if (v.validUntil < v.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "Termin ważności nie może być wcześniejszy niż data wystawienia",
      });
    }
  });
export type QuoteFormValues = z.input<typeof quoteSchema>;
export type QuoteInput = z.output<typeof quoteSchema>;

// ---------- Faktura ----------
export const invoiceSchema = z
  .object({
    clientId: requiredId("Wybierz nabywcę"),
    orderId: optionalId,
    issueDate: dateField("Data wystawienia"),
    saleDate: dateField("Data sprzedaży"),
    dueDate: dateField("Termin płatności"),
    placeOfIssue: optionalText(100),
    paymentMethod: z.enum(PAYMENT_METHOD.values),
    vatExemptionBasis: optionalText(256),
    notes: optionalText(256),
    items: z.array(quoteItemSchema).min(1, "Dodaj co najmniej jedną pozycję").max(50, "Maksymalnie 50 pozycji"),
  })
  .superRefine((v, ctx) => {
    if (v.dueDate < v.issueDate) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Termin płatności nie może być wcześniejszy niż data wystawienia" });
    }
    if (v.items.some((i) => i.vatRate === "zw") && !v.vatExemptionBasis) {
      ctx.addIssue({
        code: "custom",
        path: ["vatExemptionBasis"],
        message: "Przy stawce zw. podaj podstawę prawną zwolnienia z VAT",
      });
    }
  });
export type InvoiceFormValues = z.input<typeof invoiceSchema>;
export type InvoiceInput = z.output<typeof invoiceSchema>;

// ---------- Zadanie ----------
export const taskSchema = z.object({
  title: requiredText("Tytuł", 200),
  description: optionalText(3000),
  dueDate: optionalDateField("Termin"),
  priority: z.enum(TASK_PRIORITY.values),
  status: z.enum(TASK_STATUS.values),
  clientId: optionalId,
  orderId: optionalId,
});
export type TaskFormValues = z.input<typeof taskSchema>;
export type TaskInput = z.output<typeof taskSchema>;

// ---------- Wydarzenie w kalendarzu ----------
export const eventSchema = z
  .object({
    type: z.enum(EVENT_TYPE.values),
    title: requiredText("Tytuł", 200),
    date: dateField("Data"),
    startTime: timeField,
    endTime: timeField,
    location: optionalText(300),
    notes: optionalText(2000),
    clientId: optionalId,
    orderId: optionalId,
  })
  .superRefine((v, ctx) => {
    if (v.endTime && !v.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Podaj godzinę rozpoczęcia" });
    }
    if (v.startTime && v.endTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Koniec musi być później niż początek" });
    }
  });
export type EventFormValues = z.input<typeof eventSchema>;
export type EventInput = z.output<typeof eventSchema>;

export const rescheduleSchema = z.object({
  kind: z.enum(["order", "task", "event"]),
  id: requiredId("Brak identyfikatora"),
  date: dateField("Nowy termin"),
});

// ---------- Ustawienia ----------
const prefix = (label: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,6}$/, `${label}: 1-6 wielkich liter lub cyfr`);

export const settingsSchema = z.object({
  companyName: requiredText("Nazwa firmy", 160),
  ownerName: optionalText(160),
  address: optionalText(300),
  nip: optionalNip,
  email: optionalEmail,
  phone: optionalPhone,
  bankAccount: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(PL)?\d{26}$/.test(v.replace(/\s/g, "")), "Numer konta: 26 cyfr (opcjonalnie z PL)")
    .transform((v) => (v === "" ? null : v)),
  defaultVatRate: z.enum(VAT_RATES.values),
  paymentTermDays: intField("Termin płatności", 0, 365),
  quoteValidityDays: intField("Ważność wyceny", 1, 365),
  orderNumberPrefix: prefix("Prefiks zleceń"),
  quoteNumberPrefix: prefix("Prefiks wycen"),
  invoiceNumberPrefix: prefix("Prefiks faktur"),
  numberPadding: intField("Liczba cyfr", 3, 6),
  serviceCategories: z
    .string()
    .transform((v) => [...new Set(v.split("\n").map((s) => s.trim()).filter(Boolean))])
    .pipe(
      z
        .array(z.string().max(100, "Kategoria: maksymalnie 100 znaków"))
        .min(1, "Podaj co najmniej jedną kategorię")
        .max(30, "Maksymalnie 30 kategorii"),
    ),
});
export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsInput = z.output<typeof settingsSchema>;
