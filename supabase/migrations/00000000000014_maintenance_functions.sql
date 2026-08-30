-- Manutenção — retenção/expurgo de evidências (LGPD, seção 13).

create or replace function public.expire_evidences(_edition_id uuid, _days integer default null)
returns table (storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem expurgar evidências.';
  end if;

  v_days := _days;
  if v_days is null then
    select coalesce((value->>'retencao_evidencias_dias')::integer, 180) into v_days
    from public.settings where edition_id = _edition_id and key = 'privacidade.retencao_evidencias_dias'
    limit 1;
    v_days := coalesce(v_days, 180);
  end if;

  perform public.log_audit('evidences', null, 'expurgo', _edition_id, null,
    jsonb_build_object('dias', v_days), format('Expurgo automático de evidências com mais de %s dias.', v_days));

  return query
  with deleted as (
    delete from public.evidences e
    where e.edition_id = _edition_id
      and e.created_at < now() - (v_days || ' days')::interval
    returning e.storage_path
  )
  select d.storage_path from deleted d;
end;
$$;

grant execute on function public.expire_evidences(uuid, integer) to authenticated;
