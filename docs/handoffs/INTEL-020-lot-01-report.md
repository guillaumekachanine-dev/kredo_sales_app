# INTEL-020 — Rapport Lot 1 — Terminé

## Baseline et décisions

- Baseline `main` : `5bb32b33757ca56eb0ad66e400cb4425f198f5ee` ; Lot 0 vérifié `done`.
- Branche : `feat/intel-020-dynamic-01-canonical-types` ; agent : Codex.
- Six catégories canoniques séparées de `interne_management`, conservé uniquement comme type legacy de lecture.
- `collaborator` et les dimensions Staff sont ajoutés aux destinataires ; 19 scénarios sont ajoutés au contrat sans entrée de registry.
- Le normaliseur pur exige un scope explicite pour scinder `interne_management` et convertit `profile_submission`.
- Aucun changement UI, Supabase, migration ou n8n. La registry ne reçoit qu'un alias de type transitoire indispensable à la compilation, sans changement de données ni de comportement.

## Fichiers

- `src/lib/n8n/types.ts`
- `src/lib/communication/communication-composer.ts`
- `src/lib/communication/communication-legacy-normalizer.ts`
- `src/lib/communication/communication-legacy-normalizer.test.ts`
- `src/lib/communication/communication-scenario-registry.ts` (alias technique)
- `docs/handoffs/INTEL-020-dynamic-implementation-ledger.md`
- `docs/handoffs/INTEL-020-lot-01-report.md`

## Validation et écarts

- `npx tsc --noEmit` : réussi après suppression du cache `.next` généré localement.
- ESLint ciblé sur les cinq fichiers TypeScript concernés : réussi.
- Tests ciblés : 9/9 réussis (`communication-legacy-normalizer` et non-régression `communication-brief-options`).
- `npm run lint` : échec de baseline, 79 erreurs et 121 avertissements hors fichiers du lot, reproduit sur `main` au SHA de baseline.
- `npm test` : l'échec de `mobile-account-custom-list.test.ts` est reproduit sur `main` (199/200) ; il n'est ni introduit ni aggravé par le Lot 1.
- Migration : aucune. Les validations propres au lot sont réussies ; les réserves de baseline sont non bloquantes et aucune dette n'est introduite par le Lot 1.

## Laissé au Lot 2

Reclasser les entrées de registry vers `management_consultants` et `internal_staff`, ajouter les 19 scénarios à la registry et retirer l'alias transitoire. Commit final et URL de PR sont fournis dans le rapport de livraison GitHub.
