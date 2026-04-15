/**
 * TeacherLayout — thin re-export dari AppShell.
 *
 * Logika layout student dan teacher telah dikonsolidasi ke AppShell.tsx
 * untuk menghilangkan duplikasi ~140 baris kode identik.
 * File ini dipertahankan untuk backward compatibility dengan import yang sudah ada.
 *
 * @see AppShell untuk implementasi aktual
 */
export { AppShell as TeacherLayout } from './AppShell'
