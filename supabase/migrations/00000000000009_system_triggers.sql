-- Triggers de sistema

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.editions for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.activities for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.settings for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.edition_participants for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.activity_records for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.missions for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.mission_participations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.totalpass_checkins for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.awards for each row execute function public.set_updated_at();

-- Auditoria automática de INSERT/UPDATE/DELETE em tabelas sensíveis.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
begin
  begin
    v_entity_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);
  exception when others then
    v_entity_id := null;
  end;

  insert into public.audit_logs (actor_id, entity_table, entity_id, action, before_data, after_data)
  values (
    auth.uid(),
    tg_table_name,
    v_entity_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger audit_editions after insert or update or delete on public.editions for each row execute function public.audit_row_change();
create trigger audit_activities after insert or update or delete on public.activities for each row execute function public.audit_row_change();
create trigger audit_settings after insert or update or delete on public.settings for each row execute function public.audit_row_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.audit_row_change();
create trigger audit_missions after insert or update or delete on public.missions for each row execute function public.audit_row_change();
create trigger audit_awards after insert or update or delete on public.awards for each row execute function public.audit_row_change();

-- Insere log de auditoria manual (usado pelas funções de domínio).
create or replace function public.log_audit(
  _entity_table text,
  _entity_id uuid,
  _action text,
  _edition_id uuid default null,
  _before jsonb default null,
  _after jsonb default null,
  _reason text default null,
  _context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, edition_id, entity_table, entity_id, action, before_data, after_data, reason, context)
  values (auth.uid(), _edition_id, _entity_table, _entity_id, _action, _before, _after, _reason, _context);
end;
$$;

-- Cria profiles + user_roles ao criar um usuário no auth.users (convite pelo admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'colaborador');

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ao aceitar o regulamento, inscreve o colaborador em edition_participants.
create or replace function public.enroll_on_regulation_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.edition_participants (edition_id, user_id)
  values (new.edition_id, new.user_id)
  on conflict (edition_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_regulation_accepted
  after insert on public.regulation_acceptances
  for each row execute function public.enroll_on_regulation_acceptance();

-- Regra de validação temporal e por categoria dos registros de atividade (seção 8.1).
-- Só se aplica quando o registro sai do rascunho (enviado/em_analise/correcao_solicitada/aprovado).
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

  -- 3. Janela de 5 horas.
  if (local_now - activity_at) > interval '5 hours' then
    raise exception 'O registro deve ser feito em até 5 horas após a realização da atividade.';
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

create trigger validate_activity_record
  before insert or update on public.activity_records
  for each row execute function public.validate_activity_record();
