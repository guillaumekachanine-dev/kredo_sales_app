# Rapport d'implémentation — INTEL-020 — Lot 16

Le Lot 16 implémente le **lancement neutre de la rédaction assistée** depuis le bouton "Rédaction assistée" du panneau Cockpit Intelligence.

---

## 1. Description technique des modifications

### A. Contrat de lancement neutre
- Le type `CommunicationComposerRequest` a été enrichi avec `launchMode?: "contextual" | "neutral"`.
- Le mode neutre désactive l'acquisition automatique de contextes CRM actifs de la page courante (compte, contact, opportunité, etc.). Pour cela, la fonction `enrichFromActiveIntelligenceContext` dans `CommunicationComposerHost.tsx` a été court-circuitée si `request.launchMode === "neutral"`.
- Un helper pur [neutral-launch.ts](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/communication/neutral-launch.ts) centralise désormais les familles, les objectifs suggérés, les canaux secondaires et la construction du brief neutre. La modale ne duplique plus le mapping canaux/finalités.

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
- Le lancement neutre annule aussi toute hydratation contextualisée en cours, remet le résumé de brief à zéro au prochain lancement et conserve le brief choisi pendant le sélecteur de compte/consultant.

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
  4. L'ordre des six familles canoniques.
  5. Les scénarios d'une famille sans préfiltrage par finalité.
  6. L'objectif suggéré en première position.
  7. Le filtrage des formats secondaires par scénario et finalité.
  8. La construction du brief via registry/résolveur/purge.
  9. Le rejet explicite d'une combinaison invalide.
- Exécution des tests ciblés launcher/host/resolver :
  ```bash
  npm test -- src/lib/communication/neutral-launch.test.ts src/lib/communication/communication-options-resolver.test.ts src/lib/communication/communication-brief-form-model.test.ts src/lib/communication/communication-purpose.test.ts src/lib/communication/communication-flow-e2e-matrix.test.ts src/lib/communication/communication-entry-intents.test.ts
  # Résultat : 6 fichiers de tests passés, 127 tests passés (0 échec).
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
  npx eslint src/components/communication/CommunicationComposerHost.tsx src/components/communication/NeutralCommunicationLaunchModal.tsx src/lib/communication/communication-composer.ts src/lib/communication/neutral-launch.ts src/lib/communication/neutral-launch.test.ts src/components/intelligence/IntelligenceFAB.tsx src/components/cockpit/CockpitPitchMailDrawer.tsx src/components/accounts-contacts/intelligence/QuoiHubModal.tsx src/components/accounts-contacts/intelligence/QuoiHubShared.tsx src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx # OK
  npm run build # OK (Compilation et optimisation réussies)
  ```
- Validation des formatages git :
  ```bash
  git diff --check # OK (zéro espace en fin de ligne ou saut de ligne de conflit)
  ```

### C. Limite des smokes de session authentifiée
- Browser plugin non disponible dans la session et Playwright non installé dans le repo.
- Le serveur local `localhost:3000` répond, mais `/cockpit` redirige en `307` vers `/login?next=%2Fcockpit`; le HTML obtenu est le formulaire de connexion. Aucun smoke Desktop/Mobile authentifié n'a donc été déclaré réussi.
