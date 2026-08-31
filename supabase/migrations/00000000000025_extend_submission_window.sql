-- Pedido do cliente: a janela de envio de 5 horas após a atividade estava
-- curta demais na prática (colaborador esquece de registrar na hora e perde
-- o prazo). Estende para 24 horas. Mantém as outras duas regras como estão
-- (sem retroativo — activity_date tem que ser hoje — e sem horário futuro).
create or replace function public.validate_activity_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  local_now timestamp;
  activity_at timestamp;
  v_category_slug text;
  v_max_per_day integer;
  v_existing_count integer;
begin
  if new.status not in ('enviado', 'em_analise', 'correcao_solicitada', 'aprovado') then
    return new;
  end if;

  local_now := timezone('America/Sao_Paulo', now());
  activity_at := new.activity_date::timestamp + coalesce(new.activity_time, local_now::time);

  -- 1. Sem retroativo.
  if new.activity_date < local_now::date then
    raise exception 'Não é permitido registrar atividades de dias anteriores.';
  end if;

  -- 2. Sem futuro.
  if activity_at > local_now then
    raise exception 'Não é permitido registrar atividades com data ou horário futuros.';
  end if;

  -- 3. Janela de 24 horas (antes: 5).
  if (local_now - activity_at) > interval '24 hours' then
    raise exception 'O registro deve ser feito em até 24 horas após a realização da atividade.';
  end if;

  -- 4. Limite por categoria: movimento e bem-estar → 1 registro/dia no total na categoria.
  select ac.slug into v_category_slug
  from public.activities a
  join public.activity_categories ac on ac.id = a.category_id
  where a.id = new.activity_id;

  if v_category_slug in ('movimento', 'bem-estar') then
    select coalesce((value->>'max_por_dia')::integer, 1) into v_max_per_day
    from public.settings
    where edition_id = new.edition_id and key = 'movimento_principal_max_por_dia'
    limit 1;

    v_max_per_day := coalesce(v_max_per_day, 1);

    select count(*) into v_existing_count
    from public.activity_records r
    join public.activities a2 on a2.id = r.activity_id
    join public.activity_categories ac2 on ac2.id = a2.category_id
    where r.user_id = new.user_id
      and r.edition_id = new.edition_id
      and r.activity_date = new.activity_date
      and ac2.slug = v_category_slug
      and r.status in ('enviado', 'em_analise', 'correcao_solicitada', 'aprovado')
      and r.id <> new.id;

    if v_existing_count >= v_max_per_day then
      raise exception 'Limite diário de % registro(s) para a categoria já atingido.', v_max_per_day;
    end if;
  end if;

  return new;
end;
$$;
