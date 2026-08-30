-- Nenhum byte de arquivo fica no Supabase — evidências vão direto para o
-- Google Drive (pasta "AZVFIT - IA", subpasta por colaborador). O Postgres
-- guarda só o ponteiro (drive_file_id / drive_view_url) para permitir a
-- fila de validação, auditoria e detecção de evidência reutilizada por hash.
-- O bucket 'evidences' fica desativado (sem policies, ninguém consegue
-- ler/escrever nele) — o storage API do Supabase não permite dropar o
-- registro do bucket via SQL direto.

drop policy if exists "evidence_self_insert" on storage.objects;
drop policy if exists "evidence_self_read" on storage.objects;
drop policy if exists "evidence_self_delete" on storage.objects;
update storage.buckets set public = false, file_size_limit = 0 where id = 'evidences';

alter table public.evidences
  add column drive_file_id text,
  add column drive_view_url text;

alter table public.evidences drop column storage_path;

alter table public.evidences
  alter column drive_file_id set not null;

-- expire_evidences agora devolve o drive_file_id (não existe mais storage_path).
create or replace function public.expire_evidences(_edition_id uuid, _days integer default null)
returns table (drive_file_id text)
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
    returning e.drive_file_id
  )
  select d.drive_file_id from deleted d;
end;
$$;

revoke all on function public.expire_evidences(uuid, integer) from public;
revoke execute on function public.expire_evidences(uuid, integer) from anon;
grant execute on function public.expire_evidences(uuid, integer) to authenticated;
