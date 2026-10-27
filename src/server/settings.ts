import "server-only";
import type { Settings } from "@prisma/client";
import { db } from "@/lib/db";
import type { SettingsInput } from "@/lib/validation/schemas";

export const DEFAULT_CATEGORIES = ["Usługa ogólna"];

export type AppSettings = Omit<Settings, "serviceCategories"> & { serviceCategories: string[] };

function parseCategories(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.every((v) => typeof v === "string") && value.length > 0) return value;
  } catch {
    // niepoprawny JSON - wracamy do wartości domyślnych
  }
  return DEFAULT_CATEGORIES;
}

export function toAppSettings(s: Settings): AppSettings {
  return { ...s, serviceCategories: parseCategories(s.serviceCategories) };
}

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.findUnique({ where: { id: 1 } });
  if (existing) return toAppSettings(existing);
  const created = await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, companyName: "Moja firma", serviceCategories: JSON.stringify(DEFAULT_CATEGORIES) },
    update: {},
  });
  return toAppSettings(created);
}

export async function updateSettings(input: SettingsInput): Promise<AppSettings> {
  const data = { ...input, currency: "PLN", serviceCategories: JSON.stringify(input.serviceCategories) };
  const saved = await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  return toAppSettings(saved);
}
