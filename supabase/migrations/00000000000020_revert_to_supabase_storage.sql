-- Reversão: evidências voltam pro Supabase Storage (bucket privado), como
-- na arquitetura original. Nenhum dado real existia em evidences ainda.

alter table public.evidences
  add column storage_path text;

update public.evidences set storage_path = coalesce(drive_view_url, drive_file_id) where storage_path is null;

alter table public.evidences alter column storage_path set not null;

alter table public.evidences
  drop column drive_file_id,
  drop column drive_view_url;

-- Reativa o bucket privado.
update storage.buckets
  set public = false,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
  where id = 'evidences';

create policy "evidence_self_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidences' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence_self_read" on storage.objects for select to authenticated
  using (bucket_id = 'evidences' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

create policy "evidence_self_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidences' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Restaura expire_evidences devolvendo storage_path.
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

revoke all on function public.expire_evidences(uuid, integer) from public;
revoke execute on function public.expire_evidences(uuid, integer) from anon;
grant execute on function public.expire_evidences(uuid, integer) to authenticated;
