/* ============================================================
   1) NAV MOBILE MENU
============================================================ */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

/* ============================================================
   2) PORTFOLIO FILTER (dengan animasi masuk/keluar)
============================================================ */
const tabs = document.querySelectorAll('.filter-tab');
const cards = document.querySelectorAll('.p-card');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.dataset.filter;
    cards.forEach(card => {
      const show = (filter === 'all' || card.dataset.cat === filter);
      if (show) {
        card.style.display = '';
        card.classList.remove('filtering-out');
        card.classList.remove('filtering-in');
        void card.offsetWidth; // restart animation
        card.classList.add('filtering-in');
      } else {
        card.classList.add('filtering-out');
        setTimeout(() => { if (card.classList.contains('filtering-out')) card.style.display = 'none'; }, 250);
      }
    });
  });
});

/* ============================================================
   3) SCROLL REVEAL ANIMATIONS (IntersectionObserver)
============================================================ */
const revealEls = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}

/* ============================================================
   4) COUNT-UP NUMBERS (stats band)
============================================================ */
const countEls = document.querySelectorAll('[data-count-to]');
function animateCount(el) {
  const target = parseFloat(el.dataset.countTo);
  const suffix = el.dataset.suffix || '';
  const isFloat = String(target).includes('.');
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent = (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
if ('IntersectionObserver' in window && countEls.length) {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  countEls.forEach(el => countObserver.observe(el));
}

/* ============================================================
   5) MARQUEE — pause on hover (nicer feel)
============================================================ */
const marquee = document.getElementById('marquee');
if (marquee) {
  marquee.parentElement.addEventListener('mouseenter', () => marquee.style.animationPlayState = 'paused');
  marquee.parentElement.addEventListener('mouseleave', () => marquee.style.animationPlayState = 'running');
}

/* ============================================================
   6) ORDER MODAL LOGIC
   Supabase/DB + payment gateway dibaca dari config.js & payment.js
============================================================ */
const orderOverlay = document.getElementById('orderOverlay');
const orderClose = document.getElementById('orderClose');
const orderFab = document.getElementById('orderFab');
const stepForm = document.getElementById('stepForm');
const stepPay = document.getElementById('stepPay');
const stepDone = document.getElementById('stepDone');
const orderError = document.getElementById('orderError');
const payError = document.getElementById('payError');
const orderSubmitBtn = document.getElementById('orderSubmitBtn');
const orderBackBtn = document.getElementById('orderBackBtn');
const orderCloseDoneBtn = document.getElementById('orderCloseDoneBtn');
const waConfirmBtn = document.getElementById('waConfirmBtn');
const payOnlineBtn = document.getElementById('payOnlineBtn');

let currentOrder = null; // { id, name, contact, service, brief, amount, status }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function showOrderError(msg) {
  orderError.textContent = msg;
  orderError.classList.add('show');
}
function hideOrderError() { orderError.classList.remove('show'); }
function showPayError(msg) {
  payError.textContent = msg;
  payError.classList.add('show');
}
function hidePayError() { payError.classList.remove('show'); }

function openOrderModal(prefillService) {
  orderOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  goToStep('stepForm');
  hideOrderError();
  hidePayError();
  if (prefillService) {
    document.getElementById('ordService').value = prefillService;
  }
}
function closeOrderModal() {
  orderOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
function goToStep(id) {
  [stepForm, stepPay, stepDone].forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

orderClose.addEventListener('click', closeOrderModal);
orderOverlay.addEventListener('click', (e) => { if (e.target === orderOverlay) closeOrderModal(); });
orderFab.addEventListener('click', () => openOrderModal());
orderCloseDoneBtn.addEventListener('click', closeOrderModal);
orderBackBtn.addEventListener('click', () => { hidePayError(); goToStep('stepForm'); });

// hook up existing CTA buttons/links on the page to open the modal instead of just #kontak
document.querySelectorAll('a[href="#kontak"]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    openOrderModal();
  });
});
// hook up "Pesan Layanan Ini" buttons on each service card
document.querySelectorAll('[data-order-service]').forEach(btn => {
  btn.addEventListener('click', () => openOrderModal(btn.dataset.orderService));
});

/* ---------- tab cara bayar: online vs manual ---------- */
document.querySelectorAll('.pay-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.paytab;
    document.getElementById('payPanelOnline').style.display = which === 'online' ? 'block' : 'none';
    document.getElementById('payPanelManual').style.display = which === 'manual' ? 'block' : 'none';
    hidePayError();
  });
});

/* ---------- submit form order ---------- */
orderSubmitBtn.addEventListener('click', async () => {
  const name = document.getElementById('ordName').value.trim();
  const contact = document.getElementById('ordContact').value.trim();
  const service = document.getElementById('ordService').value;
  const brief = document.getElementById('ordBrief').value.trim();

  hideOrderError();

  if (!name || !contact || !service || !brief) {
    showOrderError('Yah, masih ada yang kosong nih. Isi dulu semua field-nya ya.');
    return;
  }

  orderSubmitBtn.disabled = true;
  orderSubmitBtn.textContent = 'Nyimpen order...';

  const orderPayload = {
    name, contact, service, brief,
    amount: (typeof PRICING !== 'undefined' && PRICING[service]) ? PRICING[service] : 0,
    status: 'menunggu_pembayaran',
    payment_method: 'manual_transfer',
  };

  try {
    const created = await DB.createOrder(orderPayload);
    currentOrder = created;
    showPaymentStep();
  } catch (err) {
    console.error(err);
    showOrderError('Gagal nyimpen order. Coba lagi, atau langsung chat WA aja ya.');
  } finally {
    orderSubmitBtn.disabled = false;
    orderSubmitBtn.textContent = 'Lanjut ke Pembayaran →';
  }
});

