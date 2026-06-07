import { describe, expect, it } from "vitest";

import { getOptimizedImageUrl } from "../image";

describe("getOptimizedImageUrl", () => {
  it("returns the original url if it is empty", () => {
    expect(getOptimizedImageUrl("")).toBe("");
  });

  it("returns the original url if it is null or undefined", () => {
    // @ts-expect-error testing invalid inputs
    expect(getOptimizedImageUrl(null)).toBe(null);
    // @ts-expect-error testing invalid inputs
    expect(getOptimizedImageUrl(undefined)).toBe(undefined);
  });

  it("returns the original url if it does not contain the proper storage path", () => {
    const url = "https://example.com/image.jpg";
    expect(getOptimizedImageUrl(url)).toBe(url);
  });

  it("transforms a valid storage url with default options", () => {
    const originalUrl = "https://example.db.co/storage/v1/object/public/bucket/image.jpg";
    const expectedUrl = "https://example.db.co/storage/v1/render/image/public/bucket/image.jpg?resize=cover&quality=80&format=webp";
    expect(getOptimizedImageUrl(originalUrl)).toBe(expectedUrl);
  });

  it("transforms a valid storage url with explicit options", () => {
    const originalUrl = "https://example.db.co/storage/v1/object/public/bucket/image.jpg";
    const expectedUrl = "https://example.db.co/storage/v1/render/image/public/bucket/image.jpg?width=400&height=300&resize=contain&quality=90&format=webp";

    expect(
      getOptimizedImageUrl(originalUrl, {
        width: 400,
        height: 300,
        resize: "contain",
        quality: 90,
        format: "webp",
      })
    ).toBe(expectedUrl);
  });

  it("omits the format parameter when format is 'origin'", () => {
    const originalUrl = "https://example.db.co/storage/v1/object/public/bucket/image.jpg";
    const expectedUrl = "https://example.db.co/storage/v1/render/image/public/bucket/image.jpg?resize=cover&quality=80";

    expect(
      getOptimizedImageUrl(originalUrl, {
        format: "origin",
      })
    ).toBe(expectedUrl);
  });
});
