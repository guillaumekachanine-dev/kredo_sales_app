# INTEL-020 — Rapport Lot 14

## Statut

Lot 14 livré sur `main`.

- Commit : SHA final communiqué dans le rapport de livraison.
- PR : aucune, livraison directe sur `main` demandée.
- Migration Supabase : aucune.
- Déploiement n8n : aucun changement n8n dans ce lot.

## Intentions ajoutées

- Management consultants : message, reconnaissance, point 1:1, feedback écrit/oral, changement de mission, intercontrat écrit/oral, rétention explicite, entretien annuel, échange sensible, posture disciplinaire, annonce difficile.
- Staffing et coordination interne : aide staffing, priorisation, revue staffing, appui Practice, appui avant-vente, kickoff avant-vente.
- N+1, direction et comités : point de statut N+1, arbitrage N+1, business review, comité interne, synthèse de décisions, synthèse direction.
- Finance : relance facture structurée, arbitrage ressources, demande d'investissement, synthèse direction.
- Agenda : préparation événement contextualisée sûre, avec routage vers les scénarios existants quand une entité fiable est liée.

Toutes les intentions résolvent vers un scénario déjà présent dans la registry. Aucun identifiant de scénario, resolver, prompt, QA, n8n ou schéma Supabase n'a été modifié.

## Call-sites câblés

- `ConsultantDrawer` : action unique `Rédiger / préparer`, avec menu métier court pour collaborateur, reconnaissance, 1:1, feedback, mission, intercontrat, rétention explicite, entretien annuel et échange sensible.
- `AssistanceCaseDrawer` Staffing : action unique `Rédiger / préparer`, avec aide staffing, priorisation, revue, appui Practice, appui avant-vente et kickoff avant-vente.
- `FinanceDesktopDashboard` : synthèse direction, arbitrage N+1 et préparation IA depuis les alertes financières.
- `FinanceMobileDashboard` : synthèse direction IA, arbitrage N+1 IA et préparation IA depuis les risques.
- `EventDrawer` Agenda : action unique `Préparer avec l'IA`, routée selon les liens structurés de l'événement.

## Entités préremplies

- Collaborateur : `collaboratorId`, `collaboratorRef`, nom, mission explicitement connue lorsqu'une seule mission fiable est sélectionnable.
- Staffing : opportunité, compte, candidat ou collaborateur lorsqu'ils existent dans le dossier ; scope conservé en `internal`.
- Finance : synthèse KPI et alerte structurée ; mission uniquement depuis `alert.metadata.missionId`.
- Agenda : titre, type, date/heure, lieu, lien de réunion, description, participants connus, compte, contact, opportunité, mission, candidat ou collaborateur uniquement lorsqu'ils sont liés par champ structuré.
- Interne : rôle, relation et domaine uniquement depuis le call-site ou l'action utilisateur explicite.

## Surfaces non câblées

- Relance de facture réelle : aucune facture structurée avec compte, contact financier, montant, échéance et statut n'est exposée dans les dashboards Finance modifiés ; l'intention existe et échoue proprement sans facture fiable.
- Comité interne dédié : pas de page comité distincte auditée ; l'entrée est couverte par le registre et par l'Agenda lorsque le contexte structuré le justifie, sans inférence depuis un titre libre.
- Alertes intercontrat dédiées hors drawer consultant : aucune surface fiable distincte câblée dans ce lot.
- Manager nommé : aucun nom de N+1 n'est inventé ; les actions N+1 ne préremplissent que le rôle cible explicite.

## Validation

- `npx tsc --noEmit` ✅.
- `npx eslint <fichiers modifiés>` ✅, avec warnings historiques `next/no-img-element` dans `FinanceDesktopDashboard`.
- `npm test -- src/lib/communication/communication-entry-intents.test.ts` ✅.
- `npm run build` ✅.
- `git diff --check` ✅.
- Smoke Playwright desktop/mobile :
  - `/consultants` desktop : serveur atteint, limité par authentification locale.
  - `/staffing` desktop : serveur atteint, limité par authentification locale.
  - `/finance` desktop et mobile : serveur atteint, limité par authentification locale.
  - `/agenda` desktop et mobile : serveur atteint, limité par authentification locale.

## Écarts et limites

- Le smoke authentifié des drawers métier n'a pas pu être exécuté sans session locale exploitable.
- L'ouverture passe toujours par le `CommunicationComposerHost` existant ; aucun drawer métier parallèle, aucun registre de presets parallèle et aucun déclenchement n8n direct n'ont été ajoutés.
- Le Lot 15 n'a pas été commencé.
