import { getInvoice } from "@/server/invoices";
import { renderInvoicePdf } from "@/server/pdf/invoice-pdf";

export async function GET(request: Request, ctx: RouteContext<"/faktury/[id]/pdf">) {
  const { id } = await ctx.params;
  const invoice = await getInvoice(id);
  if (!invoice) return new Response("Nie znaleziono faktury", { status: 404 });
  try {
    const buffer = await renderInvoicePdf(invoice);
    const download = new URL(request.url).searchParams.get("pobierz") === "1";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Nie udało się wygenerować PDF", { status: 500 });
  }
}
