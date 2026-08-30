-- Módulos: missões, TotalPass, Day Fit, comunicados

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  category_id uuid references public.activity_categories(id) on delete set null,
  title text not null,
  description text,
  points numeric not null,
  mission_type public.mission_type not null default 'extra',
  starts_at_ts timestamptz,
  ends_at_ts timestamptz,
  requires_evidence boolean not null default true,
  evidence_type text,
  max_participations integer not null default 1,
  audience jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho',
  publish_at timestamptz,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missions_points_range check (points between 0 and 100)
);

grant select, insert, update, delete on public.missions to authenticated;
grant all on public.missions to service_role;
alter table public.missions enable row level security;

create index idx_missions_edition on public.missions(edition_id, is_published);

create table public.mission_participations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.record_status not null default 'rascunho',
  points_awarded numeric,
  notes text,
  truth_declared boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.mission_participations to authenticated;
grant all on public.mission_participations to service_role;
alter table public.mission_participations enable row level security;

create index idx_mission_participations_user on public.mission_participations(user_id, mission_id);
create index idx_mission_participations_mission on public.mission_participations(mission_id, status);

create table public.totalpass_checkins (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  gym_name text,
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

grant select, insert, update, delete on public.totalpass_checkins to authenticated;
grant all on public.totalpass_checkins to service_role;
alter table public.totalpass_checkins enable row level security;

create index idx_totalpass_checkins_user on public.totalpass_checkins(user_id, edition_id);
create index idx_totalpass_checkins_status on public.totalpass_checkins(edition_id, status);

-- Agora que mission_participations e totalpass_checkins existem, liga as FKs de evidences.
alter table public.evidences
  add constraint evidences_mission_participation_fk
    foreign key (mission_participation_id) references public.mission_participations(id) on delete cascade,
  add constraint evidences_totalpass_checkin_fk
    foreign key (totalpass_checkin_id) references public.totalpass_checkins(id) on delete cascade;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  name text not null,
  event_type text not null default 'day_fit',
  event_date date,
  start_time time,
  end_time time,
  location text,
  is_published boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

create table public.event_stations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  location text,
  points numeric not null default 1,
  start_time time,
  duration_minutes integer,
  station_code text not null,
  qr_token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, station_code)
);

grant select, insert, update, delete on public.event_stations to authenticated;
grant all on public.event_stations to service_role;
alter table public.event_stations enable row level security;

create table public.health_passport (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id uuid not null references public.event_stations(id) on delete cascade,
  stamped_by uuid references auth.users(id),
  stamped_at timestamptz not null default now(),
  status text not null default 'valido',
  points_awarded numeric not null default 0,
  method text not null default 'qrcode',
  reason text,
  corrected_by uuid references auth.users(id),
  corrected_at timestamptz,
  unique (user_id, station_id)
);

grant select, insert, update, delete on public.health_passport to authenticated;
grant all on public.health_passport to service_role;
alter table public.health_passport enable row level security;

create index idx_health_passport_user on public.health_passport(edition_id, user_id);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  body text not null,
  publish_at timestamptz,
  status text not null default 'rascunho',
  notify_participants boolean not null default true,
  notified_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edition_id uuid references public.editions(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create index idx_notifications_user on public.notifications(user_id, read_at);
