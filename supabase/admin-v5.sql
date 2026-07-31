-- Bloc 2 — migration idempotente. Peut être réexécutée sans perdre de données.
create extension if not exists pgcrypto;

create table if not exists public.club_members (id uuid primary key default gen_random_uuid());
alter table public.club_members add column if not exists code text;
alter table public.club_members add column if not exists name text;
alter table public.club_members add column if not exists email text;
alter table public.club_members add column if not exists phone text;
alter table public.club_members add column if not exists visits integer;
alter table public.club_members add column if not exists stamps integer;
alter table public.club_members add column if not exists rewards_count integer;
alter table public.club_members add column if not exists coupons_available integer;
alter table public.club_members add column if not exists created_at timestamptz;
alter table public.club_members add column if not exists updated_at timestamptz;

update public.club_members set
  code = coalesce(nullif(code, ''), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  visits = greatest(coalesce(visits, stamps, 0), 0),
  stamps = greatest(coalesce(stamps, 0), 0),
  rewards_count = greatest(coalesce(rewards_count, 0), 0),
  coupons_available = greatest(coalesce(coupons_available, 0), 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

with duplicate_codes as (
  select id, row_number() over(partition by upper(code) order by created_at, id) as position
  from public.club_members
)
update public.club_members member
set code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
from duplicate_codes duplicate
where member.id=duplicate.id and duplicate.position>1;

alter table public.club_members alter column code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
alter table public.club_members alter column code set not null;
alter table public.club_members alter column visits set default 0;
alter table public.club_members alter column visits set not null;
alter table public.club_members alter column stamps set default 0;
alter table public.club_members alter column stamps set not null;
alter table public.club_members alter column rewards_count set default 0;
alter table public.club_members alter column rewards_count set not null;
alter table public.club_members alter column coupons_available set default 0;
alter table public.club_members alter column coupons_available set not null;
alter table public.club_members alter column created_at set default now();
alter table public.club_members alter column created_at set not null;
alter table public.club_members alter column updated_at set default now();
alter table public.club_members alter column updated_at set not null;

create unique index if not exists club_members_code_unique_idx on public.club_members (upper(code));
create index if not exists club_members_email_idx on public.club_members (lower(email));
create index if not exists club_members_name_idx on public.club_members (lower(name));

create table if not exists public.club_history (id uuid primary key default gen_random_uuid());
alter table public.club_history add column if not exists member_id uuid;
alter table public.club_history add column if not exists action text;
alter table public.club_history add column if not exists value numeric;
alter table public.club_history add column if not exists note text;
alter table public.club_history add column if not exists stamps_after integer;
alter table public.club_history add column if not exists created_at timestamptz;
update public.club_history set action=coalesce(action,'stamp'), value=coalesce(value,1), created_at=coalesce(created_at,now());
update public.club_history history set member_id=null
where member_id is not null and not exists(select 1 from public.club_members member where member.id=history.member_id);
alter table public.club_history alter column action set not null;
alter table public.club_history alter column value set default 1;
alter table public.club_history alter column value set not null;
alter table public.club_history alter column created_at set default now();
alter table public.club_history alter column created_at set not null;
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid='public.club_history'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%action%'
  loop execute format('alter table public.club_history drop constraint %I', constraint_name); end loop;
  if not exists (select 1 from pg_constraint where conname='club_history_member_id_fkey') then
    alter table public.club_history add constraint club_history_member_id_fkey foreign key(member_id) references public.club_members(id) on delete cascade;
  end if;
end $$;
create index if not exists club_history_member_idx on public.club_history(member_id, created_at desc);

create table if not exists public.club_coupons (id uuid primary key default gen_random_uuid());
alter table public.club_coupons add column if not exists member_id uuid;
alter table public.club_coupons add column if not exists code text;
alter table public.club_coupons add column if not exists label text;
alter table public.club_coupons add column if not exists status text;
alter table public.club_coupons add column if not exists issued_at timestamptz;
alter table public.club_coupons add column if not exists redeemed_at timestamptz;
update public.club_coupons set code=coalesce(code,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))), label=coalesce(label,'Récompense fidélité'), status=coalesce(status,'available'), issued_at=coalesce(issued_at,now());
update public.club_coupons coupon set member_id=null
where member_id is not null and not exists(select 1 from public.club_members member where member.id=coupon.member_id);
alter table public.club_coupons alter column code set default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
alter table public.club_coupons alter column code set not null;
alter table public.club_coupons alter column label set default 'Récompense fidélité';
alter table public.club_coupons alter column label set not null;
alter table public.club_coupons alter column status set default 'available';
alter table public.club_coupons alter column status set not null;
alter table public.club_coupons alter column issued_at set default now();
alter table public.club_coupons alter column issued_at set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='club_coupons_member_id_fkey') then
    alter table public.club_coupons add constraint club_coupons_member_id_fkey foreign key(member_id) references public.club_members(id) on delete cascade;
  end if;
