#!/bin/bash
# Generate PWA icons dari base SVG
# Requires: rsvg-convert (librsvg) atau inkscape
# Alternatif: npx sharp-cli

SIZES="72 96 128 144 152 192 384 512"
INPUT="public/icons/icon-base.svg"
OUTDIR="public/icons"

# Nama file sesuai manifest di vite.config.ts
# 192 -> icon-192.png (bukan icon-192x192.png)
# 512 -> icon-512.png (bukan icon-512x512.png)
get_filename() {
  local size=$1
  if [ "$size" = "192" ] || [ "$size" = "512" ]; then
    echo "icon-${size}.png"
  else
    echo "icon-${size}x${size}.png"
  fi
}

for size in $SIZES; do
  filename=$(get_filename $size)
  echo "Generating ${size}x${size} -> ${filename}..."

  if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w $size -h $size "$INPUT" -o "${OUTDIR}/${filename}"
  elif command -v inkscape &> /dev/null; then
    inkscape -w $size -h $size "$INPUT" -o "${OUTDIR}/${filename}" 2>/dev/null
  elif command -v magick &> /dev/null; then
    magick "$INPUT" -resize ${size}x${size} "${OUTDIR}/${filename}"
  elif command -v convert &> /dev/null; then
    convert "$INPUT" -resize ${size}x${size} "${OUTDIR}/${filename}"
  else
    echo "  No SVG-to-PNG tool found. Install librsvg, inkscape, or imagemagick."
    echo "  Alternatively, run: node scripts/generate-icons.mjs"
    exit 1
  fi
done

echo "Done! Semua icon PWA berhasil digenerate."
