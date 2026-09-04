-- Bug real reportado: comissão não consegue aprovar/revisar atividades
-- enviadas em dias anteriores — dá "Não é permitido registrar atividades
-- de dias anteriores." ao clicar em Aprovar.
--
-- Causa: validate_activity_record roda em BEFORE INSERT OR UPDATE, e
-- revalida as 3 regras de prazo (sem retroativo / sem futuro / janela de
-- 24h) toda vez que o status muda pra qualquer um de
-- enviado/em_analise/correcao_solicitada/aprovado — inclusive quando quem
-- está mudando é a COMISSÃO analisando/aprovando um registro que já foi
-- enviado há dias. Como as regras comparam activity_date/activity_time
-- contra o "agora" do momento da chamada, qualquer revisão feita depois
-- do dia do envio original já cai automaticamente no "sem retroativo".
--
-- Fix: as 3 regras de prazo só fazem sentido no momento em que o
-- COLABORADOR está enviando/reenviando (saindo de rascunho ou de
-- correção solicitada) — é aí que "quando isso realmente aconteceu" é
-- relevante. Ações da comissão em cima de um registro que já passou
-- desse ponto (enviado/em_analise/aprovado mudando de status) não devem
-- reabrir essa checagem. O limite diário por categoria (regra 4) continua
-- valendo sempre — é sobre o estado dos dados, não sobre "agora".
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
  v_is_submission boolean;
begin
  if new.status not in ('enviado', 'em_analise', 'correcao_solicitada', 'aprovado') then
    return new;
  end if;

  v_is_submission := (tg_op = 'INSERT') or (old.status in ('rascunho', 'correcao_solicitada'));

  if v_is_submission then
    local_now := timezone('America/Sao_Paulo', now());
    activity_at := new.activity_date::timestamp + coalesce(new.activity_time, local_now::time);

    if new.activity_date < local_now::date then
      raise exception 'Não é permitido registrar atividades de dias anteriores.';
    end if;

    if activity_at > local_now then
      raise exception 'Não é permitido registrar atividades com data ou horário futuros.';
    end if;

    if (local_now - activity_at) > interval '24 hours' then
      raise exception 'O registro deve ser feito em até 24 horas após a realização da atividade.';
    end if;
  end if;

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
