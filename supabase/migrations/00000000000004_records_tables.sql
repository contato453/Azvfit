-- Registros e evidências

create table public.activity_records (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  activity_time time,
  quantity numeric not null default 1,
  notes text,
  status public.record_status not null default 'rascunho',
  points_awarded numeric,
  truth_declared boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.activity_records to authenticated;
grant all on public.activity_records to service_role;
alter table public.activity_records enable row level security;

create index idx_activity_records_user on public.activity_records(user_id, edition_id);
create index idx_activity_records_status on public.activity_records(edition_id, status);
create index idx_activity_records_activity on public.activity_records(activity_id);
create index idx_activity_records_date on public.activity_records(user_id, activity_date);

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  record_id uuid references public.activity_records(id) on delete cascade,
  mission_participation_id uuid,
  totalpass_checkin_id uuid,
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  file_hash text,
  created_at timestamptz not null default now(),
  constraint evidences_one_owner_check check (
    (
      (record_id is not null)::int +
      (mission_participation_id is not null)::int +
      (totalpass_checkin_id is not null)::int
    ) = 1
  )
);

grant select, insert, update, delete on public.evidences to authenticated;
grant all on public.evidences to service_role;
alter table public.evidences enable row level security;

create index idx_evidences_user on public.evidences(user_id);
create index idx_evidences_record on public.evidences(record_id);
create index idx_evidences_hash on public.evidences(user_id, file_hash);

-- Tabela de revisões, reaproveitada para activity_records, mission_participations
-- e totalpass_checkins (mesmo padrão de aprovar/recusar/ajustar). record_id é
-- polimórfico — resolvido junto com source_table, sem FK travada em uma única tabela.
create table public.record_reviews (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null,
  source_table text not null,
  reviewer_id uuid not null references auth.users(id),
  action text not null,
  from_status public.record_status,
  to_status public.record_status,
  points_before numeric,
  points_after numeric,
  reason text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.record_reviews to authenticated;
grant all on public.record_reviews to service_role;
alter table public.record_reviews enable row level security;

create index idx_record_reviews_record on public.record_reviews(source_table, record_id);
