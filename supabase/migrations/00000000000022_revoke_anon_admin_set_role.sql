-- admin_set_role (migration 021) nasceu com o grant implícito de PUBLIC do
-- Postgres para função nova, incluindo anon. A função já se protege por
-- dentro (raise exception se not is_admin()), mas o padrão deste projeto é
-- não deixar anon nem tentar chamar RPC sensível — mesma linha da migration
-- 018.
revoke execute on function public.admin_set_role(uuid, public.app_role) from anon, public;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