end $$;
create unique index if not exists club_coupons_code_unique_idx on public.club_coupons(code);
create index if not exists club_coupons_member_idx on public.club_coupons(member_id, issued_at desc);

create table if not exists public.promotions (id uuid primary key default gen_random_uuid());
alter table public.promotions add column if not exists title text;
alter table public.promotions add column if not exists description text;
alter table public.promotions add column if not exists start_at timestamptz;
alter table public.promotions add column if not exists end_at timestamptz;
alter table public.promotions add column if not exists active boolean;
alter table public.promotions add column if not exists created_at timestamptz;
update public.promotions set title=coalesce(nullif(title,''),'Promotion'), active=coalesce(active,true), created_at=coalesce(created_at,now());
alter table public.promotions alter column title set not null;
alter table public.promotions alter column active set default true;
alter table public.promotions alter column active set not null;
alter table public.promotions alter column created_at set default now();
alter table public.promotions alter column created_at set not null;
create index if not exists promotions_active_idx on public.promotions(active, start_at, end_at);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), endpoint text unique not null,
  p256dh text, auth text, subscription jsonb, created_at timestamptz not null default now()
);

create or replace function public.club_add_stamp(p_member_id uuid, p_note text default '')
returns public.club_members language plpgsql security definer set search_path=public as $$
declare result public.club_members;
begin
  update public.club_members set visits=visits+1, stamps=stamps+1, updated_at=now() where id=p_member_id returning * into result;
  if result.id is null then raise exception 'Membre introuvable'; end if;
  insert into public.club_history(member_id,action,value,note,stamps_after) values(p_member_id,'stamp',1,p_note,result.stamps);
  return result;
end $$;

create or replace function public.club_validate_reward(p_member_id uuid, p_required integer default 10, p_note text default '')
returns public.club_members language plpgsql security definer set search_path=public as $$
declare result public.club_members;
begin
  update public.club_members set stamps=stamps-p_required, rewards_count=rewards_count+1, coupons_available=coupons_available+1, updated_at=now()
  where id=p_member_id and stamps>=p_required returning * into result;
  if result.id is null then raise exception 'Nombre de tampons insuffisant ou membre introuvable'; end if;
  insert into public.club_coupons(member_id) values(p_member_id);
  insert into public.club_history(member_id,action,value,note,stamps_after) values(p_member_id,'reward',1,p_note,result.stamps);
  return result;
end $$;

create or replace function public.club_redeem_coupon(p_member_id uuid, p_coupon_id uuid)
returns public.club_members language plpgsql security definer set search_path=public as $$
declare result public.club_members;
begin
  update public.club_coupons set status='redeemed', redeemed_at=now() where id=p_coupon_id and member_id=p_member_id and status='available';
  if not found then raise exception 'Coupon indisponible'; end if;
  update public.club_members set coupons_available=greatest(coupons_available-1,0), updated_at=now() where id=p_member_id returning * into result;
  insert into public.club_history(member_id,action,value,note,stamps_after) values(p_member_id,'coupon',1,'Coupon utilisé',result.stamps);
  return result;
end $$;

grant execute on function public.club_add_stamp(uuid,text) to service_role;
grant execute on function public.club_validate_reward(uuid,integer,text) to service_role;
grant execute on function public.club_redeem_coupon(uuid,uuid) to service_role;
notify pgrst, 'reload schema';
