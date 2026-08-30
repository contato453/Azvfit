-- O provisionamento do Supabase concede privilégios padrão a `anon` para todo
-- objeto novo criado pelo papel `postgres`. Isso não vaza dados via REST porque
-- toda tabela do AZVFIT tem RLS habilitada com policies restritas a
-- `authenticated`, mas as funções SECURITY DEFINER do motor de pontuação
-- ignoram RLS por definição — a única barreira delas é a checagem de
-- auth.uid()/papel dentro do próprio corpo, que já existe em todas elas. Ainda
-- assim, revoga explicitamente o acesso de `anon` às tabelas e funções do
-- AZVFIT (não há uso legítimo por usuário anônimo: cadastro público é
-- desativado). Escopo limitado às tabelas/funções desta feature — não mexe em
-- objetos pré-existentes de outros projetos que compartilham este banco.
revoke all on
  public.profiles, public.user_roles, public.editions, public.activity_categories,
  public.activities, public.settings, public.edition_participants, public.regulation_acceptances,
  public.activity_records, public.evidences, public.record_reviews,
  public.point_ledger, public.audit_logs, public.conduct_incidents, public.weekly_bonuses,
  public.missions, public.mission_participations, public.totalpass_checkins,
  public.events, public.event_stations, public.health_passport, public.announcements, public.notifications,
  public.ranking_publications, public.ranking_entries, public.awards
from anon;

revoke execute on function
  public.has_role(uuid, public.app_role), public.is_admin(), public.is_staff(),
  public.is_comissao_of(uuid), public.is_active_user(),
  public.recalc_participant_points(uuid, uuid),
  public.review_activity_record(uuid, text, text, numeric, jsonb),
  public.review_mission_participation(uuid, text, text, numeric, jsonb),
  public.review_totalpass_checkin(uuid, text, text, jsonb),
  public.recalc_totalpass_bonus(uuid, uuid),
  public.apply_manual_adjustment(uuid, uuid, numeric, text, jsonb),
  public.register_conduct_incident(uuid, uuid, uuid, public.incident_type, public.incident_measure, text, numeric, text, jsonb),
  public.compute_ranking(uuid),
  public.publish_ranking(uuid, text, text, date, date),
  public.cancel_ranking_publication(uuid, text),
  public.day_fit_config(uuid),
  public.sync_passport_points(uuid, uuid),
  public.passport_checkin(uuid, text, text, uuid),
  public.passport_checkin_code(uuid, text),
  public.staff_passport_action(uuid, uuid, text, text),
  public.station_codes(uuid),
  public.publish_announcement(uuid),
  public.expire_evidences(uuid, integer),
  public.set_updated_at(), public.audit_row_change(), public.log_audit(text, uuid, text, uuid, jsonb, jsonb, text, jsonb),
  public.handle_new_user(), public.enroll_on_regulation_acceptance(), public.validate_activity_record()
from anon;
