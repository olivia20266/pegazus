-- ================================================================
--  Pegazus — Schéma SQL Supabase
--  Coller dans l'éditeur SQL de votre projet Supabase
-- ================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  first_name       text        not null,
  last_name        text        not null,
  phone            text,
  birth_date       date,
  nationality      text,
  country          text,
  learning_id      text        unique,
  leverage         text        not null default '1:50',
  security_q       text,
  security_a       text,
  kyc_status       text        not null default 'NOT_SUBMITTED'
                   check (kyc_status in ('NOT_SUBMITTED','PENDING','VERIFIED','REJECTED')),
  kyc_verified_at  timestamptz,
  status           text        not null default 'ACTIVE'
                   check (status in ('ACTIVE','LOCKED','SUSPENDED')),
  role             text        not null default 'USER'
                   check (role in ('USER','ADMIN','SUPERADMIN')),
  login_attempts   integer     not null default 0,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── WALLETS ──────────────────────────────────────────────────────
create table public.wallets (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid        not null unique references public.profiles(id) on delete cascade,
  balance          numeric(18,2) not null default 0,
  equity           numeric(18,2) not null default 0,
  margin           numeric(18,2) not null default 0,
  free_margin      numeric(18,2) not null default 0,
  floating_pl      numeric(18,2) not null default 0,
  learning_balance numeric(18,2) not null default 0,
  currency         text        not null default 'USD',
  mt5_login        text        not null unique,
  mt5_server       text        not null default 'Pegazus-Live01',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── TRANSACTIONS ─────────────────────────────────────────────────
create table public.transactions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null
               check (type in ('DEPOSIT','WITHDRAWAL','MANUAL_ADJUSTMENT','FEE','TRADE')),
  adjust_type  text        check (adjust_type in ('CREDIT','DEBIT')),
  amount       numeric(18,2) not null,
  currency     text        not null default 'USD',
  status       text        not null default 'PENDING'
               check (status in ('PENDING','COMPLETED','FAILED','CANCELLED')),
  source       text,
  destination  text,
  description  text,
  admin_note   text,
  admin_id     uuid        references public.profiles(id),
  reference    text,
  reason       text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ── KYC DOCUMENTS ────────────────────────────────────────────────
create table public.kyc_documents (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  document_type    text not null,
  document_number  text,
  front_file_url   text,
  address_file_url text,
  status           text not null default 'PENDING'
                   check (status in ('PENDING','VERIFIED','REJECTED')),
  admin_note       text,
  rejection_reason text,
  submitted_at     timestamptz not null default now(),
  reviewed_at      timestamptz
);

-- ── OTP CODES ────────────────────────────────────────────────────
create table public.otp_codes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid    not null references public.profiles(id) on delete cascade,
  code       text    not null,
  purpose    text    not null default 'login',
  used       boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ── AUDIT LOGS ───────────────────────────────────────────────────
create table public.audit_logs (
  id        uuid primary key default uuid_generate_v4(),
  admin_id  uuid not null references public.profiles(id),
  target_id uuid references public.profiles(id),
  action    text not null,
  details   jsonb,
  ip        text,
  timestamp timestamptz not null default now()
);

-- ── INDEXES ──────────────────────────────────────────────────────
create index idx_transactions_user_id  on public.transactions(user_id);
create index idx_transactions_type     on public.transactions(type);
create index idx_transactions_status   on public.transactions(status);
create index idx_otp_codes_user_id     on public.otp_codes(user_id);
create index idx_audit_logs_admin_id   on public.audit_logs(admin_id);
create index idx_audit_logs_target_id  on public.audit_logs(target_id);

-- ── TRIGGERS updated_at ──────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger wallets_updated_at  before update on public.wallets
  for each row execute function public.handle_updated_at();

-- ── AUTO-CRÉER PROFIL à l'inscription ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name',''), coalesce(new.raw_user_meta_data->>'last_name',''));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════
alter table public.profiles    enable row level security;
alter table public.wallets     enable row level security;
alter table public.transactions enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.otp_codes   enable row level security;
alter table public.audit_logs  enable row level security;

-- Profils : chacun voit seulement le sien (sauf admin via service_role)
create policy "Profil visible par son propriétaire"
  on public.profiles for select using (auth.uid() = id);
create policy "Profil modifiable par son propriétaire"
  on public.profiles for update using (auth.uid() = id);

-- Wallets
create policy "Wallet visible par son propriétaire"
  on public.wallets for select using (auth.uid() = user_id);

-- Transactions
create policy "Transactions visibles par leur propriétaire"
  on public.transactions for select using (auth.uid() = user_id);

-- KYC
create policy "KYC visible par son propriétaire"
  on public.kyc_documents for select using (auth.uid() = user_id);
create policy "KYC soumis par son propriétaire"
  on public.kyc_documents for insert with check (auth.uid() = user_id);

-- OTP : jamais lisibles côté client (uniquement via service_role)
-- Audit : uniquement via service_role

-- ════════════════════════════════════════════════════════════════
--  DONNÉES DE DÉMONSTRATION (optionnel)
-- ════════════════════════════════════════════════════════════════
-- Exécutez le seed depuis le dashboard Supabase ou via l'API admin
-- Les comptes sont créés via l'endpoint /api/auth/register

-- ── TRADES (historique persistant des positions fermées) ──────────
create table public.trades (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  symbol       text        not null,
  display      text,                    -- Nom affiché (EURUSD, etc.)
  type         text        not null check (type in ('BUY','SELL')),
  lot          numeric(10,2) not null,
  open_price   numeric(18,5) not null,
  close_price  numeric(18,5) not null,
  sl           numeric(18,5),
  tp           numeric(18,5),
  pips         numeric(10,2),
  pl           numeric(18,2) not null,
  close_reason text check (close_reason in ('SL','TP','MANUAL','ROBOT')),
  is_win       boolean,
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz not null default now()
);

create index idx_trades_user_id on public.trades(user_id);
create index idx_trades_closed_at on public.trades(closed_at desc);

-- RLS trades
alter table public.trades enable row level security;
create policy "Trades visibles par leur propriétaire"
  on public.trades for select using (auth.uid() = user_id);

-- Vue admin : statistiques globales par utilisateur
create or replace view public.admin_user_stats as
  select
    p.id,
    p.first_name,
    p.last_name,
    w.balance,
    w.learning_balance,
    count(t.id)                            as total_trades,
    count(t.id) filter (where t.is_win)    as wins,
    coalesce(sum(t.pl),0)                  as total_pl,
    coalesce(sum(t.pl) filter (where t.is_win),0) as gross_profit,
    coalesce(sum(abs(t.pl)) filter (where not t.is_win),0) as gross_loss
  from public.profiles p
  left join public.wallets w on w.user_id = p.id
  left join public.trades  t on t.user_id = p.id
  group by p.id, p.first_name, p.last_name, w.balance, w.learning_balance;
