# **PRD – Aplikasi Pencatat Uang (Dompet Jatah)** 

- Versi 1.0 · Status: Draft 
- Bahasa: Indonesia 
- Bahasa pemogramman dalam .js dan .jsx

## **1. Ringkasan** 

Aplikasi pencatat uang yang tidak hanya mencatat pengeluaran, tetapi **membagi uang menjadi jatah** per hari atau per bulan. User memasukkan sejumlah uang ke **Dompet Utama** , memilih berapa lama uang itu harus bertahan, lalu aplikasi menghitung jatah dan memantau apakah user masih dalam batas. 

Diferensiasi: pelacakan bukan sekadar "sudah habis berapa", tetapi **"uang ini masih cukup untuk berapa hari lagi"** . 

## **2. Tujuan & Non-Tujuan** 

#### **Tujuan** 

- Membantu user disiplin membelanjakan uang sesuai jatah harian/bulanan. 

- Memberi gambaran jelas pengeluaran per hari, bulan, dan tahun. 

- Memberi umpan balik instan saat user melewati jatah ("Keluar Jatah") dan dampaknya pada sisa hari. 

- Menampilkan kondisi keuangan secara visual di kalender. 

#### **Non-Tujuan (di luar MVP)** 

- Integrasi rekening bank / e-wallet otomatis. 

- Fitur investasi, utang-piutang, atau split bill. 

- Kolaborasi multi-user (dompet bersama). 

## **3. Target Pengguna** 

- Mahasiswa dan anak kos dengan uang bulanan/semesteran terbatas. 

- Pekerja muda dengan gaji bulanan yang ingin lebih terkontrol. 

- Freelancer dengan pemasukan tidak tetap yang perlu mengatur "uang bertahan hidup" per periode. 

## **4. Konsep Inti & Istilah** 

- **Dompet Utama** : saldo uang yang diinput user sebagai sumber dana. 

- **Periode** : lama waktu uang harus bertahan (hari/bulan). 

- **Jatah** : batas pengeluaran per satuan periode = Dompet Utama ÷ jumlah periode. 

- **Keluar Jatah** : kondisi pengeluaran melebihi jatah pada satu hari/bulan. 

- **Sisa Hari** : perkiraan jumlah hari yang masih bisa ditutup oleh saldo tersisa. 

## **5. Fitur Utama** 

### **5.1 Dompet Utama** 

- User membuat Dompet Utama dengan nominal awal. 

- User dapat menambah saldo (top-up) di tengah periode; jatah dihitung ulang (lihat 6.4). 

- User dapat memiliki lebih dari satu Dompet Utama (opsional, fase 2). 

- Setiap dompet punya mode aktif: **Perhari** atau **Perbulan** . 

### **5.2 Mode Perhari** 

#### **Pemecahan Jatah** 

- User memasukkan nominal Dompet Utama dan jumlah hari (mis. 30). 

- Aplikasi menghitung jatah harian = nominal ÷ jumlah hari. 

- Contoh: Rp3.000.000 ÷ 30 hari = **Rp100.000/hari** . Pesan: _"Kamu hanya dapat menghabiskan Rp100.000 per hari selama 30 hari."_ 

#### **Input Pengeluaran** 

- User dapat menginput pengeluaran **berkali-kali dalam satu hari** . 

- Setiap entri berisi: nominal, kategori, catatan (opsional), tanggal & waktu (default sekarang). 

- Aplikasi otomatis menghitung total pengeluaran hari itu, sisa jatah hari itu, dan status (Aman / Hampir Habis / Keluar Jatah). 

#### **Keluar Jatah (pemotongan hari)** 

- Jika pengeluaran hari itu melebihi jatah, kelebihannya **memotong jumlah hari** yang tersisa, bukan menurunkan jatah harian. 

- Contoh: jatah Rp100.000, hari ke-1 habis Rp200.000 → saldo tersisa Rp2.800.000 → total periode menjadi **29 hari** (hari ke-1 dihitung "memakan" 2 hari jatah). 

- Aplikasi menampilkan peringatan: _"Kamu melewati jatah Rp100.000. Sisa uangmu kini hanya cukup untuk 29 hari."_ 

#### **Integrasi Kalender** 

- Tampilan kalender dalam aplikasi dengan penanda warna per hari: 

   - Hijau: pengeluaran ≤ jatah. 

   - Kuning: mencapai 80–100% jatah. 

   - Merah: Keluar Jatah. 

   - Abu-abu: belum ada pencatatan / hari yang sudah "terpotong". 

- Ketuk tanggal untuk melihat rincian pengeluaran hari itu dan menambah/mengedit entri. 

