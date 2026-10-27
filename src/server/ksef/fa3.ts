import { toISODate } from "@/lib/dates";
import { documentTotals, lineNet, vatFromNet } from "@/lib/money";
import { normalizeNip } from "@/lib/nip";

/** Dane potrzebne do zbudowania faktury w strukturze logicznej FA(3) KSeF. */
export type Fa3Invoice = {
  number: string;
  issueDate: Date;
  saleDate: Date;
  dueDate: Date;
  placeOfIssue: string | null;
  paymentMethod: string;
  vatExemptionBasis: string | null;
  notes: string | null;
  sellerName: string;
  sellerNip: string;
  sellerAddress: string;
  sellerBankAccount: string | null;
  buyerName: string;
  buyerNip: string | null;
  buyerAddress: string | null;
  items: { name: string; quantity: number; unit: string; unitPriceNet: number; vatRate: string }[];
};

export const FA3_NAMESPACE = "http://crd.gov.pl/wzor/2025/06/25/13775/";
export const FA3_FORM_CODE = { systemCode: "FA (3)", schemaVersion: "1-0E", value: "FA" } as const;

/** Kolejność elementów P_13_x / P_14_x musi odpowiadać kolejności w schemacie XSD. */
const VAT_SLOTS: { rate: string; net: string; vat: string | null }[] = [
  { rate: "23", net: "P_13_1", vat: "P_14_1" },
  { rate: "8", net: "P_13_2", vat: "P_14_2" },
  { rate: "5", net: "P_13_3", vat: "P_14_3" },
  { rate: "0", net: "P_13_6_1", vat: null },
  { rate: "zw", net: "P_13_7", vat: null },
];
const P_12: Record<string, string> = { "23": "23", "8": "8", "5": "5", "0": "0 KR", zw: "zw" };
const PAYMENT_FORM: Record<string, string> = { CASH: "1", CARD: "2", TRANSFER: "6" };

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Tekst jednoliniowy (typ xsd:token) z limitem długości. */
function text(value: string, max = 256): string {
  return esc(value.replace(/\s+/g, " ").trim().slice(0, max));
}

