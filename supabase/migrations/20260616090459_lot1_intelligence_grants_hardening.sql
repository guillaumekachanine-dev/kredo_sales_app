-- Lot 1 — durcissement explicite des grants API
-- Les tables intelligence restent lisibles pour authenticated sous RLS,
-- mais ne doivent pas être accessibles à anon.

BEGIN;

REVOKE ALL ON public.intelligence_sources FROM anon, public;
REVOKE ALL ON public.enrichment_proposals FROM anon, public;
REVOKE ALL ON public.account_facts FROM anon, public;
REVOKE ALL ON public.account_signals FROM anon, public;
REVOKE ALL ON public.intelligence_source_links FROM anon, public;

GRANT SELECT ON public.intelligence_sources TO authenticated;
GRANT SELECT ON public.enrichment_proposals TO authenticated;
GRANT SELECT ON public.account_facts TO authenticated;
GRANT SELECT ON public.account_signals TO authenticated;
GRANT SELECT ON public.intelligence_source_links TO authenticated;

GRANT ALL ON public.intelligence_sources TO service_role;
GRANT ALL ON public.enrichment_proposals TO service_role;
GRANT ALL ON public.account_facts TO service_role;
GRANT ALL ON public.account_signals TO service_role;
GRANT ALL ON public.intelligence_source_links TO service_role;

COMMIT;
