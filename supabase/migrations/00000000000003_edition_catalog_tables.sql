-- Edição e catálogo

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  status public.edition_status not null default 'planejamento',
  start_date date,
  scoring_end_date date,
  day_fit_date date,
  awards_date date,
  regulation text,
  participation_term text,
  show_ranking boolean not null default false,
  scoring_config jsonb not null default '{}'::jsonb,
  tiebreaker_config jsonb not null default '{}'::jsonb,
  is_current boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.editions to authenticated;
grant all on public.editions to service_role;
alter table public.editions enable row level security;

-- Garante no máximo uma edição corrente por vez.
create unique index uq_editions_current on public.editions (is_current) where is_current;

create table public.activity_categories (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (edition_id, slug)
);

grant select, insert, update, delete on public.activity_categories to authenticated;
grant all on public.activity_categories to service_role;
alter table public.activity_categories enable row level security;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  category_id uuid not null references public.activity_categories(id) on delete cascade,
  name text not null,
  description text,
  base_points numeric not null default 0,
  points_per_unit numeric,
  max_per_day integer,
  max_per_week integer,
  max_total integer,
  requires_evidence boolean not null default true,
  is_active boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;

create index idx_activities_edition on public.activities(edition_id);
create index idx_activities_category on public.activities(category_id);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.editions(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, key)
);

grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;

create table public.edition_participants (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team text,
  is_active boolean not null default true,
  total_points numeric not null default 0,
  is_disqualified boolean not null default false,
  disqualified_reason text,
  disqualified_at timestamptz,
  disqualified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition_id, user_id)
);

grant select, insert, update, delete on public.edition_participants to authenticated;
grant all on public.edition_participants to service_role;
alter table public.edition_participants enable row level security;

create index idx_edition_participants_edition on public.edition_participants(edition_id);
create index idx_edition_participants_user on public.edition_participants(user_id);

create table public.regulation_acceptances (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  version text not null default '1.0',
  voluntary_confirmed boolean not null default false,
  terms_accepted boolean not null default false,
  privacy_accepted boolean not null default false,
  privacy_version text not null default '1.0',
  unique (edition_id, user_id)
);

grant select, insert, update, delete on public.regulation_acceptances to authenticated;
grant all on public.regulation_acceptances to service_role;
alter table public.regulation_acceptances enable row level security;
