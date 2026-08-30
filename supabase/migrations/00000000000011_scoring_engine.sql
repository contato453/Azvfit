-- Motor de pontuação — seção 7 da documentação.
-- Princípio: nenhum ponto é escrito diretamente pelo cliente. Tudo passa por
-- estas funções SECURITY DEFINER, que gravam no ledger com rule_snapshot e
-- recalculam o total materializado em edition_participants.total_points.

create or replace function public.recalc_participant_points(_edition_id uuid, _user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(points), 0) into v_total
    from public.point_ledger where edition_id = _edition_id and user_id = _user_id;

  insert into public.edition_participants (edition_id, user_id, total_points)
  values (_edition_id, _user_id, v_total)
  on conflict (edition_id, user_id) do update set total_points = excluded.total_points;

  return v_total;
end;
$$;

-- Aprova/recusa/ajusta um registro de atividade.
create or replace function public.review_activity_record(
  _record_id uuid,
  _action text,
  _reason text default null,
  _points numeric default null,
  _context jsonb default '{}'::jsonb
)
returns public.activity_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.activity_records;
  v_activity public.activities;
  v_from_status public.record_status;
  v_to_status public.record_status;
  v_points_before numeric;
  v_points_after numeric;
  v_week_count integer;
  v_day_count integer;
begin
  select * into v_record from public.activity_records where id = _record_id for update;
  if not found then
    raise exception 'Registro não encontrado.';
  end if;

  if not public.is_comissao_of(v_record.edition_id) then
    raise exception 'Sem permissão para validar registros desta edição.';
  end if;

  select * into v_activity from public.activities where id = v_record.activity_id;

  v_from_status := v_record.status;
  v_points_before := v_record.points_awarded;

  if _action in ('recusar', 'solicitar_correcao', 'desconsiderar') and (_reason is null or btrim(_reason) = '') then
    raise exception 'Justificativa obrigatória para esta ação.';
  end if;

  if _action = 'analisar' then
    v_to_status := 'em_analise';
    update public.activity_records set status = v_to_status, reviewed_by = auth.uid(), reviewed_at = now() where id = _record_id;

  elsif _action = 'aprovar' then
    if v_activity.max_per_day is not null then
      select count(*) into v_day_count from public.activity_records
        where user_id = v_record.user_id and activity_id = v_record.activity_id
          and activity_date = v_record.activity_date and status = 'aprovado' and id <> v_record.id;
      if v_day_count >= v_activity.max_per_day then
        raise exception 'Limite diário desta atividade já atingido.';
      end if;
    end if;
    if v_activity.max_per_week is not null then
      select count(*) into v_week_count from public.activity_records
        where user_id = v_record.user_id and activity_id = v_record.activity_id
          and status = 'aprovado' and id <> v_record.id
          and activity_date >= date_trunc('week', v_record.activity_date)::date
          and activity_date < (date_trunc('week', v_record.activity_date) + interval '7 days')::date;
      if v_week_count >= v_activity.max_per_week then
        raise exception 'Limite semanal desta atividade já atingido.';
      end if;
    end if;

    v_to_status := 'aprovado';
    v_points_after := coalesce(_points, v_activity.base_points * v_record.quantity);

    update public.activity_records
      set status = v_to_status, points_awarded = v_points_after, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason
      where id = _record_id;

    insert into public.point_ledger (edition_id, user_id, kind, source_table, source_id, points, rule_snapshot, reason, created_by)
    values (v_record.edition_id, v_record.user_id, 'registro', 'activity_records', v_record.id, v_points_after, to_jsonb(v_activity), _reason, auth.uid())
    on conflict (source_table, source_id, kind) where (source_id is not null and kind not in ('ajuste', 'penalidade'))
      do update set points = excluded.points, rule_snapshot = excluded.rule_snapshot, reason = excluded.reason, created_by = excluded.created_by, created_at = now();

    perform public.recalc_participant_points(v_record.edition_id, v_record.user_id);

  elsif _action = 'ajustar_pontos' then
    if _points is null then
      raise exception 'Informe os pontos para o ajuste.';
    end if;
    if _reason is null or btrim(_reason) = '' then
      raise exception 'Justificativa obrigatória para alterar a pontuação.';
    end if;
    v_to_status := 'aprovado';
    v_points_after := _points;
    update public.activity_records
      set status = v_to_status, points_awarded = v_points_after, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason
      where id = _record_id;

    insert into public.point_ledger (edition_id, user_id, kind, source_table, source_id, points, rule_snapshot, reason, created_by)
    values (v_record.edition_id, v_record.user_id, 'registro', 'activity_records', v_record.id, v_points_after, to_jsonb(v_activity), _reason, auth.uid())
    on conflict (source_table, source_id, kind) where (source_id is not null and kind not in ('ajuste', 'penalidade'))
      do update set points = excluded.points, reason = excluded.reason, created_by = excluded.created_by, created_at = now();

    perform public.recalc_participant_points(v_record.edition_id, v_record.user_id);

  elsif _action = 'recusar' then
    v_to_status := 'recusado';
    update public.activity_records set status = v_to_status, points_awarded = null, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _record_id;
    delete from public.point_ledger where source_table = 'activity_records' and source_id = _record_id and kind = 'registro';
    perform public.recalc_participant_points(v_record.edition_id, v_record.user_id);

  elsif _action = 'solicitar_correcao' then
    v_to_status := 'correcao_solicitada';
    update public.activity_records set status = v_to_status, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _record_id;

  elsif _action = 'desconsiderar' then
    v_to_status := 'cancelado';
    update public.activity_records set status = v_to_status, points_awarded = null, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _record_id;
    delete from public.point_ledger where source_table = 'activity_records' and source_id = _record_id and kind = 'registro';
    perform public.recalc_participant_points(v_record.edition_id, v_record.user_id);

  else
    raise exception 'Ação inválida: %', _action;
  end if;

  insert into public.record_reviews (record_id, source_table, reviewer_id, action, from_status, to_status, points_before, points_after, reason, context)
  values (_record_id, 'activity_records', auth.uid(), _action, v_from_status, v_to_status, v_points_before, v_points_after, _reason, _context);

  perform public.log_audit('activity_records', _record_id, _action, v_record.edition_id, to_jsonb(v_record), null, _reason, _context);

  select * into v_record from public.activity_records where id = _record_id;
  return v_record;
