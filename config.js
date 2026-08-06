/* ============================================================
   KONFIGURASI SITUS — ARLAN PORTFOLIO
   ============================================================
   File ini dibaca oleh: index.html, payment.html, admin.html
   Semua pengaturan penting ada di sini. Jangan upload ke repo
   publik kalau berisi key asli (Supabase anon key aman kok,
   tapi server key gateway JANGAN pernah ditaruh di frontend).
============================================================ */

/* ---------- KONTAK & SOSMED ---------- */
const WHATSAPP_NUMBER = '6281234567890'; // format internasional, tanpa tanda +
const CONTACT_EMAIL    = 'hello@arlan.design';

/* ---------- INFO TRANSFER MANUAL ---------- */
// Dipakai kalau klien milih "Transfer Manual" di step pembayaran.
const PAYMENT_INFO = {
  bankName:      'BCA',
  accountNumber: '1234567890',
  accountHolder: 'Arlan',
  qrisImage:     '', // isi path/URL gambar QRIS asli kalau ada (mis. 'qris.png')
};

/* ---------- HARGA LAYANAN (Rupiah) ---------- */
// Dipakai buat ngitung nominal order otomatis dari layanan yang dipilih.
const PRICING = {
  'Design Grafis':    350000, // mulai Rp350K
  'Thumbnail Design':  75000, // mulai Rp75K
  'Web Design':       850000, // mulai Rp850K
};

/* ---------- KUOTA SLOT PROYEK PER BULAN ---------- */
// Dipakai buat hitung "Sisa X slot bulan ini" (hero, marquee, CTA).
// Terisi otomatis dari jumlah order bulan berjalan (status != batal).
const SLOT_QUOTA = 5;

/* ============================================================
   PAYMENT GATEWAY
   ============================================================
   PAYMENT_MODE:
   - 'sandbox'   (DEFAULT) — simulasi pembayaran penuh tanpa gateway
                 asli. Klien bisa milih metode (QRIS / VA / e-wallet /
                 kartu), lalu "bayar" pakai tombol simulasi. Aman buat
                 demo/portofolio, gak ada uang beneran yang dipindah.
   - 'midtrans'  — kalau nanti pilih Midtrans: isi key sandbox di
                 bawah, terus jalanin backend kecil di folder /server
                 (lihat README-PAYMENT.md). Frontend otomatis redirect
                 ke halaman Snap Midtrans.
   - 'xendit' / 'tripay' — tinggal nambahin adapter di payment.js.
============================================================ */
const PAYMENT_MODE = 'sandbox';

const PAYMENT_CONFIG = {
  mode: PAYMENT_MODE,

  /* Konfigurasi mode sandbox (simulator) */
  sandbox: {
    gatewayName:   'Sandbox Payment',       // nama yang tampil di halaman bayar
    autoApprove:   false,                   // true = klik "Bayar" langsung sukses
    expiryMinutes: 60,                      // masa berlaku pembayaran (menit)
    testCard:      '4811 1111 1111 1114',   // kartu uji coba (standar Midtrans sandbox)
  },

  /* Konfigurasi Midtrans (aktif kalau PAYMENT_MODE = 'midtrans') */
  midtrans: {
    sandbox:    true,                        // true = pakai environment sandbox Midtrans
    serverKey:  'SB-Mid-server-GANTI_INI',   // SERVER KEY — rahasia, cuma dipakai backend
    clientKey:  'SB-Mid-client-GANTI_INI',   // CLIENT KEY — aman dipakai frontend
    backendUrl: 'http://localhost:3000/api/midtrans', // proxy backend (folder /server)
    snapUrl:    'https://app.sandbox.midtrans.com/snap/v2/vtweb/', // URL redirect Snap
  },
};

/* ============================================================
   SUPABASE (database orderan)
   ============================================================
   Cara setup (sekali doang):
   1. Bikin project gratis di https://supabase.com
   2. Buka SQL Editor, jalankan isi file `supabase-schema.sql`
   3. Salin Project URL + anon public key ke bawah ini.
   Kalau dibiarin 'GANTI_...', semua data otomatis disimpen
   lokal di browser (localStorage) — cocok buat demo dulu.
============================================================ */
const SUPABASE_URL      = 'GANTI_URL_SUPABASE';
const SUPABASE_ANON_KEY = 'GANTI_KEY_SUPABASE';

/* ---------- Status order yang dipakai ----------
   menunggu_pembayaran → dibayar → selesai
        └──────────────→ batal
   (menunggu_verifikasi dipakai kalau bayar lewat transfer manual)
------------------------------------------------- */
const ORDER_STATUSES = [
  'menunggu_pembayaran',
  'menunggu_verifikasi',
  'dibayar',
  'selesai',
  'batal',
];

/* ---------- Admin panel ----------
   PENTING: ini auth client-side, cuma buat demo/sandbox.
   Untuk produksi beneran, ganti ke Supabase Auth / backend.
   Ganti password-nya sebelum dipakai! */
const ADMIN_PASSWORD = 'arlan123';

/* ============================================================
   BAGIAN INI DIBACA OTOMATIS — JANGAN DIEDIT
   ============================================================ */
const SUPABASE_READY = typeof supabase !== 'undefined'
  && typeof SUPABASE_URL === 'string'
  && typeof SUPABASE_ANON_KEY === 'string'
  && !SUPABASE_URL.includes('GANTI_')
  && !SUPABASE_ANON_KEY.includes('GANTI_');

let SUPABASE_CLIENT = null;
if (SUPABASE_READY) {
  SUPABASE_CLIENT = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
