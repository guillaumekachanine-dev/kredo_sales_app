# ADR-0007 : Moteur d'intelligence commerciale (autonomie vis-à-vis de FOLIO)

**Statut :** Accepté
**Date :** 2026-06-10
**Décideur :** Dosta (porteur du projet)
**Liés :** [0003](ADR-0003-supabase-projet-dedie-schema-unique.md) (schéma unique), [0004](ADR-0004-modele-pivot-opportunite.md) (pivot opportunité), [0006](ADR-0006-strategie-device-adaptive-cible.md) (device adaptive)

## Contexte

KREDO doit internaliser le mécanisme d'analyse de prospection de FOLIO (analyse client, étude sectorielle, diagnostic process, roadmap, pitch) pour devenir **autonome**, sur une base propre et compréhensible.

État réel vérifié (base live `jvzgmhvwirsbdkjpmvla`, juin 2026) :

- **95 comptes** dans `public.companies`. Les colonnes `ai_score` (numeric), `priority` (`basse`/`normale`/`haute`), `next_action_label`, `next_action_at`, `legal_name`, `sector`, `website`, `hq_location`, `description` **existent déjà**.
- **93 comptes** portent `metadata.analysis_data` (**Phase 1** : `identite/positionnement/signaux/contexte_sectoriel/synthese_consultant`, ~5 Ko) + `metadata.legacy_prospect_id`. Import FOLIO déjà fait.
- **Aucune Phase 2** dans KREDO (`has_sector = false` sur 100% des comptes). Les ~81 études sectorielles et 38 pitchs vivent encore dans le **projet Supabase FOLIO `agent_business_analyst`**, atteignables seulement par `service_role` cross-projet via la jointure fragile `clients.source_prospect_id → missions → resultats_phases`.
- Le motif RLS réel de `companies` : `workspace_id default current_workspace_id()`, `owner_id default auth.uid()`, 4 policies `workspace_id = current_workspace_id()` (l'INSERT a bien un `WITH CHECK`).

FOLIO souffre de : 2 projets Supabase pontés par `service_role` (RLS contourné), Phase 1 dupliquée à 3 endroits, statuts incohérents (`review/completed/generated/pending/running/cancelled/error`), triple stockage du contenu (`json/html`), secrets en clair dans des exports n8n. **L'objectif est de reprendre les principes (modèle unifié runs/results, asynchrone, KREDO propriétaire) sans recopier la dette.**

## Décision

### Modèle de données — **3 tables**, domaine `ai_` (pas 5)

- `ai_intelligence_runs` — une exécution d'analyse pour un compte (cycle de vie, phase courante, coûts agrégés, `input_snapshot`).
- `ai_intelligence_results` — un résultat de phase. **`content_json` est l'unique source de vérité** (markdown/html rendus dans l'app, jamais stockés). `result_type text` (liste évolutive). `pitch` = un `result_type`, pas une table dédiée.
- `ai_intelligence_logs` — événements technique/métier (coûts, erreurs, retries).

