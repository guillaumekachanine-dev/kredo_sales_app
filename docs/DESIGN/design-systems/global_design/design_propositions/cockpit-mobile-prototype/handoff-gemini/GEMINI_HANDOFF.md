# KREDO Cockpit Mobile - Gemini Handoff

## 1. Objectif produit

Implémenter la version mobile finale du Cockpit KREDO sur `/cockpit`, fidèle au prototype validé situé dans `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype`.

Objectif produit:
- fournir un centre de commande journalier et hebdomadaire pour un commercial ESN;
- privilégier l'action immédiate sur mobile;
- conserver la navigation basse existante et les safe areas iOS;
- réutiliser les tokens, primitives et patterns existants du workspace local.

Non-objectifs:
- aucune refonte Desktop;
- aucune réinterprétation visuelle;
- aucune nouvelle dépendance;
- aucune couleur en dur ou nouvelle primitive globale;
- aucun mock silencieux en production;
- aucune modification Supabase ou schéma tant qu'un seam typé suffit.

## 2. Sources de vérité

Prototype final:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/src/App.jsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/src/styles.css`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/design-qa.md`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/final-capture-main-collapsed.png`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/final-capture-agenda-expanded.png`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/final-capture-quick-actions.png`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/final-capture-staffing-sheet.png`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/cockpit-mobile-prototype/final-capture-meeting-sheet.png`

Production Cockpit:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/(app)/cockpit/page.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/index.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/CockpitMobileDashboard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/CockpitDesktopDashboard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/cockpit/cockpit-data.ts`

Shell, layout, primitives:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/globals.css`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/layout.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/templates/MobileActionPage.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/layout/AppShell.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/layout/MobileNav.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/layout/MobileBottomNav.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/mobile/MobilePageHeader.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/Button.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/SurfaceCard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/StatusPill.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/AppDrawer.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/AppDialog.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/HeaderAlerts.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/QuickActionDrawer.tsx`

Sources fonctionnelles:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/staffing/staffing-data.ts`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/staffing/StaffingMobileDashboard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/prospection/synthese-data.ts`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/prospection/suivi-data.ts`

Composants métier existants à réutiliser:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/CompanyIdentityDrawer.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/ContactIdentityDrawer.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/AccountsContactsViews.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/missions/NewOpportunityButton.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/missions/NewOpportunityDrawer.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx`

## 3. Logo officiel