- Sinkronisasi opsional ke kalender perangkat (Google/Apple Calendar): all-day event berisi total pengeluaran dan status hari tersebut, serta tanda tanggal berakhirnya uang ("Perkiraan uang habis"). 

### **5.3 Mode Perbulan** 

- User memasukkan nominal Dompet Utama dan jumlah bulan. 

- Jatah bulanan = nominal ÷ jumlah bulan. Contoh: Rp30.000.000 ÷ 3 bulan = **Rp10.000.000/bulan** . 

- Logika Keluar Jatah sama dengan Mode Perhari, tetapi satuannya bulan: jika sebulan melebihi jatah, jumlah bulan yang tersisa berkurang. 

- Tampilan kalender menandai bulan dan menampilkan ringkasan per bulan. 

### **5.4 Mode Perbulan → Dipecah ke Perhari** 

- Dari jatah bulanan, user dapat memecahnya lagi menjadi jatah harian. 

- Contoh: Rp10.000.000/bulan ÷ 30 hari = Rp333.333/hari (dibulatkan; lihat 6.3). 

- Jumlah hari mengikuti jumlah hari sebenarnya pada bulan tersebut (28–31), atau dapat diatur manual. 

- Pengeluaran harian otomatis terakumulasi ke total bulanan. Jika hari melewati jatah, sisa jatah bulan itu berkurang, dan status bulan ikut diperbarui. 

### **5.5 Pelacakan & Laporan** 

- Ringkasan pengeluaran per **hari, bulan, dan tahun** . 

- Grafik tren (garis/batang) dan rincian per kategori. 

- Filter berdasarkan rentang tanggal dan kategori. 

- Ekspor data (CSV) pada fase berikutnya. 

## **6. Aturan Perhitungan** 

### **6.1 Rumus dasar** 

- Jatah = Saldo Awal Periode ÷ Jumlah Periode. 

- Sisa Saldo = Saldo Awal − Total Pengeluaran. 

- Sisa Hari (Mode Perhari) = hari yang sudah berjalan + Sisa Saldo ÷ Jatah⌊ ⌋. 

### **6.2 Pemotongan hari saat Keluar Jatah** 

- Pengeluaran di bawah jatah: sisa jatah tidak hangus (lihat 6.5). 

- Pengeluaran di atas jatah: Sisa Hari dihitung ulang dengan rumus di atas; jatah harian tetap. 

- Jika Sisa Saldo < Jatah, hari berikutnya menjadi hari terakhir dengan jatah sebesar sisa saldo. 

- Jika Sisa Saldo ≤ 0, dompet berstatus **Habis** , dan pengeluaran selanjutnya dicatat sebagai defisit. 

### **6.3 Pembulatan** 

- Jatah dibulatkan ke bawah ke rupiah penuh; sisa pembulatan masuk ke hari terakhir. 

### **6.4 Top-up di tengah periode** 

- Saldo ditambahkan ke Sisa Saldo. User memilih: **(a)** menambah jumlah hari dengan jatah tetap, atau **(b)** menaikkan jatah dengan jumlah hari tetap. 

### **6.5 Sisa jatah hari yang hemat** 

- Default: jatah yang tidak terpakai tetap menjadi bagian Sisa Saldo, sehingga **menambah Sisa Hari** (hemat hari ini = periode lebih panjang). 

- Opsi pengaturan: jatah tidak digulung (hangus) agar jatah harian selalu konstan. 

## **7. User Stories** 

1. Sebagai user, saya ingin membuat Dompet Utama Rp3.000.000 dan memecahnya 30 hari agar tahu batas belanja harian. 

2. Sebagai user, saya ingin mencatat beberapa pengeluaran dalam sehari dan langsung melihat sisa jatah hari itu. 

3. Sebagai user, saya ingin diberi peringatan saat melewati jatah beserta dampaknya pada sisa hari. 

4. Sebagai user, saya ingin melihat kalender berwarna untuk mengetahui hari mana saja yang boros. 

5. Sebagai user, saya ingin memecah uang per bulan, lalu memecah jatah bulanan menjadi jatah harian. 

6. Sebagai user, saya ingin melihat rekap pengeluaran per hari, bulan, dan tahun. 

7. Sebagai user, saya ingin mengedit atau menghapus entri yang salah, dan sisa hari menyesuaikan otomatis. 

## **8. Kebutuhan Fungsional** 

