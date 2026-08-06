# 💳 Payment Gateway (Sandbox) + Admin Panel — Panduan

Fitur baru di project ini:

| Fitur | File |
|---|---|
| Payment gateway (mode **sandbox**) | `payment.html`, `payment.js`, `payment-page.js`, `payment.css` |
| Admin panel | `admin.html`, `admin.js`, `admin.css` |
| Konfigurasi semua pengaturan | `config.js` |
| Schema database (Supabase) | `supabase-schema.sql` |

> ⚠️ **`config.js` sebelumnya belum ada** — padahal `index.html` & `script.js` lama udah
> mereferensikannya. File ini sekarang dibuat dan jadi pusat konfigurasi.

---

## 1. Alur pembayaran (mode sandbox)

1. Klien isi brief di modal order → order tersimpan (`menunggu_pembayaran`)
2. Klien pilih **"Bayar Online"** → diarahkan ke `payment.html` (halaman gateway)
3. Di sana klien pilih metode: **QRIS / Virtual Account (BCA, BNI, BRI) / GoPay / OVO / DANA / Kartu**
4. Klik **"✅ Simulasi: Pembayaran Berhasil"** → status order otomatis jadi **`dibayar`**,
   lalu balik ke website dengan pesan sukses. Ada juga tombol **"❌ Simulasi Gagal"** buat ngetes skenario gagal.
5. Alternatif: tab **"Transfer Manual"** tetap ada (info rekening + konfirmasi via WhatsApp).

**Tidak ada uang asli yang dipindah** — semua simulasi. QR code yang tampil juga fake
(dibuat deterministik dari ID order) biar flow-nya realistis.

---

## 2. Admin panel

Buka **`admin.html`** (ada link kecil "Admin" di footer website).

- Password default: **`arlan123`** → ganti di `config.js` (`ADMIN_PASSWORD`)
- Fitur:
  - 📊 Dashboard: total order, yang nunggu bayar, yang lunas, total pemasukan, breakdown status
  - 📦 Pesanan: cari/filter, lihat detail, ubah status (`dibayar` → `selesai`, batalkan, dll), hapus, chat klien via WA, export CSV
  - 💳 Pembayaran: riwayat transaksi gateway (metode, jumlah, status)

> ⚠️ Auth admin masih **client-side (demo only)**. Untuk produksi beneran, pindah ke
> Supabase Auth / backend — jangan pernah jagain data sensitif cuma pakai password di JS.

---

## 3. Aktifkan Supabase (opsional, tapi disarankan)

Tanpa Supabase semua data cuma nyimpen di localStorage browser — cukup buat demo,
tapi hilang kalau ganti browser/PC. Supabase bikin data kebagi antar perangkat:

1. Bikin project gratis di [supabase.com](https://supabase.com)
2. **SQL Editor** → jalankan isi `supabase-schema.sql`
3. Salin **Project URL** dan **anon public key** ke `config.js`:

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Selesai — order & payment otomatis masuk tabel `orders` / `payments`, dan admin panel
membacanya dari sana.

---

## 4. Pindah ke payment gateway asli

Kodenya udah diarsitekturin biar gampang dipindah — tinggal ganti `PAYMENT_MODE` di `config.js`.

### Opsi A: Midtrans Snap (paling umum di Indonesia)

1. Daftar di [midtrans.com](https://midtrans.com) → ambil key **sandbox** di dashboard
   (Server Key & Client Key `SB-Mid-...`)
2. Isi di `config.js`:
   ```js
   const PAYMENT_MODE = 'midtrans';
   const PAYMENT_CONFIG = { mode: 'midtrans', midtrans: { sandbox: true, serverKey: 'SB-Mid-server-...', clientKey: 'SB-Mid-client-...', ... } };
   ```
3. **Server Key TIDAK boleh di frontend.** Jalanin backend proxy kecil:
   ```bash
   cd server && npm install && npm start
   ```
   (lihat `server/README.md`). `payment.js` sudah punya adapter `Gateway.adapters.midtrans`
   yang minta snap token ke backend itu, lalu redirect ke halaman Snap.
4. Pasang notifikasi (webhook) dari Midtrans ke endpoint `/api/midtrans/notification` di
   backend biar status dibayar ke-update otomatis.

### Opsi B: Xendit / Tripay / lainnya

Tambahin adapter baru di `payment.js` dengan bentuk yang sama
(`createPayment(order)` → return `{ paymentId, redirectUrl }`), terus set `PAYMENT_MODE` ke nama adapter.
Pola yang dipakai (redirect ke halaman gateway + balik ke `index.html?payment=success|failed&order=ID`)
bener-bener mirip cara kerja gateway asli, jadi migrasinya mulus.

---

## 5. Catatan teknis

- **Status order**: `menunggu_pembayaran → menunggu_verifikasi | dibayar → selesai | batal`
- Sandbox gateway otomatis set `dibayar` saat simulasi sukses; transfer manual set `menunggu_verifikasi` (nanti diverifikasi manual di admin panel)
- Harga otomatis ngikut `PRICING` di `config.js` (Design Grafis Rp350K, Thumbnail Rp75K, Web Rp850K)
- Masa berlaku pembayaran sandbox: 60 menit (atur `expiryMinutes`); kalau expired di tengah demo, otomatis di-reset
- Jalanin via server lokal biar aman: `python -m http.server 8000` → buka `http://localhost:8000`
