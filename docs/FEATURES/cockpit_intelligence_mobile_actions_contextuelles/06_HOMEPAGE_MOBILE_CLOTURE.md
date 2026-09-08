# Clôture — Homepage mobile Cockpit

Statut : clôturé. La QA visuelle finale a été validée manuellement par le Product Owner.

## Architecture conservée

`CockpitDesktopDashboard` demeure inchangé. Le split Desktop/Mobile est conservé : `CockpitMobileDashboard` reste l’orchestrateur mobile et compose `CockpitMobileHome`, `MobileCockpitModuleSheet` et `CockpitQuickActionsSheet`. `AppShell`, `MobileNav`, `MobileBottomNav`, `IntelligenceFAB` global et `WorkflowExecutionIndicatorMobile` restent inchangés.

Le Design Lab historique reste indépendant et constitue la référence visuelle : `src/app/design-lab/kredo-home-mobile-v2/` et `src/components/design-lab/kredo-home-mobile-v2/`.

## Composition validée

Le Hero cobalt fait 258 px ; la surface blanche démarre à 198 px, soit un overlap de 60 px. L’illustration canonique est `public/images/design-lab/kredo-home-mobile-v2-hero-final.png`. Le logo KREDO et le bouton « + » sont intégrés au Hero ; le bouton conserve l’ouverture de `CockpitQuickActionsSheet`. Les entrées Agenda et Urgences historiques ont été retirées structurellement du Hero.

La surface ne contient que :

- **Ma semaine** : les trois entrées Brief hebdomadaire, Priorités et Opportunités ouvrent leurs sheets existantes.
- **Mes RDV** : le rail affiche les rendez-vous commerciaux du jour ; son raccourci accessible ouvre `/agenda`.
- **Mes actualités** : le rail affiche au plus cinq éléments normalisés et récents.

Le Diagnostic et son code métier sont conservés, mais ne possèdent plus de point d’entrée sur cette homepage.

## Contrat mobile

`CockpitMobileSnapshot` conserve les projections ajoutées à la homepage :

- `meetings.todayItems` est une projection légère de `meetings.items`, filtrée avec le fuseau Agenda canonique et triée chronologiquement. `meetings.items` reste intact pour la sheet existante.
- `news.items` est un tableau de `CockpitNewsItem` réunissant signaux de compte, dernier digest et dernière analyse. Les éléments sont normalisés, triés par `occurredAt` décroissant et limités à cinq.

Les données sont chargées côté serveur dans le loader mobile, sans fetch client supplémentaire.

## Navigation et parcours existants

Les cartes Ma semaine restent des points d’entrée de modules ; elles ne ciblent pas d’entité individuelle. Les chemins existants sont préservés : `/agenda`, `/veille?digestId=<id>` et `/veille?tab=analyses&analysisId=<id>`. Le dernier lien initialise la sélection d’analyse mobile tout en laissant le comportement par défaut de `/veille` inchangé.

## QA de clôture

La QA automatisée navigateur n’a pas été exécutée car la session `.codex/auth-state.json` locale est expirée. La QA visuelle finale, réalisée manuellement par le Product Owner, est **VALIDÉE**.
