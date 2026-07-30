create extension if not exists pgcrypto;

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  code text unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  name text,
  email text,
  phone text,
  stamps integer not null default 0 check (stamps >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.club_members(id) on delete cascade,
  action text not null check (action in ('add','remove','reward')),
  value numeric not null default 1,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text,
  auth text,
  subscription jsonb,
  created_at timestamptz not null default now()
);

create index if not exists club_members_code_idx on public.club_members(code);
create index if not exists club_members_email_idx on public.club_members(email);
create index if not exists club_history_member_idx on public.club_history(member_id, created_at desc);
create index if not exists promotions_active_idx on public.promotions(active, start_at, end_at);
