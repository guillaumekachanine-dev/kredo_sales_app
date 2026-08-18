-- Durcissement de get_manager_summary_facts (ADR-0020 §5.1 / action item 9).
--
-- Découvert le 2026-08-18 en préparant ADR-0020 : cette fonction est SECURITY DEFINER,
-- sans search_path fixé, et EXECUTE était accordé à anon/authenticated/PUBLIC en plus de
-- service_role. Elle prend p_workspace_id en paramètre et filtre dessus sans jamais
-- vérifier que l'appelant y appartient — hors RLS, par construction SECURITY DEFINER.
-- Un appelant porteur de la seule clé anon publique pouvait donc lire des données
-- métier (RDV, top clients, candidats, opportunités) de n'importe quel workspace en
-- passant un p_workspace_id arbitraire.
--
-- Seul appelant légitime en base : src/app/api/reports/manager-summary/trigger/route.ts,
-- via le client service-role (SUPABASE_SERVICE_ROLE_KEY, jamais exposée au navigateur).
-- Le workflow n8n report-manager-summary ne l'appelle jamais — il attend que Next.js ait
-- déjà assemblé les faits (cf. commentaire du nœud "Validate Brief").
--
-- Corps déjà entièrement qualifié `public.*` (calendar_events, companies, opportunities,
-- opportunity_candidates, skills, opportunity_skills, candidates, persons,
-- offer_practices, candidate_hiring_milestones, candidate_hiring_processes) :
-- search_path = '' est donc sans effet sur le résultat.
--
-- Contre-exemple déjà correct dans le repo : get_workspace_diagnostic_context
-- (SECURITY DEFINER + search_path = '' + EXECUTE révoqué à anon/authenticated).

revoke execute on function public.get_manager_summary_facts(uuid, uuid, date, date)
  from public, anon, authenticated;

alter function public.get_manager_summary_facts(uuid, uuid, date, date)
  set search_path = '';

comment on function public.get_manager_summary_facts(uuid, uuid, date, date) is
  'SECURITY DEFINER — EXECUTE réservé à service_role. Appelée uniquement par '
  'src/app/api/reports/manager-summary/trigger/route.ts via le client service-role. '
  'Ne jamais accorder EXECUTE à anon/authenticated : la fonction ne vérifie pas '
  'l''appartenance de l''appelant à p_workspace_id (ADR-0020 action item 9).';
