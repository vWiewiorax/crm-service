import "server-only";
import { Prisma } from "@prisma/client";
import { formatDocumentNumber } from "@/lib/numbering-format";

export type DocumentKind = "order" | "quote";

export { formatDocumentNumber };

/**
 * Pobiera kolejny numer dokumentu w ramach transakcji.
 * Licznik zwiększany jest atomowo w bazie (INSERT ... ON CONFLICT DO UPDATE) jako pierwsza operacja zapisu,
 * więc równoległe zapisy czekają na blokadę zamiast dostawać ten sam numer.
 * Dodatkowym zabezpieczeniem jest unikalny indeks na kolumnie `number`.
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  kind: DocumentKind,
  year: number,
): Promise<string> {
  const key = `${kind}-${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  const settings = await tx.settings.findUnique({ where: { id: 1 } });
  const prefix = kind === "order" ? (settings?.orderNumberPrefix ?? "ZL") : (settings?.quoteNumberPrefix ?? "WYC");
  return formatDocumentNumber(prefix, year, counter.value, settings?.numberPadding ?? 4);
}

export async function peekNextNumber(
  client: Prisma.TransactionClient,
  kind: DocumentKind,
  year: number,
): Promise<string> {
  const [counter, settings] = await Promise.all([
    client.counter.findUnique({ where: { key: `${kind}-${year}` } }),
    client.settings.findUnique({ where: { id: 1 } }),
  ]);
  const prefix = kind === "order" ? (settings?.orderNumberPrefix ?? "ZL") : (settings?.quoteNumberPrefix ?? "WYC");
  return formatDocumentNumber(prefix, year, (counter?.value ?? 0) + 1, settings?.numberPadding ?? 4);
}

const RETRYABLE = new Set(["P2002", "P2034"]);

/** Ponawia transakcję przy konflikcie unikalności numeru lub konflikcie zapisu SQLite. */
export async function withNumberRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        (error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE.has(error.code)) ||
        (error instanceof Error && /database is locked|SQLITE_BUSY/i.test(error.message));
      if (!retryable) throw error;
      await new Promise((r) => setTimeout(r, 20 * (i + 1) + Math.random() * 30));
    }
  }
  throw lastError;
}
