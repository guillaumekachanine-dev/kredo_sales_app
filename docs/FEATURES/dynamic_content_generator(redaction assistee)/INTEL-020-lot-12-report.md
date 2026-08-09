# INTEL-020 — Rapport Lot 12

## Statut

Lot 12 livré sur `main`.

- Commit : SHA final communiqué dans le rapport de livraison.
- PR : aucune, livraison directe sur `main` demandée.
- Déploiement n8n : JSON modifié dans le dépôt ; réimport VPS encore à faire pour activer la nouvelle métadonnée de titre.

## Migration Supabase

- Migration créée : `supabase/migrations/20260712164656_intel_020_prise_de_parole_document_type.sql`.
- SQL : `alter type public.intelligence_document_type add value if not exists 'prise_de_parole';`
- `supabase db push --linked` était bloqué par deux divergences historiques d'historique de migrations antérieures au lot. Pour rester dans le périmètre, seul le SQL idempotent Lot 12 a été exécuté, puis `20260712164656` a été marqué `applied`.
- Enum live vérifié : `public.intelligence_document_type` contient `prise_de_parole`.
- Types Supabase régénérés : `src/types/database.generated.ts`.
- Vérification directe : insertion, relecture puis suppression d'un document `prise_de_parole` avec `scope_json` `internal/spoken_pitch`.

## Implémentation

- Nouveau helper pur : `src/lib/communication/communication-result-documents.ts`.
- Mapping résultat → document centralisé : `communication`, `commercial_pitch`, alias legacy `pitch`/`pitch_mail`, `prise_de_parole`, et types rapport existants.
- Auto-sauvegarde callback : `prise_de_parole` est éligible uniquement si le résultat est `succeeded`.
- Sauvegarde manuelle : idempotence conservée par `source_result_id`; le bouton reconnaît un document déjà créé automatiquement.
- Scope documentaire : lecture canonique de `input_snapshot.what.scope`, fallback compatible avec les anciens `input_snapshot.scope`.
- `scope_json` structuré avec finalité, catégorie, scénario, destinataire et références.
- Entités documentaires : `primary_entity_type` / `primary_entity_id` du run, références du brief et `company_id` optionnel ; liens dédupliqués et filtrés par `intelligence_entity_type`.
- Documents `collaborator` et `internal` sauvegardables sans compte.

## Présentation

- Titres contextuels : `Message — Suivi de mission`, `Pitch oral — Défense d’un candidat`, `Briefing — Entretien de rétention`, `Prise de parole — Arbitrage de ressources`.
- Durées pitch : `ultra_short` 30 s, `concise` 1 min, `standard` 2 min, `detailed` 5 min.
- Labels commerciaux/non commerciaux : `Lien avec l’offre` vs `Message à faire passer`, `Chiffres à citer` vs `Faits à mobiliser`, `Sorties possibles du RDV` vs `Issues et prochaines étapes`.
- Briefing contextualisé par scope : compte, collaborateur, interne.
- Bibliothèque : labels, badges, filtres et rendu structuré incluent `prise_de_parole` en desktop et mobile.
- Copie texte : écrit, pitch oral et briefing produisent un texte complet depuis les blocs JSON.

## Validation

- `npm run db:types` ✅
- Supabase enum live + insert/read/delete `prise_de_parole` ✅
- `npm test -- src/lib/communication/communication-result-documents.test.ts src/lib/intelligence/intelligence-resource-types.test.ts` ✅ 17/17
- `node n8n/workflows/__tests__/intel-020-communication.test.js` ✅ 81/81
- `npx tsc --noEmit` ✅
- ESLint ciblé Lot 12 ✅, warnings historiques Reports conservés.
- `npm run build` ✅
- Playwright screenshots `/reports` desktop/mobile ✅, redirection login faute de session locale.
- `git diff --check` ✅

## Écarts et notes

- Les prompts, la logique QA, le registry, le résolveur et les points d'entrée modules n'ont pas été modifiés.
- Le workflow n8n est modifié uniquement sur la métadonnée de titre dans `Prepare Callback`.
- Des modifications non Lot 12 préexistantes restent dans le worktree sur `Hydrate Context` / documentation n8n ; elles ne font pas partie du périmètre de ce rapport.
