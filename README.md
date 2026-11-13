# Dompet Jatah

Dompet Jatah adalah aplikasi pencatat uang lokal untuk membantu mengatur saldo,
memantau pengeluaran, dan memperkirakan berapa lama saldo akan bertahan.

## Fitur

- Membuat satu dompet dengan saldo awal dan jatah per hari atau per bulan.
- Mencatat pemasukan dan pengeluaran, termasuk kategori dan catatan opsional.
  Tanggal dan waktu transaksi otomatis mengikuti saat transaksi disimpan.
- Melihat sisa saldo, jatah, status pemakaian, dan perkiraan tanggal saldo habis.
- Melihat pengeluaran harian di kalender. Warna menunjukkan status jatah;
  bingkai menandai periode saldo diperkirakan masih bertahan.
- Melihat laporan pengeluaran harian, bulanan, dan tahunan, grafik mingguan,
  rincian kategori, serta daftar transaksi.
- Membuat event pengingat pada tanggal saldo diperkirakan habis di kalender
  perangkat.
- Mengubah pengaturan dompet serta mengedit atau menghapus transaksi.
- Menyimpan data di perangkat menggunakan penyimpanan lokal; tidak memerlukan
  akun atau koneksi internet untuk penggunaan sehari-hari.

## Menjalankan aplikasi web

```sh
npm install
npm run dev
```

Buka `http://127.0.0.1:5173`.

## Logo dan splash screen Android

Simpan file sumber desain di [`assets/branding/`](assets/branding/README.md):

- `logo.png`: PNG transparan, persegi, 1024 × 1024 piksel; disarankan di bawah
  1 MB.
- `splash.png`: PNG, persegi, 2732 × 2732 piksel; disarankan di bawah 4 MB.
  Letakkan logo di tengah dengan ruang kosong yang cukup di sekelilingnya.

File di folder tersebut hanya sumber desain dan belum otomatis digunakan
aplikasi. Ikuti petunjuk di folder untuk mengganti resource launcher icon dan
splash screen Android. PNG disarankan; JPG/JPEG perlu dikonversi ke PNG sebelum
dipakai sebagai resource Android.

## Build Android

Build APK tidak dijalankan sebagai bagian dari perubahan ini. Jika nanti siap,
pastikan JDK 21 atau lebih baru dan Android SDK API 36/build tools tersedia,
lalu jalankan:

```sh
npm run android:apk
```

APK debug akan dibuat di `android/app/build/outputs/apk/debug/app-debug.apk`.
