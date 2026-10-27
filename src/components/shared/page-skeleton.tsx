import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ variant = "list" }: { variant?: "list" | "dashboard" | "detail" | "form" }) {
  return (
    <div aria-busy="true" aria-label="Ładowanie" className="animate-in fade-in duration-300">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {variant === "dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      )}
      {variant === "list" && (
        <>
          <div className="mb-4 flex gap-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="space-y-px overflow-hidden rounded-xl border bg-card">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-none" />
            ))}
          </div>
        </>
      )}
      {variant === "detail" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}
      {variant === "form" && <Skeleton className="h-[480px] rounded-xl" />}
    </div>
  );
}
