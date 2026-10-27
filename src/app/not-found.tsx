import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Nie znaleziono strony</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Rekord mógł zostać usunięty albo adres jest nieprawidłowy.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Wróć do dashboardu</Link>
      </Button>
    </div>
  );
}
