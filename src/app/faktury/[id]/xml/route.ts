import { getInvoice, invoiceXml } from "@/server/invoices";

/** Plik FA(3): dla wysłanej faktury dokładnie ten, który trafił do KSeF. */
export async function GET(_request: Request, ctx: RouteContext<"/faktury/[id]/xml">) {
  const { id } = await ctx.params;
  const invoice = await getInvoice(id);
  if (!invoice) return new Response("Nie znaleziono faktury", { status: 404 });
  const xml = invoice.ksefStatus !== "NOT_SENT" && invoice.ksefXml ? invoice.ksefXml : invoiceXml(invoice);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoice.number}-FA3.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
