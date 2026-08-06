# Arlan — Portfolio & Jasa Desain 🎨

Website portofolio freelance untuk **Arlan** (Design Grafis, Thumbnail YouTube, Web Design).
Dibangun 100% vanilla HTML/CSS/JS — tanpa framework, tanpa build step. Tinggal buka `index.html`.

## Fitur

- 🎨 Landing page portofolio (responsive, animasi scroll-reveal, filter karya)
- 📝 **Sistem order**: modal brief → tersimpan otomatis → pilih cara bayar
- 💳 **Payment gateway (mode sandbox)**: halaman bayar sendiri dengan 8 metode uji coba
  (QRIS, Virtual Account BCA/BNI/BRI, GoPay, OVO, DANA, Kartu) + simulasi sukses/gagal.
  Siap migrasi ke gateway asli (Midtrans/Xendit/Tripay) — lihat `README-PAYMENT.md`.
- 🛡️ **Admin panel** (`admin.html`): dashboard ringkasan, kelola status order,
  riwayat pembayaran, export CSV. Login: password default `arlan123` (ubah di `config.js`).
- 🗄️ **Supabase-ready**: order & payment otomatis masuk database kalau key diisi
  (schema: `supabase-schema.sql`). Tanpa key, data fallback ke localStorage — tetap jalan buat demo.

## Struktur

```
├── index.html / style.css / script.js   # website utama
├── payment.html / payment.css / payment-page.js   # halaman gateway sandbox
├── admin.html / admin.css / admin.js    # admin panel
├── config.js      # SEMUA pengaturan: kontak, harga, gateway, Supabase, password admin
├── payment.js     # lapisan payment gateway + storage (dipakai 3 halaman)
├── supabase-schema.sql   # schema database
├── server/        # (opsional) proxy Midtrans Snap buat mode produksi
└── README-PAYMENT.md    # panduan lengkap payment gateway & admin
```

## Cara jalanin

```bash
# opsi 1: langsung buka index.html di browser
# opsi 2: server lokal biar lebih aman (disarankan)
python -m http.server 8000
# buka http://localhost:8000
```

## Konfigurasi

Semua ada di `config.js`:

| Setting | Variabel |
|---|---|
| Nomor WhatsApp | `WHATSAPP_NUMBER` |
| Info transfer manual | `PAYMENT_INFO` |
| Harga layanan | `PRICING` |
| Mode gateway (sandbox/midtrans) | `PAYMENT_MODE` + `PAYMENT_CONFIG` |
| Supabase URL + anon key | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| Password admin | `ADMIN_PASSWORD` |

> ⚠️ `config.js` di repo ini berisi **placeholder** (`GANTI_...`). Kalau kamu isi key asli,
> jangan di-commit — pindahin ke environment variable atau private repo.
> Auth admin panel masih client-side (buat demo) — untuk produksi pakai Supabase Auth/backend.

## Status pembayaran

`menunggu_pembayaran` → `menunggu_verifikasi` (transfer manual) | `dibayar` (gateway) → `selesai` → `batal`

---

© 2026 Arlan. Didesain & dikembangin sendiri, dari nol.
