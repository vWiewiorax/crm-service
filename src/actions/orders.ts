"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { orderSchema, orderStatusChangeSchema, type OrderFormValues } from "@/lib/validation/schemas";
import { toUserMessage } from "@/server/errors";
import { changeOrderStatus, createOrder, deleteOrder, updateOrder } from "@/server/orders";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveOrderAction(
  id: string | null,
  values: OrderFormValues,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const order = id && isId(id) ? await updateOrder(id, parsed.data) : await createOrder(parsed.data);
    refreshAll();
    return ok({ id: order.id, number: order.number }, id ? "Zapisano zmiany zlecenia" : `Utworzono zlecenie ${order.number}`);
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function changeOrderStatusAction(values: {
  orderId: string;
  status: string;
  note: string;
}): Promise<ActionResult> {
  const parsed = orderStatusChangeSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await changeOrderStatus(parsed.data.orderId, parsed.data.status, parsed.data.note);
    refreshAll();
    return ok(undefined, "Zmieniono status zlecenia");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteOrderAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteOrder(id);
    refreshAll();
    return ok(undefined, "Usunięto zlecenie");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć zlecenia."));
  }
}