|ID|Kebutuhan|Prioritas|
|---|---|---|
|F-01|Buat/ubah/hapus Dompet Utama|Must|
|F-02|Pilih mode Perhari/Perbulan dan jumlah periode|Must|
|F-03|Hitung jatah otomatis dan tampilkan pesan jatah|Must|
|F-04|CRUD pengeluaran, beberapa kali per hari|Must|
|F-05|Hitung total harian, sisa jatah, dan status Keluar Jatah|Must|
|F-06|Pemotongan hari otomatis saat Keluar Jatah|Must|
|F-07|Kalender dalam aplikasi dengan penanda status warna|Must|
|F-08|Pecah jatah bulanan ke harian|Must|
|F-09|Laporan harian/bulanan/tahunan|Must|



|ID|Kebutuhan|Prioritas|
|---|---|---|
|F-10|Kategori pengeluaran (default + kustom)|Should|
|F-11|Notifikasi pengingat catat dan peringatan hampir habis|Should|
|F-12|Sinkron ke kalender perangkat|Should|
|F-13|Top-up saldo dengan dua opsi hitung ulang|Should|
|F-14|Ekspor CSV, backup & sinkron cloud|Could|
|F-15|Beberapa Dompet Utama|Could|



## **9. Kebutuhan Non-Fungsional** 

- **Performa** : perhitungan ulang jatah dan sisa hari < 200 ms setelah entri disimpan. 

- **Offline-first** : semua fitur inti berjalan tanpa internet; data tersimpan lokal. 

- **Akurasi** : seluruh nominal disimpan sebagai bilangan bulat rupiah (tanpa floating point). 

- **Keamanan & privasi** : data lokal terenkripsi; opsi kunci aplikasi (PIN/biometrik). 

- **Zona waktu** : batas hari mengikuti zona waktu perangkat (default WIB). 

- **Lokalisasi** : Bahasa Indonesia, format Rp dengan pemisah titik. 

- **Aksesibilitas** : status warna selalu disertai ikon/teks, bukan warna saja. 

## **10. Alur Pengguna (Mode Perhari)** 

1. Onboarding → buat Dompet Utama (nominal) → pilih Mode Perhari → isi jumlah hari. 

2. Aplikasi menampilkan jatah harian dan tanggal perkiraan uang habis. 

3. Beranda: sisa jatah hari ini, tombol **+ Pengeluaran** , ringkasan Sisa Hari. 

4. User menambah entri → total dan status diperbarui langsung. 

5. Bila Keluar Jatah → peringatan + Sisa Hari terbarui + hari di kalender berwarna merah. 

6. Kalender dan Laporan untuk meninjau riwayat. 

## **11. Edge Case** 

- Pengeluaran sangat besar yang menghabiskan seluruh saldo dalam satu hari. 

- Edit/hapus entri di tanggal lampau yang mengubah Sisa Hari (hitung ulang berurutan dari awal periode). 

- Entri dengan tanggal di masa depan (ditolak atau ditandai terjadwal). 

- Pergantian bulan/tahun dan bulan 28/29/31 hari pada Mode Perbulan→Perhari. 

- Mengubah mode atau jumlah periode saat periode sedang berjalan. 

- Hari tanpa catatan: dianggap Rp0 (hemat) atau menunggu konfirmasi user (pengaturan). 

- Perubahan zona waktu/perangkat. 

## **12. Metrik Keberhasilan** 

- Aktivasi: ≥ 60% user baru membuat Dompet Utama dan mencatat ≥ 1 pengeluaran di hari pertama. 

- Retensi: ≥ 40% user aktif pada minggu ke-4. 

- Kebiasaan: rata-rata ≥ 4 hari/minggu ada pencatatan. 

- Efektivitas: persentase hari berstatus Keluar Jatah menurun dari bulan ke-1 ke bulan ke-3. 

## **13. Rencana Rilis** 

- **MVP** : F-01 s/d F-09 (Mode Perhari dan Perbulan, kalender dalam aplikasi, laporan dasar). 

- **Rilis 2** : kategori kustom, notifikasi, sinkron kalender perangkat, top-up. 

- **Rilis 3** : ekspor, backup cloud, banyak dompet. 

## **14. Pertanyaan Terbuka** 

1. Apakah jatah hemat digulung ke hari berikutnya (default 6.5) atau hangus? 

2. Apakah pemasukan baru dicatat sebagai top-up Dompet Utama atau dompet terpisah? 

3. Platform MVP: mobile (Android/iOS), web, atau desktop? 

4. Apakah sinkron cloud dan akun login diperlukan sejak MVP? 

5. Pada Mode Perbulan→Perhari, apakah jatah harian bersifat tetap atau menyesuaikan sisa hari bulan itu? 

