-- ============================================================
-- SUPABASE SCHEMA — Arlan Portfolio (orders + payments)
-- Cara pakai:
--   1. Buka https://supabase.com → bikin project (gratis)
--   2. Menu SQL Editor → paste semua ini → RUN
--   3. Salin Project URL + anon public key ke config.js
--
-- CATATAN KEAMANAN: ini versi demo. Buat produksi beneran,
-- aktifkan RLS dan bikin policy yang lebih ketat + pakai
-- Supabase Auth buat admin panel.
-- ============================================================

-- ---------- TABLE: orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  service text not null,
  brief text not null default '',
  amount numeric not null default 0,
  status text not null default 'menunggu_pembayaran',
  payment_method text not null default 'manual_transfer',
  created_at timestamptz not null default now()
);

-- ---------- TABLE: payments ----------
create table if not exists public.payments (
  id text primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric not null default 0,
  method text,
  status text not null default 'pending',   -- pending | paid | failed | expired
  expires_at bigint,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- indeks biar query admin cepet ----------
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists payments_order_id_idx on public.payments(order_id);

-- ---------- RLS: buat demo, akses anon dibuka penuh ----------
-- (untuk produksi: hapus baris di bawah, terus bikin policy
--  berbasis role + pakai Supabase Auth untuk admin)
alter table public.orders  enable row level security;
alter table public.payments enable row level security;

drop policy if exists "anon full access orders"  on public.orders;
drop policy if exists "anon full access payments" on public.payments;

create policy "anon full access orders"  on public.orders  for all using (true) with check (true);
create policy "anon full access payments" on public.payments for all using (true) with check (true);
