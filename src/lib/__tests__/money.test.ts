import { describe, expect, it } from "vitest";
import { documentTotals, lineNet, moneyToInput, parseMoney, parseQuantity, totalsFromNet, vatFromNet } from "../money";

describe("money", () => {
  it("parsuje kwoty w polskim formacie do groszy", () => {
    expect(parseMoney("1 234,56")).toBe(123456);
    expect(parseMoney("10")).toBe(1000);
    expect(parseMoney("10,5")).toBe(1050);
    expect(parseMoney("0,01 zł")).toBe(1);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("12,345")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("formatuje grosze do pola formularza", () => {
    expect(moneyToInput(123456)).toMatch(/1\s?234,56/);
    expect(parseMoney(moneyToInput(98765))).toBe(98765);
  });

  it("parsuje ilości z przecinkiem", () => {
    expect(parseQuantity("2,5")).toBe(2.5);
    expect(parseQuantity("3")).toBe(3);
    expect(parseQuantity("1,2345")).toBeNull();
  });

  it("liczy VAT z zaokrągleniem do grosza", () => {
    expect(vatFromNet(10000, "23")).toBe(2300);
    expect(vatFromNet(333, "23")).toBe(77);
    expect(vatFromNet(10000, "zw")).toBe(0);
    expect(totalsFromNet(10000, "8")).toEqual({ net: 10000, vat: 800, gross: 10800 });
  });

  it("liczy wartość pozycji", () => {
    expect(lineNet({ quantity: 2.5, unitPriceNet: 1999 })).toBe(4998);
  });

  it("sumuje dokument z VAT liczonym od sum stawek", () => {
    const t = documentTotals([
      { quantity: 1, unitPriceNet: 333, vatRate: "23" },
      { quantity: 1, unitPriceNet: 333, vatRate: "23" },
      { quantity: 2, unitPriceNet: 5000, vatRate: "8" },
    ]);
    expect(t.net).toBe(10666);
    expect(t.breakdown).toHaveLength(2);
    expect(t.breakdown[0]).toEqual({ rate: "23", net: 666, vat: 153, gross: 819 });
    expect(t.vat).toBe(153 + 800);
    expect(t.gross).toBe(t.net + t.vat);
  });
});
