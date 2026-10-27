"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { eventSchema, rescheduleSchema, type EventFormValues } from "@/lib/validation/schemas";
import { createEvent, deleteEvent, reschedule, updateEvent } from "@/server/calendar";
import { toUserMessage } from "@/server/errors";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveEventAction(id: string | null, values: EventFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const event = id && isId(id) ? await updateEvent(id, parsed.data) : await createEvent(parsed.data);
    refreshAll();
    return ok({ id: event.id }, id ? "Zapisano wydarzenie" : "Dodano wydarzenie");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteEvent(id);
    refreshAll();
    return ok(undefined, "Usunięto wydarzenie");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć wydarzenia."));
  }
}

export async function rescheduleAction(values: { kind: string; id: string; date: string }): Promise<ActionResult> {
  const parsed = rescheduleSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await reschedule(parsed.data.kind, parsed.data.id, parsed.data.date);
    refreshAll();
    return ok(undefined, "Zmieniono termin");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się zmienić terminu."));
  }
}
