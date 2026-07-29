-- =============================================================================
-- 059 — Optimisation RLS : wrapping InitPlan des fonctions de workspace
-- Audit de performance KREDO, Lot 1 — cf. docs/AUDIT-PERFORMANCE-KREDO.md
-- =============================================================================
-- CE QUI A ÉTÉ FAIT
--   210 policies RLS réécrites : `private.current_workspace_id()` devient
--   `(select private.current_workspace_id())` (idem `private.is_workspace_admin()`),
--   dans USING comme dans WITH CHECK. Forme recommandée par Supabase : elle force
--   un InitPlan, donc un seul appel de fonction par requête au lieu d'une
--   réévaluation possible par ligne sur les nœuds de type Filter.
--
-- ⚠️ HONNÊTETÉ SUR LE GAIN — À LIRE AVANT DE CITER CETTE MIGRATION
--   La justification initiale de l'audit était que les 689 232 scans séquentiels
--   sur `profiles` (table à 1 ligne) venaient d'une réévaluation par ligne.
--   **C'est FAUX, et la mesure l'a démontré.** Avant migration, le plan de
--   `select * from companies where lifecycle_status = ...` montrait déjà
--   `Index Cond: (workspace_id = private.current_workspace_id())` : PostgreSQL
--   traitait déjà la fonction STABLE comme une expression évaluée une seule fois
--   au démarrage du scan.
--
--   Mesure A/B sur `v_crm_account_list` (la requête réellement lente, 341 appels,
--   90 ms de moyenne historique), cache chaud, session authentifiée réelle :
--       non wrappé : 53,58 ms
--       wrappé     : 53,35 ms
--   → **aucun gain mesurable.** Les 689k scans sur `profiles` reflètent le NOMBRE
--   de requêtes (dominé par les 535 001 évaluations RLS du polling WAL Realtime),
--   pas un coût par ligne. La vraie cible est donc le Lot 2, pas ce lot-ci.
--
--   Cette migration est néanmoins conservée : elle est sémantiquement neutre,
--   sans coût mesuré, et protège les nœuds où le prédicat tombe en `Filter` et
--   non en `Index Cond` (cas réellement présent dans le plan de
--   `v_crm_account_list` avant migration : `SubPlan 4 → Filter:
--   (private.current_workspace_id() = workspace_id)` sur ai_intelligence_results).
--   Le bénéfice est donc structurel et croîtra avec le volume, il n'est pas
--   observable au volume actuel (96 comptes, 642 contacts).
--
--   Effet de bord constaté, sans conséquence ici : sur `companies`, le
--   planificateur passe d'un Index Scan à un Seq Scan. Ce n'est PAS une
--   régression — sur 96 lignes il estime le Seq Scan moins coûteux (41 buffers
--   contre 44) et il a raison. À revérifier si la table dépasse ~10k lignes.
--
-- SÉMANTIQUE : inchangée. `(select f())` et `f()` renvoient la même valeur pour
--   une fonction STABLE ; seul le moment de l'évaluation change.
--
-- MÉTHODE : ALTER POLICY, jamais DROP + CREATE. Aucune fenêtre pendant laquelle
--   une table serait sans policy ; rôles / cmd / permissive préservés par
--   construction (ALTER POLICY ne peut pas les modifier).
--
-- IDEMPOTENCE : la garde `not like '%SELECT private.<fn>()%'` exclut les policies
--   déjà wrappées (16 en USING, 7 en WITH CHECK l'étaient avant cette migration,
--   posées par une migration antérieure). Réexécutable sans double wrapping.
--
-- TEST NÉGATIF D'ISOLATION (dry-run ROLLBACK puis revérifié après application,
-- en session `authenticated` réelle) — comptages strictement identiques :
--     utilisateur réel    : companies 96 · contacts 642 · opportunities 24 ·
--                           missions 23 · collaborator_compensation 23 ·
--                           financial_models 12 · account_signals 750
--     utilisateur inconnu : 0 sur toutes ces tables
-- =============================================================================

do $$
declare
  r record;
  n_altered int := 0;
begin
  for r in
    select
      p.tablename,
      p.policyname,
      case when p.qual is not null then
        replace(replace(p.qual,
          'private.current_workspace_id()', '(select private.current_workspace_id())'),
          'private.is_workspace_admin()',   '(select private.is_workspace_admin())')
      end as new_qual,
      case when p.with_check is not null then
        replace(replace(p.with_check,
          'private.current_workspace_id()', '(select private.current_workspace_id())'),
          'private.is_workspace_admin()',   '(select private.is_workspace_admin())')
      end as new_with_check
    from pg_policies p
    where p.schemaname = 'public'
      and (
           (p.qual       like '%private.current_workspace_id()%' and p.qual       not like '%SELECT private.current_workspace_id()%')
        or (p.qual       like '%private.is_workspace_admin()%'   and p.qual       not like '%SELECT private.is_workspace_admin()%')
        or (p.with_check like '%private.current_workspace_id()%' and p.with_check not like '%SELECT private.current_workspace_id()%')
        or (p.with_check like '%private.is_workspace_admin()%'   and p.with_check not like '%SELECT private.is_workspace_admin()%')
      )
  loop
    -- N'émet que les clauses réellement présentes au catalogue : garantit qu'on ne
    -- pose jamais un WITH CHECK sur une policy SELECT/DELETE ni un USING sur un INSERT.
    execute format('ALTER POLICY %I ON public.%I%s%s',
      r.policyname,
      r.tablename,
      case when r.new_qual       is not null then ' USING ('||r.new_qual||')'            else '' end,
      case when r.new_with_check is not null then ' WITH CHECK ('||r.new_with_check||')' else '' end
    );
    n_altered := n_altered + 1;
  end loop;

  raise notice '059_rls_initplan_wrapping — policies modifiees : %', n_altered;

  -- Garde-fou : la migration échoue plutôt que de laisser un état partiel.
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and (
           (qual       like '%private.current_workspace_id()%' and qual       not like '%SELECT private.current_workspace_id()%')
        or (qual       like '%private.is_workspace_admin()%'   and qual       not like '%SELECT private.is_workspace_admin()%')
        or (with_check like '%private.current_workspace_id()%' and with_check not like '%SELECT private.current_workspace_id()%')
        or (with_check like '%private.is_workspace_admin()%'   and with_check not like '%SELECT private.is_workspace_admin()%')
      )
  ) then
    raise exception 'Des policies non wrappees subsistent apres migration';
  end if;
end $$;
