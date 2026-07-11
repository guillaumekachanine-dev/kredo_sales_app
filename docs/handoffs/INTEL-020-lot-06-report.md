# INTEL-020 — Rapport Lot 6

## Baseline

- Branche : `main`
- SHA de départ : `449940a4aa1a6dfa18c157783c4f0f63dddc8f78`
- Périmètre : navigation à trois finalités dans le composer, sans Supabase, n8n, registry, resolver, résultats ni points d'entrée applicatifs.

## Décisions et changements

- Le composer pilote désormais la navigation par `outputKind` canonique :
  - `written_message` — Rédiger un mail ;
  - `spoken_pitch` — Élaborer un pitch ;
  - `structured_briefing` — Préparer un RDV.
- Les anciens presets `mail` et `pitch` restent lisibles via une normalisation pure ; aucune nouvelle valeur canonique `mail` ou `pitch` n'est produite.
- Pitch oral et briefing RDV sont séparés dans le header, le picker de scénarios, les libellés et la cascade de finalité.
- Le changement de finalité ne remonte plus le contenu du composer ; les valeurs encore compatibles sont conservées et les ajustements automatiques sont signalés discrètement.
- La composition mobile utilise une variante dédiée avec trois choix tactiles ≥ 44 px.

## Fichiers

- `src/lib/communication/communication-purpose.ts`
- `src/lib/communication/communication-purpose.test.ts`
- `src/components/communication/CommunicationComposerHost.tsx`
- `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx`
- `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx`
- `src/components/accounts-contacts/intelligence/ScenarioPicker.tsx`
- `src/components/accounts-contacts/intelligence/ScenarioPickerModal.tsx`
- `docs/handoffs/INTEL-020-dynamic-implementation-ledger.md`

## Tests et validations

- `npx tsc --noEmit` ✅
- `npx eslint src/components/communication/CommunicationComposerHost.tsx src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx src/components/accounts-contacts/intelligence/ScenarioPicker.tsx src/components/accounts-contacts/intelligence/ScenarioPickerModal.tsx src/lib/communication/communication-purpose.ts src/lib/communication/communication-purpose.test.ts` ✅
- `npm test -- src/lib/communication/communication-purpose.test.ts src/lib/communication/communication-options-resolver.test.ts src/lib/communication/communication-scenario-registry.test.ts src/lib/communication/communication-context-brief.test.ts src/components/accounts-contacts/intelligence/communication-brief-options.test.ts` ✅ — 24 tests
- `git diff --check` ✅

## Limites

- Les champs métier spécifiques `account`, `collaborator` et `internal` ne sont pas refondus dans ce lot.
- Le smoke visuel authentifié du drawer dépend d'une session applicative existante ; le contrôle complet reste prévu dans le Lot 15.
