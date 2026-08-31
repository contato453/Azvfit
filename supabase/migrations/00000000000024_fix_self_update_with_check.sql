-- Bug real encontrado testando ao vivo: "Não foi possível salvar o
-- registro" / "Não foi possível enviar o check-in" em TODO envio de
-- atividade, missão ou check-in TotalPass — 100% reproduzível, não é
-- intermitente.
--
-- Causa: as políticas de UPDATE de activity_records, mission_participations
-- e totalpass_checkins só têm cláusula USING, sem WITH CHECK explícito.
-- Quando o Postgres não recebe WITH CHECK numa policy de UPDATE, ele reusa
-- a MESMA expressão do USING para validar a linha NOVA também — não só a
-- linha antiga. A USING existente é
--   (user_id = auth.uid() and status in ('rascunho','correcao_solicitada'))
--   or <staff>
-- que é exatamente certa pra decidir quais linhas o usuário pode tentar
-- editar (só rascunho/correção). Mas o fluxo de envio é: grava rascunho →
-- sobe evidência → UPDATE status = 'enviado'. Essa última atualização faz
-- a linha NOVA ter status 'enviado', que não está mais em
-- ('rascunho','correcao_solicitada') — falha contra a própria política que
-- deveria estar liberando a transição, e o Postgres devolve "new row
-- violates row-level security policy" pra os 3 fluxos, sempre, em toda
-- tentativa de envio.
--
-- Fix: WITH CHECK próprio, permitindo status também poder virar 'enviado'
-- na transição feita pelo próprio dono. As mudanças de status pra
-- aprovado/recusado/em_analise continuam só pelas funções SECURITY DEFINER
-- (review_activity_record etc.), que rodam como owner e não passam por
-- esta policy — aqui só habilita o auto-envio do colaborador.
alter policy records_self_update_editable on public.activity_records
  with check (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada', 'enviado'))
    or public.is_comissao_of(edition_id)
  );

alter policy totalpass_checkins_self_update on public.totalpass_checkins
  with check (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada', 'enviado'))
    or public.is_comissao_of(edition_id)
  );

alter policy mission_participations_self_update on public.mission_participations
  with check (
    (user_id = auth.uid() and status in ('rascunho', 'correcao_solicitada', 'enviado'))
    or public.is_staff()
  );
