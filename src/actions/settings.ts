"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation/schemas";
import { toUserMessage } from "@/server/errors";
import { updateSettings } from "@/server/settings";
import { refreshAll, validationFailure } from "./helpers";

export async function saveSettingsAction(values: SettingsFormValues): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateSettings(parsed.data);
    refreshAll();
    return ok(undefined, "Zapisano ustawienia");
  } catch (error) {
    return fail(toUserMessage(error));
  }
}
