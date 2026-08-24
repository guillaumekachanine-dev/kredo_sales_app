# LOT 1 — Neutralisation runtime des scores globaux de compte

## Objectif

Retirer du runtime KREDO toute note synthétique de potentiel, valeur, conviction, investissement ou priorité globale d'un compte, sans créer de score de remplacement.

## Périmètre neutralisé

- Cockpit, actions prioritaires, Prospection, Business Intelligence et vues legacy encore actives : plus de lecture, affichage, filtre, tri ou règle fondé sur un score global.
- Les ordres nécessaires reposent sur des faits explicites : actions dépassées, opportunités sans prochaine action, signaux urgents, inactivité, dates, puis nom et identifiant pour la stabilité.
- REPORT-001 expose les opportunités, la relation, l'activité et les signaux. Son analyse est factuelle.

## Contrats Supabase déployés

La migration `20260823231219_neutralize-account-global-scores-runtime.sql`, appliquée en production le 24 août 2026, remplace les contrats actifs suivants :

- vues `v_ai_intelligence_summary` et `v_crm_account_list` ;
- RPC `get_account_summary_facts` ;
- RPC `get_communication_context` et `get_pitch_context` ;
- RPC `get_commercial_strategy_context` ;
- RPC `get_workspace_diagnostic_context`.

Les vues conservent la position et le type de l'ancienne colonne, renommée en fait explicite `open_opportunities_count`, afin de rester compatibles avec `CREATE OR REPLACE VIEW` sans suppression destructive.

## Workflows neutralisés

- REPORT-001 : aucun Score IA, conviction, investissement ou contrôle QA associé ;
- INTEL-020 : les nouveaux contextes et `normalizedContract.context` filtrent les anciennes notes ;
- INTEL-032 : contexte de stratégie factuel, sans objet de scores ;
- INTEL-040 : aucune distribution ou consigne d'interprétation par bande de compte.
- veille hebdomadaire : sélection des comptes par critères factuels successifs, sans somme multi-sources par compte.

## Structures conservées pour le LOT 2

Les tables, vues techniques, fonctions et colonnes physiques historiques restent en place, notamment `account_score_runs`, `account_score_components`, `account_score_feedback`, `account_score_current`, la colonne héritée de `companies`, les deux fonctions historiques de calcul, `get_account_score_context` et la métadonnée historique de potentiel. Le LOT 1 retire leurs consommateurs ; il ne détruit ni objets ni données.

## Références historiques restantes

Les anciennes migrations, les types DB générés à partir du schéma physique et la documentation de transition peuvent encore nommer ces objets. Ces occurrences ne constituent pas du runtime actif.

## Vérifications

- tests unitaires Cockpit, actions, BI et legacy adaptés ;
- tests n8n d'absence des clés interdites et exécution des nœuds Code sur mocks ;
- recherche négative du runtime ;
- typecheck, tests, frontière serveur, lint et build.

## Réservé au LOT 2

La suppression physique, la purge éventuelle de données historiques, la régénération des types après migration de schéma et le nettoyage des anciens snapshots ou documents ne font pas partie de ce lot.
