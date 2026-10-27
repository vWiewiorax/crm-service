"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { invoiceSchema, type InvoiceFormValues } from "@/lib/validation/schemas";
import { toUserMessage } from "@/server/errors";
import {
  createInvoice,
  deleteInvoice,
  refreshKsefStatus,
  sendInvoiceToKsef,
  updateInvoice,
  type KsefOutcome,
} from "@/server/invoices";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveInvoiceAction(
  id: string | null,
  values: InvoiceFormValues,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = invoiceSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const invoice = id && isId(id) ? await updateInvoice(id, parsed.data) : await createInvoice(parsed.data);
    refreshAll();
    return ok({ id: invoice.id, number: invoice.number }, id ? "Zapisano zmiany faktury" : `Wystawiono fakturę ${invoice.number}`);
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteInvoice(id);
    refreshAll();
    return ok(undefined, "Usunięto fakturę");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć faktury."));
  }
}

export async function sendInvoiceToKsefAction(id: string): Promise<ActionResult<KsefOutcome>> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    const result = await sendInvoiceToKsef(id);
    refreshAll();
    return ok(result, result.message);
  } catch (error) {
    refreshAll();
    return fail(toUserMessage(error, "Nie udało się wysłać faktury do KSeF."));
  }
}

export async function refreshKsefStatusAction(id: string): Promise<ActionResult<KsefOutcome>> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    const result = await refreshKsefStatus(id);
    refreshAll();
    return ok(result, result.message);
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się sprawdzić statusu w KSeF."));
  }
}
