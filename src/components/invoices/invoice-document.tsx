import { PAYMENT_METHOD } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatNumber, formatVat } from "@/lib/format";
import { documentTotals, lineNet } from "@/lib/money";
import { formatNip } from "@/lib/nip";

export type InvoiceDocData = {
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
  ksefStatus: string;
  ksefNumber: string | null;
  items: { id: string; name: string; quantity: number; unit: string; unitPriceNet: number; vatRate: string }[];
};

export function paymentLabel(method: string) {
  return PAYMENT_METHOD.map[method as keyof typeof PAYMENT_METHOD.map]?.label ?? method;
}

/** Podgląd HTML faktury - ten sam układ co PDF. */
export function InvoiceDocument({ invoice }: { invoice: InvoiceDocData }) {
  const totals = documentTotals(invoice.items);
  return (
    <article className="mx-auto max-w-[820px] rounded-lg border bg-white p-6 text-[13px] text-slate-800 shadow-sm sm:p-10">
      <header className="flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row">
        <div>
          <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Faktura VAT</p>
          <p className="text-xl font-semibold">{invoice.number}</p>
          {invoice.ksefNumber && (
            <p className="mt-1 text-xs text-slate-500">
              Numer KSeF (środowisko testowe): <span className="font-mono">{invoice.ksefNumber}</span>
            </p>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm sm:text-right">
          <dt className="text-slate-500">Data wystawienia</dt>
          <dd>{formatDate(invoice.issueDate)}</dd>
          <dt className="text-slate-500">Data sprzedaży</dt>
          <dd>{formatDate(invoice.saleDate)}</dd>
          {invoice.placeOfIssue && (
            <>
              <dt className="text-slate-500">Miejsce wystawienia</dt>
              <dd>{invoice.placeOfIssue}</dd>
            </>
          )}
        </dl>
      </header>
      <div className="grid gap-6 border-b py-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wider text-slate-500 uppercase">Sprzedawca</p>
          <p className="font-semibold text-[#1e3a6e]">{invoice.sellerName}</p>
          <p className="whitespace-pre-line">{invoice.sellerAddress}</p>
          <p>NIP: {formatNip(invoice.sellerNip)}</p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wider text-slate-500 uppercase">Nabywca</p>
          <p className="font-semibold">{invoice.buyerName}</p>
          {invoice.buyerAddress && <p className="whitespace-pre-line">{invoice.buyerAddress}</p>}
          {invoice.buyerNip && <p>NIP: {formatNip(invoice.buyerNip)}</p>}
        </div>
      </div>
      <div className="overflow-x-auto py-6">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-[#1e3a6e] text-left text-xs text-white">
              <th className="px-2 py-2 font-medium">Lp.</th>
              <th className="px-2 py-2 font-medium">Nazwa</th>
              <th className="px-2 py-2 text-right font-medium">Ilość</th>
              <th className="px-2 py-2 text-right font-medium">Cena netto</th>
              <th className="px-2 py-2 text-right font-medium">VAT</th>
              <th className="px-2 py-2 text-right font-medium">Wartość netto</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="px-2 py-2 text-slate-500">{i + 1}</td>
                <td className="px-2 py-2">{it.name}</td>
                <td className="tabular px-2 py-2 text-right whitespace-nowrap">
                  {formatNumber(it.quantity)} {it.unit}
                </td>
                <td className="tabular px-2 py-2 text-right whitespace-nowrap">{formatMoney(it.unitPriceNet)}</td>
                <td className="px-2 py-2 text-right">{formatVat(it.vatRate)}</td>
                <td className="tabular px-2 py-2 text-right whitespace-nowrap">{formatMoney(lineNet(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-slate-500">Forma płatności:</span> {paymentLabel(invoice.paymentMethod)}
          </p>
          <p>
            <span className="text-slate-500">Termin płatności:</span> {formatDate(invoice.dueDate)}
          </p>
          {invoice.paymentMethod === "TRANSFER" && invoice.sellerBankAccount && (
            <p>
              <span className="text-slate-500">Rachunek:</span> <span className="font-mono">{invoice.sellerBankAccount}</span>
            </p>
          )}
          {invoice.vatExemptionBasis && totals.breakdown.some((b) => b.rate === "zw") && (
            <p>
              <span className="text-slate-500">Podstawa zwolnienia z VAT:</span> {invoice.vatExemptionBasis}
            </p>
          )}
        </div>
        <table className="w-full max-w-xs text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pb-1 text-left font-normal">Stawka</th>
              <th className="pb-1 text-right font-normal">Netto</th>
              <th className="pb-1 text-right font-normal">VAT</th>
              <th className="pb-1 text-right font-normal">Brutto</th>
            </tr>
          </thead>
          <tbody>
            {totals.breakdown.map((b) => (
              <tr key={b.rate}>
                <td>{formatVat(b.rate)}</td>
                <td className="tabular text-right">{formatMoney(b.net)}</td>
                <td className="tabular text-right">{formatMoney(b.vat)}</td>
                <td className="tabular text-right">{formatMoney(b.gross)}</td>
              </tr>
            ))}
            <tr className="border-t font-medium">
              <td className="pt-1">Razem</td>
              <td className="tabular pt-1 text-right">{formatMoney(totals.net)}</td>
              <td className="tabular pt-1 text-right">{formatMoney(totals.vat)}</td>
              <td className="tabular pt-1 text-right">{formatMoney(totals.gross)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex justify-between rounded-md bg-slate-50 px-4 py-3 text-base font-semibold text-[#1e3a6e]">
        <span>Do zapłaty</span>
        <span className="tabular">{formatMoney(totals.gross)}</span>
      </p>
      {invoice.notes && (
        <div className="mt-6 border-t pt-4">
          <p className="mb-1 text-[11px] font-medium tracking-wider text-slate-500 uppercase">Uwagi</p>
          <p className="whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}
    </article>
  );
}
