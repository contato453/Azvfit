-- Hardening pós-advisors: por padrão o Postgres concede EXECUTE a PUBLIC (o que
-- inclui o papel `anon`) em toda função nova. Revoga esse acesso implícito e deixa
-- só as concessões explícitas a `authenticated` feitas nas migrations anteriores.
-- Funções internas (triggers e helpers como log_audit) ficam sem nenhuma concessão
-- de EXECUTE — continuam funcionando via trigger ou chamadas internas de outra
-- função SECURITY DEFINER, que roda com o privilégio do dono, não do chamador.

revoke execute on all functions in schema public from public;
alter default privileges in schema public revoke execute on functions from public;

-- Corrige o único trigger function sem search_path fixo apontado pelo advisor.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
