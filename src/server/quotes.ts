import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { QUOTE_STATUS, type QuoteStatus } from "@/lib/constants";
import { today } from "@/lib/dates";
import { documentTotals, dominantVatRate } from "@/lib/money";
import type { QuoteInput } from "@/lib/validation/schemas";
import { DomainError } from "./errors";
import { nextDocumentNumber, withNumberRetry } from "./numbering";

export const OPEN_QUOTE_STATUSES: QuoteStatus[] = ["DRAFT", "SENT"];

/** Wysłane wyceny po terminie ważności oznaczamy jako wygasłe (operacja idempotentna). */
export async function syncQuoteExpiry() {
  try {
    await db.quote.updateMany({
      where: { status: "SENT", validUntil: { lt: today() } },
      data: { status: "EXPIRED" },
    });
  } catch (error) {
    console.error("[quotes] expiry sync failed", error instanceof Error ? error.message : error);
  }
}

export type QuoteFilters = { q?: string; status?: string; clientId?: string; sort?: string };

export const QUOTE_SORTS = [
  { value: "date_desc", label: "Data: najnowsze" },
  { value: "date_asc", label: "Data: najstarsze" },
  { value: "amount_desc", label: "Kwota: najwyższa" },
  { value: "valid_asc", label: "Ważność: najbliższa" },
] as const;

export async function listQuotes(f: QuoteFilters) {
  await syncQuoteExpiry();
  const and: Prisma.QuoteWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { number: { contains: q } },
        { title: { contains: q } },
        { client: { name: { contains: q } } },
        { client: { companyName: { contains: q } } },
      ],
    });
  }
  if (f.status && (QUOTE_STATUS.values as string[]).includes(f.status)) and.push({ status: f.status });
  if (f.clientId) and.push({ clientId: f.clientId });
  const orderBy: Prisma.QuoteOrderByWithRelationInput[] =
    f.sort === "date_asc"
      ? [{ issueDate: "asc" }, { number: "asc" }]
      : f.sort === "amount_desc"
        ? [{ netTotal: "desc" }]
        : f.sort === "valid_asc"
          ? [{ validUntil: "asc" }]
          : [{ issueDate: "desc" }, { number: "desc" }];
  return db.quote.findMany({
    where: and.length ? { AND: and } : {},
    orderBy,
    include: {
      client: { select: { id: true, name: true, companyName: true, type: true } },
      order: { select: { id: true, number: true } },
    },
  });
}

export async function getQuote(id: string) {
  await syncQuoteExpiry();
  return db.quote.findUnique({
    where: { id },
    include: {
      client: true,
      items: { orderBy: { position: "asc" } },
      order: { select: { id: true, number: true, status: true } },
    },
  });
}
export type QuoteDetail = NonNullable<Awaited<ReturnType<typeof getQuote>>>;

function itemsData(items: QuoteInput["items"]) {
  return items.map((item, position) => ({ ...item, position }));
}

function decisionDates(status: QuoteStatus, previous?: { status: string; sentAt: Date | null; decidedAt: Date | null }) {
  const now = new Date();
  const sentAt = status === "DRAFT" ? null : (previous?.sentAt ?? now);
  const decided = status === "ACCEPTED" || status === "REJECTED";
  const decidedAt = decided ? (previous?.status === status && previous.decidedAt ? previous.decidedAt : now) : null;
  return { sentAt, decidedAt };
}

export async function createQuote(input: QuoteInput) {
  const totals = documentTotals(input.items);
  return withNumberRetry(() =>
    db.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: input.clientId }, select: { id: true } });
      if (!client) throw new DomainError("Wybrany klient nie istnieje.");
      const number = await nextDocumentNumber(tx, "quote", input.issueDate.getUTCFullYear());
      const { items, ...rest } = input;
      return tx.quote.create({
        data: {
          ...rest,
          number,
          netTotal: totals.net,
          vatTotal: totals.vat,
          grossTotal: totals.gross,
          ...decisionDates(input.status),
          items: { create: itemsData(items) },
        },
      });
    }),
  );
}

