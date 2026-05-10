/**
 * EduSync LMS — Image optimization utilities
 * Provides helpers for storage image transformation.
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
  format?: "webp" | "origin";
}

/**
 * Transforms a storage public URL to use the built-in image transformation service.
 * @param url - Original public URL
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageTransformOptions = {},
): string {
  if (!url || !url.includes(".db.co/storage/v1/object/public/")) {
    return url;
  }

  const {
    width,
    height,
    resize = "cover",
    quality = 80,
    format = "webp",
  } = options;

  const params = new URLSearchParams();
  if (width) params.set("width", width.toString());
  if (height) params.set("height", height.toString());
  params.set("resize", resize);
  params.set("quality", quality.toString());
  if (format !== "origin") params.set("format", format);

  // Transformation URL structure:
  // /storage/v1/render/image/public/[bucket]/[path]?[params]
  return (
    url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    ) +
    "?" +
    params.toString()
  );
}