/** Grosze -> "1234.50" */
export function fa3Amount(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function quantity(q: number): string {
  return String(Math.round(q * 1e6) / 1e6);
}

/** Dzieli adres na dwie linie FA(3): ulica oraz kod i miejscowość. */
export function splitAddress(address: string): [string, string | null] {
  const lines = address
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return [lines[0], lines.slice(1).join(", ")];
  const single = lines[0] ?? "";
  const idx = single.lastIndexOf(",");
  if (idx > 0) return [single.slice(0, idx).trim(), single.slice(idx + 1).trim()];
  return [single, null];
}

function addressXml(address: string | null): string {
  if (!address?.trim()) return "";
  const [l1, l2] = splitAddress(address);
  return `<Adres><KodKraju>PL</KodKraju><AdresL1>${text(l1, 512)}</AdresL1>${l2 ? `<AdresL2>${text(l2, 512)}</AdresL2>` : ""}</Adres>`;
}

export function buildFa3Xml(inv: Fa3Invoice, opts: { generatedAt?: Date; systemInfo?: string } = {}): string {
  const generatedAt = (opts.generatedAt ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const totals = documentTotals(inv.items);
  const byRate = new Map(totals.breakdown.map((b) => [b.rate, b]));
  const unknownRate = inv.items.find((i) => !(i.vatRate in P_12));
  if (unknownRate) throw new Error(`Nieobsługiwana stawka VAT: ${unknownRate.vatRate}`);
  const hasExempt = byRate.has("zw");

  const sums = VAT_SLOTS.filter((slot) => byRate.has(slot.rate))
    .map((slot) => {
      const row = byRate.get(slot.rate)!;
      const vat = slot.vat ? `<${slot.vat}>${fa3Amount(vatFromNet(row.net, slot.rate))}</${slot.vat}>` : "";
      return `<${slot.net}>${fa3Amount(row.net)}</${slot.net}>${vat}`;
    })
    .join("");

  const buyerId = inv.buyerNip ? `<NIP>${normalizeNip(inv.buyerNip)}</NIP>` : "<BrakID>1</BrakID>";
  const exemption = hasExempt
    ? `<P_19>1</P_19><P_19A>${text(inv.vatExemptionBasis ?? "")}</P_19A>`
    : "<P_19N>1</P_19N>";

  const rows = inv.items
    .map(
      (it, i) =>
        `<FaWiersz><NrWierszaFa>${i + 1}</NrWierszaFa><P_7>${text(it.name, 512)}</P_7><P_8A>${text(it.unit)}</P_8A>` +
        `<P_8B>${quantity(it.quantity)}</P_8B><P_9A>${fa3Amount(it.unitPriceNet)}</P_9A>` +
        `<P_11>${fa3Amount(lineNet(it))}</P_11><P_12>${P_12[it.vatRate]}</P_12></FaWiersz>`,
    )
    .join("");

  const bank = inv.sellerBankAccount?.replace(/[\s-]/g, "").replace(/^PL/i, "");
  const payment =
    `<Platnosc><TerminPlatnosci><Termin>${toISODate(inv.dueDate)}</Termin></TerminPlatnosci>` +
    `<FormaPlatnosci>${PAYMENT_FORM[inv.paymentMethod] ?? "6"}</FormaPlatnosci>` +
    (inv.paymentMethod === "TRANSFER" && bank ? `<RachunekBankowy><NrRB>${esc(bank)}</NrRB></RachunekBankowy>` : "") +
    `</Platnosc>`;

  const notes = inv.notes?.trim()
    ? `<DodatkowyOpis><Klucz>Uwagi</Klucz><Wartosc>${text(inv.notes)}</Wartosc></DodatkowyOpis>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Faktura xmlns="${FA3_NAMESPACE}" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<Naglowek><KodFormularza kodSystemowy="${FA3_FORM_CODE.systemCode}" wersjaSchemy="${FA3_FORM_CODE.schemaVersion}">${FA3_FORM_CODE.value}</KodFormularza>` +
    `<WariantFormularza>3</WariantFormularza><DataWytworzeniaFa>${generatedAt}</DataWytworzeniaFa>` +
    `<SystemInfo>${text(opts.systemInfo ?? "ZleceniaPro")}</SystemInfo></Naglowek>` +
    `<Podmiot1><DaneIdentyfikacyjne><NIP>${normalizeNip(inv.sellerNip)}</NIP><Nazwa>${text(inv.sellerName, 512)}</Nazwa></DaneIdentyfikacyjne>` +
    `${addressXml(inv.sellerAddress)}</Podmiot1>` +
    `<Podmiot2><DaneIdentyfikacyjne>${buyerId}<Nazwa>${text(inv.buyerName, 512)}</Nazwa></DaneIdentyfikacyjne>` +
    `${addressXml(inv.buyerAddress)}<JST>2</JST><GV>2</GV></Podmiot2>` +
    `<Fa><KodWaluty>PLN</KodWaluty><P_1>${toISODate(inv.issueDate)}</P_1>` +
    (inv.placeOfIssue?.trim() ? `<P_1M>${text(inv.placeOfIssue)}</P_1M>` : "") +
    `<P_2>${text(inv.number)}</P_2><P_6>${toISODate(inv.saleDate)}</P_6>` +
    `${sums}<P_15>${fa3Amount(totals.gross)}</P_15>` +
    `<Adnotacje><P_16>2</P_16><P_17>2</P_17><P_18>2</P_18><P_18A>2</P_18A><Zwolnienie>${exemption}</Zwolnienie>` +
    `<NoweSrodkiTransportu><P_22N>1</P_22N></NoweSrodkiTransportu><P_23>2</P_23><PMarzy><P_PMarzyN>1</P_PMarzyN></PMarzy></Adnotacje>` +
    `<RodzajFaktury>VAT</RodzajFaktury>${notes}${rows}${payment}</Fa></Faktura>`
  );
}
