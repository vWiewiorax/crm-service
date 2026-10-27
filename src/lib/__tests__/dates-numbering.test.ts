import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffInDays, formatDate, fromISODate, toISODate, todayISO } from "../dates";
import { formatDocumentNumber } from "../numbering-format";

describe("dates", () => {
  it("liczy dzisiejszy dzień w strefie Europe/Warsaw", () => {
    expect(todayISO(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-02");
    expect(todayISO(new Date("2026-07-15T21:59:00Z"))).toBe("2026-07-15");
    expect(todayISO(new Date("2026-07-15T22:01:00Z"))).toBe("2026-07-16");
  });

  it("operuje na datach bez przesunięć strefy", () => {
    const d = fromISODate("2026-01-31");
    expect(toISODate(d)).toBe("2026-01-31");
    expect(toISODate(addDays(d, 1))).toBe("2026-02-01");
    expect(diffInDays(fromISODate("2026-03-30"), fromISODate("2026-03-28"))).toBe(2);
    expect(formatDate(d)).toBe("31.01.2026");
    expect(toISODate(addMonths(fromISODate("2026-01-01"), 1))).toBe("2026-02-01");
  });
});

describe("numeracja", () => {
  it("formatuje numer dokumentu", () => {
    expect(formatDocumentNumber("ZL", 2026, 1, 4)).toBe("ZL-2026-0001");
    expect(formatDocumentNumber("WYC", 2026, 123, 3)).toBe("WYC-2026-123");
  });
});
