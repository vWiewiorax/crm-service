import "server-only";
import { Prisma } from "@prisma/client";
import { clientDisplayName } from "@/lib/client-name";
import { KSEF_STATUS, type KsefStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { documentTotals } from "@/lib/money";
import { isValidNip, normalizeNip } from "@/lib/nip";
import type { InvoiceInput } from "@/lib/validation/schemas";
import { DomainError } from "./errors";
import { buildFa3Xml } from "./ksef/fa3";
import {
  closeSession,
  createTestCredentials,
  getInvoiceStatus,
  getInvoiceUpo,
  isPending,
  KsefError,
  sendInvoice,
  waitForInvoiceStatus,
  type KsefCredentials,
  type KsefInvoiceStatus,
} from "./ksef/client";
import { nextDocumentNumber, withNumberRetry } from "./numbering";

/** Faktury, których nie wolno już zmieniać ani usuwać (są w KSeF lub w trakcie przetwarzania). */
const LOCKED: KsefStatus[] = ["PROCESSING", "ACCEPTED"];
export const isInvoiceLocked = (status: string) => (LOCKED as string[]).includes(status);

export type InvoiceFilters = { q?: string; ksef?: string; clientId?: string; sort?: string };

export const INVOICE_SORTS = [
  { value: "date_desc", label: "Data: najnowsze" },
  { value: "date_asc", label: "Data: najstarsze" },
  { value: "amount_desc", label: "Kwota: najwyższa" },
  { value: "due_asc", label: "Termin płatności" },
] as const;

export async function listInvoices(f: InvoiceFilters) {
  const and: Prisma.InvoiceWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    and.push({ OR: [{ number: { contains: q } }, { buyerName: { contains: q } }, { ksefNumber: { contains: q } }] });
  }
  if (f.ksef && (KSEF_STATUS.values as string[]).includes(f.ksef)) and.push({ ksefStatus: f.ksef });
  if (f.clientId) and.push({ clientId: f.clientId });
  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] =
    f.sort === "date_asc"
      ? [{ issueDate: "asc" }, { number: "asc" }]
      : f.sort === "amount_desc"
        ? [{ grossTotal: "desc" }]
        : f.sort === "due_asc"
          ? [{ dueDate: "asc" }]
          : [{ issueDate: "desc" }, { number: "desc" }];
  return db.invoice.findMany({
    where: and.length ? { AND: and } : {},
    orderBy,
    include: { order: { select: { id: true, number: true } } },
  });
}

export async function getInvoice(id: string) {
  return db.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, companyName: true, type: true } },
      order: { select: { id: true, number: true, title: true } },
      items: { orderBy: { position: "asc" } },
    },
  });
}
export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

async function snapshots(tx: Prisma.TransactionClient, input: InvoiceInput) {
  const [settings, client] = await Promise.all([
    tx.settings.findUnique({ where: { id: 1 } }),
    tx.client.findUnique({ where: { id: input.clientId } }),
  ]);
  if (!client) throw new DomainError("Wybrany nabywca nie istnieje.");
  if (!settings?.nip || !isValidNip(settings.nip) || !settings.address?.trim()) {
    throw new DomainError("Uzupełnij w ustawieniach NIP i adres firmy. Są wymagane na fakturze.");
  }
  if (input.orderId) {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, select: { clientId: true } });
    if (!order) throw new DomainError("Powiązane zlecenie nie istnieje.");
    if (order.clientId !== client.id) throw new DomainError("Zlecenie należy do innego klienta niż wybrany nabywca.");
  }
  const buyerNip = client.type === "COMPANY" && client.nip ? normalizeNip(client.nip) : null;
  if (buyerNip && !isValidNip(buyerNip)) throw new DomainError("NIP nabywcy jest nieprawidłowy. Popraw go w danych klienta.");
  return {
    sellerName: settings.companyName,
    sellerNip: normalizeNip(settings.nip),
    sellerAddress: settings.address,
    sellerBankAccount: settings.bankAccount,
    buyerName: clientDisplayName(client),
    buyerNip,
    buyerAddress: client.address,
  };
}

function itemsData(items: InvoiceInput["items"]) {
  return items.map((item, position) => ({ ...item, position }));
}

function totalsData(items: InvoiceInput["items"]) {
  const t = documentTotals(items);
  return { netTotal: t.net, vatTotal: t.vat, grossTotal: t.gross };
}

