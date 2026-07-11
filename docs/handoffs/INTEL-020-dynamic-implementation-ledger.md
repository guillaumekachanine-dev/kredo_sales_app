# INTEL-020 — Ledger d'implémentation dynamique

Ce ledger est le support de continuité entre Codex, Claude Code, Gemini, les développeurs humains et les futurs agents. Le contrat fonctionnel est défini par le [handoff INTEL-020](../HANDOFF_INTEL-020_ARCHITECTURE_DYNAMIQUE.md) et gelé par [ADR-0015](../adr/ADR-0015-intel-020-dynamic-communication-architecture.md).

## Règles de continuité

Avant chaque lot, l'agent part du `main` contenant le lot précédent, lit intégralement le handoff, ADR-0015 et ce ledger, audite le code concerné et vérifie le schéma live si Supabase est touché. Tout écart doit être signalé avant modification. Une branche `feat/intel-020-dynamic-XX-slug` est utilisée par lot ; aucun lot suivant ni chantier parallèle ne doit être commencé.

Chaque agent met à jour son entrée sans réécrire l'historique des lots précédents. Son rapport doit renseigner : fichiers modifiés, décisions prises, migrations créées ou appliquées, tests exécutés et résultats, écarts au contrat, limitations, SHA du commit, lien de PR et statut final (`done`, `blocked` ou `partial`). Toute correction historique est ajoutée comme note traçable.

## Baseline du Lot 0

### Git

- Repository : `guillaumekachanine-dev/kredo_sales_app`.
- Branche source synchronisée : `main`.
- SHA de départ relevé le 2026-07-11 : `65f6065b3075d04ef4dd0e0c5c329dd6c10ba8a4`.
- Écart documentaire : le handoff conserve son audit historique au SHA `0b28735ded3516ab91ddfe30c8bbe20cf4964bdc` ; ce SHA n'est pas la baseline du Lot 0.

### Supabase — audit en lecture seule

- Projet : `Kredo_Sales_App` (`jvzgmhvwirsbdkjpmvla`), état `ACTIVE_HEALTHY`.
- `collaborators` : 19 lignes et 19 colonnes ; `manager_id` est nullable, non renseigné sur 19/19 lignes et référence `collaborators.id` ; `manager_profile_id` est absent.
- `intel-020-communication` : 48 runs du 2026-07-02 au 2026-07-10 ; les 6 plus récents contiennent simultanément `what.outputKind`, `what.activityCategory` et `what.scope`, les 42 runs antérieurs n'en contiennent aucun.
- Valeurs persistées : `outputKind = written_message` (6), `scope = account` (6), `activityCategory = commerce_actif` (4) ou `commerce_prospection` (2). Aucune autre valeur n'est actuellement persistée dans ces trois champs.
- Les dix derniers runs audités sont tous `succeeded` : six runs structurés le 2026-07-10, puis quatre runs legacy sans les trois champs du 2026-07-08 au 2026-07-09.
- Conclusion qualité : constat cohérent avec le handoff et preuve de la nécessité du fallback legacy. Aucun identifiant de ligne, payload métier ou secret n'est reproduit ici.

## Suivi des lots

