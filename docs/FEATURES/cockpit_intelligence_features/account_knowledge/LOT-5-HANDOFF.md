# AccountKnowledge V3 — Lot 5 : Restitution Desktop et Mobile (Handoff)

## Synthèse

Le **Lot 5** de la refonte AccountKnowledge (V3) est implémenté et intègre les composants d'interface structurant la restitution de la connaissance entreprise en 7 rubriques, aussi bien pour le Desktop que pour le Mobile, tout en respectant l'Adaptive Design et le Design System `edito-bright-cockpit`.

## Contenu implémenté

### 1. Primitives et Charte Graphique (FOLIO)
- **Fichier** : `src/components/accounts-contacts/intelligence/folio-v3/FolioStudyPrimitives.tsx`
- **Contenu** : 
  - `FolioStudySubheading`, `FolioNarrativeBlock`, `FolioEditorialList`
  - Composants de gestion de sources : `FolioSourceMarker`, `FolioSourceDisclosure`, `FolioEvidenceState`
- **Particularités** : Utilise les tokens de `globals.css`, incluant le jaune `#D89B16` (Cobalt Franc) et les couleurs marines `[#1E3150]`, `[#243B63]`. Le composant `FolioSourceDisclosure` exploite `<details>` et `<summary>` natifs sans dépendances externes.

### 2. Layouts de Section
- **Fichier** : `src/components/accounts-contacts/intelligence/folio-v3/FolioStudyLayouts.tsx`
- **Contenu** : 
  - `FolioStudySummary` : Encart spécial en tête de page (encadré blanc bordé, icône dorée).
  - `FolioStudySection` / `FolioStudySectionHeader` : Conteneur principal (header `bg-[#1E3150]`).
  - `FolioIdentityGrid` (Desktop) et `FolioIdentityRowsMobile` (Mobile) : Grilles de données pour la Fiche d'identité.

### 3. Assemblage V3 (Desktop et Mobile)
- **Fichiers** : 
  - `src/components/accounts-contacts/intelligence/folio-v3/AccountKnowledgeV3Desktop.tsx`
  - `src/components/accounts-contacts/intelligence/folio-v3/AccountKnowledgeV3Mobile.tsx`
- **Contenu** :
  - Parsing et rendu des 7 rubriques de `AccountKnowledgeContentV3`.
  - Construction du Disclosure de sources à la fin de chaque section, n'affichant que les sources pertinentes.
  - Résolution des index de sources et rendering par `FolioClaimText` (inclus dans `FolioStudyShared.tsx`).

### 4. Intégration des Signaux
- **Fichier** : `src/components/accounts-contacts/intelligence/folio-v3/AccountSignalsV3.tsx`
- **Contenu** :
  - `AccountSignalsCompactList` (Desktop) et `AccountSignalsMobileCards` (Mobile) : N'affichent que les signaux ciblés ou les 3 plus récents.
  - `AccountSignalsModal` : Modale reprenant le split-pane existant `IntelligenceSplitModalShell` sur Desktop et un écran total sur Mobile pour lister l'intégralité des signaux.

### 5. Bascule et Relocalisation V2
- **Fichiers** : `ClientIntelligenceCompanyTab.tsx` et `ClientIntelligenceMobileView.tsx`
- **Changements** : 
  - Les blocs obsolètes de la V2 (Organisation, Activités Opérationnelles, Relation Commerciale) sont sortis du flux généré par l'IA. Ils sont maintenant affichés sous le rapport V3 ("Espace relationnel & opérations").
  - `data.accountKnowledgeV3` (ou `AccountKnowledgeV3State`) est utilisé comme condition d'affichage. L'historique `knowledge.version === 1 | 2` subsiste en fallback.
- **Trigger N8N** : `useAccountKnowledgeRun` a été mis à jour pour envoyer `{ schemaVersion: 3 }` en payload (validation de la bascule).

## Validation Technique
- **Typechecking** (`npm run typecheck`) : ✅ 
- **Tests** : À effectuer manuellement (l'architecture respecte les types stricts de `account-intelligence-contracts.ts`).

## Prochaines étapes suggérées
1. Vérification fonctionnelle en environnement de staging avec de vrais payloads V3 de Supabase.
2. Revue visuelle du mapping des sources (index globaux vs par section) si le besoin d'ajustement émerge à l'usage.
