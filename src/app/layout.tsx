import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSettings } from "@/server/settings";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "ZleceniaPro", template: "%s | ZleceniaPro" },
  description: "System obsługi zleceń, klientów i wycen dla jednoosobowej firmy usługowej (wersja demonstracyjna).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dane pochodzą z lokalnej bazy i mają być zawsze aktualne - renderujemy dynamicznie.
  await connection();
  const settings = await getSettings();
  return (
    <html lang="pl" className={cn("h-full antialiased font-sans", inter.variable)}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={300}>
          <AppShell companyName={settings.companyName}>{children}</AppShell>
        </TooltipProvider>
        <Toaster position="top-right" richColors={false} closeButton />
      </body>
    </html>
  );
}
