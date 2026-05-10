/**
 * Translates raw authentication errors into Bahasa Indonesia
 */
export const translateAuthError = (message: string): string => {
  if (!message) return "Terjadi kesalahan yang tidak diketahui.";

  const msg = message.toLowerCase();

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("cors") ||
    msg.includes("cross-origin") ||
    msg.includes("mixed content")
  ) {
    return "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
  }

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials")
  ) {
    return "Email atau kata sandi salah. Silakan coba lagi.";
  }
  if (msg.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
  }
  if (msg.includes("user not found")) {
    return "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.";
  }
  if (
    msg.includes("user already registered") ||
    msg.includes("already exists")
  ) {
    return "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
  }
  if (msg.includes("password should be at least")) {
    return "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.";
  }
  if (msg.includes("weak password") || msg.includes("password strength")) {
    return "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
  }
  if (msg.includes("token expired") || msg.includes("expired token")) {
    return "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
  }
  if (msg.includes("invalid token")) {
    return "Tautan tidak valid atau sudah digunakan.";
  }

  return message; // fallback to raw message if unknown
};
