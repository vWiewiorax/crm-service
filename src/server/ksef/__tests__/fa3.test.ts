import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fromISODate } from "@/lib/dates";
import { buildFa3Xml, fa3Amount, splitAddress, type Fa3Invoice } from "../fa3";

const base: Fa3Invoice = {
  number: "FV-2026-0001",
  issueDate: fromISODate("2026-10-27"),
  saleDate: fromISODate("2026-10-25"),
  dueDate: fromISODate("2026-11-10"),
  placeOfIssue: "Rzeszów",
  paymentMethod: "TRANSFER",
  vatExemptionBasis: null,
  notes: "Dziękujemy & zapraszamy <ponownie>",
  sellerName: "Elektro-Serwis Nowicki",
  sellerNip: "8130000000",
  sellerAddress: "ul. Przykładowa 12\n35-001 Rzeszów",
  sellerBankAccount: "PL00 1020 0000 0000 0000 0000 0000",
  buyerName: "Piekarnia Złoty Kłos s.c.",
  buyerNip: "1111111111",
  buyerAddress: "ul. Młyńska 8, 35-005 Rzeszów",
  items: [
    { name: "Wymiana gniazd", quantity: 3, unit: "szt.", unitPriceNet: 8000, vatRate: "23" },
    { name: "Materiały", quantity: 1.5, unit: "kpl.", unitPriceNet: 1999, vatRate: "8" },
  ],
};

const hasXmllint = spawnSync("xmllint", ["--version"]).status === 0;
const XSD = path.join(process.cwd(), "ksef", "schemy", "FA3.xsd");

function validate(xml: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "fa3-"));
  const file = path.join(dir, "fa.xml");
  writeFileSync(file, xml);
  return execFileSync("xmllint", ["--nonet", "--noout", "--schema", XSD, file], { encoding: "utf8", stdio: "pipe" });
}

describe("FA(3)", () => {
  it("formats amounts and splits addresses", () => {
    expect(fa3Amount(123450)).toBe("1234.50");
    expect(fa3Amount(5)).toBe("0.05");
    expect(splitAddress("ul. Młyńska 8, 35-005 Rzeszów")).toEqual(["ul. Młyńska 8", "35-005 Rzeszów"]);
    expect(splitAddress("ul. A 1\n35-001 Rzeszów")).toEqual(["ul. A 1", "35-001 Rzeszów"]);
  });

  it("builds sums per VAT rate and escapes text", () => {
    const xml = buildFa3Xml(base, { generatedAt: new Date("2026-10-27T10:00:00Z") });
    expect(xml).toContain("<P_13_1>240.00</P_13_1><P_14_1>55.20</P_14_1>");
    expect(xml).toContain("<P_13_2>29.99</P_13_2><P_14_2>2.40</P_14_2>");
    expect(xml).toContain("<P_15>327.59</P_15>");
    expect(xml).toContain("Dziękujemy &amp; zapraszamy &lt;ponownie&gt;");
    expect(xml).toContain("<NrRB>00102000000000000000000000</NrRB>");
  });

  it.skipIf(!hasXmllint)("validates against the official FA(3) XSD", () => {
    validate(buildFa3Xml(base));
    validate(
      buildFa3Xml({
        ...base,
        buyerNip: null,
        buyerAddress: null,
        paymentMethod: "CASH",
        notes: null,
        placeOfIssue: null,
        vatExemptionBasis: "art. 43 ust. 1 pkt 1 ustawy o VAT",
        items: [
          { name: "Usługa zwolniona", quantity: 1, unit: "usł.", unitPriceNet: 10000, vatRate: "zw" },
          { name: "Usługa 0%", quantity: 2, unit: "h", unitPriceNet: 5000, vatRate: "0" },
          { name: "Usługa 5%", quantity: 1, unit: "usł.", unitPriceNet: 100, vatRate: "5" },
        ],
      }),
    );
  });
});
