-- Lot 2 — durcissement des grants sur les tables Intelligence
-- Les écritures utilisateur passent uniquement par les RPC contrôlées.

BEGIN;

REVOKE ALL ON TABLE public.intelligence_sources FROM anon, authenticated;
REVOKE ALL ON TABLE public.enrichment_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_facts FROM anon, authenticated;
REVOKE ALL ON TABLE public.account_signals FROM anon, authenticated;
REVOKE ALL ON TABLE public.intelligence_source_links FROM anon, authenticated;

GRANT SELECT ON TABLE public.intelligence_sources TO authenticated;
GRANT SELECT ON TABLE public.enrichment_proposals TO authenticated;
GRANT SELECT ON TABLE public.account_facts TO authenticated;
GRANT SELECT ON TABLE public.account_signals TO authenticated;
GRANT SELECT ON TABLE public.intelligence_source_links TO authenticated;

COMMIT;
