"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { QUOTE_STATUS } from "@/lib/constants";
import { optionalDateField, requiredText } from "@/lib/validation/common";
import { quoteSchema, type QuoteFormValues } from "@/lib/validation/schemas";
import { toUserMessage } from "@/server/errors";
import { changeQuoteStatus, convertQuoteToOrder, createQuote, deleteQuote, updateQuote } from "@/server/quotes";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveQuoteAction(
  id: string | null,
  values: QuoteFormValues,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = quoteSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const quote = id && isId(id) ? await updateQuote(id, parsed.data) : await createQuote(parsed.data);
    refreshAll();
    return ok({ id: quote.id, number: quote.number }, id ? "Zapisano zmiany wyceny" : `Utworzono wycenę ${quote.number}`);
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(QUOTE_STATUS.values) });

export async function changeQuoteStatusAction(id: string, status: string): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await changeQuoteStatus(parsed.data.id, parsed.data.status);
    refreshAll();
    return ok(undefined, `Status wyceny: ${QUOTE_STATUS.map[parsed.data.status].label}`);
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteQuote(id);
    refreshAll();
    return ok(undefined, "Usunięto wycenę");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć wyceny."));
  }
}

const convertSchema = z.object({
  quoteId: z.string().min(1),
  category: requiredText("Kategoria", 100),
  dueDate: optionalDateField("Termin realizacji"),
});

export async function convertQuoteAction(values: {
  quoteId: string;
  category: string;
  dueDate: string;
}): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = convertSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const order = await convertQuoteToOrder(parsed.data.quoteId, parsed.data);
    refreshAll();
    return ok({ id: order.id, number: order.number }, `Utworzono zlecenie ${order.number}`);
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się utworzyć zlecenia z wyceny."));
  }
}
