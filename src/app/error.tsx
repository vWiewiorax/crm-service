"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Coś poszło nie tak</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nie udało się wczytać danych. Sprawdź, czy baza danych została utworzona (npm run setup), i spróbuj ponownie.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw data-icon="inline-start" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
