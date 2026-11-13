# Sumber logo dan splash screen

Letakkan file desain di folder ini:

- `logo.png` — ikon aplikasi, PNG transparan 1024 × 1024 piksel, disarankan
  maksimal 1 MB. Sisakan ruang di tepi agar ikon tidak terpotong saat Android
  menerapkan bentuk adaptif.
- `splash.png` — gambar splash, PNG 2732 × 2732 piksel, disarankan maksimal
  4 MB. Tempatkan logo di tengah; hindari teks atau detail penting dekat tepi.

PNG adalah format yang disarankan karena mendukung transparansi dan sesuai
dengan resource Android saat ini. Jika desain awal berupa JPG/JPEG, ekspor atau
konversikan menjadi PNG.

## Agar tampil di aplikasi Android

Menaruh gambar di folder ini saja tidak mengubah aplikasi. Setelah menambahkan
file, siapkan versi ukuran layar Android lalu ganti resource berikut:

- **Ikon launcher:** ganti `ic_launcher.png`, `ic_launcher_round.png`, dan
  `ic_launcher_foreground.png` di setiap folder
  `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`.
  Ukuran ikon legacy masing-masing adalah 48, 72, 96, 144, dan 192 piksel.
  Periksa juga `mipmap-anydpi-v26/ic_launcher.xml` dan
  `mipmap-anydpi-v26/ic_launcher_round.xml`; keduanya memakai foreground dan
  background ikon adaptif.
- **Splash screen:** ganti `splash.png` di
  `android/app/src/main/res/drawable/`,
  `drawable-port-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`, dan
  `drawable-land-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`. Buat ukuran yang sesuai
  dengan kepadatan layar dan orientasi; jangan sekadar mengganti satu folder.
  `values/styles.xml` sudah menunjuk ke resource `@drawable/splash`.

Resource Android harus tetap memakai format PNG dan nama file yang sama.
Sesudah semua resource diganti, sinkronkan/build proyek Android agar perubahan
masuk ke aplikasi. Folder `android/` saat ini diabaikan Git pada proyek ini.