export async function updateQuote(id: string, input: QuoteInput) {
  const totals = documentTotals(input.items);
  return db.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({ where: { id }, include: { order: { select: { id: true } } } });
    if (!current) throw new DomainError("Wycena nie istnieje lub została usunięta.");
    if (current.order) {
      throw new DomainError("Wycena została już przekształcona w zlecenie, dlatego nie można jej edytować.");
    }
    const { items, ...rest } = input;
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    return tx.quote.update({
      where: { id },
      data: {
        ...rest,
        netTotal: totals.net,
        vatTotal: totals.vat,
        grossTotal: totals.gross,
        ...decisionDates(input.status, current),
        items: { create: itemsData(items) },
      },
    });
  });
}

export async function changeQuoteStatus(id: string, status: QuoteStatus) {
  return db.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({ where: { id }, include: { order: { select: { id: true } } } });
    if (!current) throw new DomainError("Wycena nie istnieje lub została usunięta.");
    if (current.order) throw new DomainError("Wycena została już przekształcona w zlecenie - status jest zablokowany.");
    if (status === "SENT" && current.validUntil < today()) {
      throw new DomainError("Termin ważności wyceny minął. Zmień termin ważności przed wysłaniem.");
    }
    return tx.quote.update({ where: { id }, data: { status, ...decisionDates(status, current) } });
  });
}

export async function deleteQuote(id: string) {
  const quote = await db.quote.findUnique({ where: { id }, include: { order: { select: { id: true } } } });
  if (!quote) throw new DomainError("Wycena nie istnieje lub została usunięta.");
  if (quote.order) {
    throw new DomainError("Nie można usunąć wyceny powiązanej ze zleceniem.");
  }
  await db.quote.delete({ where: { id } });
}

/**
 * Tworzy zlecenie na podstawie zaakceptowanej wyceny. Całość w jednej transakcji;
 * unikalny indeks Order.quoteId gwarantuje, że z jednej wyceny powstanie co najwyżej jedno zlecenie.
 */
export async function convertQuoteToOrder(quoteId: string, options: { category: string; dueDate: Date | null }) {
  try {
    return await withNumberRetry(() =>
      db.$transaction(async (tx) => {
        // Zapis jako pierwsza operacja - blokuje bazę na czas transakcji (SQLite), co serializuje konwersje.
        const number = await nextDocumentNumber(tx, "order", today().getUTCFullYear());
        const quote = await tx.quote.findUnique({
          where: { id: quoteId },
          include: { items: { orderBy: { position: "asc" } }, order: { select: { id: true, number: true } } },
        });
        if (!quote) throw new DomainError("Wycena nie istnieje lub została usunięta.");
        if (quote.order) {
          throw new DomainError(`Z tej wyceny utworzono już zlecenie ${quote.order.number}.`);
        }
        if (quote.status !== "ACCEPTED") {
          throw new DomainError("Zlecenie można utworzyć tylko z zaakceptowanej wyceny.");
        }
        const createdDate = today();
        if (options.dueDate && options.dueDate < createdDate) {
          throw new DomainError("Termin realizacji nie może być wcześniejszy niż dzisiejsza data.");
        }
        return tx.order.create({
          data: {
            number,
            title: quote.title,
            description: quote.description,
            clientId: quote.clientId,
            category: options.category,
            createdDate,
            dueDate: options.dueDate,
            status: "PLANNED",
            netAmount: quote.netTotal,
            vatRate: dominantVatRate(quote.items),
            internalNotes: quote.notes,
            quoteId: quote.id,
            items: {
              create: quote.items.map((i) => ({
                position: i.position,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                unitPriceNet: i.unitPriceNet,
                vatRate: i.vatRate,
              })),
            },
            statusHistory: {
              create: { fromStatus: null, toStatus: "PLANNED", note: `Utworzone z wyceny ${quote.number}` },
            },
          },
        });
      }),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.order.findUnique({ where: { quoteId }, select: { number: true } });
      if (existing) throw new DomainError(`Z tej wyceny utworzono już zlecenie ${existing.number}.`);
    }
    throw error;
  }
}
