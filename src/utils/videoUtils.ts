/**
 * Video URL Parser Utility
 * Parses video URLs to detect type (YouTube, Vimeo, or direct) and generate embed URLs
 */

export type VideoType = "youtube" | "vimeo" | "direct";

export interface ParsedVideoUrl {
  type: VideoType;
  embedUrl: string | null;
  thumbnailUrl?: string;
}

/**
 * Parse a video URL and determine its type and embed URL
 *
 * Supported formats:
 * - YouTube: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
 * - Vimeo: vimeo.com/...
 * - Direct: any other URL (mp4, webm, etc.)
 *
 * @param url - The video URL to parse
 * @returns ParsedVideoUrl object with type, embedUrl, and optional thumbnailUrl
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
  if (!url) {
    return { type: "direct", embedUrl: null };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // YouTube detection
    if (
      hostname.includes("youtube.com") ||
      hostname === "youtu.be" ||
      hostname.includes("youtube-nocookie.com")
    ) {
      let videoId = "";

      if (hostname === "youtu.be") {
        // youtu.be/VIDEO_ID
        videoId = pathname.slice(1);
      } else if (pathname.includes("/embed/")) {
        // youtube.com/embed/VIDEO_ID or youtube-nocookie.com/embed/VIDEO_ID
        const match = pathname.match(/\/embed\/([^/?]+)/);
        videoId = match?.[1] || "";
      } else {
        // youtube.com/watch?v=VIDEO_ID
        videoId = searchParams.get("v") || "";
      }

      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        return { type: "youtube", embedUrl, thumbnailUrl };
      }
    }

    // Vimeo detection
    if (hostname.includes("vimeo.com")) {
      // vimeo.com/VIDEO_ID
      const match = pathname.match(/^\/(\d+)/);
      const videoId = match?.[1];

      if (videoId) {
        const embedUrl = `https://player.vimeo.com/video/${videoId}`;
        return { type: "vimeo", embedUrl };
      }
    }

    // Direct video URL (mp4, webm, ogg, etc.)
    return { type: "direct", embedUrl: null };
  } catch {
    // If URL parsing fails, treat as direct URL
    return { type: "direct", embedUrl: null };
  }
}

/**
 * Check if a URL is a supported embedded video (YouTube or Vimeo)
 * @param url - The video URL to check
 * @returns true if URL is YouTube or Vimeo
 */
export function isEmbeddedVideo(url: string): boolean {
  const { type } = parseVideoUrl(url);
  return type === "youtube" || type === "vimeo";
}