`ai_intelligence_sources` (provenance web) et une table `pitchs` dédiée (tracking d'envoi) sont **reportées** : YAGNI tant que leur usage n'existe pas.

Toutes : PK `uuid/gen_random_uuid()`, `workspace_id`/`owner_id` avec defaults identiques à `companies`, `created_at/updated_at` + trigger `set_updated_at()`, RLS `workspace_id = current_workspace_id()` (4 policies), argent en `numeric`. Enfants (`results`, `logs`) `on delete cascade` depuis `runs`/`companies`.

### Statuts — **un seul cycle de vie**, enums préfixés

`ai_run_status` et `ai_result_status` = `queued · running · succeeded · failed · cancelled`. Le besoin de relecture est un booléen `needs_review` **orthogonal** (on ne le mélange pas au statut). On refuse explicitement la prolifération de statuts de FOLIO.

### Scoring — **déterministe et versionné**, échelle **1–10**

L'analyse brute (`results`) est immuable et horodatée. L'**état commercial dérivé** (`companies.ai_score` sur **1–10**, `priority`, `next_action_*`) est calculé par une **fonction déterministe versionnée** sur les facettes notées par le LLM (potentiel, signaux récents, fit secteur ESN, contacts qualifiés, urgence − risques). Le LLM **note des facettes** ; KREDO **calcule le score**. Reproductible, explicable au commercial, testable, cohérent avec les 93 valeurs existantes. On ne laisse pas le LLM écrire directement un nombre dans la colonne triée par l'UI.

### Orchestration — **hybride durci** (n8n worker + logique in-repo)

KREDO possède tables, routes, statuts, **prompts et schémas Zod** (dans le repo). n8n n'est qu'un **worker d'exécution asynchrone** (traitements longs > 300 s). Pattern : `route = création run` → `worker n8n` → `callback = stockage` → `UI = polling`. Jamais de traitement LLM long en route synchrone.

**Durcissement du callback** (corrige des défauts non vus par la proposition initiale) :
- **Client service-role** (exempt de RLS) — le callback n'a pas de session ; `current_workspace_id()` y renverrait `NULL`.
- **`workspace_id` et `owner_id` écrits explicitement** depuis le `run` (sinon insert `NULL`/échec).
- **Signature HMAC** sur le body + comparaison à temps constant (pas un simple bearer).
- **Idempotence** : `UNIQUE (run_id, phase)` sur `results` + callback rejouable en upsert (anti double-lancement).
- **Validation Zod stricte** au callback : JSON non conforme → `failed` + log, **jamais stocké cassé**.

### Vue de synthèse — `security_invoker`

`v_ai_intelligence_summary` (par compte : présence par phase, dernier statut/date, compteurs) créée `WITH (security_invoker = true)` pour que le RLS multi-tenant s'applique (sinon fuite cross-workspace).

### Périmètre & valeur

- **Ordre des phases : 1 → 2 → 4 → 5 → 3.** La Phase 3 (diagnostic) est la moins fiable/réutilisable → reportée en dernier.
- **Mutualisation : l'étude sectorielle (Phase 2) est rattachée au *secteur*, pas au *compte*** (95 comptes ≈ 15–25 secteurs) → coût LLM ÷ ~5.
- **Grounding sur les données KREDO** (contacts, `decision_power`, interactions, missions du secteur), pas uniquement le web public — c'est le moat inimitable.
- **Boucle CRM : la Phase 4 (roadmap) matérialise des `sales_opportunities` / `tasks` réelles.** C'est ce qui distingue « prospection intelligence » d'un générateur de JSON.
- **Adaptive design** ([0006](ADR-0006-strategie-device-adaptive-cible.md)) : panel `index/DesktopView/MobileView`, palette Cobalt Franc, zéro lib de chart.

## Options considérées

| Dimension | Cloner FOLIO (5 tables, 2 projets) | **Modèle unifié 3 tables (retenu)** |
|-----------|-----------------------------------|--------------------------------------|
| Sources de vérité | Multiples (dette) | Une (`content_json`) |
| Multi-tenant / RLS | `service_role` cross-projet (contourné) | `workspace_id` natif |
| Statuts | 7 valeurs incohérentes | 1 cycle + `needs_review` |
| Coût de maintenance (solo) | Élevé (5 workflows + 5 tables) | Contenu (V1 serrée) |
| Autonomie FOLIO | Faible | Totale après Lot 4 |

| Orchestration | n8n seul (logique hors repo) | Worker 100% in-repo | **Hybride durci (retenu)** |
|---------------|------------------------------|---------------------|-----------------------------|
| Vitesse de mise en œuvre | ✅ déjà maîtrisé | ❌ long | ✅ rapide |
| Versionnement prompts/schémas | ❌ | ✅ | ✅ (in-repo) |
| Tâches longues > 300 s | ✅ | ⚠️ à construire | ✅ (n8n) |
| Risque secrets | ⚠️ exports | ✅ | ✅ (secrets côté serveur) |

## Conséquences

- ✅ KREDO devient **propriétaire** du modèle et des résultats ; n8n n'est qu'un moteur remplaçable.
- ✅ Score **explicable** → confiance commerciale → feature réellement utilisée.
- ✅ RLS multi-tenant cohérent de bout en bout (tables + vue + callback).
- ⚠️ **Dépendance non triviale : un lot de backfill ETL** (Lot 0.5) pour rapatrier les ~81 sectorielles + 38 pitchs depuis le projet FOLIO agent — sinon l'affichage est vide.
- ⚠️ **Rotation immédiate des secrets** exposés dans les exports n8n FOLIO (à traiter comme compromis).
- ⚠️ Échelle de score **1–10** figée → la fonction de scoring backfille les `ai_score` existants dans cette échelle.
- 🔄 À revisiter : extraire `ai_intelligence_sources` et une table `pitchs` quand la capture de sources web / le tracking d'emailing existeront ; envisager un worker durable in-repo (Edge Function / Workflow) si n8n devient un point de friction.

## Séquence d'implémentation (V1 = Lots 0 → 5)

| Lot | Contenu |
|-----|---------|
| 0 | Rotation secrets n8n FOLIO + variables KREDO (`KREDO_INTELLIGENCE_CALLBACK_SECRET`, provider IA) |
| 0.5 | **Backfill ETL** FOLIO `agent_business_analyst` → KREDO (sectorielles + pitchs), puis coupure du lien FOLIO |
| 1 | 3 tables + enums + RLS + index + `UNIQUE(run_id,phase)` + vue `security_invoker` + `npm run db:types` |
| 2 | Affichage Phase 1 (existant) + sectorielles backfillées — **Desktop/Mobile**, intégré au drawer Comptes & Contacts |
| 3 | Run lifecycle (POST/GET) + statut unifié + idempotence |
| 4 | **Worker Phase 2 autonome** (Zod, callback durci) → autonomie FOLIO atteinte |
| 5 | **Scoring déterministe** → `companies.ai_score/priority/next_action` + tri Comptes & Contacts |
| 6+ | Phase 4 (roadmap → opportunités/tâches), Phase 5 (pitch), Phase 3 (diagnostic), `sources`, monitoring — itération 2 |

## Action items

1. [ ] Lot 0 : rotation des secrets compromis + variables d'environnement KREDO.
2. [ ] Lot 0.5 : script de backfill ETL (jointure `source_prospect_id → missions → resultats_phases`).
3. [ ] Lot 1 : migration `supabase/migrations/005_ai_intelligence.sql` (3 tables, 2 enums, RLS, index, vue `security_invoker`).
4. [ ] Régénérer `src/types/database.ts` (`npm run db:types`).
5. [ ] Mettre à jour la section « État de la base » de `CLAUDE.md` après migration.
