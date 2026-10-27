import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ companyName, children }: { companyName: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <aside className="no-print sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Brand companyName={companyName} />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
        <div className="border-t px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          Wersja demonstracyjna. Dane przechowywane lokalnie w bazie SQLite.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-8">
          <MobileNav companyName={companyName} />
          <span className="truncate text-sm font-semibold lg:hidden">{companyName}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/klienci/nowy">
                <Plus data-icon="inline-start" />
                <span className="hidden sm:inline">Dodaj klienta</span>
                <span className="sm:hidden">Klient</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/zlecenia/nowe">
                <Plus data-icon="inline-start" />
                <span className="hidden sm:inline">Nowe zlecenie</span>
                <span className="sm:hidden">Zlecenie</span>
              </Link>
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
