/* ============================================================
   PAYMENT GATEWAY LAYER — Arlan Portfolio
   ============================================================
   File ini dibaca oleh: index.html, payment.html, admin.html
   Isi:
     - DB        : storage order + payment (Supabase dulu, fallback
                   localStorage kalau Supabase belum dikonfigurasi)
     - Gateway   : abstraksi payment gateway. Sekarang mode 'sandbox'
                   (simulator). Mau pindah ke Midtrans / Xendit /
                   Tripay? Tinggal ganti PAYMENT_MODE di config.js
                   dan nambahin adapter di bawah.
     - helpers   : formatRupiah, fake QR, status order, link WA.
============================================================ */

'use strict';

/* ============================================================
   1) STORAGE LOKAL (mirror) — biar demo tetap jalan
      walau Supabase belum dikonfigurasi.
============================================================ */
const LS_ORDERS   = 'arlan_orders_v1';
const LS_PAYMENTS = 'arlan_payments_v1';

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
}
function lsUpsert(key, item) {
  const list = lsGet(key, []);
  const idx = list.findIndex(x => x.id === item.id);
  if (idx >= 0) list[idx] = item; else list.unshift(item);
  lsSet(key, list);
}
function lsRemove(key, id) {
  lsSet(key, lsGet(key, []).filter(x => x.id !== id));
}

function shortId(prefix) {
  return (prefix || '') + Date.now().toString(36).toUpperCase()
    + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/* ============================================================
   2) DB — akses data (Supabase-first, localStorage fallback)
============================================================ */
const DB = {
  /* ---------- ORDERS ---------- */
  async getOrders() {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return lsGet(LS_ORDERS, []);
  },

  async getOrder(id) {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('orders').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data;
    }
    return lsGet(LS_ORDERS, []).find(o => o.id === id) || null;
  },

  async createOrder(payload) {
    const order = {
      ...payload,
      created_at: new Date().toISOString(),
    };
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('orders').insert([order]).select().single();
      if (!error && data) { lsUpsert(LS_ORDERS, data); return data; }
      console.warn('Gagal insert ke Supabase, fallback lokal:', error?.message);
    }
    order.id = shortId('ORD-');
    lsUpsert(LS_ORDERS, order);
    return order;
  },

  async updateOrder(id, patch) {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('orders').update(patch).eq('id', id).select().single();
      if (!error && data) { lsUpsert(LS_ORDERS, data); return data; }
      console.warn('Gagal update Supabase, fallback lokal:', error?.message);
    }
    const order = lsGet(LS_ORDERS, []).find(o => o.id === id);
    if (order) {
      Object.assign(order, patch);
      lsUpsert(LS_ORDERS, order);
      return order;
    }
    return null;
  },

  async deleteOrder(id) {
    if (SUPABASE_READY) {
      const { error } = await SUPABASE_CLIENT.from('orders').delete().eq('id', id);
      if (error) console.warn('Gagal delete Supabase:', error.message);
    }
    lsRemove(LS_ORDERS, id);
  },

  /* ---------- PAYMENTS ---------- */
  async getPayments() {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('payments').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return lsGet(LS_PAYMENTS, []);
  },

  async getPaymentByOrder(orderId) {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('payments').select('*').eq('order_id', orderId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) return data;
    }
    return lsGet(LS_PAYMENTS, []).find(p => p.order_id === orderId && p.status === 'pending')
      || lsGet(LS_PAYMENTS, []).find(p => p.order_id === orderId) || null;
  },

  async createPayment(rec) {
    const payment = { ...rec, created_at: new Date().toISOString() };
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('payments').insert([payment]).select().single();
      if (!error && data) { lsUpsert(LS_PAYMENTS, data); return data; }
      console.warn('Gagal insert payment Supabase, fallback lokal:', error?.message);
    }
    payment.id = rec.id || shortId('PAY-');
    lsUpsert(LS_PAYMENTS, payment);
    return payment;
  },

  async updatePayment(id, patch) {
    if (SUPABASE_READY) {
      const { data, error } = await SUPABASE_CLIENT
        .from('payments').update(patch).eq('id', id).select().single();
      if (!error && data) { lsUpsert(LS_PAYMENTS, data); return data; }
      console.warn('Gagal update payment Supabase, fallback lokal:', error?.message);
    }
    const payment = lsGet(LS_PAYMENTS, []).find(p => p.id === id);
    if (payment) {
      Object.assign(payment, patch);
      lsUpsert(LS_PAYMENTS, payment);
      return payment;
    }
    return null;
  },
};

/* ============================================================
   3) HELPERS
============================================================ */
function formatRupiah(n) {
  const num = Number(n) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
}

const ORDER_STATUS_META = {
  menunggu_pembayaran: { label: 'Menunggu Pembayaran', color: '#FF9F43' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', color: '#4C8DFF' },
  dibayar:             { label: 'Dibayar',             color: '#3FBFA4' },
  selesai:             { label: 'Selesai',             color: '#2E9E8A' },
  batal:               { label: 'Dibatalkan',          color: '#FF6B6B' },
};

function statusLabel(s) { return (ORDER_STATUS_META[s] || { label: s }).label; }
function statusColor(s) { return (ORDER_STATUS_META[s] || { color: '#93A2BD' }).color; }

function waLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
function orderWaText(order) {
  return `Halo Arlan! Saya sudah transfer untuk order:%0AID: ${String(order.id).slice(0, 8).toUpperCase()}%0ANama: ${order.name}%0ALayanan: ${order.service}%0A%0AMohon dicek ya, terima kasih!`;
}

/* ============================================================
   4) FAKE QR (deterministik dari ID) — buat tampilan sandbox.
      QR asli dari gateway beneran nanti, ini cuma placeholder
      yang kelihatan kayak QR biar flow-nya realistis.
============================================================ */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function drawFakeQR(canvas, seedText) {
  const size = 25, scale = 4, pad = 3;
  const rnd = mulberry32(hashString(seedText));
  canvas.width = (size + pad * 2) * scale;
  canvas.height = (size + pad * 2) * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cell = (x, y, on) => {
    ctx.fillStyle = on ? '#17233D' : '#fff';
    ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
  };
  // finder pattern di 3 pojok
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const border = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      cell(ox + x, oy + y, border || core);
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  // data module acak tapi deterministik
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
      if (inFinder) continue;
      if (rnd() > 0.52) cell(x, y, true);
    }
  }
}

