export function formatDocumentNumber(prefix: string, year: number, seq: number, padding: number): string {
  return `${prefix}-${year}-${String(seq).padStart(padding, "0")}`;
}
