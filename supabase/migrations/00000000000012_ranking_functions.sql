-- Ranking — seção 7.3: 6 critérios de desempate.

create or replace function public.compute_ranking(_edition_id uuid)
returns table (
  user_id uuid,
  participant_name text,
  total_points numeric,
  approved_activities bigint,
  weekly_frequency bigint,
  totalpass_checkins bigint,
  extra_missions bigint,
  day_fit_participation boolean,
  "position" bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_comissao_of(_edition_id) then
    raise exception 'Sem permissão para calcular o ranking desta edição.';
  end if;

  return query
  with base as (
    select
      ep.user_id as p_user_id,
      coalesce(p.full_name, '') as p_participant_name,
      ep.total_points as p_total_points,
      (select count(*) from public.activity_records r where r.user_id = ep.user_id and r.edition_id = _edition_id and r.status = 'aprovado') as p_approved_activities,
      (select count(distinct date_trunc('week', r.activity_date)) from public.activity_records r where r.user_id = ep.user_id and r.edition_id = _edition_id and r.status = 'aprovado') as p_weekly_frequency,
      (select count(*) from public.totalpass_checkins t where t.user_id = ep.user_id and t.edition_id = _edition_id and t.status = 'aprovado') as p_totalpass_checkins,
      (select count(*) from public.mission_participations mp join public.missions m on m.id = mp.mission_id where mp.user_id = ep.user_id and m.edition_id = _edition_id and mp.status = 'aprovado') as p_extra_missions,
      exists (select 1 from public.health_passport hp where hp.user_id = ep.user_id and hp.edition_id = _edition_id) as p_day_fit_participation
    from public.edition_participants ep
    left join public.profiles p on p.id = ep.user_id
    where ep.edition_id = _edition_id and ep.is_active and not ep.is_disqualified
  )
  select
    b.p_user_id,
    b.p_participant_name,
    b.p_total_points,
    b.p_approved_activities,
    b.p_weekly_frequency,
    b.p_totalpass_checkins,
    b.p_extra_missions,
    b.p_day_fit_participation,
    row_number() over (
      order by b.p_total_points desc, b.p_approved_activities desc, b.p_weekly_frequency desc,
               b.p_totalpass_checkins desc, b.p_extra_missions desc, b.p_day_fit_participation desc,
               b.p_participant_name asc
    ) as "position"
  from base b
  order by "position";
end;
$$;

-- Cria o snapshot imutável publicado (só ele é visível ao colaborador).
create or replace function public.publish_ranking(
  _edition_id uuid,
  _title text,
  _notes text default null,
  _period_start date default null,
  _period_end date default null
)
returns public.ranking_publications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pub public.ranking_publications;
  v_row record;
begin
  if not public.is_comissao_of(_edition_id) then
    raise exception 'Sem permissão para publicar o ranking desta edição.';
  end if;

  insert into public.ranking_publications (edition_id, title, notes, period_start, period_end, published_by)
  values (_edition_id, _title, _notes, _period_start, _period_end, auth.uid())
  returning * into v_pub;

  for v_row in select * from public.compute_ranking(_edition_id) loop
    insert into public.ranking_entries (
      publication_id, user_id, participant_name, position, total_points,
      approved_activities, weekly_frequency, totalpass_checkins, extra_missions, day_fit_participation
    ) values (
      v_pub.id, v_row.user_id, v_row.participant_name, v_row.position, v_row.total_points,
      v_row.approved_activities, v_row.weekly_frequency, v_row.totalpass_checkins, v_row.extra_missions, v_row.day_fit_participation
    );
  end loop;

  update public.editions set show_ranking = true where id = _edition_id;

  perform public.log_audit('ranking_publications', v_pub.id, 'publicar', _edition_id, null, to_jsonb(v_pub));

  return v_pub;
end;
$$;

-- Cancelamento só admin, com motivo obrigatório.
create or replace function public.cancel_ranking_publication(_publication_id uuid, _reason text)
returns public.ranking_publications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pub public.ranking_publications;
begin
  select * into v_pub from public.ranking_publications where id = _publication_id;
  if not found then
    raise exception 'Publicação não encontrada.';
  end if;
  if not public.is_admin() then
    raise exception 'Apenas administradores podem cancelar uma publicação de ranking.';
  end if;
  if _reason is null or btrim(_reason) = '' then
    raise exception 'Justificativa obrigatória para cancelar.';
  end if;

  update public.ranking_publications
    set status = 'cancelado', canceled_at = now(), canceled_by = auth.uid(), cancel_reason = _reason
    where id = _publication_id
    returning * into v_pub;

  perform public.log_audit('ranking_publications', _publication_id, 'cancelar', v_pub.edition_id, null, to_jsonb(v_pub), _reason);

  return v_pub;
end;
$$;

grant execute on function public.compute_ranking(uuid) to authenticated;
grant execute on function public.publish_ranking(uuid, text, text, date, date) to authenticated;
grant execute on function public.cancel_ranking_publication(uuid, text) to authenticated;
