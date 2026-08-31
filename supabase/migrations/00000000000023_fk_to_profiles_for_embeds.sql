-- Bug real encontrado em revisão: telas do admin (validação, participantes,
-- relatórios, auditoria) usam PostgREST embed (`.select('*, profiles(...)')`)
-- pra trazer nome/e-mail junto do registro. Isso só funciona se existir uma
-- FK direta da tabela pra public.profiles — mas activity_records,
-- mission_participations, totalpass_checkins, edition_participants e
-- audit_logs só tinham FK pra auth.users(id) (schema que o PostgREST nem
-- expõe). Resultado: PostgREST não acha o relacionamento e a query inteira
-- falha em runtime (erro PGRST200) — fila de validação, participantes,
-- relatórios e auditoria ficavam com a tela em branco/erro, mesmo com o
-- resto do sistema funcionando.
--
-- Fix: adiciona uma segunda FK nessas colunas apontando pra public.profiles(id),
-- sem tirar a FK existente pra auth.users(id). profiles.id sempre é um
-- subconjunto válido de auth.users.id (toda linha nova em auth.users ganha
-- profile via handle_new_user), então a nova FK nunca quebra dado existente
-- — só habilita o PostgREST a resolver o embed.
alter table public.activity_records
  add constraint activity_records_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.mission_participations
  add constraint mission_participations_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.totalpass_checkins
  add constraint totalpass_checkins_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.edition_participants
  add constraint edition_participants_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.audit_logs
  add constraint audit_logs_actor_id_profiles_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;
