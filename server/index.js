/* ============================================================
   MIDTRANS SNAP PROXY — backend kecil buat Arlan Portfolio
   ============================================================
   Kenapa perlu backend? Server key Midtrans cuma boleh dipakai
   di server. Backend ini yang bikin snap token, terus frontend
   tinggal redirect ke halaman Snap Midtrans.

   Setup:
     1. npm install
     2. Isi MIDTRANS_SERVER_KEY (sandbox: SB-Mid-server-...)
     3. npm start  →  jalan di http://localhost:3000
     4. Di config.js: PAYMENT_MODE = 'midtrans' dan isi key-nya.

   Catatan: ini versi minimal buat demo. Untuk produksi:
   - pindah key ke environment variable
   - validasi signature notifikasi Midtrans (X-Signature)
   - simpan order_id yang udah dibayar biar anti duplikat
============================================================ */
'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-GANTI_INI';
const IS_SANDBOX = true;

const API_BASE = IS_SANDBOX
  ? 'https://app.sandbox.midtrans.com/snap/v1'
  : 'https://app.midtrans.com/snap/v1';

const app = express();
app.use(cors());
app.use(express.json());

const authHeader = 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64');

/* ---------- bikin snap token ---------- */
app.post('/api/midtrans', async (req, res) => {
  const { order_id, amount, name, contact, service } = req.body || {};
  if (!order_id || !amount) {
    return res.status(400).json({ error: 'order_id dan amount wajib diisi' });
  }

  try {
    const { data } = await axios.post(API_BASE + '/transactions', {
      transaction_details: {
        order_id: String(order_id).slice(0, 50),
        gross_amount: Number(amount),
      },
      customer_details: {
        first_name: name || 'Klien',
        phone: contact || '',
      },
      item_details: [
        { id: 'SVC-1', price: Number(amount), quantity: 1, name: service || 'Jasa Desain' },
      ],
    }, { headers: { Authorization: authHeader } });

    res.json({ token: data.token, redirect_url: data.redirect_url });
  } catch (err) {
    console.error('Midtrans error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Gagal create transaksi Midtrans' });
  }
});

/* ---------- notifikasi webhook dari Midtrans ----------
   Saat pembayaran sukses, Midtrans POST ke sini.
   Untuk demo cukup di-log; integrasi ke Supabase tinggal
   nambahin update status order di sini (pakai anon key
   frontend sama seperti payment.js). */
app.post('/api/midtrans/notification', (req, res) => {
  console.log('Notifikasi Midtrans:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Midtrans proxy jalan di http://localhost:${PORT}`);
  console.log('Mode:', IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION');
});
