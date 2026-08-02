-- Bloc 2 — migration corrective sans perte de données.
-- Les données historiques du site public restent la source de vérité :
-- club_members.personal_code, club_members.loyalty_points et club_loyalty_events.
create extension if not exists pgcrypto;

create table if not exists public.club_members (id uuid primary key default gen_random_uuid());
alter table public.club_members add column if not exists first_name text;
alter table public.club_members add column if not exists last_name text;
alter table public.club_members add column if not exists email text;
alter table public.club_members add column if not exists birthday date;
alter table public.club_members add column if not exists personal_code text;
alter table public.club_members add column if not exists loyalty_points integer;
alter table public.club_members add column if not exists reward_available boolean;
alter table public.club_members add column if not exists created_at timestamptz;
alter table public.club_members add column if not exists updated_at timestamptz;

-- Colonnes de compatibilité créées par la première migration Bloc 2.
-- Elles sont alimentées depuis l'historique, jamais dans l'autre sens.
alter table public.club_members add column if not exists code text;
alter table public.club_members add column if not exists name text;
alter table public.club_members add column if not exists visits integer;
alter table public.club_members add column if not exists stamps integer;
alter table public.club_members add column if not exists rewards_count integer;
alter table public.club_members add column if not exists coupons_available integer;

update public.club_members set
  personal_code = coalesce(nullif(personal_code, ''), nullif(code, ''), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  loyalty_points = greatest(coalesce(loyalty_points, stamps, 0), 0),
  reward_available = coalesce(reward_available, coalesce(loyalty_points, stamps, 0) >= 10),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

with duplicate_codes as (
  select id, row_number() over(partition by upper(personal_code) order by created_at, id) as position
  from public.club_members
)
update public.club_members member
set personal_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
from duplicate_codes duplicate
where member.id=duplicate.id and duplicate.position>1;

alter table public.club_members alter column personal_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
alter table public.club_members alter column personal_code set not null;
alter table public.club_members alter column loyalty_points set default 0;
alter table public.club_members alter column loyalty_points set not null;
alter table public.club_members alter column reward_available set default false;
alter table public.club_members alter column reward_available set not null;
alter table public.club_members alter column created_at set default now();
alter table public.club_members alter column created_at set not null;
alter table public.club_members alter column updated_at set default now();
alter table public.club_members alter column updated_at set not null;
create unique index if not exists club_members_personal_code_unique_idx on public.club_members(upper(personal_code));
create index if not exists club_members_email_idx on public.club_members(lower(email));
create index if not exists club_members_name_idx on public.club_members(lower(first_name),lower(last_name));

create table if not exists public.club_loyalty_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.club_members(id) on delete cascade,
  event_type text not null,
  event_day date not null default current_date,
  created_at timestamptz not null default now(),
  receipt_number text,
  reward_value_ttc numeric,
  note text
);
alter table public.club_loyalty_events add column if not exists member_id uuid;
alter table public.club_loyalty_events add column if not exists event_type text;
alter table public.club_loyalty_events add column if not exists event_day date;
alter table public.club_loyalty_events add column if not exists created_at timestamptz;
alter table public.club_loyalty_events add column if not exists receipt_number text;
alter table public.club_loyalty_events add column if not exists reward_value_ttc numeric;
alter table public.club_loyalty_events add column if not exists note text;
update public.club_loyalty_events set event_type=coalesce(event_type,'passage'),event_day=coalesce(event_day,created_at::date,current_date),created_at=coalesce(created_at,now());
create index if not exists club_loyalty_events_member_idx on public.club_loyalty_events(member_id,created_at desc);
create index if not exists club_loyalty_events_day_idx on public.club_loyalty_events(event_day,event_type);

-- Récupère les opérations éventuellement saisies par la première version du Bloc 2.
-- Aucun membre n'est créé et aucun événement historique n'est supprimé.
do $$
begin
  if to_regclass('public.club_history') is not null then
    execute $copy$
      insert into public.club_loyalty_events(member_id,event_type,event_day,created_at,note)
      select old.member_id,
             case when old.action='reward' then 'reward' else 'passage' end,
             old.created_at::date,old.created_at,old.note
      from public.club_history old
      where old.member_id is not null
        and old.action in ('stamp','add','reward')
        and exists(select 1 from public.club_members member where member.id=old.member_id)
        and not exists(
          select 1 from public.club_loyalty_events event
          where event.member_id=old.member_id
            and event.event_type=case when old.action='reward' then 'reward' else 'passage' end
            and (
              (old.action in ('stamp','add') and event.event_day=old.created_at::date)
              or event.created_at=old.created_at
            )
        )
    $copy$;
  end if;
