-- Correctif de la migration precedente (digest_thematique_ingest_source_corpus_scope_kind).
--
-- Le DROP + CREATE a fait heriter la nouvelle fonction des DEFAULT PRIVILEGES du
-- schema public, qui accordent EXECUTE a `anon`. La version precedente de
-- `ingest_source_corpus` ne l'accordait PAS (proacl mesure avant migration :
-- {postgres, authenticated, service_role}).
--
-- `revoke ... from public` ne retire rien a `anon`, qui detient le droit en propre.
-- Il faut le revoquer nommement — meme faille et meme correctif que
-- 20260818092506_harden_get_manager_summary_facts_privileges.
--
-- La fonction est SECURITY DEFINER : son corps appelle bien
-- private.require_authenticated_user() en premiere instruction, donc un appel anonyme
-- levait deja une exception. On ne compte pas sur cette seconde serrure pour
-- justifier une porte ouverte.

revoke execute on function public.ingest_source_corpus(jsonb, text, text, public.corpus_scope_kind) from anon;
