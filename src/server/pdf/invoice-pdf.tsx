import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { paymentLabel, type InvoiceDocData } from "@/components/invoices/invoice-document";
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
const BORDER = "#e2e8f0";
const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 9.5, color: "#1e293b", padding: 40, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: BORDER, paddingBottom: 14 },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  number: { fontSize: 15, fontWeight: 700 },
  parties: { flexDirection: "row", gap: 24, paddingVertical: 14, borderBottomWidth: 1, borderColor: BORDER },
  col: { flex: 1 },
  bold: { fontWeight: 700 },
  th: { flexDirection: "row", backgroundColor: NAVY, color: "#fff", paddingVertical: 5, paddingHorizontal: 4, fontSize: 8.5, marginTop: 14 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 4 },
  cLp: { width: 22 },
  cName: { flex: 1, paddingRight: 6 },
  cQty: { width: 60, textAlign: "right" },
  cPrice: { width: 72, textAlign: "right" },
  cVat: { width: 40, textAlign: "right" },
  cNet: { width: 78, textAlign: "right" },
  bottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 20 },
  sumRow: { flexDirection: "row", paddingVertical: 1.5 },
  sCell: { width: 56, textAlign: "right" },
  grand: { flexDirection: "row", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: NAVY, marginTop: 14, backgroundColor: "#f8fafc", padding: 8 },
  notes: { marginTop: 14, borderTopWidth: 1, borderColor: BORDER, paddingTop: 8 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 24, fontSize: 7.5, color: MUTED, borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 6 },
});

function InvoicePdf({ invoice }: { invoice: InvoiceDocData }) {
  const totals = documentTotals(invoice.items);
  const exempt = totals.breakdown.some((b) => b.rate === "zw");
  return (
    <Document title={`Faktura ${invoice.number}`} author={invoice.sellerName} language="pl">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.label}>Faktura VAT</Text>
            <Text style={s.number}>{invoice.number}</Text>
            {invoice.ksefNumber && <Text style={{ color: MUTED, marginTop: 2 }}>Numer KSeF (środowisko testowe): {invoice.ksefNumber}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>Data wystawienia: {formatDate(invoice.issueDate)}</Text>
            <Text>Data sprzedaży: {formatDate(invoice.saleDate)}</Text>
            {invoice.placeOfIssue && <Text>Miejsce wystawienia: {invoice.placeOfIssue}</Text>}
          </View>
        </View>
        <View style={s.parties}>
          <View style={s.col}>
            <Text style={s.label}>Sprzedawca</Text>
            <Text style={[s.bold, { color: NAVY }]}>{invoice.sellerName}</Text>
            <Text>{invoice.sellerAddress}</Text>
            <Text>NIP: {formatNip(invoice.sellerNip)}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Nabywca</Text>
            <Text style={s.bold}>{invoice.buyerName}</Text>
            {invoice.buyerAddress && <Text>{invoice.buyerAddress}</Text>}
            {invoice.buyerNip && <Text>NIP: {formatNip(invoice.buyerNip)}</Text>}
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
        {invoice.items.map((it, i) => (
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
        <View style={s.bottom} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text>Forma płatności: {paymentLabel(invoice.paymentMethod)}</Text>
            <Text>Termin płatności: {formatDate(invoice.dueDate)}</Text>
            {invoice.paymentMethod === "TRANSFER" && invoice.sellerBankAccount && <Text>Rachunek: {invoice.sellerBankAccount}</Text>}
            {exempt && invoice.vatExemptionBasis && <Text>Podstawa zwolnienia z VAT: {invoice.vatExemptionBasis}</Text>}
          </View>
          <View>
            <View style={[s.sumRow, { color: MUTED, fontSize: 8 }]}>
              <Text style={{ width: 40 }}>Stawka</Text>
              <Text style={s.sCell}>Netto</Text>
              <Text style={s.sCell}>VAT</Text>
              <Text style={s.sCell}>Brutto</Text>
            </View>
            {totals.breakdown.map((b) => (
              <View key={b.rate} style={s.sumRow}>
                <Text style={{ width: 40 }}>{formatVat(b.rate)}</Text>
                <Text style={s.sCell}>{formatMoney(b.net)}</Text>
                <Text style={s.sCell}>{formatMoney(b.vat)}</Text>
                <Text style={s.sCell}>{formatMoney(b.gross)}</Text>
              </View>
            ))}
            <View style={[s.sumRow, s.bold, { borderTopWidth: 0.5, borderColor: BORDER, marginTop: 2, paddingTop: 3 }]}>
              <Text style={{ width: 40 }}>Razem</Text>
              <Text style={s.sCell}>{formatMoney(totals.net)}</Text>
              <Text style={s.sCell}>{formatMoney(totals.vat)}</Text>
              <Text style={s.sCell}>{formatMoney(totals.gross)}</Text>
            </View>
          </View>
        </View>
        <View style={s.grand} wrap={false}>
          <Text>Do zapłaty</Text>
          <Text>{formatMoney(totals.gross)}</Text>
        </View>
        {invoice.notes && (
          <View style={s.notes} wrap={false}>
            <Text style={s.label}>Uwagi</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
        <Text style={s.footer} fixed>
          {invoice.ksefNumber
            ? "Faktura przesłana do testowego środowiska KSeF Ministerstwa Finansów. Środowisko testowe nie wywołuje skutków podatkowych."
            : `Faktura ${invoice.number} · ${invoice.sellerName}`}
        </Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(invoice: InvoiceDocData) {
  return renderToBuffer(<InvoicePdf invoice={invoice} />);
}
