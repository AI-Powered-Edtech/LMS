// EduSync LMS — iCalendar Export Utility
// RFC 5545 compliant — dapat diimport ke Google Calendar, Apple Calendar, Outlook.

import type { CalendarEvent } from "@/features/calendar/api/calendarService";

/**
 * Menghasilkan string iCalendar (.ics) dari array CalendarEvent.
 * RFC 5545 compliant — dapat diimport ke Google Calendar, Apple Calendar, Outlook.
 *
 * @param events - Daftar event kalender EduSync
 * @param calendarName - Nama kalender (default: 'EduSync')
 * @returns String iCalendar yang valid sesuai RFC 5545
 */
export function generateICal(
  events: CalendarEvent[],
  calendarName = "EduSync",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EduSync LMS//ID",
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const dtStart = toICalDate(event.date, event.time);
    const dtEnd = event.endDate
      ? toICalDate(event.endDate, event.endTime ?? event.time)
      : toICalDate(event.date, event.time, event.duration ?? 60);

    lines.push(
      "BEGIN:VEVENT",
      `UID:edusync-${event.id}@edusync.dev`,
      `DTSTAMP:${toICalDate(new Date())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICalText(event.title)}`,
      `DESCRIPTION:${escapeICalText(event.description || "")}`,
      `LOCATION:${escapeICalText(event.location || "")}`,
      `CATEGORIES:${event.type.toUpperCase()}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 §3.1: baris dipisahkan oleh CRLF
  return lines.join("\r\n");
}

/**
 * Mengkonversi Date + string waktu opsional ke format iCalendar DATE-TIME.
 * Format: YYYYMMDDTHHmmssZ (UTC)
 *
 * @param date - Objek Date dasar
 * @param time - String waktu format "HH:mm" (opsional)
 * @param addMinutes - Menit yang ditambahkan ke waktu (untuk menghitung end time)
 * @returns String format iCalendar DATE-TIME
 */
function toICalDate(date: Date, time?: string, addMinutes = 0): string {
  // Buat Date baru untuk menghindari mutasi
  let d = new Date(date);

  if (time) {
    // Parse "HH:mm" dan set jam/menit ke objek date sebagai UTC
    const parts = time.split(":");
    const hours = parseInt(parts[0] ?? "0", 10);
    const minutes = parseInt(parts[1] ?? "0", 10);
    d.setUTCHours(hours, minutes, 0, 0);
  }

  if (addMinutes > 0) {
    d = new Date(d.getTime() + addMinutes * 60 * 1000);
  }

  // Format ke UTC: YYYYMMDDTHHmmssZ
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const mins = pad(d.getUTCMinutes());
  const secs = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

/**
 * Melakukan escape karakter khusus pada teks iCalendar sesuai RFC 5545 §3.3.11.
 * Karakter yang di-escape: backslash, koma, titik koma, dan newline.
 *
 * @param text - Teks yang akan di-escape
 * @returns Teks yang sudah di-escape untuk properti iCalendar
 */
function escapeICalText(text: string): string {
  return (
    text
      // Backslash harus di-escape pertama kali
      .replace(/\\/g, "\\\\")
      // Koma dan titik koma perlu di-escape
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      // Newline di-escape sebagai \n (literal dua karakter)
      .replace(/\r\n|\r|\n/g, "\\n")
  );
}

/**
 * Men-download file iCalendar (.ics) berisi daftar event yang diberikan.
 * Membuat Blob dan memicu download via tag <a> yang dibuat secara dinamis.
 *
 * @param events - Daftar event kalender yang akan diekspor
 * @param filename - Nama file yang akan didownload (default: 'edusync-calendar.ics')
 */
export function downloadICal(
  events: CalendarEvent[],
  filename = "edusync-calendar.ics",
): void {
  const content = generateICal(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Bebaskan object URL setelah download selesai
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
