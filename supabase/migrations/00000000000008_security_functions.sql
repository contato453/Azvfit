-- Funções de segurança (SECURITY DEFINER) — evitam RLS recursiva e escalação de privilégio.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'comissao');
$$;

-- Comissão global (edition_id null) ou da edição específica.
create or replace function public.is_comissao_of(_edition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin') or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'comissao'
      and (ur.edition_id is null or ur.edition_id = _edition_id)
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_comissao_of(uuid) to authenticated;
grant execute on function public.is_active_user() to authenticated;
