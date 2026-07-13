# Rapport d'implémentation — INTEL-020 — Lot 16

Le Lot 16 implémente le **lancement neutre de la rédaction assistée** depuis le bouton "Rédaction assistée" du panneau Cockpit Intelligence.

---

## 1. Description technique des modifications

### A. Contrat de lancement neutre
- Le type `CommunicationComposerRequest` a été enrichi avec `launchMode?: "contextual" | "neutral"`.
- Le mode neutre désactive l'acquisition automatique de contextes CRM actifs de la page courante (compte, contact, opportunité, etc.). Pour cela, la fonction `enrichFromActiveIntelligenceContext` dans `CommunicationComposerHost.tsx` a été court-circuitée si `request.launchMode === "neutral"`.

### B. Primitives visuelles partagées
- Pour éviter la duplication visuelle des familles, scénarios et objectifs, les constantes de styles, images de catégories et composants de base (`CategoryCard`, `ScenarioCard`, `ObjectiveCard`, `StepDots`, `CheckIcon`) ont été extraits de [QuoiHubModal.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/QuoiHubModal.tsx) et relocalisés dans un fichier partagé : [QuoiHubShared.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/QuoiHubShared.tsx).
- [QuoiHubModal.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/QuoiHubModal.tsx) a été refactorisé pour importer et utiliser ces composants partagés, garantissant une parfaite non-régression visuelle de la modale "Quoi" existante.

### C. Modale neutre à 4 étapes
- Création de [NeutralCommunicationLaunchModal.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/communication/NeutralCommunicationLaunchModal.tsx) qui propose un parcours en 4 étapes :
  1. **Famille** (6 cartes fixes de familles métiers sans filtrage d'outputKind).
  2. **Scénario** (sélection parmi les scénarios de la famille).
  3. **Objectif** (objectifs compatibles, objectif suggéré en premier).
  4. **Format** (sélection du format principal Mail/Pitch/RDV avec miniatures adaptées. Si format invalide pour le scénario, le bouton est grisé et affiche "Non disponible pour ce scénario". Après sélection, la carte sélectionnée remonte de façon compacte et révèle la liste tactile des formats secondaires/canaux compatibles).
- La modale est entièrement responsive et propose des rendus différents selon la propriété `device` (Desktop vs Mobile) :
  - **Desktop** : familles en grille 3x2, formats principaux sur une ligne.
  - **Mobile** : familles en grille 2 colonnes, formats principaux en liste verticale lisible de hauteur ≥ 48px, options secondaires en grandes lignes tactiles de hauteur ≥ 48px.
- La modale gère le bouton retour d'étape en étape, la touche Échap, le focus trap et réinitialise son état complet à chaque réouverture.

### D. Orchestration dans le Host
- [CommunicationComposerHost.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/communication/CommunicationComposerHost.tsx) gère le nouvel état `neutralPickerOpen` et `neutralDraft`.
- À l'événement de lancement neutre, le Host réinitialise l'état complet du drawer, n'appelle pas l'hydratation automatique et ouvre la modale neutre.
- Lors de la complétion de la modale, le brief canonique est construit, la modale est fermée, le Host appelle `hydrate` avec ce brief et ouvre le drawer unifié.
- Si le scope résolu est `account` (ou `collaborator`), n'ayant pas de compte (ou consultant) associé au départ, le drawer affiche le sélecteur correspondant après la configuration métier, puis charge le contexte une fois l'entité sélectionnée.

### E. Résumé dans l'en-tête du drawer
- L'en-tête du drawer affiche désormais de manière dynamique sous le sélecteur de finalité le résumé textuel : `Famille • Scénario • Objectif • Format` (sans identifiant technique brut). Les changements locaux en direct dans le formulaire sont immédiatement répercutés dans ce résumé via la remontée d'état `onBriefChange`.

### F. Bouton Cockpit Intelligence
- Les deux points de déclenchement du Cockpit :
  1. [IntelligenceFAB.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceFAB.tsx) (`openComposerFromCockpit`)
  2. [CockpitPitchMailDrawer.tsx](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/CockpitPitchMailDrawer.tsx)
- Ont été configurés pour transmettre `launchMode: "neutral"` et fermer le panneau global avant le déclenchement de la modale pour éviter tout conflit de focus.

---

## 2. Validations et Tests

### A. Tests unitaires
- Ajout d'une suite de tests unitaires dédiée dans [neutral-launch.test.ts](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/communication/neutral-launch.test.ts) validant :
  1. Le comportement contextualisé par défaut de `launchMode`.
  2. La non-enrichissement du contexte CRM actif en mode neutre.
  3. L'enrichissement attendu en mode contextualisé classique.
- Exécution de tous les tests unitaires de communication :
  ```bash
  npx vitest run src/lib/communication/
  # Résultat : 13 fichiers de tests passés, 166 tests passés (0 échec).
  ```

### B. Tests d'intégration et Build
- Validation du script d'intégration n8n :
  ```bash
  node n8n/workflows/__tests__/intel-020-communication.test.js
  # Résultat : 81 passés, 0 failed.
  ```
- Validation de la compilation TypeScript globale et du build de production Next.js :
  ```bash
  npx tsc --noEmit # OK (0 erreur)
  npm run build # OK (Compilation et optimisation réussies)
  ```
- Validation des formatages git :
  ```bash
  git diff --check # OK (zéro espace en fin de ligne ou saut de ligne de conflit)
  ```

### C. Limite des smokes de session authentifiée
- La validation des parcours UI authentifiés de bout en bout et Playwright reste limitée localement en l'absence de session utilisateur mockée/active.
