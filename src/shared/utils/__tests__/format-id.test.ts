import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
} from "../format-id";

describe("format-id", () => {
  describe("formatDate", () => {
    it("formats a leap-year date as long id-ID", () => {
      expect(formatDate(new Date(2024, 1, 29))).toMatch(/29 Februari 2024/);
    });

    it("formats end-of-month date", () => {
      expect(formatDate(new Date(2026, 0, 31))).toMatch(/31 Januari 2026/);
    });

    it("returns fallback for invalid input", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate(NaN)).toBe("—");
      expect(formatDate("not-a-date")).toBe("—");
    });
  });

  describe("formatDateShort", () => {
    it("formats as DD/MM/YYYY", () => {
      expect(formatDateShort(new Date(2026, 3, 15))).toBe("15/04/2026");
    });

    it("formats start-of-month", () => {
      expect(formatDateShort(new Date(2026, 11, 1))).toBe("01/12/2026");
    });
  });

  describe("formatDateTime", () => {
    it("includes date and time", () => {
      const out = formatDateTime(new Date(2026, 3, 15, 14, 5));
      expect(out).toMatch(/2026/);
      expect(out).toMatch(/14[.:]05/);
    });
  });

  describe("formatRelative", () => {
    it("formats hours ago in Indonesian", () => {
      const now = new Date("2026-04-24T12:00:00Z");
      const twoHoursAgo = new Date("2026-04-24T10:00:00Z");
      expect(formatRelative(twoHoursAgo, now)).toMatch(/jam.*lalu/i);
    });

    it("formats yesterday as kemarin", () => {
      const now = new Date("2026-04-24T12:00:00Z");
      const yesterday = new Date("2026-04-23T12:00:00Z");
      expect(formatRelative(yesterday, now).toLowerCase()).toContain("kemarin");
    });

    it("returns fallback for invalid", () => {
      expect(formatRelative(null)).toBe("—");
    });
  });

  describe("formatNumber", () => {
    it("formats with id-ID separators", () => {
      expect(formatNumber(1234.56)).toBe("1.234,56");
    });

    it("handles negative, zero, decimal", () => {
      expect(formatNumber(-42)).toBe("-42");
      expect(formatNumber(0)).toBe("0");
      expect(formatNumber(0.5)).toBe("0,5");
    });

    it("returns empty for invalid", () => {
      expect(formatNumber(null)).toBe("");
      expect(formatNumber(undefined)).toBe("");
      expect(formatNumber(NaN)).toBe("");
      expect(formatNumber(Infinity)).toBe("");
    });
  });

  describe("formatCurrency", () => {
    it("formats IDR without decimals for millions", () => {
      const out = formatCurrency(1_234_567);
      expect(out).toMatch(/Rp/);
      expect(out).toContain("1.234.567");
      expect(out).not.toMatch(/,\d{2}$/);
    });

    it("formats zero", () => {
      expect(formatCurrency(0)).toMatch(/Rp.*0/);
    });

    it("returns empty for invalid", () => {
      expect(formatCurrency(null)).toBe("");
      expect(formatCurrency(NaN)).toBe("");
    });
  });

  describe("formatPercent", () => {
    it("formats with id-ID decimal separator", () => {
      expect(formatPercent(82.5)).toBe("82,5%");
    });

    it("handles boundaries 0 and 100", () => {
      expect(formatPercent(0)).toBe("0,0%");
      expect(formatPercent(100)).toBe("100,0%");
    });

    it("respects digits arg", () => {
      expect(formatPercent(33.333, 0)).toBe("33%");
    });

    it("returns empty for invalid", () => {
      expect(formatPercent(null)).toBe("");
      expect(formatPercent(NaN)).toBe("");
    });
  });
});
