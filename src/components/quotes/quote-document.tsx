import { formatDate } from "@/lib/dates";
import { formatMoney, formatNumber, formatVat } from "@/lib/format";
import { documentTotals, lineNet } from "@/lib/money";
import { formatNip } from "@/lib/nip";
import { clientDisplayName } from "@/lib/client-name";

export type QuoteDocData = {
  number: string;
  title: string;
  description: string | null;
  notes: string | null;
  issueDate: Date;
  validUntil: Date;
  client: { name: string; companyName: string | null; type: string; address: string | null; nip: string | null; email: string | null; phone: string | null };
  items: { id: string; name: string; quantity: number; unit: string; unitPriceNet: number; vatRate: string }[];
};

export type CompanyDocData = {
  companyName: string;
  ownerName: string | null;
  address: string | null;
  nip: string | null;
  email: string | null;
  phone: string | null;
  bankAccount: string | null;
};

/** Podgląd HTML dokumentu wyceny - ten sam układ co PDF. */
export function QuoteDocument({ quote, company }: { quote: QuoteDocData; company: CompanyDocData }) {
  const totals = documentTotals(quote.items);
  return (
    <article className="mx-auto max-w-[820px] rounded-lg border bg-white p-6 text-[13px] text-slate-800 shadow-sm sm:p-10">
      <header className="flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row">
        <div>
          <p className="text-lg font-semibold text-[#1e3a6e]">{company.companyName}</p>
          {company.ownerName && <p>{company.ownerName}</p>}
          {company.address && <p className="whitespace-pre-line">{company.address}</p>}
          {company.nip && <p>NIP: {formatNip(company.nip)}</p>}
          {company.phone && <p>tel. {company.phone}</p>}
          {company.email && <p>{company.email}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Wycena</p>
          <p className="text-xl font-semibold">{quote.number}</p>
          <p className="mt-2">Data wystawienia: {formatDate(quote.issueDate)}</p>
          <p>Ważna do: {formatDate(quote.validUntil)}</p>
        </div>
      </header>
      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs tracking-wide text-slate-500 uppercase">Dla</p>
          <p className="font-semibold">{clientDisplayName(quote.client)}</p>
          {quote.client.type === "COMPANY" && <p>{quote.client.name}</p>}
          {quote.client.address && <p className="whitespace-pre-line">{quote.client.address}</p>}
          {quote.client.nip && <p>NIP: {formatNip(quote.client.nip)}</p>}
        </div>
        <div>
          <p className="mb-1 text-xs tracking-wide text-slate-500 uppercase">Przedmiot wyceny</p>
          <p className="font-semibold">{quote.title}</p>
          {quote.description && <p className="whitespace-pre-line text-slate-600">{quote.description}</p>}
        </div>
      </section>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
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
            {quote.items.map((it, i) => (
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
      <div className="mt-4 ml-auto w-full max-w-xs space-y-1">
        {totals.breakdown.map((b) => (
          <div key={b.rate} className="flex justify-between text-xs text-slate-500">
            <span>
              {formatVat(b.rate)} od {formatMoney(b.net)}
            </span>
            <span className="tabular">{formatMoney(b.vat)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2">
          <span>Razem netto</span>
          <span className="tabular">{formatMoney(totals.net)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span className="tabular">{formatMoney(totals.vat)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-[#1e3a6e]">
          <span>Do zapłaty brutto</span>
          <span className="tabular">{formatMoney(totals.gross)}</span>
        </div>
      </div>
      {quote.notes && (
        <section className="mt-6 border-t pt-4">
          <p className="mb-1 text-xs tracking-wide text-slate-500 uppercase">Uwagi</p>
          <p className="whitespace-pre-line">{quote.notes}</p>
        </section>
      )}
      <footer className="mt-8 border-t pt-4 text-xs text-slate-500">
        Dokument ma charakter oferty i nie jest fakturą VAT.
        {company.bankAccount && ` Rachunek: ${company.bankAccount}.`}
      </footer>
    </article>
  );
}
