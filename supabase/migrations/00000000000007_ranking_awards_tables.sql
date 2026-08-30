-- Ranking e premiação

create table public.ranking_publications (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  title text not null,
  notes text,
  period_start date,
  period_end date,
  status text not null default 'publicado',
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  canceled_at timestamptz,
  canceled_by uuid references auth.users(id),
  cancel_reason text,
  constraint ranking_publications_status_check check (status in ('publicado', 'cancelado'))
);

grant select, insert, update, delete on public.ranking_publications to authenticated;
grant all on public.ranking_publications to service_role;
alter table public.ranking_publications enable row level security;

create index idx_ranking_publications_edition on public.ranking_publications(edition_id, status);

create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.ranking_publications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_name text not null,
  position integer not null,
  total_points numeric not null default 0,
  approved_activities integer not null default 0,
  weekly_frequency integer not null default 0,
  totalpass_checkins integer not null default 0,
  extra_missions integer not null default 0,
  day_fit_participation boolean not null default false,
  tiebreak_note text,
  unique (publication_id, user_id)
);

grant select, insert, update, delete on public.ranking_entries to authenticated;
grant all on public.ranking_entries to service_role;
alter table public.ranking_entries enable row level security;

create index idx_ranking_entries_publication on public.ranking_entries(publication_id, position);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions(id) on delete cascade,
  title text not null,
  description text,
  criteria text,
  category_slug text not null,
  position integer,
  prize_amount numeric,
  prize_note text,
  winner_user_id uuid references auth.users(id),
  is_published boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.awards to authenticated;
grant all on public.awards to service_role;
alter table public.awards enable row level security;

create index idx_awards_edition on public.awards(edition_id);
