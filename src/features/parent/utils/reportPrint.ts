// ==========================================================================
// reportPrint.ts — Utilities untuk print/share laporan orang tua
// Wave 4 — Task 29.6: Monthly Progress Report
// ==========================================================================

/**
 * Memicu dialog print browser.
 * Halaman laporan harus sudah di-render dengan print CSS yang tepat.
 */
export function printReport(): void {
  window.print()
}

/**
 * Share laporan menggunakan Web Share API.
 * Fallback ke clipboard jika Web Share API tidak tersedia.
 *
 * @param studentName - Nama siswa
 * @param monthName - Nama bulan (e.g. "Maret 2026")
 * @returns Promise yang resolve ke true jika berhasil share, false jika gagal
 */
export async function shareReport(studentName: string, monthName: string): Promise<boolean> {
  const text = `Laporan Perkembangan ${studentName} — ${monthName}\nDibuat melalui EduSync LMS`
  const url = window.location.href

  // Cek apakah Web Share API tersedia (mobile browsers)
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Laporan ${studentName} — ${monthName}`,
        text,
        url,
      })
      return true
    } catch (err) {
      // User membatalkan share — bukan error
      if ((err as Error)?.name === 'AbortError') return false
      // Fallback ke clipboard jika share gagal
    }
  }

  // Fallback: copy ke clipboard
  try {
    const shareText = `${text}\n${url}`
    await navigator.clipboard.writeText(shareText)
    return true
  } catch {
    // Fallback manual clipboard selection
    try {
      const textArea = document.createElement('textarea')
      textArea.value = `${text}\n${url}`
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      textArea.style.top = '0'
      textArea.style.left = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Cek apakah Web Share API tersedia di browser saat ini.
 */
export function canNativeShare(): boolean {
  return !!navigator.share
}
