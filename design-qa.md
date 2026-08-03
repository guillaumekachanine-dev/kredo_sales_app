# Design QA — Cockpit

## Findings

- [P1] Capture du Cockpit authentifié indisponible
  Location: `/cockpit` à 1280 × 800, 1440 × 900 et 1600 × 1000.
  Evidence: la référence est `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/codex-clipboard-7b92f791-5371-44dc-9a64-389abd5c6d88.png`; chaque capture locale, dont `/tmp/kredo-cockpit-1440x900.png`, redirige vers l’écran de connexion (`/login?next=%2Fcockpit`).
  Impact: la comparaison de la composition, des densités, des trois breakpoints et des interactions nécessite l’état Desktop connecté avec des données réelles.
  Fix: fournir une session locale authentifiée ou exécuter la QA dans un environnement de prévisualisation déjà connecté.

## Open Questions

- Les captures de la page protégée ne représentent pas la même vue que la maquette ; aucune conclusion visuelle ne doit être déduite de l’écran de connexion.

## Implementation Checklist

1. Ouvrir `/cockpit` avec une session authentifiée aux trois viewports demandés.
2. Comparer la capture 1440 × 900 avec la référence fournie, puis vérifier les états focus et les actions Nouvelle action, Rédiger et Simuler.
3. Mettre à jour ce rapport après comparaison visible.

## Comparison Evidence

- Source visual truth: `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/codex-clipboard-7b92f791-5371-44dc-9a64-389abd5c6d88.png`
- Implementation screenshot: `/tmp/kredo-cockpit-1440x900.png`
- Viewports captured: 1280 × 800, 1440 × 900, 1600 × 1000.
- State: anonymous local session; implementation was redirected to the login screen.
- Full-view comparison: blocked because the source is the authenticated Cockpit and the implementation capture is the login route.
- Focused-region comparison: not applicable until the authenticated Cockpit is captured.
- Primary interactions tested: route navigation only; protected-route redirection was observed. The Cockpit header actions could not be exercised without authentication.
- Console errors checked: no Cockpit runtime state could be reached through the anonymous session.

## Comparison History

1. Initial capture: blocked before visual comparison because `/cockpit` redirected to `/login?next=%2Fcockpit` at all requested Desktop viewports.

Final result: blocked.

---

# Design QA — Reports Atlas éditorial

## Sources de vérité

- Desktop : `/Users/dosta/Downloads/Image Codex 3 août 2026, 03_11_11.png` (2103 × 748). La page Rapports & rédaction est le panneau central de la planche.
- Mobile : `/Users/dosta/Downloads/Image Codex 3 août 2026, 03_11_23.png` (1538 × 1023). La page Rapports & rédaction est le téléphone central de la planche.
- Spécification écrite : les deux briefs joints au ticket. Elle prévaut sur la planche pour la suppression du hero et du sous-titre, ainsi que pour l’ouverture du document mobile dans une modale presque plein écran.

## Captures d’implémentation comparées conjointement aux références

- Desktop, document sélectionné : `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/kredo-reports-atlas-desktop-final-v3-1512x982.png` (1512 × 982).
- Mobile, bibliothèque : `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/kredo-reports-atlas-mobile-final-v3-390x844.png` (390 × 844).
- Mobile, document ouvert : `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/kredo-reports-atlas-mobile-dialog-final2-390x844.png` (390 × 844).
- Mobile compact : `/var/folders/nd/p8yph1j15bz4m89x1jpf6n3w0000gn/T/kredo-reports-atlas-mobile-375x812.png` (375 × 812).

## Comparaison visuelle

### Desktop

- Conforme : navigation locale étroite Documents / Historique / Génération, titre sans sous-titre, commandes regroupées à droite, bibliothèque dense, papier dominant, fiche latérale, liseré laiton de sélection.
- Conforme : proportions éditoriales, fond ivoire, surfaces papier, traits fins gris chauds, bleu nuit et accent laiton.
- Conforme : aucune carte surdimensionnée et aucune tuile sombre héritée.
- Adaptation attendue : la planche présente trois modules côte à côte, alors que la capture d’implémentation montre la route réelle avec le shell KREDO complet.

### Mobile

- Conforme : aucun hero ; les trois onglets suivent immédiatement le titre.
- Conforme : recherche, filtres compacts et lignes de documents continues remplissent le viewport.
- Conforme : le footer fixe contient exactement deux actions et reste au-dessus de la navigation globale KREDO.
- Conforme : la fiche s’ouvre dans une modale à 12 px des bords, avec header et actions fixes, contenu seul scrollable, fermeture par bouton et Échap, restauration du focus au déclencheur.
- Adaptation attendue : le shell mobile existant de KREDO conserve sa navigation basse, conformément à la contrainte de préserver l’architecture produit.

## Passes de correction

1. La première passe dépassait la hauteur du viewport sur desktop et mobile. Les conteneurs flex ont reçu des contraintes `min-height: 0` et le scroll a été localisé à la bibliothèque et au papier.
2. Le footer mobile chevauchait la navigation globale. Il a été repositionné avec l’offset de layout existant.
3. La première modale masquait ses actions sous le pli. `AppDialog` prend désormais en charge un mode pleine hauteur où seul le corps défile.
4. La liste et la modale ont été revérifiées à 390 × 844 et 375 × 812 ; aucun débordement horizontal n’est présent.

## Matrice de viewport

| Viewport | Résultat |
| --- | --- |
| 1512 × 982 desktop | Passé — page et thème sans débordement |
| 1440 × 900 desktop | Passé — page et thème sans débordement |
| 1280 × 800 desktop | Passé — page et thème sans débordement |
| 390 × 844 mobile réel | Passé — branche serveur mobile, liste et modale |
| 375 × 812 mobile réel | Passé — branche serveur mobile, aucun débordement horizontal |

## Interactions vérifiées

- Onglets Documents, Historique et Génération.
- Filtre, recherche et changement de document.
- Ouverture, fermeture et restauration du focus de la fiche mobile.
- Mode d’édition desktop puis annulation sans écriture.
- Historique des versions et actions de document visibles.
- Footer mobile : composer un mail et générer un rapport ouvrent les flux existants.
- Aucune erreur ou alerte navigateur dans l’état final.

## Résultat final

**Passé.** L’implémentation respecte le contrat Atlas éditorial et les écarts visibles restants correspondent aux adaptations explicitement imposées par le brief ou au shell KREDO existant.