Source fichier absolue:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/outputs/logos_vdef/logo_sans_fond.png`

Recommandation canonique de copie en production:
- copier ce fichier vers `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/public/branding/kredo/logo_sans_fond.png`
- l'utiliser au runtime via `/branding/kredo/logo_sans_fond.png`

Pourquoi ce chemin:
- stable;
- explicite pour les assets de marque;
- évite de pointer vers `outputs/` en production;
- ne casse pas les conventions Next `public/`.

## 4. Contraintes d'appareil et de viewport

Appareil cible:
- iPhone 14 portrait
- viewport CSS `390 x 844`
- DPR `3`
- capture physique `1170 x 2532`
- `viewportFit: "cover"` déjà actif dans `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/layout.tsx`

Contraintes à respecter:
- safe areas hautes et basses obligatoires;
- bottom nav jamais masquée;
- aucun scroll horizontal;
- touch targets `>= 44px`;
- Safari iOS et PWA standalone.

Comportement layout:
- la vue mobile doit rester dans le flux normal de `AppShell`;
- le scroll appartient au `main` existant de `AppShell`;
- ne pas créer une couche fixed qui recouvre la bottom nav hors sheets/drawers;
- le contenu principal doit garder un padding bas compatible avec `--layout-mobile-content-bottom-offset`.

## 5. Description visuelle par zone

### Header global

Composition stricte:
- logo officiel à gauche;
- titre `Cockpit` immédiatement à droite;
- bouton alertes;
- bouton rond bleu primaire avec icône éclair blanche complètement à droite.

Contraintes:
- une seule ligne;
- alignement vertical très propre;
- pas d'avatar;
- pas de sous-titre;
- pas de deuxième ligne;
- aucun débordement à `390px`.

Le bouton éclair ouvre un bottom sheet `Actions rapides` avec exactement:
- Enregistrer une note vocale
- Créer ou mettre à jour une tâche
- Créer ou mettre à jour un besoin
- Accéder au simulateur financier
- Créer ou mettre à jour un contact

### Agenda

Structure:
- module en premier;
- header sur une ligne: `Agenda` seulement;
- bande compacte de 5 jours ouvrés;
- jour courant sélectionné par défaut;
- agenda replié par défaut.

Interaction:
- toucher un jour déplie inline la liste du jour;
- le détail pousse naturellement les modules suivants;
- animation hauteur + opacité, rapide, environ `180-220ms`;
- version `prefers-reduced-motion` sans animation perceptible.

Chaque ligne agenda affiche:
- heure ou urgence;
- type;
- titre;
- client ou contexte;
- chevron;
- destination KREDO.

### Staffings & besoins

Structure:
- exactement 3 besoins;
- header sur une ligne: `Staffings & besoins` seulement;
- cartes plus compactes que le rendu initial de production.

En-tête de carte:
- rang;
- poste;
- client;
- en haut à droite, petite icône calendrier + date `JJ/MM`;
- aucun badge `Couverture`, `Critique`, `Aucune couverture`.

Ligne métier:
- deux colonnes équilibrées;
- `ETAPE`;
- `POSITIONNES`;
- pas de troisième colonne.

Pied:
- exactement deux boutons;
- primaire bleu à gauche;
- `Action` à droite;
- aucun troisième bouton visible.

### Rendez-vous clients

Structure:
- header sur une ligne: `Rendez-vous clients` seulement;
- liste chronologique compacte.

Carte:
- première ligne: nom client à gauche, date en haut à droite;
- le client est cliquable vers la fiche entreprise;
- petite icône illustrative devant le nom de l'entreprise;
- la date est sur 2 lignes dans le coin supérieur droit: `jour JJ mois` puis horaire, en noir et légèrement plus grand;
- deuxième ligne: contact avec petite icône illustrative, format `Nom Prenom - Poste`;
- accès drawer contact via la ligne contact;
- ligne objet unique avec préfixe `Objet :`;
- aucune sous-description.

Pied:
- deux boutons `50/50`;
- `Préparer`;
- `Action`.

Bottom sheet rendez-vous:
- ligne de header alignée à gauche au format `NOM DU CLIENT - JJ/MM - HH:MM`
- grand, gras;
- remplace l'ancien titre générique.

### Prospection

Structure:
- header sur une ligne: `Prospection` seulement;
- une ligne de métriques hebdomadaires compactes;
- 2 à 3 priorités maximum;
- deux boutons visibles max par item.

Actions visibles:
- bouton primaire bleu;
- bouton `Action`.

Le reste doit être dans le menu contextuel:
- pitch/mail IA;
- appel;
- analyses;
- tâche.

### Navigation basse

Règles:
- conserver `MobileNav` et `MobileBottomNav`;
- ne pas masquer la nav;
- ne pas réinventer les icônes;
- conserver la logique de rail existante.

## 6. Dimensions et espacements à respecter

Contraintes visuelles suffisantes pour éviter la dérive:
- page conçue pour un premier écran montrant entièrement header + agenda replié + début du module staffing;
- modules séparés par des espacements réguliers, compacts, homogènes;
- headers de section en une ligne avec bordure basse nette;
- cartes flat, sans gradient ni ombre décorative;
- rayons et couleurs uniquement via tokens existants;
- bottom sheets ancrés bas, pleine largeur mobile, sans effet lourd;
- drawers entreprise/contact: réutiliser les composants existants, pas un nouveau pattern.

Références relatives:
- header: hauteur visuelle proche du prototype, plus compacte qu'un `MobilePageHeader` standard;
- boutons d'action: hauteur cohérente avec `Button size=md` existant;
- cartes staffing et meetings: hauteur réduite mais jamais en dessous de touch targets accessibles;
- la nav basse doit rester entièrement visible quand un sheet n'est pas ouvert.

## 7. Hiérarchie complète des composants

Hiérarchie recommandée côté production:

1. `src/components/cockpit/index.tsx`
   garde le split serveur actuel par device.
2. `src/components/cockpit/CockpitDesktopDashboard.tsx`
   inchangé.
3. `src/components/cockpit/CockpitMobileDashboard.tsx`
   devient l'orchestrateur client du nouveau cockpit mobile.
4. Créer des composants locaux au cockpit, par exemple sous:
   - `src/components/cockpit/mobile/CockpitMobileHeader.tsx`
   - `src/components/cockpit/mobile/CockpitAgendaStrip.tsx`
   - `src/components/cockpit/mobile/CockpitAgendaDetails.tsx`
   - `src/components/cockpit/mobile/CockpitStaffingCard.tsx`
   - `src/components/cockpit/mobile/CockpitMeetingCard.tsx`
   - `src/components/cockpit/mobile/CockpitProspectionCard.tsx`
   - `src/components/cockpit/mobile/CockpitQuickActionsSheet.tsx`
   - `src/components/cockpit/mobile/CockpitContextSheet.tsx`
   - `src/components/cockpit/mobile/cockpit-mobile-view-model.ts`

Primitives à réutiliser telles quelles:
- `MobileActionPage`
- `Button`
- `SurfaceCard`
- `AppDrawer`
- `MobileBottomNav` via `AppShell`

Primitives à éviter pour le rendu final mobile du cockpit:
- `MobilePageHeader`
  car trop haut et trop générique pour le header compact final;
- `HeaderAlerts`
  seulement comme référence de pattern, pas comme vérité produit, car mock et contient des couleurs en dur;
- `StatusPill`
  non nécessaire dans les cartes staffing finales.

## 8. Etats interactifs et transitions

Etats observés dans le prototype:
- `collapsed`
- `expanded`
- `quick-actions`
- `sheet`
- `staffing-sheet`
- `meeting-sheet`
- `company-drawer`
- `contact-drawer`

Traduction attendue en production:
- état par défaut: agenda replié;
- état déplié: jour sélectionné avec détails inline;
- état actions rapides: bottom sheet transverse;
- état staffing action: bottom sheet contextuel staffing;
- état rendez-vous action: bottom sheet contextuel rendez-vous;
- état drawer entreprise: `CompanyIdentityDrawer`;
- état drawer contact: `ContactIdentityDrawer`.

Transitions:
- inline expand agenda: `180-220ms`;
- sheets/drawers: réutiliser le comportement de `AppDrawer`;
- backdrop closable;
- bouton `Fermer` closable;
- `Escape` et retour mobile pris en charge par `AppDrawer`;
- focus initial sur le contrôle de fermeture ou premier élément actionnable;
- restore focus vers le déclencheur.

## 9. Matrice des actions et destinations

### Header

Alertes:
- composant existant: `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/HeaderAlerts.tsx`
- statut: `MOCK_ONLY`

Actions rapides:
- Note vocale: `A RESOUDRE`
- Tâche: `A RESOUDRE`
- Besoin: composant existant `NewOpportunityDrawer` sur `/missions/opps` ou `/missions`
- Simulateur financier: `A RESOUDRE`
- Contact: `/prospection/accounts` avec modal locale existante, pas de deep-link confirmé

### Agenda

Routes prototype présentes:
- `/staffing`
- `/prospection/suivi`
- `/missions/opps`
- `/prospection/accounts`
- `/prospection`
- `/finance`
- `/cockpit`

Règle production:
- chaque item agenda doit pointer vers une route réelle confirmée;
- si l'information n'existe pas dans les données réelles, ne pas inventer un item.

### Staffing

Actions visibles:
- CTA principal dynamique selon `actionLabel`
- `Action` ouvre le sheet

Actions du sheet staffing:
- Changer l'étape du staffing
  destination confirmée partielle: `/missions/opps/[id]/edit`
  résolution fine vers la section étape: `A RESOUDRE`
- Consulter les CV
  point d'entrée partiel dans l'édition opportunité / staffing lié: `A RESOUDRE`
- Créer ou modifier une tâche
  `A RESOUDRE`
- Contacter le client
  destination confirmée: `/prospection/accounts?drawer=<companyId>`
- Ouvrir la simulation financière
  `A RESOUDRE`

### Rendez-vous

Actions visibles:
- `Préparer`
- `Action`

Actions du sheet rendez-vous:
- Élaborer un pitch
  destination confirmée: `/prospection/accounts/[companyId]` avec `ClientIntelligenceMobileView` et drawer pitch
- Consulter l'actualité du client
  destination confirmée: `/prospection/accounts/[companyId]`
- Générer la synthèse des échanges et les Next Steps IA
  destination partiellement confirmée: `/prospection/accounts/[companyId]` synthèse client existante, Next Steps IA non confirmés
- Créer ou modifier une tâche
  `A RESOUDRE`

### Prospection

Actions visibles:
- CTA principal selon priorité
- `Action`

Destinations confirmées:
- pitch/mail: `/prospection/accounts/[companyId]`
- analyses portefeuille: `/prospection`, `/prospection/signals`, `/prospection/ai-workshop`, `/prospection/sequences`
- appel: pas de route spécifique, probablement via drawer contact ou action externe, `A RESOUDRE`
- tâche: `A RESOUDRE`

## 10. Mapping prototype -> production

Header prototype:
- prototype: `top-header` dans `outputs/.../src/styles.css`
- production cible: nouveau composant local `CockpitMobileHeader`
- dépendances production: `Button` ou bouton local léger + asset logo + éventuellement `HeaderAlerts` refactoré ou wrapper local

Agenda prototype:
- prototype: `WEEK_DAYS`, état `activeDayKey`, panneau inline
- production cible: `CockpitAgendaStrip` + `CockpitAgendaDetails`
- source données: view-model cockpit mobile unifié

Staffing prototype:
- prototype: `STAFFING_NEEDS`
- production cible: `CockpitStaffingCard`
- données réelles: `staffing.openNeeds`

Meetings prototype:
- prototype: `MEETINGS`
- production cible: `CockpitMeetingCard`
- données réelles: pas de source unifiée actuelle, prévoir seam

Prospection prototype:
- prototype: `PROSPECTION_METRICS` + `PROSPECTION_PRIORITIES`
- production cible: `CockpitProspectionCard`
- données réelles: synthèse + suivi + éventuel seam

Sheets prototype:
- prototype: `ActionSheet`
- production cible: composant local basé sur `AppDrawer side="bottom"`

Drawers prototype:
- prototype: `EntityDrawer`
- production cible: `CompanyIdentityDrawer` et `ContactIdentityDrawer` réels

## 11. Mapping données -> interfaces -> affichage

Créer un view-model mobile unifié local au cockpit, sans changer le contrat Desktop:

```ts
type CockpitMobileViewModel = {
  header: {
    title: "Cockpit"
    alertCount?: number | null
  }
  agenda: {
    selectedDayKey: string
    days: AgendaDayVm[]
  }
  staffing: {
    items: StaffingNeedVm[]
  }
  meetings: {
    items: MeetingVm[]
  }
  prospection: {
    metrics: ProspectionMetricVm[]
    priorities: ProspectionPriorityVm[]
  }
}
```

Règle:
- le view-model agrège les données réelles disponibles;
- les champs non disponibles restent `null` ou tableau vide;
- un seam explicite est préférable à un mock silencieux.

## 12. Contrat de données par champ

### Agenda unifié

- bande 5 jours ouvrés: `DERIVABLE`
  règle: calcul local sur semaine courante.
- nombre d'éléments par jour: `MISSING`
  aucune source unique croisant tâches, rendez-vous, échéances et priorités.
- rendez-vous unifiés: `MISSING`
  source probable future: table dédiée meetings/events ou interactions calendaires.
- échéances staffing de la semaine: `AVAILABLE`
  source: `getStaffingDashboardData().weeklyDeadlines`
- tâches unifiées: `MISSING`
  la table `tasks` existe mais aucun agrégateur cockpit mobile n'existe pour l'utilisateur courant.
- priorité du jour: `DERIVABLE`
  possible à partir des besoins staffing scorés, mais seulement pour la partie staffing.

### Staffing

- besoin / poste / client: `AVAILABLE`
  source: `staffing.openNeeds`
- étape actuelle: `AVAILABLE`
  source: `openNeeds[].stage`
- positionnés: `AVAILABLE`
  source: `openNeeds[].candidateCount`
- échéance `JJ/MM`: `DERIVABLE`
  règle: formatter `openNeeds[].startDateLabel` ou mieux ajouter une vraie date de démarrage au view-model quand disponible.
- priorité des besoins: `DERIVABLE`
  règle déjà présente dans `scoreNeed()` et `priorities`, mais pas exposée comme champ final compact exact.
- action principale dynamique: `AVAILABLE`
  source: `openNeeds[].actionLabel`, dérivée dans `getPriorityAction()`
- couverture / criticité synthétique: `DERIVABLE`
  source: `coverageLabel`, `candidateCount`, `priority`, `scoreNeed()`

### Rendez-vous clients

- client: `MISSING`
  pas de liste cockpit unifiée actuelle.
- date / heure du rendez-vous: `MISSING`
- contact du rendez-vous: `MISSING`
- poste du contact: `MISSING`
- niveau de préparation: `MISSING`
- objet du rendez-vous: `MISSING`
- lien entreprise: `DERIVABLE`
  si `companyId` est connu, route confirmée `/prospection/accounts?drawer=<companyId>` et `/prospection/accounts/[companyId]`.
- lien contact: `MISSING`
  drawer contact existant mais pas de deep-link URL confirmé.

### Prospection

- métriques portefeuille compactes:
  - comptes à activer: `AVAILABLE` via `synthese.accountsToActivate.length`
  - pipe pondéré: `AVAILABLE` via `synthese.pipeline.totalWeighted`
  - urgences / actions de la semaine: `MOCK_ONLY` via `suivi-data.ts`
  - objectif atteint: `MOCK_ONLY` via `suivi.dashboardPersonnel.objectifJournalierPct`
- priorités de prospection:
  - comptes à activer: `AVAILABLE`
  - signaux radar: `MOCK_ONLY`
  - prospects urgents: `MOCK_ONLY`
- actions IA: `DERIVABLE`
  destination UI confirmée dans `ClientIntelligenceMobileView`, mais pas toujours pilotée par le cockpit.

### Alertes

- système de cloche et compteur: `MOCK_ONLY`
  source actuelle: `HeaderAlerts.tsx`

### Deep-links

- `/prospection/accounts?drawer=<companyId>`: `AVAILABLE`
- drawer contact via URL: `MISSING`
- simulateur financier: `MISSING`
- note vocale: `MISSING`
- tâche cockpit globale: `MISSING`

## 13. Données déjà disponibles

- split serveur mobile/desktop du cockpit;
- données cockpit desktop consolidées via `getCockpitDashboardData()`;
- besoins staffing ouverts et candidats positionnés;
- échéances staffing hebdomadaires;
- comptes à activer;
- pipeline pondéré;
- route et drawer entreprise;
- route et drawer contact en état local;
- création opportunité/besoin via `NewOpportunityDrawer`;
- vues intelligence client pour pitch et synthèse.

## 14. Données calculables

- semaine courante et 5 jours ouvrés;
- jour courant sélectionné;
- action principale staffing;
- format de date compacte `JJ/MM`;
- métriques prospectives compactes à partir de `synthese`;
- ordre de priorité staffing via score ou rang déjà calculé;
- fallback CTA prospection à partir d'un compte chaud.

## 15. Données réellement manquantes

Bloquantes pour fidélité complète au prototype:
- un agenda mobile unifié croisant rendez-vous, tâches, échéances et priorités;
- une source réelle de rendez-vous clients avec `companyId`, `contactId`, date, heure, objet;
- niveau de préparation des rendez-vous;
- deep-link robuste vers le drawer contact depuis une URL;
- action globale créer/modifier tâche;
- simulateur financier identifié;
- note vocale identifiée;
- compteur d'alertes réel.

Non bloquantes si on accepte des états vides typés:
- priorités prospection enrichies;
- actions IA avec Next Steps automatiques;
- bouton appel direct.

## 16. Deep-links confirmés

- `/cockpit`
- `/missions`
- `/missions/opps`
- `/missions/opps/[id]/edit`
- `/missions/planning`
- `/prospection`
- `/prospection/accounts`
- `/prospection/accounts?drawer=<companyId>`
- `/prospection/accounts/[companyId]`
- `/prospection/suivi`
- `/prospection/signals`
- `/prospection/sequences`
- `/prospection/ai-workshop`
- `/finance`
- `/recruitment/import`

## 17. Deep-links non confirmés - A RESOUDRE

- ouverture URL du drawer contact
- création/édition tâche depuis le cockpit
- simulateur financier exact
- note vocale
- consultation des CV sur une destination dédiée
- changement d'étape d'un staffing vers une ancre ou action directe
- création/édition contact via query param ou route dédiée
- Next Steps IA des rendez-vous comme action cockpit dédiée

## 18. Plan d'implémentation fichier par fichier

Fichiers à modifier en priorité:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/CockpitMobileDashboard.tsx`
- nouveaux fichiers locaux sous `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/mobile/`
- éventuellement `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/lib/cockpit/cockpit-data.ts` pour exposer un contrat mobile dédié sans casser le desktop

