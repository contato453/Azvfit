-- Área de cadastro de usuários pelo admin (painel /admin/usuarios).
-- A criação da conta em si (auth.users) é feita por uma Edge Function com
-- a service role key (supabase.auth.admin.createUser) — não é possível
-- criar login de terceiros com a chave publicável. Esta migration cobre
-- o que fica do lado do Postgres: trigger de perfil estendido + RPC de
-- troca de papel + auditoria.

-- handle_new_user passa a também aproveitar phone/department/unit/job_title
-- quando vierem no raw_user_meta_data (cadastro em lote pelo admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  insert into public.profiles (id, full_name, email, phone, department, unit, job_title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'job_title'
  )
  on conflict (id) do nothing;

  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'colaborador');

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Troca de papel é sensível (dá acesso ao painel admin) — só admin, e como
-- modelo é "um papel ativo por vez", faz delete+insert atômico numa função
-- só, em vez do client mexer direto em duas escritas separadas.
create or replace function public.admin_set_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis.';
  end if;

  select jsonb_agg(role) into v_before from public.user_roles where user_id = _user_id;

  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);

  perform public.log_audit('user_roles', _user_id, 'troca_papel', null, v_before, jsonb_build_array(_role));
end;
$$;

grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;

-- profiles não tinha trigger de auditoria (só user_roles tinha) — edição de
-- cadastro (ativar/desativar, corrigir departamento etc.) passa a ficar
-- rastreada como o resto do sistema sensível.
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
