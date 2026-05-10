// EduSync LMS — AES-GCM Encryption Layer untuk IndexedDB Storage
//
// SECURITY NOTE: Protects against:
//   - Akses fisik perangkat (laptop/HP yang dicuri)
//   - Ekstensi browser berbahaya yang membaca IndexedDB
//
// Does NOT protect against:
//   - Active XSS (penyerang menjalankan JS di origin yang sama)
//   - Akses tingkat OS

const APP_SALT = "edusync-lms-2026";

// Cache derived keys per userId agar tidak di-derive ulang setiap operasi
const keyCache = new Map<string, CryptoKey>();

/**
 * Menurunkan CryptoKey AES-GCM 256-bit dari userId menggunakan PBKDF2.
 * Key di-cache di memori agar tidak perlu re-derive pada setiap operasi.
 *
 * @param userId - ID pengguna unik sebagai bahan derivasi kunci
 * @returns CryptoKey yang siap digunakan untuk enkripsi/dekripsi
 */
async function deriveKey(userId: string): Promise<CryptoKey> {
  const cached = keyCache.get(userId);
  if (cached) return cached;

  // Encode userId dan salt sebagai bahan PBKDF2
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(APP_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // tidak bisa di-export
    ["encrypt", "decrypt"],
  );

  keyCache.set(userId, key);
  return key;
}

/**
 * Mengenkripsi data sembarang ke string Base64 menggunakan AES-GCM 256-bit.
 * IV (12 byte) dibuat secara acak per operasi dan disematkan di awal output.
 *
 * Format output: base64(iv[12 bytes] + ciphertext)
 *
 * @param data - Data sembarang yang akan dienkripsi (akan di-JSON.stringify)
 * @param userId - ID pengguna untuk derivasi kunci
 * @returns String Base64 berisi IV + ciphertext
 */
export async function encryptData(
  data: unknown,
  userId: string,
): Promise<string> {
  const key = await deriveKey(userId);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  // IV acak 12 byte — wajib unik per operasi enkripsi (AES-GCM requirement)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  // Gabungkan IV + ciphertext menjadi satu Uint8Array
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  // Encode ke Base64 untuk penyimpanan di IndexedDB sebagai string
  return btoa(String.fromCharCode(...combined));
}

/**
 * Mendekripsi string Base64 hasil `encryptData` kembali ke data aslinya.
 *
 * @param encrypted - String Base64 berisi IV + ciphertext
 * @param userId - ID pengguna yang sama dengan saat enkripsi
 * @returns Data asli yang telah di-parse dari JSON
 * @throws Error jika kunci salah atau data korup
 */
export async function decryptData<T>(
  encrypted: string,
  userId: string,
): Promise<T> {
  const key = await deriveKey(userId);

  // Decode Base64 kembali ke binary
  const binaryString = atob(encrypted);
  const combined = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

  // Pisahkan IV (12 byte pertama) dari ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted)) as T;
}
