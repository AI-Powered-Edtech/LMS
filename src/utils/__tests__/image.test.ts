import { describe, expect, it } from "vitest";

import { getOptimizedImageUrl } from "../image";

describe("getOptimizedImageUrl", () => {
  const baseUrl =
    "https://example.db.co/storage/v1/object/public/bucket/image.png";

  it("should return original url if it does not contain the target path", () => {
    const url = "https://example.com/image.png";
    expect(getOptimizedImageUrl(url)).toBe(url);
  });

  it("should return original url if it is empty or undefined", () => {
    expect(getOptimizedImageUrl("")).toBe("");
    expect(
      getOptimizedImageUrl(undefined as unknown as string),
    ).toBeUndefined();
  });

  it("should transform URL with default options", () => {
    const result = getOptimizedImageUrl(baseUrl);
    expect(result).toBe(
      "https://example.db.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80&format=webp",
    );
  });

  it("should include width and height if provided", () => {
    const result = getOptimizedImageUrl(baseUrl, { width: 100, height: 200 });
    expect(result).toBe(
      "https://example.db.co/storage/v1/render/image/public/bucket/image.png?width=100&height=200&resize=cover&quality=80&format=webp",
    );
  });

  it("should apply custom resize and quality", () => {
    const result = getOptimizedImageUrl(baseUrl, {
      resize: "contain",
      quality: 60,
    });
    expect(result).toBe(
      "https://example.db.co/storage/v1/render/image/public/bucket/image.png?resize=contain&quality=60&format=webp",
    );
  });

  it("should not include format if format is 'origin'", () => {
    const result = getOptimizedImageUrl(baseUrl, { format: "origin" });
    expect(result).toBe(
      "https://example.db.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80",
    );
  });
});
