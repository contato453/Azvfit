-- Políticas de RLS — seção 6.1 da documentação.
-- Padrão geral: colaborador enxerga o que é seu; comissão/admin (is_staff / is_comissao_of)
-- enxergam e operam tudo dentro da edição; escrita sensível é feita via funções SECURITY DEFINER.

-- profiles: cada um vê e edita o próprio perfil; staff vê todos.
create policy profiles_self_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- user_roles: leitura própria + staff; escrita só admin.
create policy user_roles_self_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy user_roles_admin_write on public.user_roles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- editions: leitura para autenticados; escrita para admin.
create policy editions_read on public.editions for select to authenticated using (true);
create policy editions_admin_write on public.editions for insert to authenticated with check (public.is_admin());
create policy editions_admin_update on public.editions for update to authenticated using (public.is_admin());
create policy editions_admin_delete on public.editions for delete to authenticated using (public.is_admin());

-- activity_categories / activities: leitura para autenticados; escrita para admin.
create policy activity_categories_read on public.activity_categories for select to authenticated using (true);
create policy activity_categories_admin_write on public.activity_categories for insert to authenticated with check (public.is_admin());
create policy activity_categories_admin_update on public.activity_categories for update to authenticated using (public.is_admin());
create policy activity_categories_admin_delete on public.activity_categories for delete to authenticated using (public.is_admin());

create policy activities_read on public.activities for select to authenticated using (true);
create policy activities_admin_write on public.activities for insert to authenticated with check (public.is_admin());
create policy activities_admin_update on public.activities for update to authenticated using (public.is_admin());
create policy activities_admin_delete on public.activities for delete to authenticated using (public.is_admin());

-- settings: públicas (is_public) legíveis por todos autenticados; staff vê tudo; escrita admin.
create policy settings_read on public.settings for select to authenticated
  using (is_public or public.is_staff());
create policy settings_admin_write on public.settings for insert to authenticated with check (public.is_admin());
create policy settings_admin_update on public.settings for update to authenticated using (public.is_admin());
create policy settings_admin_delete on public.settings for delete to authenticated using (public.is_admin());

-- edition_participants: próprio vê a si mesmo; staff vê todos da edição; escrita via triggers/staff.
create policy edition_participants_select on public.edition_participants for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy edition_participants_staff_write on public.edition_participants for insert to authenticated
  with check (public.is_comissao_of(edition_id));
create policy edition_participants_staff_update on public.edition_participants for update to authenticated
  using (public.is_comissao_of(edition_id));
create policy edition_participants_admin_delete on public.edition_participants for delete to authenticated
  using (public.is_admin());

-- regulation_acceptances: só o próprio insere/lê; staff lê tudo.
create policy regulation_acceptances_self_select on public.regulation_acceptances for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy regulation_acceptances_self_insert on public.regulation_acceptances for insert to authenticated
  with check (user_id = auth.uid());

-- activity_records: self read/insert; self update/delete só em rascunho/correção; staff tudo.
create policy records_self_read on public.activity_records for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy records_self_insert on public.activity_records for insert to authenticated
  with check (user_id = auth.uid());
create policy records_self_update_editable on public.activity_records for update to authenticated
  using (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada'))
    or public.is_comissao_of(edition_id)
  );
create policy records_self_delete_draft on public.activity_records for delete to authenticated
  using (user_id = auth.uid() and status = 'rascunho');
create policy records_admin_delete on public.activity_records for delete to authenticated
  using (public.is_admin());

-- evidences: self read/insert/delete; staff lê tudo.
create policy evidences_self_select on public.evidences for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy evidences_self_insert on public.evidences for insert to authenticated
  with check (user_id = auth.uid());
create policy evidences_self_delete on public.evidences for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- record_reviews: leitura do dono do registro/missão/checkin + staff; escrita só staff.
-- record_id é polimórfico (ver source_table), então checa nas três tabelas de origem.
create policy record_reviews_select on public.record_reviews for select to authenticated
  using (
    public.is_staff()
    or (source_table = 'activity_records' and exists (select 1 from public.activity_records r where r.id = record_id and r.user_id = auth.uid()))
    or (source_table = 'mission_participations' and exists (select 1 from public.mission_participations mp where mp.id = record_id and mp.user_id = auth.uid()))
    or (source_table = 'totalpass_checkins' and exists (select 1 from public.totalpass_checkins t where t.id = record_id and t.user_id = auth.uid()))
  );
create policy record_reviews_staff_insert on public.record_reviews for insert to authenticated
  with check (public.is_staff());

-- point_ledger: leitura própria; staff lê tudo. Escrita apenas via funções SECURITY DEFINER (revogada abaixo).
create policy point_ledger_select on public.point_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));

-- audit_logs: somente staff lê; somente leitura (sem update/delete de ninguém).
create policy audit_logs_staff_select on public.audit_logs for select to authenticated
  using (public.is_staff());
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (true);

-- conduct_incidents: staff lê/escreve; colaborador vê as próprias ocorrências.
create policy conduct_incidents_select on public.conduct_incidents for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy conduct_incidents_staff_write on public.conduct_incidents for insert to authenticated
  with check (public.is_comissao_of(edition_id));
create policy conduct_incidents_staff_update on public.conduct_incidents for update to authenticated
  using (public.is_admin());

-- weekly_bonuses: leitura própria + staff; escrita só via função (comissão pode inserir manualmente também).
create policy weekly_bonuses_select on public.weekly_bonuses for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));

