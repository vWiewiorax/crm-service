import "server-only";
import { Prisma } from "@prisma/client";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Zamienia błąd na bezpieczny komunikat dla użytkownika (bez szczegółów technicznych). */
export function toUserMessage(error: unknown, fallback = "Nie udało się zapisać zmian. Spróbuj ponownie."): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "Rekord nie istnieje lub został usunięty.";
    if (error.code === "P2003") return "Operacja narusza powiązania między rekordami.";
    if (error.code === "P2002") return "Rekord o takim numerze już istnieje.";
  }
  console.error("[db]", error instanceof Error ? error.message : error);
  return fallback;
}
