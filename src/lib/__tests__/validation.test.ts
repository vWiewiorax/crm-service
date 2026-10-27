import { describe, expect, it } from "vitest";
import { clientSchema, orderSchema, quoteSchema, settingsSchema, taskSchema } from "../validation/schemas";

const item = { name: "Robocizna", quantity: "2", unit: "godz.", unitPriceNet: "120,00", vatRate: "23" as const };

describe("walidacja", () => {
  it("wycena: wymaga pozycji i poprawnych dat", () => {
    const base = { clientId: "c1", title: "Test", description: "", issueDate: "2026-05-10", validUntil: "2026-06-10", status: "DRAFT" as const, notes: "", items: [item] };
    const ok = quoteSchema.safeParse(base);
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.items[0].unitPriceNet).toBe(12000);
    expect(quoteSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    const bad = quoteSchema.safeParse({ ...base, validUntil: "2026-05-01" });
    expect(bad.success).toBe(false);
    expect(quoteSchema.safeParse({ ...base, items: [{ ...item, unitPriceNet: "abc" }] }).success).toBe(false);
  });

  it("klient: e-mail i NIP są opcjonalne, ale walidowane", () => {
    const base = { type: "PRIVATE", name: "Jan Testowy", companyName: "", email: "", phone: "", address: "", nip: "", notes: "" };
    expect(clientSchema.safeParse(base).success).toBe(true);
    expect(clientSchema.safeParse({ ...base, email: "zly-email" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("zadanie: pusty klient i zlecenie zapisują się jako null", () => {
    const r = taskSchema.safeParse({ title: "Zadzwonić", description: "", dueDate: "", priority: "NORMAL", status: "TODO", clientId: "", orderId: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.clientId).toBeNull();
      expect(r.data.orderId).toBeNull();
      expect(r.data.dueDate).toBeNull();
    }
  });

  it("ustawienia: kategorie z wierszy, bez duplikatów", () => {
    const r = settingsSchema.safeParse({
      companyName: "Firma", ownerName: "", address: "", nip: "", email: "", phone: "", bankAccount: "",
      defaultVatRate: "23", paymentTermDays: "14", quoteValidityDays: "30", orderNumberPrefix: "ZL", quoteNumberPrefix: "WYC", numberPadding: "4",
      serviceCategories: "A\nB\n\nA ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.serviceCategories).toEqual(["A", "B"]);
  });

  it("zlecenie: odrzuca ujemną kwotę", () => {
    const shape = orderSchema.safeParse({ title: "", netAmount: "-1" });
    expect(shape.success).toBe(false);
  });
});
