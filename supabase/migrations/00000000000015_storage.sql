-- Storage privado de evidências — seção 10.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidences', 'evidences', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

create policy "evidence_self_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidences' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence_self_read" on storage.objects for select to authenticated
  using (bucket_id = 'evidences' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

create policy "evidence_self_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidences' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
