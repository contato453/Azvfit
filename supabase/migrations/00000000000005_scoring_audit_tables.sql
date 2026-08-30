-- Pontuação e auditoria

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.ledger_kind not null,
  source_table text,
  source_id uuid,
  points numeric not null,
  is_manual boolean not null default false,
  rule_snapshot jsonb not null default '{}'::jsonb,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.point_ledger is 'Ledger imutável. Nenhum ponto é escrito diretamente pelo cliente — apenas via funções SECURITY DEFINER.';

grant select, insert, update, delete on public.point_ledger to authenticated;
grant all on public.point_ledger to service_role;
alter table public.point_ledger enable row level security;

create index idx_point_ledger_user on public.point_ledger(edition_id, user_id);

-- Índice único parcial: evita duplicidade de pontos ao reaprovar o mesmo registro/missão/checkin.
create unique index uq_point_ledger_source
  on public.point_ledger (source_table, source_id, kind)
  where source_id is not null and kind not in ('ajuste', 'penalidade');

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  edition_id uuid references public.editions(id) on delete set null,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create index idx_audit_logs_entity on public.audit_logs(entity_table, entity_id);
create index idx_audit_logs_edition on public.audit_logs(edition_id, created_at desc);

create table public.conduct_incidents (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid references public.activity_records(id) on delete set null,
  incident_type public.incident_type not null,
  measure public.incident_measure not null,
  points_delta numeric not null default 0,
  description text,
  reason text not null,
  decided_by uuid not null references auth.users(id),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.conduct_incidents to authenticated;
grant all on public.conduct_incidents to service_role;
alter table public.conduct_incidents enable row level security;

create index idx_conduct_incidents_user on public.conduct_incidents(edition_id, user_id);

create table public.weekly_bonuses (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  reason text not null,
  points numeric not null,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (edition_id, user_id, week_start, reason)
);

grant select, insert, update, delete on public.weekly_bonuses to authenticated;
grant all on public.weekly_bonuses to service_role;
alter table public.weekly_bonuses enable row level security;
