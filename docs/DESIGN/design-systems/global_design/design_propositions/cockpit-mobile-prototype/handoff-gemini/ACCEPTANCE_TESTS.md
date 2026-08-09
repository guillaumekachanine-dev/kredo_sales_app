# Acceptance Tests

## Configuration

- appareil: iPhone 14
- viewport: `390 x 844`
- DPR: `3`
- orientation: portrait
- vérifier aussi desktop pour non-régression

## Scénarios visuels

1. Vue principale agenda replié
- ouvrir `/cockpit` en mobile;
- vérifier header compact avec logo officiel, titre, cloche, éclair;
- vérifier agenda replié par défaut;
- vérifier que le début du module staffing apparaît dans le premier écran;
- vérifier bottom nav visible.

2. Agenda déplié
- toucher le jour courant;
- vérifier l'ouverture inline;
- vérifier que les modules suivants sont repoussés vers le bas;
- vérifier l'absence de saut visuel brutal.

3. Changement de jour
- toucher plusieurs jours ouvrés;
- vérifier que le jour actif change proprement;
- vérifier que le compteur reste lisible;
- vérifier qu'un seul jour est déplié à la fois, si tel est le comportement retenu.

## Header et actions rapides

4. Bouton éclair
- vérifier taille et forme ronde;
- vérifier aria-label explicite;
- vérifier alignement à droite de la cloche.

5. Menu transverse
- ouvrir le sheet `Actions rapides`;
- vérifier les 5 lignes exactes;
- vérifier icône + libellé + chevron;
- fermer via backdrop;
- rouvrir puis fermer via bouton.

## Staffing

6. Carte staffing
- vérifier 3 cartes exactement;
- vérifier date `JJ/MM` avec icône calendrier en haut à droite;
- vérifier absence de badge couverture/criticité;
- vérifier ligne `ETAPE` et `POSITIONNES`;
- vérifier 2 boutons seulement.

7. Sheet staffing
- toucher `Action`;
- vérifier les 5 entrées:
  - Changer l'étape du staffing
  - Consulter les CV
  - Créer ou modifier une tâche
  - Contacter le client
  - Ouvrir la simulation financière
- vérifier fermeture par backdrop et bouton.

## Rendez-vous clients

8. Module rendez-vous
- vérifier client sur la même hauteur que la date;
- vérifier date et heure en haut à droite;
- vérifier icône illustrative devant entreprise et contact;
- vérifier contact au format `Nom Prenom - Poste`;
- vérifier ligne `Objet : ...`;
- vérifier 2 boutons de même largeur.

9. Sheet rendez-vous
- ouvrir `Action`;
- vérifier header `NOM DU CLIENT - JJ/MM - HH:MM`;
- vérifier les 4 actions attendues;
- vérifier bouton fermer visible.

10. Drawer entreprise
- ouvrir depuis la ligne entreprise;
- vérifier ouverture de `CompanyIdentityDrawer`;
- vérifier fermeture et restore focus.

11. Drawer contact
- ouvrir depuis la ligne contact;
- vérifier ouverture de `ContactIdentityDrawer`;
- vérifier fermeture et restore focus.

## Prospection

12. Module prospection
- vérifier la ligne de métriques compacte;
- vérifier 2 ou 3 priorités max;
- vérifier 2 boutons visibles max par item;
- vérifier absence de graphique ou carrousel.

## Etats de données

13. Données longues
- injecter localement un client et un contact très longs;
- vérifier troncature élégante;
- vérifier aucun débordement horizontal.

14. Etats vides
- tester avec tableaux vides pour meetings et prospection si la donnée n'existe pas;
- vérifier qu'un état vide explicite apparaît plutôt qu'un mock silencieux.

15. Absence de données
- vérifier qu'une absence de rendez-vous ou d'actions ne casse pas la page;
- vérifier que le layout reste stable.

## Accessibilité et interaction

16. Navigation basse
- vérifier que le contenu n'est pas masqué par la bottom nav;
- vérifier safe area basse.

17. Clavier et focus
- tabuler sur les boutons;
- vérifier `focus-visible`;
- vérifier focus initial des sheets/drawers;
- vérifier restore focus à la fermeture.

18. VoiceOver
- vérifier les labels:
  - cloche
  - actions rapides
  - boutons `Action`
  - déclencheurs entreprise/contact
  - boutons fermer

19. prefers-reduced-motion
- activer reduced motion;
- vérifier la disparition des animations non essentielles;
- vérifier que l'agenda reste fonctionnel.

20. Scroll horizontal
- vérifier `document.documentElement.scrollWidth === viewport width`;
- vérifier aucun overflow visuel sur cards, headers, sheets.

## Non-régression desktop

21. Desktop cockpit
- ouvrir `/cockpit` sur viewport desktop;
- vérifier que `CockpitDesktopDashboard` n'a pas changé;
- vérifier qu'aucun composant mobile n'est affiché.

## Validation technique

22. TypeScript
- lancer le typecheck du repo;
- aucun nouveau warning bloquant.

23. Build
- lancer le build du repo;
- vérifier que `/cockpit` compile sans erreur.

24. Régression globale
- vérifier qu'aucune primitive partagée n'a été modifiée pour un besoin spécifique au cockpit mobile sauf justification explicite.
