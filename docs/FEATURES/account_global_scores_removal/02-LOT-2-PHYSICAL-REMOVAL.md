# LOT 2 — Suppression physique des scores globaux de compte

## Statut

**PRÉPARÉ — NON APPLIQUÉ EN PRODUCTION.**

La migration forward-only `20260824080013_drop_account_global_scores.sql` retire le sous-système historique après la neutralisation runtime du LOT 1. Elle n'est ni poussée ni appliquée automatiquement.

## État live audité le 24 août 2026

- `companies` : 112 lignes, dont 78 avec `legacy_folio_score` et 78 avec la clé JSONB `metadata.potential_score_raw` ;
- `account_score_runs` : 10 lignes ;
- `account_score_components` : 51 lignes ;
- `account_score_feedback` : 0 ligne ;
- `account_score_current` et les six fonctions ciblées sont présentes.

L'audit a croisé `pg_depend`, `pg_class`, `pg_proc`, `pg_rewrite`, `pg_trigger`, `pg_constraint`, `pg_policy` et `information_schema`. Les seules dépendances entrantes sont internes au sous-système :

- la vue `account_score_current` dépend de `account_score_runs` ;
- les tables enfant `account_score_components` et `account_score_feedback` référencent `account_score_runs` ;
- les trois triggers de validation appellent leurs trois fonctions privées dédiées ;
- contraintes, index, policies, types composites, TOAST et grants appartiennent aux relations supprimées.

Aucune vue, fonction ou table métier externe active ne dépend des objets ciblés. La recherche textuelle des définitions actives complète `pg_depend` pour les corps PL/pgSQL.

## Opérations préparées

La migration :

1. bloque l'exécution si une vue ou une routine active externe référence encore le scoring ;
2. retire uniquement `potential_score_raw` du JSONB `companies.metadata`, sans remplacer le document ;
3. supprime `account_score_current`, puis `get_account_score_context(uuid, uuid)` ;
4. supprime les tables enfant avant `account_score_runs` ;
5. supprime les trois fonctions privées de validation devenues orphelines ;
6. supprime `compute_conviction_score_v1(uuid)` et `compute_investment_score_v1(uuid)` ;
7. supprime `companies.legacy_folio_score` ;
8. exécute des assertions post-migration sur les relations, fonctions, colonne et clé JSONB.

La migration ne contient aucun `DROP ... CASCADE`. Toute dépendance cataloguée oubliée provoque donc un échec. Le garde préalable couvre aussi les références textuelles des routines PL/pgSQL.

## Objets conservés

`companies.priority` reste la classification métier explicite. Les scores spécialisés restent hors périmètre : signaux de compte, cartographie concurrentielle, attractivité sectorielle, matching, recrutement/staffing, confiance factuelle, qualité de données et mesure de l'écart de compétences.

Les artefacts IA historiques (`ai_intelligence_results`, `intelligence_documents`, snapshots de contexte) ne sont pas purgés ; leur éventuel nettoyage relève du LOT 3.

## Types et tests

- `src/types/database.generated.ts` a été régénéré depuis un clone local du schéma live après exécution de la migration, jamais édité manuellement ;
- le contrat Vitest vérifie l'absence dans les types, le runtime, les workflows actifs et les scripts ;
- le harnais n8n du LOT 1 continue de vérifier l'absence de consumer dans tous les workflows ;
- `supabase/tests/20260824080013_drop_account_global_scores.assertions.sql` vérifie le schéma et les données après application.

Le clone local a été créé depuis un dump de schéma production read-only. Une fixture portant `potential_score_raw` et une clé témoin a prouvé que la migration supprime la première et conserve la seconde. Résultat : migration atomique et assertions SQL vertes ; typecheck vert ; 1 996 tests Vitest sur 206 fichiers ; tous les harnais n8n verts ; frontière serveur/client verte ; lint ciblé vert ; build Next.js de production vert.

## Reste du chantier

Un final SQL gate humain est requis avant toute application Supabase production. Après application autorisée, régénérer une dernière fois les types depuis la production et exécuter les assertions live.
