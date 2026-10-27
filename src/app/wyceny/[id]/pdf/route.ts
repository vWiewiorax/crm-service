import { renderQuotePdf } from "@/server/pdf/quote-pdf";
import { getQuote } from "@/server/quotes";
import { getSettings } from "@/server/settings";

export async function GET(request: Request, ctx: RouteContext<"/wyceny/[id]/pdf">) {
  const { id } = await ctx.params;
  const [quote, settings] = await Promise.all([getQuote(id), getSettings()]);
  if (!quote) return new Response("Nie znaleziono wyceny", { status: 404 });
  try {
    const buffer = await renderQuotePdf(quote, settings);
    const download = new URL(request.url).searchParams.get("pobierz") === "1";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${quote.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Nie udało się wygenerować PDF", { status: 500 });
  }
}