/* ============================================================
   5) GATEWAY — abstraksi payment gateway
============================================================ */
const Gateway = {
  get mode() { return (typeof PAYMENT_CONFIG !== 'undefined') ? PAYMENT_CONFIG.mode : 'sandbox'; },

  /* Buat transaksi pembayaran. Return: { paymentId, redirectUrl } */
  async createPayment(order) {
    if (this.mode === 'midtrans') return this.adapters.midtrans.createPayment(order);
    return this.adapters.sandbox.createPayment(order);
  },

  adapters: {
    /* ---------- SANDBOX SIMULATOR (default) ---------- */
    sandbox: {
      name: 'Sandbox Payment',

      async createPayment(order) {
        const cfg = (PAYMENT_CONFIG && PAYMENT_CONFIG.sandbox) || {};
        const rec = {
          id: shortId('PAY-'),
          order_id: order.id,
          amount: order.amount,
          method: null,               // diisi di payment.html
          status: 'pending',          // pending | paid | failed | expired
          expires_at: Date.now() + (cfg.expiryMinutes || 60) * 60 * 1000,
        };
        await DB.createPayment(rec);
        return { paymentId: rec.id, redirectUrl: 'payment.html?order=' + encodeURIComponent(order.id) };
      },

      /* Simulasi hasil pembayaran. success=true → order jadi 'dibayar'. */
      async simulateResult(paymentId, success, method) {
        const payments = await DB.getPayments();
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return null; // payment record gak ketemu — jangan dilanjutin
        const order = await DB.getOrder(payment.order_id);
        if (!order) return null;

        const now = new Date().toISOString();
        const patch = { method: method || payment.method || 'qris', status: success ? 'paid' : 'failed' };
        if (success) patch.paid_at = now; else patch.failed_at = now;
        await DB.updatePayment(paymentId, patch);

        if (success && order.status === 'menunggu_pembayaran') {
          await DB.updateOrder(order.id, { status: 'dibayar', payment_method: 'sandbox_gateway' });
        }
        return DB.getOrder(order.id);
      },
    },

    /* ---------- MIDTRANS SNAP (aktif kalau PAYMENT_MODE='midtrans') ----------
       Butuh backend kecil di folder /server (lihat README-PAYMENT.md)
       karena server key Midtrans TIDAK boleh ada di frontend. */
    midtrans: {
      name: 'Midtrans Snap',

      async createPayment(order) {
        const cfg = PAYMENT_CONFIG.midtrans || {};
        const res = await fetch(cfg.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: String(order.id).slice(0, 20),
            amount: order.amount,
            name: order.name,
            contact: order.contact,
            service: order.service,
          }),
        });
        if (!res.ok) throw new Error('Gagal dapat token Midtrans: ' + res.status);
        const data = await res.json();
        return { paymentId: data.token, redirectUrl: cfg.snapUrl + data.token };
      },
    },
  },
};

/* ============================================================
   6) SANDBOX — daftar metode pembayaran uji coba
============================================================ */
const SANDBOX_METHODS = [
  { id: 'qris',    name: 'QRIS',                desc: 'Scan pakai e-wallet / m-banking',  icon: '📱', kind: 'qris' },
  { id: 'va_bca',  name: 'Virtual Account BCA', desc: 'Transfer ke nomor VA',            icon: '🏦', kind: 'va',   bank: 'BCA' },
  { id: 'va_bni',  name: 'Virtual Account BNI', desc: 'Transfer ke nomor VA',            icon: '🏦', kind: 'va',   bank: 'BNI' },
  { id: 'va_bri',  name: 'Virtual Account BRI', desc: 'Transfer ke nomor VA',            icon: '🏦', kind: 'va',   bank: 'BRI' },
  { id: 'gopay',   name: 'GoPay',               desc: 'Bayar pakai saldo GoPay',         icon: '💚', kind: 'ewallet', wallet: 'GoPay' },
  { id: 'ovo',     name: 'OVO',                 desc: 'Bayar pakai saldo OVO',           icon: '💜', kind: 'ewallet', wallet: 'OVO' },
  { id: 'dana',    name: 'DANA',                desc: 'Bayar pakai saldo DANA',          icon: '💙', kind: 'ewallet', wallet: 'DANA' },
  { id: 'card',    name: 'Kartu Kredit / Debit', desc: 'Pakai kartu uji coba sandbox',   icon: '💳', kind: 'card' },
];

function sandboxVA(paymentId, bank) {
  // nomor VA palsu tapi stabil per payment id
  const digits = hashString(paymentId + bank).toString().padStart(10, '0').slice(0, 10);
  return '70012' + digits;
}
function sandboxWalletNumber(paymentId, wallet) {
  return '08' + hashString(paymentId + wallet).toString().padStart(9, '9').slice(0, 9);
}
