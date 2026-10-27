"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clientSchema, type ClientFormValues } from "@/lib/validation/schemas";
import { createClient, deleteClient, updateClient } from "@/server/clients";
import { toUserMessage } from "@/server/errors";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveClientAction(
  id: string | null,
  values: ClientFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const client = id && isId(id) ? await updateClient(id, parsed.data) : await createClient(parsed.data);
    refreshAll();
    return ok({ id: client.id }, id ? "Zapisano zmiany klienta" : "Dodano klienta");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteClient(id);
    refreshAll();
    return ok(undefined, "Usunięto klienta");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć klienta."));
  }
}
