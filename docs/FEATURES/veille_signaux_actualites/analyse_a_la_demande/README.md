# Analyse à la demande — Veille

**Statut : cadré — implémentation non commencée**  
**Date de cadrage : 2026-08-19**  
**Baseline repo : `7ffb6822e69508d2f8ecc67da8a2fd5a338cd791`**

Ce dossier est le hub de référence du chantier **Analyse à la demande** de la page **Veille & actualités**.

L'objectif est de permettre à l'utilisateur de lancer une analyse stratégique à partir de **1 à 3 groupes de sources KREDO explicitement choisis**, complétés par une **intention libre courte**, sans créer un second moteur d'analyse et sans empiéter sur le framework des Missions d'intelligence.

## Décisions structurantes

1. **Réutiliser et étendre `INTEL-021`**, ne pas créer de nouveau workflow n8n.
2. **Préserver intégralement le fonctionnement mensuel historique** de `intel-021-monthly-watch-analysis` via son contrat V1.
3. Ajouter un **contrat V2 `manual_custom`** pour les analyses à la demande.
4. **Aucune nouvelle table Supabase** et, au cadrage, **aucune migration nécessaire**.
5. Le navigateur transmet uniquement des **références** ; il ne transmet jamais le contenu documentaire complet.
6. Les références sont **revalidées côté serveur avec la session utilisateur/RLS** avant envoi à n8n.
7. Sources V1 : digest/articles, signaux comptes, rapports/documents, Listes/Corpus.
8. Une analyse à la demande produit toujours `resultType = strategic_watch_analysis`, mais elle devient un **document autonome** dans `intelligence_documents` ; elle ne doit pas être fusionnée par période avec l'analyse mensuelle.
9. Les citations V2 sont généralisées en `evidenceRefs` afin de pouvoir référencer autre chose qu'un `veille_article`.
10. Ce chantier reste distinct du framework `docs/FEATURES/intelligence_missions/` et de `mission-001-run`.

## Ordre de lecture obligatoire pour un agent

1. `README.md` — décisions et état du chantier.
2. `00-CADRAGE-FONCTIONNEL.md` — périmètre produit et UX.
3. `01-ARCHITECTURE-ET-CONTRATS.md` — architecture cible et invariants techniques.
4. `02-ROADMAP-ET-HANDOFF.md` — lots, dépendances et règles de collaboration.
5. Le prompt du lot attribué, à commencer par `03-PROMPT-LOT-0.md`.

## Sources de vérité existantes à relire avant toute modification

- `src/components/veille/VeilleActualitesDesktop.tsx`
- `src/components/veille/VeilleActualitesMobile.tsx`
- `src/components/veille/mobile/VeilleAnalysesTab.tsx`
- `src/components/veille/veille-desktop-contracts.ts`
- `src/components/accounts-contacts/intelligence/CompanyDocumentsModal.tsx`
- `src/components/intelligence/IntelligenceSplitModalShell.tsx`
- `src/features/content-collections/data/resolve-knowledge-scope.ts`
- `src/features/content-collections/domain/content-collections-contracts.ts`
- `src/app/api/n8n/trigger/route.ts`
- `src/lib/n8n/types.ts`
- `n8n/workflows/intel-021-monthly-watch-analysis.json`
- `n8n/workflows/intel-021-monthly-watch-analysis.SETUP.md`
- `src/components/accounts-contacts/intelligence/save-as-document.ts`
- `docs/adr/ADR-0020-missions-intelligence.md`

## Roadmap

| Lot | Objet | Dépendance | État |
|---|---|---|---|
| L0 | Contrats V2 + validation/résolution des sources | aucune | à faire |
| L1 | Compositeur UI Desktop + Mobile | L0 | à faire |
| L2 | Extension `INTEL-021` V2 | L0 | à faire |
| L3 | Persistance documentaire + lecture V1/V2 | L2 | à faire |
| L4 | QA E2E et non-régression | L1 + L2 + L3 | à faire |

## Doctrine multi-agents

Un agent travaille sur **un lot borné** et ne préempte pas le suivant. Les fichiers possédés par un lot sont précisés dans `02-ROADMAP-ET-HANDOFF.md`.

À la fin d'un lot, l'agent doit produire un handoff court indiquant : fichiers modifiés, décisions prises, tests exécutés, résultat, écarts éventuels au contrat, points à reprendre. Si un écart d'architecture est nécessaire, il doit être documenté avant d'être propagé aux lots suivants.

Ne pas modifier Supabase, importer/activer un workflow n8n, commit ou déployer en production sauf ordre explicite correspondant au lot.
