-- Advisor de sécurité a révélé que reap_stale_intelligence_runs (ops-004) est
-- exécutable par anon ET authenticated via /rest/v1/rpc/ — contradiction avec
-- l'intention documentée ("EXECUTE réservé service_role", Session 22). Le
-- GRANT PUBLIC par défaut de Postgres n'avait jamais été révoqué à l'origine.
-- Resserré ici car la fonction vient d'être étendue (Lot 0 monitoring IA) —
-- ne change rien au cron (exécuté en tant que postgres, non affecté par les
-- révocations de rôle applicatif).
revoke execute on function public.reap_stale_intelligence_runs(integer, integer) from public;
revoke execute on function public.reap_stale_intelligence_runs(integer, integer) from anon;
revoke execute on function public.reap_stale_intelligence_runs(integer, integer) from authenticated;
grant execute on function public.reap_stale_intelligence_runs(integer, integer) to service_role;