Fichiers explicitement à ne pas modifier sauf bug avéré:
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/cockpit/CockpitDesktopDashboard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/layout/MobileBottomNav.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/Button.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/SurfaceCard.tsx`
- `/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/ui/AppDrawer.tsx`

## 19. Risques de régression

- casser le split serveur mobile/desktop en faisant du masquage CSS;
- introduire une variante cockpit dans une primitive globale alors que le besoin est local;
- perdre le padding bas lié à la bottom nav;
- réintroduire des badges de statut visibles dans le staffing;
- réutiliser `HeaderAlerts` tel quel et réinjecter des couleurs en dur;
- forcer des mocks meetings/prospection en production;
- rendre les drawers entreprise/contact incompatibles avec leur logique actuelle de focus et retour.

## 20. Critères d'acceptation

- desktop inchangé visuellement et fonctionnellement;
- mobile cockpit fidèle aux 5 captures de référence;
- header compact exact;
- agenda replié par défaut, dépliement inline;
- 3 cartes staffing compactes avec 2 boutons seulement;
- rendez-vous clients compacts, 2 boutons, accès drawers;
- prospection synthétique, pas de dashboard dense;
- bottom nav intacte;
- aucun scroll horizontal;
- safe areas respectées;
- `prefers-reduced-motion` respecté;
- aucun mock silencieux pour les données manquantes.

## 21. Checklist finale

- lire les captures dans `reference-assets/` avant toute modification;
- protéger le desktop;
- copier le logo vers `public/branding/kredo/logo_sans_fond.png`;
- créer un view-model mobile dédié;
- remplacer le rendu mobile actuel du cockpit;
- brancher les drawers entreprise/contact réels;
- laisser les seams typés pour meetings, tasks, simulator, voice note;
- vérifier TypeScript;
- vérifier build;
- vérifier accessibilité clavier et VoiceOver;
- vérifier iPhone 14 `390x844`;
- vérifier absence de scroll horizontal;
- vérifier que chaque élément métier n'a que 2 boutons.

## 22. Notes d'audit utiles

- `design-qa.md` copié en référence reflète un audit visuel partiel plus ancien; les captures finales restent la vérité visuelle la plus stricte.
- Le prototype utilise des états query-string (`?state=collapsed`, etc.) uniquement pour la démonstration isolée. Ne pas répliquer cette API interne telle quelle en production sauf si elle aide à la QA locale.
