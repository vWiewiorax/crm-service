import { Building2, User } from "lucide-react";
import Link from "next/link";
import { clientDisplayName } from "@/lib/client-name";

export function ClientLink({
  client,
  showIcon = true,
}: {
  client: { id: string; name: string; companyName?: string | null; type?: string };
  showIcon?: boolean;
}) {
  const Icon = client.type === "COMPANY" ? Building2 : User;
  return (
    <Link href={`/klienci/${client.id}`} className="inline-flex max-w-full min-w-0 items-center gap-1.5 hover:text-primary hover:underline">
      {showIcon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
      <span className="truncate">{clientDisplayName(client)}</span>
    </Link>
  );
}
