# INTEL-020 — Rapport Lot 4

## Baseline et périmètre

- SHA de départ : `82b8c9f855fc65de543450be38b9cb0bde3254e9` (`main`).
- Lot terminé sans modification d'UI, de registry, de résolveur, de n8n ni de point d'entrée applicatif.

## Décisions et livraison Supabase

- Migration additive `20260711192041_intel_020_collaborator_communication_context.sql` appliquée au projet live : colonne nullable `collaborators.manager_profile_id`, FK vers `profiles(id)` avec `on delete set null`, index partiel non-null et backfill idempotent réservé aux workspaces mono-profil.
- Backfill : 19 collaborateurs renseignés ; aucune valeur existante n'a été écrasée.
- RPC `public.get_collaborator_communication_context(uuid, uuid, uuid default null)` livrée : `stable`, `security invoker`, `search_path=public`, contrôle strict de `workspace_id`, sélection explicite de mission ou fallback courant, et forme JSON stable.
- Les données exposées sont factuelles et bornées : identité professionnelle, statut/disponibilité, manager applicatif, missions, profil métier, compétences, activité et absences structurées. Aucune note, métadonnée RH ou inférence de performance n'est renvoyée.
- Exécution limitée à `service_role`; RLS vérifiée sur les tables lues. Les alertes globales Supabase préexistantes, hors périmètre, n'ont pas été modifiées.

## Fichiers et validations

- Migration : `supabase/migrations/20260711192041_intel_020_collaborator_communication_context.sql`.
- Tests SQL : `supabase/tests/intel_020_lot4_collaborator_context_tests.sql`.
- Types régénérés : `src/types/database.generated.ts`.
- Traçabilité : ce rapport et le ledger.
- Validations : `npm run db:types`, tests SQL live (colonne/FK, backfill mono et multi-profils, accès valide, mission explicite et fallback, isolement workspace, collaborateur absent, JSON stable), `npx tsc --noEmit`, ESLint ciblé et `git diff --check`.

## Point laissé au Lot 5

L'hydratation des faits Supabase vers le front et les mappings applicatifs reste strictement reportée au Lot 5.