-- missions: leitura pública de missões publicadas dentro da janela; staff vê tudo; escrita staff.
create policy missions_read_published on public.missions for select to authenticated
  using (
    public.is_staff()
    or (is_published and (starts_at_ts is null or now() >= starts_at_ts))
  );
create policy missions_staff_write on public.missions for insert to authenticated with check (public.is_staff());
create policy missions_staff_update on public.missions for update to authenticated using (public.is_staff());
create policy missions_admin_delete on public.missions for delete to authenticated using (public.is_admin());

-- mission_participations: self + staff, mesmo padrão de activity_records.
create policy mission_participations_select on public.mission_participations for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
  );
create policy mission_participations_self_insert on public.mission_participations for insert to authenticated
  with check (user_id = auth.uid());
create policy mission_participations_self_update on public.mission_participations for update to authenticated
  using (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada'))
    or public.is_staff()
  );
create policy mission_participations_self_delete on public.mission_participations for delete to authenticated
  using (user_id = auth.uid() and status = 'rascunho');

-- totalpass_checkins: mesmo padrão.
create policy totalpass_checkins_select on public.totalpass_checkins for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy totalpass_checkins_self_insert on public.totalpass_checkins for insert to authenticated
  with check (user_id = auth.uid());
create policy totalpass_checkins_self_update on public.totalpass_checkins for update to authenticated
  using (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada'))
    or public.is_comissao_of(edition_id)
  );
create policy totalpass_checkins_self_delete on public.totalpass_checkins for delete to authenticated
  using (user_id = auth.uid() and status = 'rascunho');

-- events / event_stations: leitura de eventos publicados para todos; staff vê tudo; escrita staff.
create policy events_read on public.events for select to authenticated
  using (is_published or public.is_staff());
create policy events_staff_write on public.events for insert to authenticated with check (public.is_staff());
create policy events_staff_update on public.events for update to authenticated using (public.is_staff());
create policy events_admin_delete on public.events for delete to authenticated using (public.is_admin());

create policy event_stations_read on public.event_stations for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.events e where e.id = event_id and e.is_published)
  );
create policy event_stations_staff_write on public.event_stations for insert to authenticated with check (public.is_staff());
create policy event_stations_staff_update on public.event_stations for update to authenticated using (public.is_staff());
create policy event_stations_admin_delete on public.event_stations for delete to authenticated using (public.is_admin());

-- health_passport: self + staff.
create policy health_passport_select on public.health_passport for select to authenticated
  using (user_id = auth.uid() or public.is_comissao_of(edition_id));
create policy health_passport_staff_write on public.health_passport for insert to authenticated
  with check (public.is_comissao_of(edition_id) or user_id = auth.uid());
create policy health_passport_staff_update on public.health_passport for update to authenticated
  using (public.is_comissao_of(edition_id));
create policy health_passport_staff_delete on public.health_passport for delete to authenticated
  using (public.is_comissao_of(edition_id));

-- announcements: publicados visíveis a todos; staff vê tudo; escrita staff.
create policy announcements_read on public.announcements for select to authenticated
  using (status = 'publicado' or public.is_staff());
create policy announcements_staff_write on public.announcements for insert to authenticated with check (public.is_staff());
create policy announcements_staff_update on public.announcements for update to authenticated using (public.is_staff());
create policy announcements_admin_delete on public.announcements for delete to authenticated using (public.is_admin());

-- notifications: cada um vê/marca as suas.
create policy notifications_self_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_self_update on public.notifications for update to authenticated
  using (user_id = auth.uid());
create policy notifications_staff_insert on public.notifications for insert to authenticated
  with check (public.is_staff() or user_id = auth.uid());

-- ranking_publications / ranking_entries: colaborador vê publicados; staff vê tudo; escrita staff/admin.
create policy ranking_publications_read on public.ranking_publications for select to authenticated
  using (status = 'publicado' or public.is_comissao_of(edition_id));
create policy ranking_publications_staff_write on public.ranking_publications for insert to authenticated
  with check (public.is_comissao_of(edition_id));
create policy ranking_publications_admin_update on public.ranking_publications for update to authenticated
  using (public.is_admin());

create policy ranking_entries_read on public.ranking_entries for select to authenticated
  using (
    exists (
      select 1 from public.ranking_publications p
      where p.id = publication_id
        and (p.status = 'publicado' or public.is_comissao_of(p.edition_id))
    )
  );
create policy ranking_entries_staff_write on public.ranking_entries for insert to authenticated
  with check (
    exists (select 1 from public.ranking_publications p where p.id = publication_id and public.is_comissao_of(p.edition_id))
  );

-- awards: publicados visíveis a todos; staff vê tudo; escrita admin.
create policy awards_read on public.awards for select to authenticated
  using (is_published or public.is_staff());
create policy awards_admin_write on public.awards for insert to authenticated with check (public.is_admin());
create policy awards_admin_update on public.awards for update to authenticated using (public.is_admin());
create policy awards_admin_delete on public.awards for delete to authenticated using (public.is_admin());

-- Reforço de segurança: revoga INSERT/UPDATE/DELETE diretos em point_ledger para o client.
-- Toda escrita de pontos passa pelas funções SECURITY DEFINER do motor de pontuação.
revoke insert, update, delete on public.point_ledger from authenticated;
revoke update, delete on public.audit_logs from authenticated;
