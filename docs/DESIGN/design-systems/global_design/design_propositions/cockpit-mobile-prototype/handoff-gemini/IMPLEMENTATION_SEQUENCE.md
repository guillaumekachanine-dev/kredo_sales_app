# Implementation Sequence

## Lot 0 - Audit et sauvegarde de l'existant

Fichiers:
- `src/components/cockpit/CockpitMobileDashboard.tsx`
- `src/components/cockpit/CockpitDesktopDashboard.tsx`
- `src/components/cockpit/index.tsx`
- `src/lib/cockpit/cockpit-data.ts`

Dependances:
- aucune

Resultat attendu:
- comprendre l'existant;
- protéger explicitement le desktop;
- confirmer les primitives réutilisables.

Validation:
- aucun changement fonctionnel;
- mapping des composants et données validé.

Risques:
- casser le split mobile/desktop par erreur.

Test:
- ouvrir `/cockpit` en desktop et mobile avant modification.

## Lot 1 - View-model et contrats de données

Fichiers:
- `src/lib/cockpit/cockpit-data.ts`
- `src/components/cockpit/mobile/cockpit-mobile-view-model.ts`

Dependances:
- Lot 0

Resultat attendu:
- exposer un contrat mobile dédié;
- classifier les champs réels, dérivables et manquants;
- aucun mock silencieux.

Validation:
- types stables;
- aucun impact desktop.

Risques:
- mélanger besoins desktop et mobile;
- rendre les types trop couplés au prototype.

Test:
- typecheck ciblé.

## Lot 2 - Shell et header mobile

Fichiers:
- `public/branding/kredo/logo_sans_fond.png`
- `src/components/cockpit/CockpitMobileDashboard.tsx`
- `src/components/cockpit/mobile/CockpitMobileHeader.tsx`
- `src/components/cockpit/mobile/CockpitQuickActionsSheet.tsx`

Dependances:
- Lot 1

Resultat attendu:
- header compact final;
- bouton cloche;
- bouton éclair;
- sheet transverse `Actions rapides`.

Validation:
- une seule ligne;
- alignement propre;
- aucune couleur en dur;
- touch targets correctes.

Risques:
- réutiliser `MobilePageHeader` et obtenir un header trop haut;
- oublier le padding safe area.

Test:
- viewport `390x844`, capture header + actions rapides.

## Lot 3 - Agenda

Fichiers:
- `src/components/cockpit/mobile/CockpitAgendaStrip.tsx`
- `src/components/cockpit/mobile/CockpitAgendaDetails.tsx`
- `src/components/cockpit/CockpitMobileDashboard.tsx`

Dependances:
- Lot 1
- Lot 2

Resultat attendu:
- 5 jours ouvrés;
- état replié par défaut;
- dépliement inline animé;
- items navigables.

Validation:
- aucun chevauchement;
- contenu suivant poussé vers le bas;
- reduced motion respecté.

Risques:
- animation qui casse la hauteur;
- sélection de jour non persistée.

Test:
- changer de jour;
- ouvrir/fermer plusieurs jours;
- vérifier absence de scroll horizontal.

## Lot 4 - Staffings et besoins

Fichiers:
- `src/components/cockpit/mobile/CockpitStaffingCard.tsx`
- `src/components/cockpit/mobile/CockpitContextSheet.tsx`
- `src/components/cockpit/CockpitMobileDashboard.tsx`

Dependances:
- Lot 1
- Lot 2

Resultat attendu:
- 3 cartes compactes;
- date `JJ/MM` en haut à droite;
- ligne `ETAPE` / `POSITIONNES`;
- 2 boutons seulement;
- sheet staffing.

Validation:
- aucun badge de statut ancien;
- bouton primaire dynamique correct;
- sheet ouvre les 5 actions attendues.

Risques:
- réintroduire `StatusPill`;
- mauvaise troncature des valeurs longues.

Test:
- ouvrir sheet staffing;
- vérifier les 3 cartes à `390px`.

## Lot 5 - Rendez-vous

Fichiers:
- `src/components/cockpit/mobile/CockpitMeetingCard.tsx`
- `src/components/cockpit/mobile/CockpitContextSheet.tsx`
- `src/components/cockpit/CockpitMobileDashboard.tsx`

Dependances:
- Lot 1
- Lot 2

Resultat attendu:
- client et date sur première ligne;
- contact sur deuxième ligne;
- objet sur une ligne;
- 2 boutons `50/50`;
- sheet rendez-vous;
- accès drawer entreprise et contact.

Validation:
- icônes discrètes mais cliquables;
- date sur 2 lignes en haut à droite;
- pas de sous-description.

Risques:
- absence de données réelles;
- confusion entre route entreprise et drawer contact.

Test:
- ouvrir le sheet;
- ouvrir drawer entreprise;
- ouvrir drawer contact.

## Lot 6 - Prospection

Fichiers:
- `src/components/cockpit/mobile/CockpitProspectionCard.tsx`
- `src/components/cockpit/CockpitMobileDashboard.tsx`

Dependances:
- Lot 1
- Lot 2

Resultat attendu:
- métriques hebdo compactes;
- 2 ou 3 priorités max;
- 2 actions visibles max.

Validation:
- pas de dashboard dense;
- pas de graphes;
- CTA cohérents avec routes réelles.

Risques:
- s'appuyer sur `suivi-data.ts` mock sans le signaler;
- surcharger visuellement le module.

Test:
- vérifier les cas `AVAILABLE` et `EMPTY STATE`.

## Lot 7 - Sheets, drawers et deep-links

Fichiers:
- `src/components/cockpit/CockpitMobileDashboard.tsx`
- `src/components/cockpit/mobile/CockpitQuickActionsSheet.tsx`
- `src/components/cockpit/mobile/CockpitContextSheet.tsx`

Dependances:
- Lots 2 à 6

Resultat attendu:
- backdrop close;
- close button;
- focus correct;
- drawers entreprise/contact branchés;
- deep-links confirmés utilisés;
- unresolved laissés typés.

Validation:
- ouverture/fermeture clavier;
- focus restore;
- aria-labels.

Risques:
- dupliquer `AppDrawer`;
- casser la gestion focus existante.

Test:
- QA interaction complète mobile.

## Lot 8 - QA finale et suppression de l'ancien rendu mobile

Fichiers:
- `src/components/cockpit/CockpitMobileDashboard.tsx`
- éventuels fichiers locaux cockpit mobile

Dependances:
- Tous les lots précédents

Resultat attendu:
- rendu mobile final fidèle;
- ancien dashboard mobile supprimé;
- desktop intact.

Validation:
- typecheck;
- build;
- QA visuelle;
- QA accessibilité;
- QA desktop sans régression.

Risques:
- laisser des actions résiduelles;
- perdre le padding bottom nav.

Test:
- typecheck projet;
- build projet;
- vérification manuelle `390x844` et desktop.
