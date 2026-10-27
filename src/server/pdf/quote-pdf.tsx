import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanyDocData, QuoteDocData } from "@/components/quotes/quote-document";
import { clientDisplayName } from "@/lib/client-name";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatNumber, formatVat } from "@/lib/format";
import { documentTotals, lineNet } from "@/lib/money";
import { formatNip } from "@/lib/nip";

const fontDir = path.join(process.cwd(), "src", "assets", "fonts");
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(fontDir, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Roboto-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const NAVY = "#1e3a6e";
const MUTED = "#64748b";
const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 9.5, color: "#1e293b", padding: 40, lineHeight: 1.4 },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#e2e8f0", paddingBottom: 14 },
  company: { fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 2 },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  number: { fontSize: 15, fontWeight: 700 },
  parties: { flexDirection: "row", gap: 24, paddingVertical: 14 },
  col: { flex: 1 },
  bold: { fontWeight: 700 },
  th: { flexDirection: "row", backgroundColor: NAVY, color: "#fff", paddingVertical: 5, paddingHorizontal: 4, fontSize: 8.5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#e2e8f0", paddingVertical: 5, paddingHorizontal: 4 },
  cLp: { width: 22 },
  cName: { flex: 1, paddingRight: 6 },
  cQty: { width: 60, textAlign: "right" },
  cPrice: { width: 72, textAlign: "right" },
  cVat: { width: 40, textAlign: "right" },
  cNet: { width: 78, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 220 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: NAVY, marginTop: 3 },
  notes: { marginTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0", paddingTop: 8 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 24, fontSize: 7.5, color: MUTED, borderTopWidth: 0.5, borderColor: "#e2e8f0", paddingTop: 6 },
});

function QuotePdf({ quote, company }: { quote: QuoteDocData; company: CompanyDocData }) {
  const totals = documentTotals(quote.items);
  return (
    <Document title={`Wycena ${quote.number}`} author={company.companyName} language="pl">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.company}>{company.companyName}</Text>
            {company.ownerName && <Text>{company.ownerName}</Text>}
            {company.address && <Text>{company.address}</Text>}
            {company.nip && <Text>NIP: {formatNip(company.nip)}</Text>}
            {company.phone && <Text>tel. {company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Wycena</Text>
            <Text style={s.number}>{quote.number}</Text>
            <Text style={{ marginTop: 6 }}>Data wystawienia: {formatDate(quote.issueDate)}</Text>
            <Text>Ważna do: {formatDate(quote.validUntil)}</Text>
          </View>
        </View>
        <View style={s.parties}>
          <View style={s.col}>
            <Text style={s.label}>Dla</Text>
            <Text style={s.bold}>{clientDisplayName(quote.client)}</Text>
            {quote.client.type === "COMPANY" && <Text>{quote.client.name}</Text>}
            {quote.client.address && <Text>{quote.client.address}</Text>}
            {quote.client.nip && <Text>NIP: {formatNip(quote.client.nip)}</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Przedmiot wyceny</Text>
            <Text style={s.bold}>{quote.title}</Text>
            {quote.description && <Text style={{ color: "#475569" }}>{quote.description}</Text>}
          </View>
        </View>
        <View style={s.th} fixed>
          <Text style={s.cLp}>Lp.</Text>
          <Text style={s.cName}>Nazwa</Text>
          <Text style={s.cQty}>Ilość</Text>
          <Text style={s.cPrice}>Cena netto</Text>
          <Text style={s.cVat}>VAT</Text>
          <Text style={s.cNet}>Wartość netto</Text>
        </View>
        {quote.items.map((it, i) => (
          <View key={it.id} style={s.tr} wrap={false}>
            <Text style={[s.cLp, { color: MUTED }]}>{i + 1}</Text>
            <Text style={s.cName}>{it.name}</Text>
            <Text style={s.cQty}>
              {formatNumber(it.quantity)} {it.unit}
            </Text>
            <Text style={s.cPrice}>{formatMoney(it.unitPriceNet)}</Text>
            <Text style={s.cVat}>{formatVat(it.vatRate)}</Text>
            <Text style={s.cNet}>{formatMoney(lineNet(it))}</Text>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          {totals.breakdown.map((b) => (
            <View key={b.rate} style={[s.tRow, { color: MUTED, fontSize: 8 }]}>
              <Text>
                {formatVat(b.rate)} od {formatMoney(b.net)}
              </Text>
              <Text>{formatMoney(b.vat)}</Text>
            </View>
          ))}
          <View style={[s.tRow, { borderTopWidth: 0.5, borderColor: "#e2e8f0", marginTop: 3, paddingTop: 4 }]}>
            <Text>Razem netto</Text>
            <Text>{formatMoney(totals.net)}</Text>
          </View>
          <View style={s.tRow}>
            <Text>VAT</Text>
            <Text>{formatMoney(totals.vat)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Do zapłaty brutto</Text>
            <Text>{formatMoney(totals.gross)}</Text>
          </View>
        </View>
        {quote.notes && (
          <View style={s.notes} wrap={false}>
            <Text style={s.label}>Uwagi</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}
        <Text style={s.footer} fixed>
          Dokument ma charakter oferty i nie jest fakturą VAT.{company.bankAccount ? ` Rachunek: ${company.bankAccount}.` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export function renderQuotePdf(quote: QuoteDocData, company: CompanyDocData) {
  return renderToBuffer(<QuotePdf quote={quote} company={company} />);
}
