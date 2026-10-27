const WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

export function normalizeNip(value: string): string {
  return value.replace(/[\s-]/g, "").replace(/^PL/i, "");
}

/** Sprawdza sumę kontrolną polskiego NIP-u. */
export function isValidNip(value: string): boolean {
  const nip = normalizeNip(value);
  if (!/^\d{10}$/.test(nip)) return false;
  const digits = nip.split("").map(Number);
  const sum = WEIGHTS.reduce((s, w, i) => s + w * digits[i], 0);
  const control = sum % 11;
  return control !== 10 && control === digits[9];
}

export function formatNip(value: string | null | undefined): string {
  if (!value) return "-";
  const n = normalizeNip(value);
  return n.length === 10 ? `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8)}` : value;
}
