import { describe, expect, it } from "vitest";

import { isEmbeddedVideo, parseVideoUrl } from "../videoUtils";

describe("videoUtils", () => {
  describe("parseVideoUrl", () => {
    it("handles youtube watch urls", () => {
      const result = parseVideoUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
      expect(result.type).toBe("youtube");
      expect(result.embedUrl).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      );
    });

    it("handles youtu.be urls", () => {
      const result = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result.type).toBe("youtube");
      expect(result.embedUrl).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      );
    });

    it("handles youtube embed urls", () => {
      const result = parseVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(result.type).toBe("youtube");
      expect(result.embedUrl).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      );
    });

    it("handles youtube-nocookie embed urls", () => {
      const result = parseVideoUrl(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      );
      expect(result.type).toBe("youtube");
      expect(result.embedUrl).toBe(
        "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      );
    });

    it("handles vimeo urls", () => {
      const result = parseVideoUrl("https://vimeo.com/123456789");
      expect(result.type).toBe("vimeo");
      expect(result.embedUrl).toBe("https://player.vimeo.com/video/123456789");
      expect(result.thumbnailUrl).toBeUndefined();
    });

    it("returns direct for mp4 urls", () => {
      const result = parseVideoUrl("https://example.com/video.mp4");
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
      expect(result.thumbnailUrl).toBeUndefined();
    });

    it("handles empty string", () => {
      const result = parseVideoUrl("");
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
    });

    it("handles null (by casting to string for test edge case)", () => {
      const result = parseVideoUrl(null as unknown as string);
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
    });

    it("handles undefined (by casting to string for test edge case)", () => {
      const result = parseVideoUrl(undefined as unknown as string);
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
    });

    it("handles invalid urls", () => {
      const result = parseVideoUrl("not a url");
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
    });

    it("handles youtube urls without video id", () => {
      const result = parseVideoUrl("https://www.youtube.com/");
      expect(result.type).toBe("direct");
      expect(result.embedUrl).toBeNull();
    });
  });

  describe("isEmbeddedVideo", () => {
    it("returns true for youtube urls", () => {
      expect(
        isEmbeddedVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      ).toBe(true);
    });

    it("returns true for vimeo urls", () => {
      expect(isEmbeddedVideo("https://vimeo.com/123456789")).toBe(true);
    });

    it("returns false for direct urls", () => {
      expect(isEmbeddedVideo("https://example.com/video.mp4")).toBe(false);
    });

    it("returns false for invalid urls", () => {
      expect(isEmbeddedVideo("not a url")).toBe(false);
    });
  });
});