| Lot | Périmètre | Agent | Branche | Commit / PR | Migration | Tests | Statut | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 | Gel du contrat et traçabilité : handoff versionné, ADR de référence, ledger, aucun code métier. | Codex | `feat/intel-020-dynamic-00-contract-ledger` | Commit `HEAD` — PR brouillon liée à la branche | Aucune | Liens Markdown, cohérence documentaire, périmètre `docs/`, secrets, `git diff --check` | done | Baseline Git et audit Supabase en lecture seule consignés ; SHA final et URL de PR dans le rapport de livraison. |
| 1 | Types canoniques et compatibilité legacy : six catégories, destinataire collaborateur, dimensions Staff, scénarios nouveaux déclarés, normalisation historique. Sans UI, sans DB, sans n8n. | Codex | `feat/intel-020-dynamic-01-canonical-types` | Commit `HEAD` — PR brouillon liée à la branche | Aucune | `npx tsc --noEmit` ✅ ; ESLint ciblé ✅ ; 9 tests ciblés ✅ ; lint global et `npm test` ❌ baseline | done | Fichiers et décisions : [rapport Lot 1](INTEL-020-lot-01-report.md). Registry inchangée fonctionnellement ; alias technique transitoire uniquement. Validations propres au lot réussies. Les validations globales restent affectées par 79 erreurs ESLint et un test mobile préexistants, reproduits sur la baseline main et hors périmètre INTEL-020. |
| 2 | Registry exhaustive : scinder les catégories, reclasser les scénarios, ajouter les 19 nouveaux identifiants, enrichir le contrat de registry. | Codex | `main` | Commit `HEAD` | Aucune | `npx tsc --noEmit` ✅ ; ESLint ciblé ✅ ; 15 tests ciblés ✅ ; `git diff --check` ✅ | done | 92 scénarios canoniques, six catégories et helpers purs. [Rapport Lot 2](INTEL-020-lot-02-report.md). |
| 3 | Résolveur de dépendances : créer les facts, le resolver, les cascades et la gestion `auto \| user`. | Codex | `main` | Commit `HEAD` | Aucune | `npx tsc --noEmit` ✅ ; ESLint ciblé ✅ ; 20 tests ciblés ✅ ; `git diff --check` ✅ | done | Résolveur pur facts → registry → brief normalisé, avec cascades, provenance et ajustements. [Rapport Lot 3](INTEL-020-lot-03-report.md). |
| 4 | Fondation Supabase Management : `manager_profile_id`, index, backfill sûr, RPC collaborateur, types générés. Pas d'UI. | Codex | `main` | Commit `HEAD` | `20260711192041_intel_020_collaborator_communication_context.sql` appliquée | `npm run db:types` ✅ ; SQL ciblé live ✅ ; `npx tsc --noEmit` ✅ ; ESLint ciblé ✅ ; `git diff --check` ✅ | done | 19 collaborateurs backfillés sans écrasement ; RPC `security invoker`, isolé par workspace et uniquement exécutable par `service_role`. [Rapport Lot 4](INTEL-020-lot-04-report.md). |
| 5 | Hydratation front et mappings factuels : compte/contact/persona/relation, candidat, mission, collaborateur, agenda, interne. Le resolver reçoit des facts fiables. | À affecter | `feat/intel-020-dynamic-05-*` | — | À confirmer | À définir | planned | — |
| 6 | Navigation par trois finalités : Mail / Pitch / Préparer un RDV dans le header et le picker. Ne pas encore refondre tous les champs spécifiques. | À affecter | `feat/intel-020-dynamic-06-*` | — | Aucune prévue | À définir | planned | — |
| 7 | Formulaire dynamique Account, Delivery, Recrutement : remplacer les listes globales par les options résolues pour les catégories déjà proches du modèle existant. Desktop et Mobile. | À affecter | `feat/intel-020-dynamic-07-*` | — | Aucune prévue | À définir | planned | — |
| 8 | Formulaire Management consultants : sous-composants dédiés, sélection consultant, contexte, scénarios, tons et sources. | À affecter | `feat/intel-020-dynamic-08-*` | — | Aucune prévue | À définir | planned | — |
| 9 | Formulaire Interne : rôle Staff, relation, domaine, entité liée, scénarios et tons. | À affecter | `feat/intel-020-dynamic-09-*` | — | Aucune prévue | À définir | planned | — |
| 10 | n8n — validation et hydratation par scope : normalisation, validation, RPC collaborateur, filtrage réel des sources. Ne pas réécrire encore tous les prompts. | À affecter | `feat/intel-020-dynamic-10-*` | — | Aucune prévue | À définir | planned | — |
| 11 | n8n — prompts et QA exhaustifs : couvrir tous les scénarios, durées, catégories et garde-fous. | À affecter | `feat/intel-020-dynamic-11-*` | — | Aucune prévue | Fixtures contractuelles obligatoires | planned | — |
| 12 | Résultats et bibliothèque : `prise_de_parole`, labels contextuels, correction du scope documentaire, sauvegarde. | À affecter | `feat/intel-020-dynamic-12-*` | — | À confirmer | À définir | planned | — |
| 13 | Points d'entrée commerciaux, delivery et recrutement : presets et call-sites P0/P1 de ces modules. | À affecter | `feat/intel-020-dynamic-13-*` | — | Aucune prévue | À définir | planned | — |
| 14 | Points d'entrée Management, Interne et Agenda : consultant, staffing, finance, N+1, comité, événements management. | À affecter | `feat/intel-020-dynamic-14-*` | — | Aucune prévue | À définir | planned | — |
| 15 | E2E et stabilisation : parcours complets, mobile, desktop, Supabase, n8n, bibliothèque, non-régression. Aucune nouvelle fonctionnalité dans ce lot. | À affecter | `feat/intel-020-dynamic-15-*` | — | Aucune nouvelle prévue | E2E et non-régression | planned | — |
