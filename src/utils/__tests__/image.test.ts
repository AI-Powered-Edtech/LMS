import { describe, expect, it } from "vitest";

import { getOptimizedImageUrl } from "@/utils/image";

describe("image utils", () => {
  describe("getOptimizedImageUrl", () => {
    it("returns original url if it does not contain the storage public path", () => {
      const url = "https://example.com/image.png";
      expect(getOptimizedImageUrl(url)).toBe(url);
    });

    it("returns original url if it is empty", () => {
      expect(getOptimizedImageUrl("")).toBe("");
    });

    it("transforms a valid storage url with default options", () => {
      const url =
        "https://proj.db.co/storage/v1/object/public/bucket/image.png";
      const result = getOptimizedImageUrl(url);
      expect(result).toBe(
        "https://proj.db.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80&format=webp",
      );
    });

    it("applies width and height options", () => {
      const url =
        "https://proj.db.co/storage/v1/object/public/bucket/image.png";
      const result = getOptimizedImageUrl(url, { width: 100, height: 200 });
      expect(result).toContain("width=100");
      expect(result).toContain("height=200");
    });

    it("applies resize and quality options", () => {
      const url =
        "https://proj.db.co/storage/v1/object/public/bucket/image.png";
      const result = getOptimizedImageUrl(url, {
        resize: "contain",
        quality: 60,
      });
      expect(result).toContain("resize=contain");
      expect(result).toContain("quality=60");
    });

    it("does not include format if format is origin", () => {
      const url =
        "https://proj.db.co/storage/v1/object/public/bucket/image.png";
      const result = getOptimizedImageUrl(url, { format: "origin" });
      expect(result).not.toContain("format=");
    });
  });
});
