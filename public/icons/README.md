# EduSync PWA Icons

Folder ini harus berisi icon-icon berikut untuk PWA manifest:

| File               | Ukuran  | Keterangan                           |
| ------------------ | ------- | ------------------------------------ |
| `favicon.svg`      | SVG     | Favicon utama (sudah ada)            |
| `icon-72x72.png`   | 72x72   | Android home screen                  |
| `icon-96x96.png`   | 96x96   | Android home screen                  |
| `icon-128x128.png` | 128x128 | Chrome Web Store                     |
| `icon-144x144.png` | 144x144 | Windows tile / IE                    |
| `icon-152x152.png` | 152x152 | iOS Retina iPad                      |
| `icon-192.png`     | 192x192 | Android / maskable (sudah ada)       |
| `icon-384x384.png` | 384x384 | Android high-res                     |
| `icon-512.png`     | 512x512 | Splash screen / maskable (sudah ada) |

## Cara Generate

### Dari SVG (recommended)

Membutuhkan `rsvg-convert` (librsvg), `inkscape`, atau `imagemagick`:

```bash
bash scripts/generate-icons.sh
```

### Placeholder tanpa dependency eksternal

Membuat PNG placeholder berwarna indigo (valid PNG, tanpa logo):

```bash
node scripts/generate-icons.mjs
```

### Menggunakan sharp-cli

```bash
npx sharp-cli --input icons/icon-512.png --output icons/icon-72x72.png resize 72
npx sharp-cli --input icons/icon-512.png --output icons/icon-96x96.png resize 96
npx sharp-cli --input icons/icon-512.png --output icons/icon-128x128.png resize 128
npx sharp-cli --input icons/icon-512.png --output icons/icon-144x144.png resize 144
npx sharp-cli --input icons/icon-512.png --output icons/icon-152x152.png resize 152
npx sharp-cli --input icons/icon-512.png --output icons/icon-384x384.png resize 384
```

Atau gunakan online tool: https://maskable.app / https://realfavicongenerator.net

> **PENTING:** Ganti dengan icon EduSync resmi dari designer sebelum production.

## Catatan Maskable Icons

Icon dengan `purpose: 'any maskable'` (icon-192.png dan icon-512.png) harus memiliki:

- Safe zone: 80% dari ukuran icon di tengah
- Background: bisa berwarna (tidak transparan)
- Tidak ada elemen penting di luar safe zone