/* ---------- step 2: pembayaran ---------- */
function renderPaySummary(order) {
  document.getElementById('paySummary').innerHTML = `
    <div class="ps-row"><span>Layanan</span><b>${esc(order.service)}</b></div>
    <div class="ps-row"><span>Total</span><b class="ps-amount">${formatRupiah(order.amount)}</b></div>`;
}

function showPaymentStep() {
  document.getElementById('orderIdTag').textContent = 'ID Order: ' + String(currentOrder.id).slice(0, 8).toUpperCase();
  renderPaySummary(currentOrder);

  const acc = (typeof PAYMENT_INFO !== 'undefined') ? PAYMENT_INFO : null;
  const accNumEl = document.getElementById('payAccNumber');
  const accNameEl = document.getElementById('payAccName');
  const qrisEl = document.getElementById('qrisBox');

  if (acc) {
    accNumEl.textContent = `${acc.bankName} — ${acc.accountNumber}`;
    accNameEl.textContent = 'a.n. ' + acc.accountHolder;
    if (acc.qrisImage) {
      qrisEl.innerHTML = `<img src="${acc.qrisImage}" alt="QRIS" style="width:100%;height:100%;object-fit:contain;border-radius:12px;" onerror="this.parentElement.textContent='QRIS';this.remove();">`;
    }
  }

  // reset ke tab "Bayar Online"
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.pay-tab[data-paytab="online"]').classList.add('active');
  document.getElementById('payPanelOnline').style.display = 'block';
  document.getElementById('payPanelManual').style.display = 'none';
  hidePayError();

  goToStep('stepPay');
}

/* ---------- bayar online → redirect ke gateway ---------- */
payOnlineBtn.addEventListener('click', async () => {
  if (!currentOrder) return;
  payOnlineBtn.disabled = true;
  payOnlineBtn.textContent = 'Menyiapkan pembayaran...';
  try {
    const { redirectUrl } = await Gateway.createPayment(currentOrder);
    window.location.href = redirectUrl;
  } catch (err) {
    console.error(err);
    payOnlineBtn.disabled = false;
    payOnlineBtn.textContent = 'Lanjut ke Pembayaran →';
    showPayError('Gagal nyiapin pembayaran. Coba lagi, atau pilih Transfer Manual aja ya.');
  }
});

/* ---------- konfirmasi transfer manual via WA ---------- */
waConfirmBtn.addEventListener('click', async () => {
  if (currentOrder) {
    try {
      await DB.updateOrder(currentOrder.id, { status: 'menunggu_verifikasi' });
    } catch (err) {
      console.error('Gagal update status order:', err);
    }
  }

  const waNumber = (typeof WHATSAPP_NUMBER !== 'undefined') ? WHATSAPP_NUMBER : '';
  const idShort = currentOrder ? String(currentOrder.id).slice(0, 8).toUpperCase() : '-';
  const msg = `Halo Arlan! Saya sudah transfer untuk order:%0AID: ${idShort}%0ANama: ${currentOrder?.name || '-'}%0ALayanan: ${currentOrder?.service || '-'}%0A%0AMohon dicek ya, terima kasih!`;

  if (waNumber) {
    window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank');
  }
  goToStep('stepDone');
});

/* ============================================================
   7) BALIKAN DARI PAYMENT GATEWAY (?payment=success|failed)
============================================================ */
async function handlePaymentRedirect() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('payment');
  const orderId = params.get('order');
  if (!result || !orderId) return;

  // bersihin URL biar refresh gak ngulangin flow
  history.replaceState({}, '', window.location.pathname);

  const order = await DB.getOrder(orderId);
  if (!order) return;

  openOrderModal();
  currentOrder = order;

  if (result === 'success') {
    document.getElementById('doneMsg').textContent =
      'Pembayaran (mode sandbox) kamu tercatat lunas ✅ Arlan bakal hubungin kamu max 24 jam. Makasih ya!';
    goToStep('stepDone');
  } else {
    showPaymentStep();
    showPayError('Pembayaran kamu gagal atau kadaluarsa (simulasi). Coba lagi, atau pilih Transfer Manual.');
  }
}

/* ============================================================
   8) CTA email form (bagian bawah) tetap jalan seperti biasa,
      plus arahin ke modal order buat detail lengkap
============================================================ */
const ctaForm = document.querySelector('.cta-form');
if (ctaForm) {
  ctaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ctaForm.querySelector('button').textContent = 'Terkirim ✓';
    setTimeout(() => openOrderModal(), 500);
  });
}

/* ============================================================
   9) START
============================================================ */
handlePaymentRedirect();