end $$;

-- Les coupons historiques du site public restent inchangés.
create table if not exists public.club_promotions (
  id uuid primary key default gen_random_uuid(), title text not null,
  description text, start_at timestamptz, end_at timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.club_promotions add column if not exists coupon_enabled boolean default false;
alter table public.club_promotions add column if not exists discount_rate numeric;
alter table public.club_promotions add column if not exists discount_label text;
alter table public.club_promotions add column if not exists product_label text;

create table if not exists public.club_promotion_coupons (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references public.club_promotions(id) on delete cascade,
  member_id uuid references public.club_members(id) on delete cascade,
  token text not null default encode(gen_random_bytes(24),'hex'),
  created_at timestamptz not null default now(), expires_at timestamptz,
  used_at timestamptz, original_amount_ttc numeric, discount_rate numeric,
  discount_amount_ttc numeric, final_amount_ttc numeric, receipt_number text, product_label text
);
create index if not exists club_promotion_coupons_member_idx on public.club_promotion_coupons(member_id,created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), endpoint text unique not null,
  p256dh text, auth text, subscription jsonb, created_at timestamptz not null default now()
);

-- Synchronise uniquement les colonnes de compatibilité à partir des données historiques.
update public.club_members member set
  code=member.personal_code,
  name=nullif(trim(concat_ws(' ',member.first_name,member.last_name)),''),
  stamps=member.loyalty_points,
  visits=(select count(*) from public.club_loyalty_events event where event.member_id=member.id and event.event_type='passage'),
  rewards_count=(select count(*) from public.club_loyalty_events event where event.member_id=member.id and event.event_type='reward'),
  coupons_available=(select count(*) from public.club_promotion_coupons coupon where coupon.member_id=member.id and coupon.used_at is null and (coupon.expires_at is null or coupon.expires_at>=now()));

create or replace function public.sync_club_member_compatibility()
returns trigger language plpgsql as $$
begin
  new.code:=new.personal_code;
  new.name:=nullif(trim(concat_ws(' ',new.first_name,new.last_name)),'');
  new.stamps:=new.loyalty_points;
  return new;
end $$;
drop trigger if exists sync_club_member_compatibility_trigger on public.club_members;
create trigger sync_club_member_compatibility_trigger before insert or update of personal_code,loyalty_points,first_name,last_name
on public.club_members for each row execute function public.sync_club_member_compatibility();

create or replace function public.club_add_stamp(p_member_id uuid,p_note text default '')
returns public.club_members language plpgsql security definer set search_path=public as $$
declare result public.club_members; new_points integer;
begin
  select * into result from public.club_members where id=p_member_id for update;
  if result.id is null then raise exception 'Membre introuvable'; end if;
  new_points:=coalesce(result.loyalty_points,0)+1;
  update public.club_members set loyalty_points=new_points,reward_available=(new_points>=10),updated_at=now(),visits=coalesce(visits,0)+1
  where id=p_member_id returning * into result;
  if result.loyalty_points is distinct from new_points then raise exception 'Incrémentation du tampon non confirmée'; end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='club_loyalty_events' and column_name='stamps_after'
  ) then
    execute 'insert into public.club_loyalty_events(member_id,event_type,event_day,note,stamps_after) values ($1,''passage'',current_date,nullif($2,''''),$3)'
    using p_member_id,p_note,new_points;
  else
    insert into public.club_loyalty_events(member_id,event_type,event_day,note)
    values(p_member_id,'passage',current_date,nullif(p_note,''));
  end if;
  return result;
end $$;

create or replace function public.club_validate_reward(p_member_id uuid,p_required integer default 10,p_note text default '')
returns public.club_members language plpgsql security definer set search_path=public as $$
declare result public.club_members;
begin
  select * into result from public.club_members where id=p_member_id for update;
  if result.id is null then raise exception 'Membre introuvable'; end if;
  if not coalesce(result.reward_available,false) and coalesce(result.loyalty_points,0)<p_required then raise exception 'Nombre de tampons insuffisant'; end if;
  insert into public.club_loyalty_events(member_id,event_type,event_day,note)
  values(p_member_id,'reward',current_date,coalesce(nullif(p_note,''),'Récompense fidélité'));
  update public.club_members set loyalty_points=0,reward_available=false,updated_at=now(),rewards_count=coalesce(rewards_count,0)+1
  where id=p_member_id returning * into result;
  return result;
end $$;

grant execute on function public.club_add_stamp(uuid,text) to service_role;
grant execute on function public.club_validate_reward(uuid,integer,text) to service_role;
notify pgrst,'reload schema';