export async function createInvoice(input: InvoiceInput) {
  return withNumberRetry(() =>
    db.$transaction(async (tx) => {
      const parties = await snapshots(tx, input);
      const number = await nextDocumentNumber(tx, "invoice", input.issueDate.getUTCFullYear());
      const { items, ...rest } = input;
      return tx.invoice.create({
        data: { ...rest, ...parties, ...totalsData(items), number, items: { create: itemsData(items) } },
      });
    }),
  );
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.invoice.findUnique({ where: { id }, select: { ksefStatus: true } });
    if (!current) throw new DomainError("Faktura nie istnieje.");
    if (isInvoiceLocked(current.ksefStatus)) throw new DomainError("Faktury wysłanej do KSeF nie można edytować.");
    const parties = await snapshots(tx, input);
    const { items, ...rest } = input;
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        ...rest,
        ...parties,
        ...totalsData(items),
        ksefStatus: "NOT_SENT",
        ksefStatusCode: null,
        ksefStatusDescription: null,
        ksefXml: null,
        items: { create: itemsData(items) },
      },
    });
  });
}

export async function deleteInvoice(id: string) {
  const current = await db.invoice.findUnique({ where: { id }, select: { ksefStatus: true } });
  if (!current) throw new DomainError("Faktura nie istnieje.");
  if (isInvoiceLocked(current.ksefStatus)) throw new DomainError("Faktury przesłanej do KSeF nie można usunąć.");
  await db.invoice.delete({ where: { id } });
}

/** Domyślne pozycje faktury ze zlecenia: pozycje zlecenia albo jedna linia z kwotą netto. */
export async function invoiceDraftFromOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!order) return null;
  const items = order.items.length
    ? order.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, unitPriceNet: i.unitPriceNet, vatRate: i.vatRate }))
    : [{ name: order.title, quantity: 1, unit: "usł.", unitPriceNet: order.netAmount, vatRate: order.vatRate }];
  return { orderId: order.id, orderNumber: order.number, clientId: order.clientId, items, completedAt: order.completedAt };
}

export function invoiceXml(inv: InvoiceDetail) {
  return buildFa3Xml(inv);
}

// ---------- KSeF (środowisko testowe) ----------

async function credentialsFor(nip: string): Promise<KsefCredentials> {
  const existing = await db.ksefCredential.findUnique({ where: { id: 1 } });
  if (existing && existing.nip === nip) return existing;
  const settings = await db.settings.findUnique({ where: { id: 1 }, select: { ownerName: true } });
  const created = await createTestCredentials(nip, settings?.ownerName ?? null);
  await db.ksefCredential.upsert({ where: { id: 1 }, create: { id: 1, ...created }, update: { ...created, createdAt: new Date() } });
  return created;
}

function statusData(s: KsefInvoiceStatus): Prisma.InvoiceUpdateInput {
  const description = [s.description, ...(s.details ?? [])].filter(Boolean).join(" ").slice(0, 2000);
  if (s.code === 200) {
    return { ksefStatus: "ACCEPTED", ksefNumber: s.ksefNumber ?? null, ksefStatusCode: s.code, ksefStatusDescription: description, ksefAcceptedAt: new Date() };
  }
  if (isPending(s.code)) return { ksefStatus: "PROCESSING", ksefStatusCode: s.code, ksefStatusDescription: description };
  return { ksefStatus: "REJECTED", ksefStatusCode: s.code, ksefStatusDescription: description };
}

async function afterAccepted(id: string, creds: KsefCredentials, sessionRef: string, invoiceRef: string) {
  try {
    const upo = await getInvoiceUpo(creds, sessionRef, invoiceRef);
    await db.invoice.update({ where: { id }, data: { upoXml: upo } });
  } catch (error) {
    console.warn("[ksef] UPO not ready yet", error instanceof Error ? error.message : error);
  }
  try {
    await closeSession(creds, sessionRef);
  } catch {
    // sesja zamknie się automatycznie po 12 godzinach
  }
}

export type KsefOutcome = { status: KsefStatus; message: string };

function outcome(status: string, description?: string | null, ksefNumber?: string | null): KsefOutcome {
  const s = status as KsefStatus;
  if (s === "ACCEPTED") return { status: s, message: `Faktura przyjęta w testowym KSeF. Numer KSeF: ${ksefNumber}` };
  if (s === "PROCESSING") return { status: s, message: "KSeF nadal przetwarza fakturę. Odśwież status za chwilę." };
  return { status: s, message: description ? `KSeF: ${description}` : "KSeF odrzucił fakturę." };
}

