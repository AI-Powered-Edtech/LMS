import { describe, expect, it } from "vitest";

import {
  defaultCsvFilename,
  rowsToCsv,
  todayStamp,
} from "@/shared/utils/export-table";

describe("rowsToCsv", () => {
  it("prefixes output with UTF-8 BOM", () => {
    const csv = rowsToCsv([{ name: "Budi" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("uses first row keys as header by default", () => {
    const csv = rowsToCsv([{ name: "Budi", age: 10 }]);
    const [, header] = csv.split("\uFEFF");
    expect(header.split("\r\n")[0]).toBe("name,age");
  });

  it("escapes double-quotes by doubling them and wrapping in quotes", () => {
    const csv = rowsToCsv([{ note: 'He said "hi"' }]);
    expect(csv).toContain('"He said ""hi"""');
  });

  it("wraps fields containing commas in quotes", () => {
    const csv = rowsToCsv([{ name: "Doe, John" }]);
    expect(csv).toContain('"Doe, John"');
  });

  it("wraps fields containing newlines in quotes", () => {
    const csv = rowsToCsv([{ note: "line1\nline2" }]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders null and undefined as empty strings", () => {
    const csv = rowsToCsv([{ a: null, b: undefined, c: "x" }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe(",,x");
  });

  it("throws on empty rows array", () => {
    expect(() => rowsToCsv([])).toThrow("No data to export");
  });

  it("respects custom columns order and labels", () => {
    const csv = rowsToCsv(
      [{ name: "Budi", age: 10, email: "b@x.id" }],
      [
        { key: "email", label: "Email" },
        { key: "name", label: "Nama" },
      ],
    );
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[0]).toBe("Email,Nama");
    expect(lines[1]).toBe("b@x.id,Budi");
  });

  it("coerces non-string primitives", () => {
    const csv = rowsToCsv([{ n: 42, b: true }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe("42,true");
  });
});

describe("filename helpers", () => {
  it("todayStamp formats YYYYMMDD", () => {
    expect(todayStamp(new Date("2026-04-24T10:00:00Z"))).toMatch(/^\d{8}$/);
  });

  it("defaultCsvFilename combines page and date", () => {
    const name = defaultCsvFilename("users", new Date("2026-04-24T00:00:00"));
    expect(name).toBe("users-20260424.csv");
  });
});
