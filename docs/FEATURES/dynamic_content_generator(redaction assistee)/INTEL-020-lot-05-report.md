# INTEL-020 Lot 5 — Hydratation Front et faits contextuels

**Baseline :** `12506bc0f497dd38c6869d11ed5d41bcafb130f2`
**Branche :** `main`
**Statut :** terminé

## Décisions

- Création d'un loader de contexte unifié, indépendant de React, couvrant `account`, `collaborator` et `internal`.
- Ajout de mappings purs pour transformer les contextes RPC en facts compatibles avec le résolveur du Lot 3.
- Accès Supabase côté serveur via une Server Function : session utilisateur pour résoudre le `workspace_id`, puis `service_role` uniquement pour les RPC déjà bornées par ce workspace.
- Pour le scope `account`, `get_communication_context` est toujours chargé et `get_pitch_context` n'est appelé que lorsqu'une offre est sélectionnée ou exigée.
- Pour le scope `collaborator`, le loader utilise `get_collaborator_communication_context`.
- Pour le scope `internal`, aucune table Staff n'est créée et aucune source Supabase n'est chargée.
- Le composer expose au formulaire les facts, la résolution, les références et la disponibilité des sources sans refondre l'UX.

## Fichiers

- `src/lib/communication/communication-context-loader.ts`
- `src/lib/communication/communication-context-mappers.ts`
- `src/lib/communication/communication-context-actions.ts`
- `src/lib/communication/communication-context-brief.ts`
- Tests associés dans `src/lib/communication/*context*.test.ts`
- Adaptations minimales :
  - `src/components/communication/CommunicationComposerHost.tsx`
  - `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx`
  - `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx`
  - `src/lib/communication/communication-composer.ts`

## Validations

- `npx tsc --noEmit` : OK
- Tests ciblés communication : 26 tests OK
- ESLint ciblé : OK
- `git diff --check` : OK
- Smoke rendu Playwright CLI : OK sur `http://localhost:3000` avec redirection login, sans page blanche ni overlay visible. Le composer authentifié n'a pas été exercé visuellement faute de session locale.

## Hors lot

- Pas de modification registry.
- Pas de modification résolveur.
- Pas de migration Supabase.
- Pas de modification n8n.
- Pas de refonte navigation Mail / Pitch / RDV : Lot 6.
- Pas de filtrage effectif des sources dans n8n : Lot 10.
