export function Brand({ companyName }: { companyName: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="3" width="16" height="18" rx="2" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-foreground" title={companyName}>
          {companyName}
        </p>
        <p className="text-xs leading-tight text-muted-foreground">ZleceniaPro</p>
      </div>
    </div>
  );
}
