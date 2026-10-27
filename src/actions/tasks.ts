"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { taskSchema, type TaskFormValues } from "@/lib/validation/schemas";
import { toUserMessage } from "@/server/errors";
import { createTask, deleteTask, setTaskDone, updateTask } from "@/server/tasks";
import { isId, refreshAll, validationFailure } from "./helpers";

export async function saveTaskAction(id: string | null, values: TaskFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const task = id && isId(id) ? await updateTask(id, parsed.data) : await createTask(parsed.data);
    refreshAll();
    return ok({ id: task.id }, id ? "Zapisano zadanie" : "Dodano zadanie");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function setTaskDoneAction(id: string, done: boolean): Promise<ActionResult> {
  if (!isId(id) || typeof done !== "boolean") return fail("Nieprawidłowe dane.");
  try {
    await setTaskDone(id, done);
    refreshAll();
    return ok(undefined, done ? "Zadanie oznaczone jako zakończone" : "Zadanie przywrócone do realizacji");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail("Nieprawidłowy identyfikator.");
  try {
    await deleteTask(id);
    refreshAll();
    return ok(undefined, "Usunięto zadanie");
  } catch (error) {
    return fail(toUserMessage(error, "Nie udało się usunąć zadania."));
  }
}
