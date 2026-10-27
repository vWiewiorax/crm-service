import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (total === 0) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("strona", String(p));
    else sp.delete("strona");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Paginacja" className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        <span className="tabular">
          {from}-{to}
        </span>{" "}
        z <span className="tabular">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)} aria-label="Poprzednia strona">
                <ChevronLeft data-icon="inline-start" />
                Poprzednia
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft data-icon="inline-start" />
              Poprzednia
            </Button>
          )}
          <span className="tabular text-muted-foreground">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)} aria-label="Następna strona">
                Następna
                <ChevronRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Następna
              <ChevronRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