end;
$$;

-- Mesmo padrão para participações em missões.
create or replace function public.review_mission_participation(
  _participation_id uuid,
  _action text,
  _reason text default null,
  _points numeric default null,
  _context jsonb default '{}'::jsonb
)
returns public.mission_participations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part public.mission_participations;
  v_mission public.missions;
  v_from_status public.record_status;
  v_to_status public.record_status;
  v_points_before numeric;
  v_points_after numeric;
begin
  select * into v_part from public.mission_participations where id = _participation_id for update;
  if not found then
    raise exception 'Participação não encontrada.';
  end if;

  select * into v_mission from public.missions where id = v_part.mission_id;

  if not public.is_comissao_of(v_mission.edition_id) then
    raise exception 'Sem permissão para validar missões desta edição.';
  end if;

  v_from_status := v_part.status;
  v_points_before := v_part.points_awarded;

  if _action in ('recusar', 'solicitar_correcao', 'desconsiderar') and (_reason is null or btrim(_reason) = '') then
    raise exception 'Justificativa obrigatória para esta ação.';
  end if;

  if _action = 'analisar' then
    v_to_status := 'em_analise';
    update public.mission_participations set status = v_to_status, reviewed_by = auth.uid(), reviewed_at = now() where id = _participation_id;

  elsif _action in ('aprovar', 'ajustar_pontos') then
    if _action = 'ajustar_pontos' and (_reason is null or btrim(_reason) = '') then
      raise exception 'Justificativa obrigatória para alterar a pontuação.';
    end if;
    v_to_status := 'aprovado';
    v_points_after := coalesce(_points, v_mission.points);

    update public.mission_participations
      set status = v_to_status, points_awarded = v_points_after, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason
      where id = _participation_id;

    insert into public.point_ledger (edition_id, user_id, kind, source_table, source_id, points, rule_snapshot, reason, created_by)
    values (v_mission.edition_id, v_part.user_id, 'missao', 'mission_participations', v_part.id, v_points_after, to_jsonb(v_mission), _reason, auth.uid())
    on conflict (source_table, source_id, kind) where (source_id is not null and kind not in ('ajuste', 'penalidade'))
      do update set points = excluded.points, reason = excluded.reason, created_by = excluded.created_by, created_at = now();

    perform public.recalc_participant_points(v_mission.edition_id, v_part.user_id);

  elsif _action = 'recusar' then
    v_to_status := 'recusado';
    update public.mission_participations set status = v_to_status, points_awarded = null, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _participation_id;
    delete from public.point_ledger where source_table = 'mission_participations' and source_id = _participation_id and kind = 'missao';
    perform public.recalc_participant_points(v_mission.edition_id, v_part.user_id);

  elsif _action = 'solicitar_correcao' then
    v_to_status := 'correcao_solicitada';
    update public.mission_participations set status = v_to_status, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _participation_id;

  elsif _action = 'desconsiderar' then
    v_to_status := 'cancelado';
    update public.mission_participations set status = v_to_status, points_awarded = null, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason where id = _participation_id;
    delete from public.point_ledger where source_table = 'mission_participations' and source_id = _participation_id and kind = 'missao';
    perform public.recalc_participant_points(v_mission.edition_id, v_part.user_id);
  else
    raise exception 'Ação inválida: %', _action;
  end if;

  insert into public.record_reviews (record_id, source_table, reviewer_id, action, from_status, to_status, points_before, points_after, reason, context)
  values (_participation_id, 'mission_participations', auth.uid(), _action, v_from_status, v_to_status, v_points_before, v_points_after, _reason, _context);

  perform public.log_audit('mission_participations', _participation_id, _action, v_mission.edition_id, to_jsonb(v_part), null, _reason, _context);

  select * into v_part from public.mission_participations where id = _participation_id;
  return v_part;
