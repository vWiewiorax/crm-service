import { z } from "zod";
import { fromISODate, isValidISODate } from "../dates";
import { parseMoney, parseQuantity } from "../money";

const MAX_MONEY = 100_000_000_00; // 100 mln zł w groszach

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label}: pole wymagane`).max(max, `${label}: maksymalnie ${max} znaków`);

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Maksymalnie ${max} znaków`)
    .transform((v) => (v === "" ? null : v));

export const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === "" || v === "none" ? null : v));

export const requiredId = (message: string) => z.string().trim().min(1, message);

export const moneyField = (label = "Kwota") =>
  z
    .string()
    .trim()
    .min(1, `${label}: podaj kwotę`)
    .transform((value, ctx) => {
      const grosze = parseMoney(value);
      if (grosze === null) {
        ctx.addIssue({ code: "custom", message: `${label}: podaj kwotę w formacie 1234,56` });
        return z.NEVER;
      }
      if (grosze > MAX_MONEY) {
        ctx.addIssue({ code: "custom", message: `${label}: kwota jest zbyt duża` });
        return z.NEVER;
      }
      return grosze;
    });

export const optionalMoneyField = (label = "Kwota") =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return 0;
      const grosze = parseMoney(value);
      if (grosze === null || grosze > MAX_MONEY) {
        ctx.addIssue({ code: "custom", message: `${label}: podaj kwotę w formacie 1234,56` });
        return z.NEVER;
      }
      return grosze;
    });

export const quantityField = z
  .string()
  .trim()
  .min(1, "Podaj ilość")
  .transform((value, ctx) => {
    const q = parseQuantity(value);
    if (q === null || q <= 0 || q > 100_000) {
      ctx.addIssue({ code: "custom", message: "Ilość musi być liczbą większą od 0" });
      return z.NEVER;
    }
    return q;
  });

export const dateField = (label = "Data") =>
  z
    .string()
    .trim()
    .min(1, `${label}: pole wymagane`)
    .refine(isValidISODate, `${label}: podaj poprawną datę`)
    .transform(fromISODate);

export const optionalDateField = (label = "Data") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || isValidISODate(v), `${label}: podaj poprawną datę`)
    .transform((v) => (v === "" ? null : fromISODate(v)));

export const intField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}: podaj liczbę całkowitą`)
    .transform(Number)
    .pipe(z.number().min(min, `${label}: minimum ${min}`).max(max, `${label}: maksimum ${max}`));

export const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Podaj poprawny adres e-mail")
  .transform((v) => (v === "" ? null : v.toLowerCase()));

export const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[\d\s()-]{7,20}$/.test(v), "Podaj poprawny numer telefonu")
  .transform((v) => (v === "" ? null : v));

export const timeField = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Podaj godzinę w formacie GG:MM")
  .transform((v) => (v === "" ? null : v));
