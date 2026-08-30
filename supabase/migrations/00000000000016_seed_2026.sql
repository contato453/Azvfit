-- Seed inicial — edição AZVFIT 2026, catálogo (seção 9) e settings.

do $$
declare
  v_edition_id uuid;
  v_cat_alimentacao uuid;
  v_cat_movimento uuid;
  v_cat_bemestar uuid;
begin
  insert into public.editions (
    name, year, status, start_date, scoring_end_date, day_fit_date, awards_date,
    regulation, participation_term, show_ranking, is_current,
    scoring_config, tiebreaker_config
  ) values (
    'AZVFIT 2026', 2026, 'ativa', date '2026-01-01', date '2026-09-30', null, null,
    'Regulamento oficial do programa AZVFIT 2026 — "AZVD em Equilíbrio". Colaboradores registram atividades diárias com evidência, a comissão organizadora valida e o sistema calcula pontos de forma auditável, gerando um ranking com critérios de desempate e premiações.',
    'A participação no programa é voluntária. Ao aderir, autorizo o uso das informações e evidências enviadas exclusivamente para validação da pontuação do programa interno de qualidade de vida, com acesso restrito à comissão organizadora e à administração. O programa não realiza diagnóstico médico, recomendação clínica ou avaliação de saúde.',
    false, true,
    '{}'::jsonb,
    jsonb_build_object('ordem', jsonb_build_array(
      'total_points', 'approved_activities', 'weekly_frequency',
      'totalpass_checkins', 'extra_missions', 'day_fit_participation'
    ))
  )
  returning id into v_edition_id;

  insert into public.activity_categories (edition_id, name, slug, description, icon, sort_order)
  values (v_edition_id, 'Alimentação', 'alimentacao', 'Hábitos alimentares diários.', 'utensils', 1)
  returning id into v_cat_alimentacao;

  insert into public.activity_categories (edition_id, name, slug, description, icon, sort_order)
  values (v_edition_id, 'Movimento', 'movimento', 'Atividade física do dia a dia.', 'activity', 2)
  returning id into v_cat_movimento;

  insert into public.activity_categories (edition_id, name, slug, description, icon, sort_order)
  values (v_edition_id, 'Bem-estar', 'bem-estar', 'Saúde mental e ergonomia.', 'heart-pulse', 3)
  returning id into v_cat_bemestar;

  -- Alimentação — 1 ponto cada (exceto substituição), limite 1x/dia, foto obrigatória.
  insert into public.activities (edition_id, category_id, name, description, base_points, max_per_day, requires_evidence)
  values
    (v_edition_id, v_cat_alimentacao, 'Café da manhã saudável', 'Registre com foto.', 1, 1, true),
    (v_edition_id, v_cat_alimentacao, 'Consumir fruta', 'Registre com foto.', 1, 1, true),
    (v_edition_id, v_cat_alimentacao, 'Refeição com legumes/salada', 'Registre com foto.', 1, 1, true),
    (v_edition_id, v_cat_alimentacao, 'Lanche saudável', 'Registre com foto.', 1, 1, true),
    (v_edition_id, v_cat_alimentacao, 'Meta de hidratação do dia (2 L)', 'Foto da garrafa ou do app de hidratação.', 1, 1, true),
    (v_edition_id, v_cat_alimentacao, 'Substituir refrigerante por água/suco natural', 'Registre com foto.', 2, 1, true);

  -- Movimento — máximo 1 atividade por dia na categoria (aplicado via trigger validate_activity_record).
  insert into public.activities (edition_id, category_id, name, description, base_points, requires_evidence)
  values
    (v_edition_id, v_cat_movimento, 'Caminhada', 'Mínimo 30 minutos. Print de app/relógio.', 2, true),
    (v_edition_id, v_cat_movimento, 'Corrida', 'Mínimo 20 minutos. Print de app/relógio.', 2, true),
    (v_edition_id, v_cat_movimento, 'Academia/treino de força', 'Mínimo 30 minutos. Registro TotalPass/app/foto.', 2, true),
    (v_edition_id, v_cat_movimento, 'Bicicleta', 'Mínimo 30 minutos. Print de app/relógio.', 2, true),
    (v_edition_id, v_cat_movimento, 'Treino funcional', 'Mínimo 20 minutos. Registro/foto.', 2, true),
    (v_edition_id, v_cat_movimento, 'Jump', 'Mínimo 20 minutos. Foto/vídeo/registro.', 2, true),
    (v_edition_id, v_cat_movimento, 'Yoga/Pilates', 'Mínimo 20 minutos. Foto ou app.', 2, true),
    (v_edition_id, v_cat_movimento, 'Dança', 'Registre com foto ou print de app.', 4, true),
    (v_edition_id, v_cat_movimento, 'Alongamento/mobilidade', 'Mínimo 15 minutos. Foto/registro.', 1, true);

  -- Bem-estar — 1 ponto cada, máximo 1 atividade por dia na categoria.
  insert into public.activities (edition_id, category_id, name, description, base_points, requires_evidence)
  values
    (v_edition_id, v_cat_bemestar, 'Leitura', 'Pelo menos 20 minutos. Foto do livro.', 1, true),
    (v_edition_id, v_cat_bemestar, 'Prática de respiração/relaxamento', 'Mínimo 5 minutos. Declaração/registro.', 1, true),
    (v_edition_id, v_cat_bemestar, 'Pausa consciente ou alongamento no expediente', 'Registro.', 1, true),
    (v_edition_id, v_cat_bemestar, 'Organização da estação de trabalho', 'Foto antes e depois.', 1, true);

  insert into public.settings (edition_id, key, value, description, is_public) values
    (v_edition_id, 'movimento_principal_max_por_dia', jsonb_build_object('max_por_dia', 1), 'Limite diário de registros nas categorias movimento e bem-estar.', true),
    (v_edition_id, 'missao_pontos_faixa', jsonb_build_object('min', 3, 'max', 10), 'Faixa de pontuação permitida ao criar missões.', true),
    (v_edition_id, 'totalpass_bonus', jsonb_build_object('checkins_por_semana', 3, 'pontos_por_semana', 2, 'maximo_total', 8), 'Regra de bônus semanal do TotalPass.', true),
    (v_edition_id, 'day_fit_config', jsonb_build_object('pontos_por_estacao', 1, 'bonus_passaporte_completo', 5, 'sorteio_exige_passaporte_completo', true), 'Configuração do Day Fit e do Passaporte da Saúde.', true),
    (v_edition_id, 'privacidade.anonimizar_ranking', to_jsonb(false), 'Se true, exibe apenas iniciais no ranking.', true),
    (v_edition_id, 'privacidade.retencao_evidencias_dias', to_jsonb(180), 'Dias de retenção das evidências antes do expurgo.', false);
end $$;
