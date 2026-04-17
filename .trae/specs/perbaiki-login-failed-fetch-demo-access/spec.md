# Perbaikan Login “Failed to fetch” & Perapihan Demo Access Spec

## Why
Saat pengguna menekan tombol Masuk, aplikasi menampilkan error “Failed to fetch” sehingga proses login gagal dan tidak ada arahan yang jelas untuk pengguna. Selain itu, bagian “Demo Access” di halaman login tampak overlap/tidak rapi sehingga menurunkan kejelasan UI.

## What Changes
- Memperbaiki alur login agar tidak gagal karena “Failed to fetch” pada environment yang didukung (dev/demo/production).
- Menambahkan penanganan error jaringan/API yang lebih jelas (pesan yang mudah dipahami, status loading, dan fallback yang aman).
- Merapikan layout dan tipografi “Demo Access” agar tidak overlap dan responsif di berbagai ukuran layar.

## Impact
- Affected specs: Autentikasi email+password, konfigurasi API client, penanganan error UI, layout halaman login.
- Affected code: [src/pages/Login.tsx](file:///workspace/src/pages/Login.tsx), [src/features/auth/hooks/useLoginState.ts](file:///workspace/src/features/auth/hooks/useLoginState.ts), [src/features/auth/api/authService.ts](file:///workspace/src/features/auth/api/authService.ts), [src/services/api/vilApiClient.ts](file:///workspace/src/services/api/vilApiClient.ts), kemungkinan komponen UI terkait.

## ADDED Requirements
### Requirement: Penanganan Error “Failed to fetch”
Sistem SHALL menampilkan pesan error yang informatif ketika request login gagal karena masalah jaringan atau API tidak dapat dijangkau.

#### Scenario: Network error saat login
- **WHEN** pengguna menekan Masuk dan request login gagal karena network/CORS/DNS/endpoint tidak dapat dijangkau (error bertipe fetch/network)
- **THEN** UI menampilkan pesan yang ramah (mis. “Tidak dapat terhubung ke server. Cek koneksi atau konfigurasi environment.”) dan tidak menampilkan stack trace
- **AND** tombol Masuk kembali aktif setelah kegagalan
- **AND** tidak ada state auth yang tersimpan/parsial

### Requirement: Layout Demo Access Rapi & Responsif
Sistem SHALL menampilkan bagian “Demo Access” tanpa overlap, dengan jarak dan pemenggalan teks yang konsisten pada viewport kecil hingga besar.

#### Scenario: Tampilan mobile
- **WHEN** halaman login dibuka pada lebar layar kecil (contoh 320–375px)
- **THEN** teks dan daftar akun demo tidak saling bertumpuk
- **AND** setiap item demo access tetap terbaca (email tidak “nabrak” elemen lain)

#### Scenario: Tampilan desktop
- **WHEN** halaman login dibuka pada lebar layar sedang–besar (contoh 768–1440px)
- **THEN** grid/kolom demo access sejajar dan konsisten dengan layout kartu login

## MODIFIED Requirements
### Requirement: Alur Login Email+Password
Sistem SHALL melakukan request login ke API base URL yang sesuai dengan konfigurasi environment aktif, dan menampilkan error yang dapat dipahami ketika autentikasi gagal.

## REMOVED Requirements
N/A
