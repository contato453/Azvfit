-- Day Fit / Passaporte da Saúde / comunicados — seção 7.2 e 12.4.

create or replace function public.day_fit_config(_edition_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.settings where edition_id = _edition_id and key = 'day_fit_config' limit 1),
    jsonb_build_object('pontos_por_estacao', 1, 'bonus_passaporte_completo', 5, 'sorteio_exige_passaporte_completo', true)
  );
$$;

-- Soma pontos do passaporte: pontos_por_estacao × estações carimbadas válidas
-- + bônus se todas as estações ativas do(s) evento(s) day_fit da edição foram carimbadas.
create or replace function public.sync_passport_points(_edition_id uuid, _user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config jsonb;
  v_pontos_por_estacao numeric;
  v_bonus numeric;
  v_stamped_count integer;
  v_total_stations integer;
  v_points numeric;
begin
  v_config := public.day_fit_config(_edition_id);
  v_pontos_por_estacao := coalesce((v_config->>'pontos_por_estacao')::numeric, 1);
  v_bonus := coalesce((v_config->>'bonus_passaporte_completo')::numeric, 5);

  select count(*) into v_stamped_count
  from public.health_passport hp
  where hp.edition_id = _edition_id and hp.user_id = _user_id and hp.status = 'valido';

  select count(*) into v_total_stations
  from public.event_stations es
  join public.events e on e.id = es.event_id
  where e.edition_id = _edition_id and e.event_type = 'day_fit' and es.is_active;

  v_points := v_stamped_count * v_pontos_por_estacao;
  if v_total_stations > 0 and v_stamped_count >= v_total_stations then
    v_points := v_points + v_bonus;
  end if;

  delete from public.point_ledger where edition_id = _edition_id and user_id = _user_id and kind = 'bonus' and source_table = 'health_passport';

  if v_points > 0 then
    insert into public.point_ledger (edition_id, user_id, kind, source_table, points, rule_snapshot, reason)
    values (_edition_id, _user_id, 'bonus', 'health_passport', v_points, v_config, 'Passaporte da Saúde — Day Fit');
  end if;

  perform public.recalc_participant_points(_edition_id, _user_id);
end;
$$;

-- Colaborador valida a própria estação via QR Code ou código numérico.
create or replace function public.passport_checkin(
  _station_id uuid,
  _method text,
  _code text default null,
  _qr_token uuid default null
)
returns public.health_passport
language plpgsql
security definer
set search_path = public
as $$
declare
  v_station public.event_stations;
  v_edition_id uuid;
  v_entry public.health_passport;
begin
  select * into v_station from public.event_stations where id = _station_id and is_active limit 1;

  if v_station.id is null then
    raise exception 'Estação não encontrada ou inativa.';
  end if;

  select e.edition_id into v_edition_id from public.events e where e.id = v_station.event_id;

  if _method = 'qrcode' then
    if _qr_token is null or _qr_token <> v_station.qr_token then
      raise exception 'QR Code inválido.';
    end if;
  elsif _method = 'codigo' then
    if _code is null or btrim(upper(_code)) <> upper(v_station.station_code) then
      raise exception 'Código inválido.';
    end if;
  else
    raise exception 'Método de validação inválido.';
  end if;

  if exists (select 1 from public.health_passport where user_id = auth.uid() and station_id = _station_id) then
    raise exception 'Você já carimbou esta estação.';
  end if;

  insert into public.health_passport (edition_id, user_id, station_id, stamped_by, status, method)
  values (v_edition_id, auth.uid(), _station_id, auth.uid(), 'valido', _method)
  returning * into v_entry;

  perform public.sync_passport_points(v_edition_id, auth.uid());
  perform public.log_audit('health_passport', v_entry.id, 'checkin', v_edition_id, null, to_jsonb(v_entry));

  return v_entry;
end;
$$;

-- Resolve a estação pelo código dentro da edição e delega para passport_checkin.
create or replace function public.passport_checkin_code(_edition_id uuid, _code text)
returns public.health_passport
language plpgsql
security definer
set search_path = public
as $$
declare
  v_station_id uuid;
begin
  select es.id into v_station_id
  from public.event_stations es
  join public.events e on e.id = es.event_id
  where e.edition_id = _edition_id and es.is_active and upper(es.station_code) = upper(btrim(_code))
  limit 1;

  if v_station_id is null then
    raise exception 'Código não corresponde a nenhuma estação ativa desta edição.';
  end if;

  return public.passport_checkin(v_station_id, 'codigo', _code, null);
end;
$$;

-- Comissão valida manualmente ou remove um carimbo (remoção exige motivo).
create or replace function public.staff_passport_action(
  _user_id uuid,
  _station_id uuid,
  _action text,
  _reason text default null
)
returns public.health_passport
language plpgsql
security definer
set search_path = public
as $$
declare
  v_station public.event_stations;
  v_edition_id uuid;
  v_entry public.health_passport;
begin
  select * into v_station from public.event_stations where id = _station_id limit 1;
  select e.edition_id into v_edition_id from public.events e where e.id = v_station.event_id;

  if not public.is_comissao_of(v_edition_id) then
    raise exception 'Sem permissão para gerenciar o passaporte desta edição.';
  end if;

  if _action = 'validar' then
    insert into public.health_passport (edition_id, user_id, station_id, stamped_by, status, method, reason)
    values (v_edition_id, _user_id, _station_id, auth.uid(), 'valido', 'manual', _reason)
    on conflict (user_id, station_id) do update set status = 'valido', stamped_by = auth.uid(), stamped_at = now(), method = 'manual', reason = _reason
    returning * into v_entry;

  elsif _action = 'remover' then
    if _reason is null or btrim(_reason) = '' then
      raise exception 'Justificativa obrigatória para remover um carimbo.';
    end if;
    update public.health_passport
      set status = 'removido', corrected_by = auth.uid(), corrected_at = now(), reason = _reason
      where user_id = _user_id and station_id = _station_id
      returning * into v_entry;
  else
    raise exception 'Ação inválida: %', _action;
  end if;

  perform public.sync_passport_points(v_edition_id, _user_id);
  perform public.log_audit('health_passport', coalesce(v_entry.id, _station_id), _action, v_edition_id, null, to_jsonb(v_entry), _reason);

  return v_entry;
end;
$$;

-- Retorna os códigos/QR tokens das estações de um evento (para a comissão gerar os QR Codes).
create or replace function public.station_codes(_event_id uuid)
returns table (station_id uuid, name text, station_code text, qr_token uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_edition_id uuid;
begin
  select edition_id into v_edition_id from public.events where id = _event_id;
  if not public.is_comissao_of(v_edition_id) then
    raise exception 'Sem permissão para ver os códigos deste evento.';
  end if;

  return query
  select es.id, es.name, es.station_code, es.qr_token
  from public.event_stations es
  where es.event_id = _event_id
  order by es.sort_order;
end;
$$;

-- Publica um comunicado e notifica todos os participantes ativos da edição.
create or replace function public.publish_announcement(_announcement_id uuid)
returns public.announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ann public.announcements;
  v_participant record;
begin
  select * into v_ann from public.announcements where id = _announcement_id;
  if not found then
    raise exception 'Comunicado não encontrado.';
  end if;
  if not public.is_comissao_of(v_ann.edition_id) then
    raise exception 'Sem permissão para publicar comunicados desta edição.';
  end if;

  update public.announcements set status = 'publicado', notified_at = now() where id = _announcement_id returning * into v_ann;

  if v_ann.notify_participants then
    for v_participant in
      select user_id from public.edition_participants where edition_id = v_ann.edition_id and is_active
    loop
      insert into public.notifications (user_id, edition_id, title, body, link)
      values (v_participant.user_id, v_ann.edition_id, v_ann.title, v_ann.body, '/eventos');
    end loop;
  end if;

  perform public.log_audit('announcements', _announcement_id, 'publicar', v_ann.edition_id, null, to_jsonb(v_ann));

  return v_ann;
end;
$$;

grant execute on function public.day_fit_config(uuid) to authenticated;
grant execute on function public.sync_passport_points(uuid, uuid) to authenticated;
grant execute on function public.passport_checkin(uuid, text, text, uuid) to authenticated;
grant execute on function public.passport_checkin_code(uuid, text) to authenticated;
grant execute on function public.staff_passport_action(uuid, uuid, text, text) to authenticated;
grant execute on function public.station_codes(uuid) to authenticated;
grant execute on function public.publish_announcement(uuid) to authenticated;
