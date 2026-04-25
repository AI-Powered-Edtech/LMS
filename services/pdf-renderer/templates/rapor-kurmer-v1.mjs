/**
 * rapor-kurmer-v1 — Kurikulum Merdeka rapor template, POC.
 *
 * Static HTML string emitter. The production v1 will load `RaporPrintable`
 * from the FE bundle to guarantee parity with the on-screen preview, but the
 * POC stays self-contained: no node_modules dependency on the FE app, no
 * SSR pipeline. Once `RaporPrintable.tsx` lands and is bundled to an ESM
 * entry, this template becomes a thin wrapper that calls it.
 */

const escapeHtml = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export function renderRaporKurmerV1(data) {
  const {
    school = {},
    student = {},
    rombel = {},
    semester = {},
    subjects = [],
    attendance = {},
    signatures = {},
  } = data

  const subjectRows = subjects
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td class="num">${escapeHtml(s.score ?? '-')}</td>
        <td>${escapeHtml(s.predikat ?? '-')}</td>
        <td>${escapeHtml(s.deskripsi ?? '-')}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Rapor — ${escapeHtml(student.nama ?? '')}</title>
<style>
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #111; margin: 0; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px double #111; padding-bottom: 12px; }
  .header img { width: 64px; height: 64px; }
  .school-name { font-size: 16pt; font-weight: 700; text-transform: uppercase; }
  .school-meta { font-size: 9pt; color: #444; }
  h1 { font-size: 14pt; text-align: center; margin: 18px 0 6px; letter-spacing: 1px; }
  .identity { display: grid; grid-template-columns: 140px 1fr 140px 1fr; gap: 4px 12px; font-size: 10pt; margin: 12px 0; }
  table.grades { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.grades th, table.grades td { border: 1px solid #888; padding: 4px 6px; font-size: 10pt; vertical-align: top; }
  table.grades thead th { background: #eee; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .attendance { margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; }
  .attendance .cell { border: 1px solid #888; padding: 6px; text-align: center; }
  .signatures { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; font-size: 10pt; text-align: center; }
  .sig-block { min-height: 90px; }
  .sig-name { border-top: 1px solid #111; padding-top: 4px; margin-top: 60px; font-weight: 600; }
  .draft-watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .draft-watermark span { font-size: 96pt; color: rgba(200, 0, 0, 0.12); transform: rotate(-30deg); font-weight: 800; letter-spacing: 8px; }
</style>
</head>
<body>
  ${signatures.published ? '' : '<div class="draft-watermark"><span>DRAFT</span></div>'}
  <div class="header">
    <div>
      <div class="school-name">${escapeHtml(school.nama ?? 'Nama Sekolah')}</div>
      <div class="school-meta">${escapeHtml(school.alamat ?? '')}</div>
      <div class="school-meta">NPSN: ${escapeHtml(school.npsn ?? '-')}</div>
    </div>
  </div>

  <h1>Laporan Hasil Belajar Peserta Didik</h1>
  <div style="text-align:center; font-size: 10pt;">
    Semester ${escapeHtml(semester.nama ?? '-')} — Tahun Pelajaran ${escapeHtml(semester.tahun ?? '-')}
  </div>

  <div class="identity">
    <div>Nama</div><div>: ${escapeHtml(student.nama ?? '-')}</div>
    <div>NIS / NISN</div><div>: ${escapeHtml(student.nis ?? '-')} / ${escapeHtml(student.nisn ?? '-')}</div>
    <div>Kelas</div><div>: ${escapeHtml(rombel.nama ?? '-')}</div>
    <div>Wali Kelas</div><div>: ${escapeHtml(rombel.wali_kelas ?? '-')}</div>
    <div>Fase</div><div>: ${escapeHtml(rombel.fase ?? '-')}</div>
    <div>Tanggal Cetak</div><div>: ${escapeHtml(new Date().toLocaleDateString('id-ID'))}</div>
  </div>

  <table class="grades">
    <thead>
      <tr><th style="width:30%">Mata Pelajaran</th><th style="width:10%">Nilai</th><th style="width:10%">Predikat</th><th>Deskripsi</th></tr>
    </thead>
    <tbody>
      ${subjectRows || '<tr><td colspan="4" style="text-align:center; color:#888">Belum ada data nilai.</td></tr>'}
    </tbody>
  </table>

  <div class="attendance">
    <div class="cell"><strong>Sakit</strong><br/>${escapeHtml(attendance.sakit ?? 0)} hari</div>
    <div class="cell"><strong>Izin</strong><br/>${escapeHtml(attendance.izin ?? 0)} hari</div>
    <div class="cell"><strong>Alpa</strong><br/>${escapeHtml(attendance.alpa ?? 0)} hari</div>
  </div>

  <div class="signatures">
    <div class="sig-block">Orang Tua / Wali<div class="sig-name">${escapeHtml(signatures.orangtua ?? '....................')}</div></div>
    <div class="sig-block">Wali Kelas<div class="sig-name">${escapeHtml(signatures.wali_kelas ?? '....................')}</div></div>
    <div class="sig-block">Kepala Sekolah<div class="sig-name">${escapeHtml(signatures.kepsek ?? '....................')}</div></div>
  </div>
</body>
</html>`
}