end;
$$;

-- Valida/recusa check-in do TotalPass e recalcula o bônus semanal.
create or replace function public.review_totalpass_checkin(
  _checkin_id uuid,
  _action text,
  _reason text default null,
  _context jsonb default '{}'::jsonb
)
returns public.totalpass_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin public.totalpass_checkins;
  v_from_status public.record_status;
  v_to_status public.record_status;
begin
  select * into v_checkin from public.totalpass_checkins where id = _checkin_id for update;
  if not found then
    raise exception 'Check-in não encontrado.';
  end if;

  if not public.is_comissao_of(v_checkin.edition_id) then
    raise exception 'Sem permissão para validar check-ins desta edição.';
  end if;

  if _action = 'recusar' and (_reason is null or btrim(_reason) = '') then
    raise exception 'Justificativa obrigatória para recusar.';
  end if;

  v_from_status := v_checkin.status;

  if _action = 'aprovar' then
    v_to_status := 'aprovado';
  elsif _action = 'recusar' then
    v_to_status := 'recusado';
  else
    raise exception 'Ação inválida: %', _action;
  end if;

  update public.totalpass_checkins
    set status = v_to_status, reviewed_by = auth.uid(), reviewed_at = now(), review_reason = _reason
    where id = _checkin_id;

  insert into public.record_reviews (record_id, source_table, reviewer_id, action, from_status, to_status, reason, context)
  values (_checkin_id, 'totalpass_checkins', auth.uid(), _action, v_from_status, v_to_status, _reason, _context);

  perform public.recalc_totalpass_bonus(v_checkin.edition_id, v_checkin.user_id);
  perform public.log_audit('totalpass_checkins', _checkin_id, _action, v_checkin.edition_id, to_jsonb(v_checkin), null, _reason, _context);

  select * into v_checkin from public.totalpass_checkins where id = _checkin_id;
  return v_checkin;
end;
$$;

