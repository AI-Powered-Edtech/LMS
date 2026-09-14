import { describe, expect, it } from "vitest";

import { getOptimizedImageUrl } from "../image";

describe("getOptimizedImageUrl", () => {
  it("returns original url if it is empty", () => {
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("returns original url if it is undefined", () => {
    expect(getOptimizedImageUrl(undefined as unknown as string)).toBe(
      undefined,
    );
  });

  it("returns original url if it is null", () => {
    expect(getOptimizedImageUrl(null as unknown as string)).toBe(null);
  });

  it("returns original url if it does not contain the Supabase storage public URL path", () => {
    expect(getOptimizedImageUrl("https://example.com/image.png")).toBe(
      "https://example.com/image.png",
    );
  });

  it("transforms the url correctly with default options", () => {
    const originalUrl =
      "https://project.db.co/storage/v1/object/public/bucket/image.png";
    const result = getOptimizedImageUrl(originalUrl);
    expect(result).toBe(
      "https://project.db.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80&format=webp",
    );
  });

  it("transforms the url correctly with all options provided", () => {
    const originalUrl =
      "https://project.db.co/storage/v1/object/public/bucket/image.png";
    const result = getOptimizedImageUrl(originalUrl, {
      width: 100,
      height: 200,
      resize: "contain",
      quality: 90,
      format: "origin",
    });
    expect(result).toBe(
      "https://project.db.co/storage/v1/render/image/public/bucket/image.png?width=100&height=200&resize=contain&quality=90",
    );
  });
});
