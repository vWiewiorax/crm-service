import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";

export function validationFailure(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(error.issues[0]?.message ?? "Popraw błędy w formularzu.", fieldErrors);
}

export function refreshAll() {
  revalidatePath("/", "layout");
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 64;
}
