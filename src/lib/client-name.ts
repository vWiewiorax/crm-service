export function clientDisplayName(c: { name: string; companyName?: string | null; type?: string }) {
  return c.type === "COMPANY" && c.companyName ? c.companyName : c.name;
}
