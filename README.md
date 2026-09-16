# 🧺 KARTIKA LAUNDRY - Sistem Manajemen & Lacak Cucian

Aplikasi web manajemen operasional laundry, pencatatan transaksi, rekap penjualan bulanan otomatis, dan pelacakan cucian real-time untuk **KARTIKA LAUNDRY** (Padamara, Purbalingga).

---

## 📍 Informasi Outlet:
- **Nama Outlet**: KARTIKA LAUNDRY
- **Alamat**: Jl. MT. Haryono No.57, Desa Karangsentul, Kec. Padamara, Kabupaten Purbalingga, Jawa Tengah
- **No. WhatsApp**: +62 812-2780-0060 (081227800060)
- **Jam Operasional**: Senin–Sabtu 08.00–20.00 WIB | Minggu 13.00–19.00 WIB

---

## 🌟 Fitur Utama & Solusi Wawancara:

### 1. 📊 Rekap Transaksi & Penjualan Bulanan Otomatis (`/admin/reports`)
- **Tanpa Rekap Tulis Manual**: Seluruh transaksi masuk, selesai, dan tertunda direkap secara otomatis per bulan.
- **Ringkasan Keuangan**:
  - Total Omset / Uang Masuk (Lunas)
  - Total Tagihan Belum Lunas (Piutang)
  - Total Volume Berat Cucian (Kg) & Total Potong Pakaian (Pcs)
  - Rincian per Jenis Layanan (Cuci Setrika, Bed Cover, Karpet, dll).
- **Export Excel / CSV**: Download data pembukuan bulanan dalam format file Excel (.csv) dalam 1 klik.
- **Cetak Laporan / Print PDF**: Format siap cetak untuk laporan bulanan pemilik laundry.

### 2. 🔢 Pencatatan Berat (Kg) & Jumlah Potong Baju (Pcs)
- Saat membuat nota baru, admin dapat mencatat **berat timbangan (kg)** sekaligus **jumlah helai pakaian (pcs)** agar tidak ada baju pelanggan yang tertukar atau hilang saat proses cuci.

### 3. 📲 Notifikasi WhatsApp & Lacak Status Cucian (`/track`)
- **Notifikasi 1-Klik**: Admin bisa mengirim notifikasi WhatsApp otomatis saat pesanan dibuat atau saat cucian **sudah selesai & siap diambil**.
- **Lacak Mandiri**: Pelanggan bisa cek status cucian secara mandiri lewat link nota tanpa perlu login atau bolak-balik chat admin.

### 4. 💼 Dashboard Kasir & Admin (`/admin/orders`)
- **Login Admin Terkunci**: Username `admin` / Password `admin123`.
- **1-Klik Status**: Sedang Diproses ➔ Siap Diambil / Diantar ➔ Selesai.
- **1-Klik Pembayaran**: Belum Lunas (Bayar Saat Ambil) ⇋ Lunas.

---

## 🚀 Cara Menjalankan Aplikasi:

```bash
cd "C:\Users\MyBook Hype\Downloads\sprint-laundry"
npm start
```

- **Lacak Cucian Publik**: [http://localhost:3000/track](http://localhost:3000/track)
- **Portal Login Admin**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Rekap Penjualan Bulanan**: [http://localhost:3000/admin/reports](http://localhost:3000/admin/reports)