-- Recalcula do zero o bônus semanal de TotalPass (3 check-ins aprovados/semana → 2 pontos, teto 8).
create or replace function public.recalc_totalpass_bonus(_edition_id uuid, _user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_checkins_por_semana integer;
  v_pontos_por_semana numeric;
  v_maximo_total numeric;
  v_week_start date;
  v_week_end date;
  v_count integer;
  v_total_granted numeric := 0;
  v_points numeric;
begin
  select start_date into v_start from public.editions where id = _edition_id;
  if v_start is null then
    return;
  end if;

  select
    coalesce((value->>'checkins_por_semana')::integer, 3),
    coalesce((value->>'pontos_por_semana')::numeric, 2),
    coalesce((value->>'maximo_total')::numeric, 8)
  into v_checkins_por_semana, v_pontos_por_semana, v_maximo_total
  from public.settings where edition_id = _edition_id and key = 'totalpass_bonus'
  limit 1;

  v_checkins_por_semana := coalesce(v_checkins_por_semana, 3);
  v_pontos_por_semana := coalesce(v_pontos_por_semana, 2);
  v_maximo_total := coalesce(v_maximo_total, 8);

  delete from public.weekly_bonuses where edition_id = _edition_id and user_id = _user_id and reason = 'totalpass';
  delete from public.point_ledger where edition_id = _edition_id and user_id = _user_id and kind = 'totalpass';

  v_week_start := v_start;
  while v_week_start <= current_date and v_total_granted < v_maximo_total loop
    v_week_end := v_week_start + 6;

    select count(*) into v_count from public.totalpass_checkins
      where edition_id = _edition_id and user_id = _user_id and status = 'aprovado'
        and checkin_date between v_week_start and v_week_end;

    if v_count >= v_checkins_por_semana then
      v_points := least(v_pontos_por_semana, v_maximo_total - v_total_granted);
      if v_points > 0 then
        insert into public.weekly_bonuses (edition_id, user_id, week_start, week_end, reason, points, granted_by)
        values (_edition_id, _user_id, v_week_start, v_week_end, 'totalpass', v_points, null);

        insert into public.point_ledger (edition_id, user_id, kind, source_table, source_id, points, rule_snapshot, reason)
        values (_edition_id, _user_id, 'totalpass', 'weekly_bonuses', null, v_points, jsonb_build_object('week_start', v_week_start, 'week_end', v_week_end), 'Bônus semanal TotalPass');

        v_total_granted := v_total_granted + v_points;
      end if;
    end if;

    v_week_start := v_week_start + 7;
  end loop;

  perform public.recalc_participant_points(_edition_id, _user_id);
end;
$$;

-- Ajuste manual de pontos (crédito ou débito), com justificativa obrigatória.
create or replace function public.apply_manual_adjustment(
  _edition_id uuid,
  _user_id uuid,
  _points numeric,
  _reason text,
  _context jsonb default '{}'::jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_comissao_of(_edition_id) then
    raise exception 'Sem permissão para ajustar pontuação nesta edição.';
  end if;
  if _reason is null or btrim(_reason) = '' then
    raise exception 'Justificativa obrigatória para ajuste manual.';
  end if;

  insert into public.point_ledger (edition_id, user_id, kind, points, is_manual, reason, created_by, rule_snapshot)
  values (_edition_id, _user_id, 'ajuste', _points, true, _reason, auth.uid(), _context);

  perform public.log_audit('point_ledger', _user_id, 'ajuste_manual', _edition_id, null, jsonb_build_object('points', _points), _reason, _context);

  return public.recalc_participant_points(_edition_id, _user_id);
end;
$$;

-- Registra ocorrência de conduta (fraude, evidência reutilizada etc.).
create or replace function public.register_conduct_incident(
  _edition_id uuid,
  _user_id uuid,
  _record_id uuid,
  _incident_type public.incident_type,
  _measure public.incident_measure,
  _reason text,
  _points_delta numeric default 0,
  _description text default null,
  _context jsonb default '{}'::jsonb
)
returns public.conduct_incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.conduct_incidents;
begin
  if not public.is_comissao_of(_edition_id) then
    raise exception 'Sem permissão para registrar ocorrências nesta edição.';
  end if;
  if _measure = 'desclassificacao' and not public.is_admin() then
    raise exception 'Apenas administradores podem desclassificar participantes.';
  end if;
  if _reason is null or btrim(_reason) = '' then
    raise exception 'Justificativa obrigatória.';
  end if;

  insert into public.conduct_incidents (edition_id, user_id, record_id, incident_type, measure, points_delta, description, reason, decided_by, context)
  values (_edition_id, _user_id, _record_id, _incident_type, _measure, _points_delta, _description, _reason, auth.uid(), _context)
  returning * into v_incident;

  if _measure = 'desconsideracao' and _record_id is not null then
    update public.activity_records set status = 'cancelado', points_awarded = null where id = _record_id;
    delete from public.point_ledger where source_table = 'activity_records' and source_id = _record_id and kind = 'registro';
  elsif _measure = 'perda_pontos' and _points_delta <> 0 then
    insert into public.point_ledger (edition_id, user_id, kind, points, is_manual, reason, created_by, rule_snapshot)
    values (_edition_id, _user_id, 'penalidade', -abs(_points_delta), true, _reason, auth.uid(), to_jsonb(v_incident));
  elsif _measure = 'desclassificacao' then
    update public.edition_participants
      set is_disqualified = true, disqualified_reason = _reason, disqualified_at = now(), disqualified_by = auth.uid()
      where edition_id = _edition_id and user_id = _user_id;
  end if;

  perform public.recalc_participant_points(_edition_id, _user_id);
  perform public.log_audit('conduct_incidents', v_incident.id, _measure::text, _edition_id, null, to_jsonb(v_incident), _reason, _context);

  return v_incident;
end;
$$;

grant execute on function public.recalc_participant_points(uuid, uuid) to authenticated;
grant execute on function public.review_activity_record(uuid, text, text, numeric, jsonb) to authenticated;
grant execute on function public.review_mission_participation(uuid, text, text, numeric, jsonb) to authenticated;
grant execute on function public.review_totalpass_checkin(uuid, text, text, jsonb) to authenticated;
grant execute on function public.recalc_totalpass_bonus(uuid, uuid) to authenticated;
grant execute on function public.apply_manual_adjustment(uuid, uuid, numeric, text, jsonb) to authenticated;
grant execute on function public.register_conduct_incident(uuid, uuid, uuid, public.incident_type, public.incident_measure, text, numeric, text, jsonb) to authenticated;
