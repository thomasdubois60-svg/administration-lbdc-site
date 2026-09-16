-- Apply once in the Supabase SQL editor before deploying the two applications.
-- Adds one function and one optional history column; does not reset members or history.
begin;
alter table public.club_loyalty_events add column if not exists stamps_after integer;
create or replace function public.club_apply_loyalty(
 p_member_id uuid,p_action text,p_required integer,p_enabled boolean,
 p_reward_label text default 'Formule offerte',p_reward_value numeric default null,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.club_members; e public.club_loyalty_events; points integer; receipt text;
begin
 if not coalesce(p_enabled,false) then raise exception 'Programme de fidélité suspendu'; end if;
 if p_required is null or p_required<1 or p_required>1000 then raise exception 'Seuil invalide'; end if;
 if p_action not in ('stamp','reward') or p_action is null then raise exception 'Action inconnue'; end if;
 if p_reward_value<0 then raise exception 'Valeur de récompense invalide'; end if;
 select * into m from public.club_members where id=p_member_id for update;
 if m.id is null then raise exception 'Membre introuvable'; end if;
 points:=coalesce(m.loyalty_points,0);
 if p_action='stamp' then
  points:=points+1;
  update public.club_members set loyalty_points=points,reward_available=(points>=p_required),updated_at=now(),visits=coalesce(visits,0)+1 where id=m.id returning * into m;
  insert into public.club_loyalty_events(member_id,event_type,event_day,note,stamps_after)
  values(m.id,'passage',current_date,nullif(p_note,''),points) returning * into e;
 else
  if points<p_required then raise exception 'Nombre de tampons insuffisant'; end if;
  points:=points-p_required;
  receipt:='LBDC-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,12);
  insert into public.club_loyalty_events(member_id,event_type,event_day,receipt_number,reward_value_ttc,note,stamps_after)
  values(m.id,'reward',current_date,receipt,p_reward_value,coalesce(nullif(p_reward_label,''),'Récompense fidélité')||case when coalesce(p_note,'')<>'' then ' — '||p_note else '' end,points) returning * into e;
  update public.club_members set loyalty_points=points,reward_available=(points>=p_required),updated_at=now(),rewards_count=coalesce(rewards_count,0)+1 where id=m.id returning * into m;
 end if;
 return jsonb_build_object('member',to_jsonb(m),'event',to_jsonb(e));
end $$;
revoke all on function public.club_apply_loyalty(uuid,text,integer,boolean,text,numeric,text) from public;
grant execute on function public.club_apply_loyalty(uuid,text,integer,boolean,text,numeric,text) to service_role;
notify pgrst,'reload schema';
commit;
