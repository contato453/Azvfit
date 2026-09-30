-- Bug reportado: "não está contabilizando os pontos da semana corretamente"
-- (bônus semanal do TotalPass: 3 check-ins aprovados na semana = 2 pontos,
-- teto de 8).
--
-- Causa 1: recalc_totalpass_bonus fatiava as "semanas" a partir de
-- editions.start_date, andando de 7 em 7 dias. A edição atual começa numa
-- quinta (03/09), então a "semana" do sistema era quinta a quarta, e não
-- segunda a domingo como o colaborador entende (e como o limite semanal das
-- atividades, que usa date_trunc('week'), já funciona). Quem fazia seg/ter/qua
-- + qui/sex tinha os check-ins partidos em duas "semanas" e perdia o bônus.
--
-- Causa 2: o bônus só é recalculado quando a comissão aprova/recusa um
-- check-in daquele colaborador. Quem não teve check-in revisado depois que
-- a função passou a gerar os lançamentos ficou sem o bônus no ledger, mesmo
-- tendo semanas completas aprovadas.
--
-- Fix: semana passa a ser a semana civil (segunda a domingo), contando só
-- check-ins dentro do período da edição (start_date até scoring_end_date).
-- No fim, recalcula o bônus de todos os participantes da edição atual.
create or replace function public.recalc_totalpass_bonus(_edition_id uuid, _user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_checkins_por_semana integer;
  v_pontos_por_semana numeric;
  v_maximo_total numeric;
  v_week record;
  v_total_granted numeric := 0;
  v_points numeric;
begin
  select start_date, scoring_end_date into v_start, v_end from public.editions where id = _edition_id;
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

  -- Um dia conta uma vez só (dois prints do mesmo dia não viram dois check-ins).
  for v_week in
    select date_trunc('week', checkin_date)::date as week_start, count(distinct checkin_date) as n
    from public.totalpass_checkins
    where edition_id = _edition_id and user_id = _user_id and status = 'aprovado'
      and checkin_date >= v_start
      and (v_end is null or checkin_date <= v_end)
    group by 1
    order by 1
  loop
    exit when v_total_granted >= v_maximo_total;

    if v_week.n >= v_checkins_por_semana then
      v_points := least(v_pontos_por_semana, v_maximo_total - v_total_granted);
      if v_points > 0 then
        insert into public.weekly_bonuses (edition_id, user_id, week_start, week_end, reason, points, granted_by)
        values (_edition_id, _user_id, v_week.week_start, v_week.week_start + 6, 'totalpass', v_points, null);

        insert into public.point_ledger (edition_id, user_id, kind, source_table, source_id, points, rule_snapshot, reason)
        values (_edition_id, _user_id, 'totalpass', 'weekly_bonuses', null, v_points,
          jsonb_build_object('week_start', v_week.week_start, 'week_end', v_week.week_start + 6, 'checkins', v_week.n),
          'Bônus semanal TotalPass');

        v_total_granted := v_total_granted + v_points;
      end if;
    end if;
  end loop;

  perform public.recalc_participant_points(_edition_id, _user_id);
end;
$$;

-- Recalcula o bônus de todo mundo que tem check-in na edição atual.
do $$
declare
  r record;
begin
  for r in
    select distinct t.edition_id, t.user_id
    from public.totalpass_checkins t
    join public.editions e on e.id = t.edition_id
    where e.is_current
  loop
    perform public.recalc_totalpass_bonus(r.edition_id, r.user_id);
  end loop;
end;
$$;
