/* ============================================================
   PAYMENT PAGE LOGIC — sandbox gateway (payment.html)
============================================================ */
'use strict';

const params = new URLSearchParams(window.location.search);
const orderId = params.get('order');

let order = null;
let payment = null;
let selectedMethod = null;
let countdownTimer = null;

const $ = (id) => document.getElementById(id);

/* ---------- inisialisasi ---------- */
async function init() {
  const gatewayName = (PAYMENT_CONFIG && PAYMENT_CONFIG.sandbox && PAYMENT_CONFIG.sandbox.gatewayName)
    || 'Sandbox Payment';
  $('gatewayBadge').textContent = '🔒 ' + gatewayName;
  $('gatewayFooterName').textContent = gatewayName;

  if (!orderId) { showState('stateNotFound'); return; }

  order = await DB.getOrder(orderId);
  if (!order) { showState('stateNotFound'); return; }

  // kalau order udah dibayar, jangan biarin bayar dua kali
  if (order.status === 'dibayar' || order.status === 'selesai') {
    showState('stateAlreadyPaid');
    return;
  }

  // ambil payment aktif; expired/belum ada → bikin baru
  payment = await DB.getPaymentByOrder(order.id);
  if (!payment || payment.status !== 'pending' || payment.expires_at < Date.now()) {
    const rec = {
      id: shortId('PAY-'),
      order_id: order.id,
      amount: order.amount,
      method: null,
      status: 'pending',
      expires_at: Date.now() + (PAYMENT_CONFIG.sandbox.expiryMinutes || 60) * 60 * 1000,
    };
    payment = await DB.createPayment(rec);
  }

  // isi summary
  $('sumOrderId').textContent = 'ID Order: ' + String(order.id).slice(0, 8).toUpperCase();
  $('sumService').textContent = order.service;
  $('sumName').textContent = (order.name || '-') + ' · ' + (order.contact || '');
  $('sumAmount').textContent = formatRupiah(order.amount);

  renderMethods();
  showState('statePick');
}

function showState(id) {
  document.querySelectorAll('.pay-state, .pay-card').forEach(el => el.style.display = 'none');
  $(id).style.display = 'block';
}

/* ---------- daftar metode ---------- */
function renderMethods() {
  const grid = $('methodGrid');
  grid.innerHTML = '';
  SANDBOX_METHODS.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'pay-method';
    btn.innerHTML = `<span class="m-icon">${m.icon}</span>
      <span><span class="m-name">${m.name}</span><span class="m-desc">${m.desc}</span></span>`;
    btn.addEventListener('click', () => selectMethod(m));
    grid.appendChild(btn);
  });
}

/* ---------- pilih metode → detail ---------- */
function selectMethod(m) {
  selectedMethod = m;
  $('detIcon').textContent = m.icon;
  $('detTitle').textContent = m.name;
  $('detDesc').textContent = m.desc;

  ['detQris', 'detVa', 'detWallet', 'detCard'].forEach(id => $(id).style.display = 'none');

  if (m.kind === 'qris') {
    drawFakeQR($('qrisCanvas'), payment.id + order.id);
    $('detQris').style.display = 'block';
  } else if (m.kind === 'va') {
    $('vaNumber').textContent = sandboxVA(payment.id, m.bank);
    $('vaBank').textContent = m.bank;
    $('detVa').style.display = 'block';
  } else if (m.kind === 'ewallet') {
    $('walletName').textContent = m.wallet;
    $('walletNumber').textContent = sandboxWalletNumber(payment.id, m.wallet);
    $('detWallet').style.display = 'block';
  } else if (m.kind === 'card') {
    $('detCard').style.display = 'block';
  }

  startCountdown();
  showState('stateDetail');
}

/* ---------- countdown ---------- */
function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  const box = $('countdownBox');
  box.classList.remove('expired');
  tick();
  countdownTimer = setInterval(tick, 1000);

  function tick() {
    const remain = payment.expires_at - Date.now();
    if (remain <= 0) {
      box.classList.add('expired');
      $('countdown').textContent = 'habis!';
      clearInterval(countdownTimer);
      refreshExpiry();
      return;
    }
    const mins = Math.floor(remain / 60000);
    const secs = Math.floor((remain % 60000) / 1000);
    $('countdown').textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

/* expired → reset masa berlaku (biar demo gak mati) */
async function refreshExpiry() {
  const now = Date.now();
  payment = await DB.updatePayment(payment.id, {
    expires_at: now + (PAYMENT_CONFIG.sandbox.expiryMinutes || 60) * 60 * 1000,
  });
  toast('⏳ Waktu habis — masa berlaku pembayaran di-reset buat demo.');
  startCountdown();
}

/* ---------- tombol salin ---------- */
document.querySelectorAll('[data-copy-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = $(btn.dataset.copyTarget);
    if (!target) return;
    const text = target.textContent.trim();
    navigator.clipboard.writeText(text).catch(() => {});
    btn.textContent = 'Tersalin ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Salin'; btn.classList.remove('copied'); }, 1600);
  });
});

/* ---------- simulasi hasil ---------- */
$('simSuccessBtn').addEventListener('click', () => runSimulation(true));
$('simFailBtn').addEventListener('click', () => runSimulation(false));

async function runSimulation(success) {
  if (!order || !payment) return;
  showState('stateProcessing');
  await new Promise(r => setTimeout(r, 1200)); // efek "memproses"

  const methodId = selectedMethod ? selectedMethod.id : 'qris';
  try {
    await Gateway.adapters.sandbox.simulateResult(payment.id, success, methodId);
  } catch (err) {
    console.error('Simulasi gagal dicatat:', err);
  }

  const result = success ? 'success' : 'failed';
  window.location.href = 'index.html?payment=' + result + '&order=' + encodeURIComponent(order.id);
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  let el = document.querySelector('.pay-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'pay-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

init();
