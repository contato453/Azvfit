-- AZVFIT — enums de domínio
-- Reconstruído a partir da documentação técnica (seção 5.1), sem qualquer
-- vínculo com o Lovable. Projeto Supabase dedicado ao AZVFIT.

create type public.app_role as enum ('admin', 'comissao', 'colaborador');

create type public.edition_status as enum (
  'planejamento',
  'inscricoes',
  'ativa',
  'auditoria',
  'encerrada',
  'arquivada'
);

create type public.record_status as enum (
  'rascunho',
  'enviado',
  'em_analise',
  'correcao_solicitada',
  'aprovado',
  'recusado',
  'cancelado'
);

create type public.ledger_kind as enum (
  'registro',
  'missao',
  'totalpass',
  'bonus',
  'ajuste',
  'penalidade'
);

create type public.mission_type as enum ('extra', 'semanal', 'surpresa');

create type public.incident_type as enum (
  'evidencia_reutilizada',
  'evidencia_invalida',
  'fora_do_periodo',
  'informacoes_inconsistentes',
  'pontuacao_indevida'
);

create type public.incident_measure as enum (
  'advertencia',
  'desconsideracao',
  'perda_pontos',
  'desclassificacao'
);
