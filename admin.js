/* ============================================================
   ADMIN PANEL LOGIC — Arlan Portfolio
============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);

let allOrders = [];
let allPayments = [];
let currentDetailOrder = null;

/* ============================================================
   1) AUTH (client-side demo — ganti ke Supabase Auth/backend
      kalau mau dipakai beneran)
============================================================ */
const AUTH_KEY = 'arlan_admin_auth';

function checkAuth() {
  const authed = sessionStorage.getItem(AUTH_KEY) === '1';
  $('loginScreen').style.display = authed ? 'none' : 'flex';
  $('adminApp').style.display = authed ? 'flex' : 'none';
  if (authed) loadAll();
}

$('loginBtn').addEventListener('click', tryLogin);
$('loginPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });

function tryLogin() {
  const pass = $('loginPass').value;
  if (pass === (typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'arlan123')) {
    sessionStorage.setItem(AUTH_KEY, '1');
    $('loginError').classList.remove('show');
    $('loginPass').value = '';
    checkAuth();
    toast('Selamat datang, Arlan! 👋');
  } else {
    $('loginError').classList.add('show');
  }
}

$('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY);
  checkAuth();
});

/* ============================================================
   2) NAVIGASI VIEW
============================================================ */
document.querySelectorAll('.side-link[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
document.querySelectorAll('[data-go]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.go));
});

