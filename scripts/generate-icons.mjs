// Node.js script untuk generate placeholder PNG icons tanpa dependency eksternal.
// Buat minimal valid PNG files agar build tidak error.
// Di production, ganti dengan icon EduSync resmi dari designer.

import { writeFileSync, existsSync } from 'fs'

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuffer = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = crc32(crcData)

  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc, 0)

  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

// ─── Main ────────────────────────────────────────────────────────────────────

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUTDIR = 'public/icons'

// Nama file sesuai manifest di vite.config.ts
function getFilename(size) {
  if (size === 192 || size === 512) return `icon-${size}.png`
  return `icon-${size}x${size}.png`
}

import { deflateSync } from 'node:zlib'

function createMinimalPNGSync(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8)
  ihdrData.writeUInt8(2, 9)
  ihdrData.writeUInt8(0, 10)
  ihdrData.writeUInt8(0, 11)
  ihdrData.writeUInt8(0, 12)
  const ihdr = createChunk('IHDR', ihdrData)

  const rowSize = 1 + width * 3
  const rawData = Buffer.alloc(rowSize * height)
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3
      rawData[offset] = 0x63
      rawData[offset + 1] = 0x66
      rawData[offset + 2] = 0xf1
    }
  }

  const compressed = deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

console.log('Generating placeholder PWA icons...')
console.log('CATATAN: Ganti dengan icon EduSync resmi dari designer sebelum production!\n')

for (const size of SIZES) {
  const filename = getFilename(size)
  const filepath = `${OUTDIR}/${filename}`

  if (existsSync(filepath) && (size === 192 || size === 512)) {
    console.log(`  SKIP ${filename} (sudah ada)`)
    continue
  }

  const png = createMinimalPNGSync(size, size)
  writeFileSync(filepath, png)
  console.log(`  OK   ${filename} (${size}x${size}, ${png.length} bytes)`)
}

console.log('\nDone!')
