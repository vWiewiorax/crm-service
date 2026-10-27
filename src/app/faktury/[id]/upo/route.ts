import { getInvoice } from "@/server/invoices";

export async function GET(_request: Request, ctx: RouteContext<"/faktury/[id]/upo">) {
  const { id } = await ctx.params;
  const invoice = await getInvoice(id);
  if (!invoice?.upoXml) return new Response("UPO nie jest dostępne", { status: 404 });
  return new Response(invoice.upoXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="UPO-${invoice.number}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