function switchView(name) {
  document.querySelectorAll('.side-link[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
}

/* ============================================================
   3) LOAD DATA
============================================================ */
async function loadAll() {
  try {
    const [orders, payments] = await Promise.all([DB.getOrders(), DB.getPayments()]);
    allOrders = orders || [];
    allPayments = payments || [];
  } catch (err) {
    console.error('Gagal load data:', err);
    toast('Gagal ambil data — cek console.');
  }
  renderDashboard();
  renderOrders();
  renderPayments();

  // badge mode di sidebar
  const mode = (typeof PAYMENT_CONFIG !== 'undefined') ? PAYMENT_CONFIG.mode : 'sandbox';
  $('sideModeBadge').textContent = mode === 'sandbox' ? '🔒 Sandbox Mode' : '🔓 ' + mode.toUpperCase();
}

['refreshBtn', 'refreshBtn2', 'refreshBtn3'].forEach(id => {
  $(id).addEventListener('click', async () => {
    toast('Muat ulang data...');
    await loadAll();
    toast('Data ke-refresh ✓');
  });
});

/* ============================================================
   4) DASHBOARD
============================================================ */
function renderDashboard() {
  const paidStatuses = ['dibayar', 'selesai'];
  const total = allOrders.length;
  const pending = allOrders.filter(o => o.status === 'menunggu_pembayaran').length;
  const paid = allOrders.filter(o => paidStatuses.includes(o.status)).length;
  const revenue = allOrders
    .filter(o => paidStatuses.includes(o.status))
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  $('statTotal').textContent = total;
  $('statPending').textContent = pending;
  $('statPaid').textContent = paid;
  $('statRevenue').textContent = formatRupiah(revenue);

  // order terbaru (5)
  const recent = [...allOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  $('recentOrdersBody').innerHTML = recent.length
    ? recent.map(o => `
        <tr>
          <td class="mono">${String(o.id).slice(0, 8).toUpperCase()}</td>
          <td>${esc(o.name)}</td>
          <td>${esc(o.service)}</td>
          <td>${statusBadge(o.status)}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" class="table-empty">Belum ada order.</td></tr>';

  // breakdown status
  const counts = {};
  allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts));
  $('statusBreakdown').innerHTML = allOrders.length
    ? Object.keys(ORDER_STATUS_META).map(s => {
        const n = counts[s] || 0;
        if (!n) return '';
        const pct = Math.round((n / max) * 100);
        return `
          <div class="break-row">
            <span class="b-label">${ORDER_STATUS_META[s].label}</span>
            <span class="b-bar"><i style="width:${pct}%;background:${ORDER_STATUS_META[s].color}"></i></span>
            <span class="b-num">${n}</span>
          </div>`;
      }).join('')
    : '<p class="table-empty">Belum ada data.</p>';
}

/* ============================================================
   5) PESANAN (tabel + filter + detail)
============================================================ */
function renderOrders() {
  const q = ($('orderSearch').value || '').toLowerCase();
  const status = $('statusFilter').value;

  const rows = allOrders.filter(o => {
    const matchQ = !q || o.name.toLowerCase().includes(q) || String(o.id).toLowerCase().includes(q)
      || String(o.contact || '').toLowerCase().includes(q) || String(o.service || '').toLowerCase().includes(q);
    const matchS = status === 'all' || o.status === status;
    return matchQ && matchS;
  });

  $('ordersBody').innerHTML = rows.length
    ? rows.map(o => `
        <tr>
          <td>${fmtDate(o.created_at)}</td>
          <td class="mono">${String(o.id).slice(0, 8).toUpperCase()}</td>
          <td>${esc(o.name)}</td>
          <td>${esc(o.contact || '-')}</td>
          <td>${esc(o.service)}</td>
          <td class="amount-cell">${formatRupiah(o.amount)}</td>
          <td>${statusBadge(o.status)}</td>
          <td>
            <div class="row-actions">
              <button class="mini-btn" data-open-order="${escAttr(o.id)}">Detail</button>
            </div>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="8" class="table-empty">Gak ada order yang cocok.</td></tr>';
}

$('orderSearch').addEventListener('input', renderOrders);
$('statusFilter').addEventListener('change', renderOrders);

/* detail modal */
$('ordersBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-open-order]');
  if (!btn) return;
  const id = btn.dataset.openOrder;
  const order = await DB.getOrder(id);
  if (!order) { toast('Order gak ketemu.'); return; }
  openDetailModal(order);
});

function openDetailModal(order) {
  currentDetailOrder = order;
  $('detailId').textContent = 'ID Order: ' + String(order.id).slice(0, 8).toUpperCase();
  $('dName').textContent = order.name || '-';
  $('dContact').textContent = order.contact || '-';
  $('dService').textContent = order.service || '-';
  $('dAmount').textContent = formatRupiah(order.amount);
  $('dPayMethod').textContent = paymentMethodLabel(order.payment_method);
  $('dCreated').textContent = fmtDate(order.created_at, true);
  $('dBrief').textContent = order.brief || '-';
  $('statusSelect').value = order.status || 'menunggu_pembayaran';
  $('waClientBtn').href = waLink(
    (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : ''),
    `Halo ${order.name}! Ini Arlan. Mau lanjutin order *${order.service}* (${String(order.id).slice(0, 8).toUpperCase()}) ya?`
  );
  $('orderModal').classList.add('open');
}

function paymentMethodLabel(m) {
  const map = {
    sandbox_gateway: '💳 Gateway (sandbox)',
    manual_transfer: '🏦 Transfer manual',
  };
  return map[m] || (m || '—');
}

$('modalClose').addEventListener('click', () => $('orderModal').classList.remove('open'));
$('orderModal').addEventListener('click', (e) => { if (e.target === $('orderModal')) $('orderModal').classList.remove('open'); });

$('saveStatusBtn').addEventListener('click', async () => {
  if (!currentDetailOrder) return;
  const newStatus = $('statusSelect').value;
  await DB.updateOrder(currentDetailOrder.id, { status: newStatus });
  toast('Status diubah ke: ' + statusLabel(newStatus));
  currentDetailOrder.status = newStatus;
  $('orderModal').classList.remove('open');
  await loadAll();
});

$('deleteOrderBtn').addEventListener('click', async () => {
  if (!currentDetailOrder) return;
  if (!confirm('Yakin hapus order ini? Gak bisa di-undo.')) return;
  await DB.deleteOrder(currentDetailOrder.id);
  $('orderModal').classList.remove('open');
  toast('Order dihapus.');
  await loadAll();
});

/* ============================================================
   6) PEMBAYARAN
============================================================ */
const METHOD_LABELS = {
  qris: 'QRIS', va_bca: 'VA BCA', va_bni: 'VA BNI', va_bri: 'VA BRI',
  gopay: 'GoPay', ovo: 'OVO', dana: 'DANA', card: 'Kartu Kredit',
};

function renderPayments() {
  const rows = allPayments;
  $('paymentsBody').innerHTML = rows.length
    ? rows.map(p => `
        <tr>
          <td>${fmtDate(p.created_at, true)}</td>
          <td class="mono">${esc(String(p.id).slice(0, 12).toUpperCase())}</td>
          <td class="mono">${esc(String(p.order_id || '-').slice(0, 8).toUpperCase())}</td>
          <td>${METHOD_LABELS[p.method] || (p.method || '—')}</td>
          <td class="amount-cell">${formatRupiah(p.amount)}</td>
          <td>${paymentBadge(p.status)}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="table-empty">Belum ada pembayaran.</td></tr>';
}

/* ============================================================
   7) EXPORT CSV
============================================================ */
$('exportOrdersBtn').addEventListener('click', () => {
  if (!allOrders.length) { toast('Belum ada data buat di-export.'); return; }
  const header = ['Tanggal', 'ID', 'Nama', 'WhatsApp', 'Layanan', 'Jumlah', 'Status', 'Brief'];
  const lines = allOrders.map(o => [
    o.created_at, o.id, o.name, o.contact, o.service, o.amount,
    statusLabel(o.status), (o.brief || '').replace(/\n/g, ' '),
  ]);
  const csv = [header, ...lines]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'order-arlan-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV ke-download ✓');
});

/* ============================================================
   8) HELPERS TAMPILAN
============================================================ */
function statusBadge(status) {
  const meta = ORDER_STATUS_META[status] || { label: status, color: '#93A2BD' };
  return `<span class="status-badge" style="background:${meta.color}1A;color:${meta.color}">${meta.label}</span>`;
}
function paymentBadge(status) {
  const map = {
    pending:  { label: 'Menunggu',  color: '#FF9F43' },
    paid:     { label: 'Lunas',     color: '#3FBFA4' },
    failed:   { label: 'Gagal',     color: '#FF6B6B' },
    expired:  { label: 'Kadaluarsa', color: '#93A2BD' },
  };
  const meta = map[status] || { label: status, color: '#93A2BD' };
  return `<span class="status-badge" style="background:${meta.color}1A;color:${meta.color}">${meta.label}</span>`;
}
function fmtDate(iso, withTime) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('id-ID', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escAttr(s) { return esc(s); }

/* toast */
let toastTimer = null;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* start */
checkAuth();