/** Wysyła fakturę do TESTOWEGO KSeF i zapisuje wynik w bazie. */
export async function sendInvoiceToKsef(id: string): Promise<KsefOutcome> {
  const inv = await getInvoice(id);
  if (!inv) throw new DomainError("Faktura nie istnieje.");
  if (isInvoiceLocked(inv.ksefStatus)) throw new DomainError("Ta faktura została już wysłana do KSeF.");
  const xml = buildFa3Xml(inv);
  const claimed = await db.invoice.updateMany({
    where: { id, ksefStatus: { in: ["NOT_SENT", "REJECTED", "ERROR"] } },
    data: { ksefStatus: "PROCESSING", ksefXml: xml, ksefSentAt: new Date(), ksefNumber: null, upoXml: null, ksefStatusDescription: "Wysyłanie..." },
  });
  if (claimed.count === 0) throw new DomainError("Ta faktura jest już wysyłana.");

  let creds: KsefCredentials;
  let refs: { sessionRef: string; invoiceRef: string };
  try {
    creds = await credentialsFor(inv.sellerNip);
    refs = await sendInvoice(creds, xml);
  } catch (error) {
    const message = error instanceof KsefError ? error.message : "Nie udało się wysłać faktury do KSeF.";
    console.error("[ksef] send failed", error instanceof KsefError ? `${error.status} ${error.details ?? ""}` : error);
    await db.invoice.update({ where: { id }, data: { ksefStatus: "ERROR", ksefStatusCode: null, ksefStatusDescription: message } });
    return { status: "ERROR", message };
  }
  await db.invoice.update({ where: { id }, data: { ksefSessionRef: refs.sessionRef, ksefInvoiceRef: refs.invoiceRef, ksefStatusDescription: "Przesłano, trwa weryfikacja" } });

  try {
    const status = await waitForInvoiceStatus(creds, refs.sessionRef, refs.invoiceRef);
    const data = statusData(status);
    const saved = await db.invoice.update({ where: { id }, data });
    if (saved.ksefStatus === "ACCEPTED") await afterAccepted(id, creds, refs.sessionRef, refs.invoiceRef);
    if (saved.ksefStatus === "REJECTED") await closeSession(creds, refs.sessionRef).catch(() => undefined);
    return outcome(saved.ksefStatus, saved.ksefStatusDescription, saved.ksefNumber);
  } catch (error) {
    console.error("[ksef] status check failed", error instanceof Error ? error.message : error);
    return outcome("PROCESSING");
  }
}

/** Ponownie pyta KSeF o status faktury i dociąga UPO, jeśli jeszcze go nie ma. */
export async function refreshKsefStatus(id: string): Promise<KsefOutcome> {
  const inv = await db.invoice.findUnique({ where: { id } });
  if (!inv) throw new DomainError("Faktura nie istnieje.");
  if (!inv.ksefSessionRef || !inv.ksefInvoiceRef) throw new DomainError("Faktura nie została jeszcze przesłana do KSeF.");
  const creds = await credentialsFor(inv.sellerNip);
  try {
    if (inv.ksefStatus === "ACCEPTED") {
      if (!inv.upoXml) await afterAccepted(id, creds, inv.ksefSessionRef, inv.ksefInvoiceRef);
      const fresh = await db.invoice.findUniqueOrThrow({ where: { id } });
      return fresh.upoXml
        ? { status: "ACCEPTED", message: "Pobrano UPO z testowego KSeF." }
        : { status: "ACCEPTED", message: "UPO nie jest jeszcze gotowe. Spróbuj za chwilę." };
    }
    const status = await getInvoiceStatus(creds, inv.ksefSessionRef, inv.ksefInvoiceRef);
    const saved = await db.invoice.update({ where: { id }, data: statusData(status) });
    if (saved.ksefStatus === "ACCEPTED") await afterAccepted(id, creds, inv.ksefSessionRef, inv.ksefInvoiceRef);
    return outcome(saved.ksefStatus, saved.ksefStatusDescription, saved.ksefNumber);
  } catch (error) {
    if (error instanceof KsefError) throw new DomainError(error.message);
    throw error;
  }
}
