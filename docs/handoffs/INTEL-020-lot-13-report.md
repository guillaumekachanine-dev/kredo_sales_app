# INTEL-020 — Rapport Lot 13

## Statut

Lot 13 livré sur `main`.

- Commit : SHA final communiqué dans le rapport de livraison.
- PR : aucune, livraison directe sur `main` demandée.
- Migration Supabase : aucune.
- Déploiement n8n : aucun changement n8n dans ce lot.

## Modèle central

- Nouveau registre pur : `src/lib/communication/communication-entry-intents.ts`.
- Intentions couvertes : prospection, signaux, découverte, proposition, soutenance, objection prix, renouvellement mission, rebond sectoriel, pitch persona sectoriel, risque delivery, briefing d'escalade, validation de jalon, COPIL, contact candidat, invitation entretien, disponibilité candidat, feedback candidat, closing, mobilité/salaire, candidat vers client, défense atypique, besoin vers candidat, préparation recruteur.
- Builder : `buildCommunicationEntryPreset(intent, context)`.
- Le builder part d'un brief canonique, injecte uniquement les références fiables, applique la registry et le résolveur, retourne une erreur explicite si une entité requise manque, et refuse un scénario incompatible.
- `ContextualCommunicationButton` accepte désormais une intention canonique et reste compatible avec les anciens `entryPoint`.
- `CommunicationComposerHost` transmet `initialBrief`, `selectedOutputKind` et `contextReferences` au composer unifié.

## Call-sites câblés

### Commerce / Prospection

- `/prospection/suivi` desktop : action `Rédiger / préparer`, sans compte fictif lorsque la vue ne fournit que des identifiants mockés.
- `/prospection/suivi` mobile : action `Relancer via IA` convergée vers `prospection_follow_up`, sans bottom sheet métier local.
- Veille globale et signaux comptes : `signal_outreach` avec `signalRef`, compte si reconnu, secteur/catégorie et contexte du signal.
- Opportunity standing panel : `proposal_follow_up`, `proposal_defense` et `price_objection` depuis l'opportunité, plus conservation de l'action candidat vers client.
- Mission commerciale active : `mission_renewal` depuis le header mission.
- Playbook sectoriel : `sector_rebound` et `sector_persona_preparation`, avec compte seulement lorsqu'il existe.

### Delivery

- Header mission : `steering_committee` pour préparer un COPIL, sans forcer la catégorie du scénario.
- Dialog risque mission : `delivery_risk_message` et `delivery_risk_briefing` avec compte et mission réels.
- Le registre couvre aussi `milestone_validation` pour la validation de jalon.

### Recrutement

- Recruitment list desktop : invitation candidat et présentation candidat au client.
- Recruitment mobile cards : invitation, feedback et préparation recruteur selon la vue active.
- Candidate drawer : contact candidat depuis le dossier, sans inférence d'opportunité absente.
- Opportunity standing panel : présentation candidat au client, avec candidat, opportunité et compte lorsqu'ils sont fiables.

## Entités préremplies

- Compte : `companyId` / `companyName` uniquement depuis les modèles locaux fiables.
- Contact : `contactId` lorsqu'il est explicitement disponible.
- Opportunité : `opportunityId`, `opportunityTitle`.
- Mission : `missionId`, `missionTitle`.
- Candidat : `candidateId`, `candidateName`.
- Offre : `offerId` uniquement si fourni.
- Signal : `signalId` / `signalRef`.
- Secteur : `sectorId`, `sectorName`, sans création de compte ou contact fictif.

## Validation

- `npm test -- src/lib/communication/communication-entry-intents.test.ts` ✅ 24/24.
- `npx eslint <fichiers modifiés>` ✅.
- `npm run build` ✅.
- `npx tsc --noEmit` ✅.
- `git diff --check` ✅.
- Smoke Playwright :
  - `/prospection/suivi` desktop : serveur atteint, redirection login locale.
  - `/missions/actives` desktop : serveur atteint, redirection login locale.
  - `/recruitment` mobile : serveur atteint, redirection login locale.
  - Captures : `tmp/lot13-smoke/commerce-desktop.png`, `tmp/lot13-smoke/delivery-desktop.png`, `tmp/lot13-smoke/recruitment-mobile.png`.

## Écarts et surfaces différées

- Authentification locale non disponible dans la session Playwright ; le smoke visuel des pages métier est donc limité à la confirmation de routage vers le login.
- Aucun nouveau drawer local, aucun deuxième composer, aucun déclenchement n8n direct depuis les pages.
- Consultant drawer, alertes intercontrat, Management consultants, Staff interne, Finance et Agenda restent hors périmètre Lot 13.
- Les prompts, QA, résultats, bibliothèque, schéma Supabase, registry scénario et résolveur n'ont pas été modifiés.
