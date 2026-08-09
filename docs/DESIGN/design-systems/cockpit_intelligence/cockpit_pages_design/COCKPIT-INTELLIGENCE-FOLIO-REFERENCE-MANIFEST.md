# Cockpit Intelligence — Manifeste des références visuelles FOLIO

Statut : inventaire visuel du Lot 0.

Périmètre : les neuf captures FOLIO fournies le 4 août 2026, inspectées dans leur résolution d’origine.

Objet : identifier leur usage futur sans définir encore la charte graphique détaillée et sans proposer de nouveau design.

Les captures fournies sont prioritaires en cas de divergence avec le rendu actuel de `/legacy/folio/sector-studies`.

## Inventaire numéroté

| Réf. | Fichier fourni | Section représentée | Composants futurs concernés | Caractéristiques évidentes | État de la référence |
|---|---|---|---|---|---|
| 01 | `référence visuelle.png` | Marché | contexte de marché intégré à `Positionnement marché`, carte éditoriale de listes | header navy, icône jaune, titre en capitales, sous-titres éditoriaux, texte narratif et listes denses | Exploitable ; le bas de la section est volontairement recadré. |
| 02 | `codex-clipboard-67025b6f-7d61-4a6d-aaf3-367be3636942.png` | Synthèse sectorielle, référence pour la future Synthèse du compte | `AccountSummarySection`, bloc narratif d’ouverture | icône jaune cerclée, titre en capitales, long texte narratif, filet vertical de synthèse, encadrement clair | Exploitable et prioritaire pour la densité narrative. |
| 03 | `codex-clipboard-d919b5c5-0d97-41a3-b987-e71d79422c43.png` | Fiche d’identité | `CompanyIdentityGrid` | titre en capitales, grille d’identité à deux colonnes, libellés secondaires en capitales, valeurs plus fortes, ligne de dynamique pleine largeur | Exploitable. |
| 04 | `codex-clipboard-a7a5de58-7c1e-457a-869d-2e509b7f2e19.png` | Concurrence et positionnement | `MarketPositioningSection`, listes de concurrents et avantages | header navy, icône jaune, titre en capitales, texte narratif, listes éditoriales, noms clés en graisse forte | Exploitable ; la capture montre une section longue recadrée. |
| 05 | `codex-clipboard-5e7276d5-1273-42f0-a769-b28ba46a2d56.png` | Clientèle | `OffersAndCustomersSection`, sous-partie Clientèle | header navy, icône jaune, titre en capitales, profil narratif, segmentation en listes éditoriales, hiérarchie par sous-titres | Exploitable ; la fin de la section est recadrée. |
| 06 | `codex-clipboard-13db8972-e482-496e-bbbd-035805d6a00b.png` | Chaîne de valeur | `CompanyValueChainSection` | header navy, icône jaune, titre en capitales, description narrative, listes éditoriales par maillon, dépendance et vulnérabilité | Exploitable ; la fin de la section est recadrée. |
| 07 | `codex-clipboard-dc7502c2-2c15-47ef-a082-0e2a8a329aee.png` | Réglementations en vigueur | `RegulatoryEnvironmentSection` | header navy, icône jaune, titre en capitales, listes éditoriales, intitulés réglementaires en graisse forte | Exploitable ; couvre la première partie du composant. |
| 08 | `codex-clipboard-64f404e6-3350-4aaf-8f94-1186d8f7731c.png` | Certifications requises et risques de conformité | `RegulatoryEnvironmentSection` | continuité sans nouveau header, sous-titres en capitales, listes éditoriales denses, encadrement clair | Exploitable ; complète la référence 07. |
| 09 | `codex-clipboard-af8f951d-f792-4f24-83c3-15bcfdcc6fe7.png` | Modale Mails/Documents | `CompanyDocumentsModal` et patron générique de modale de consultation | modale sombre à panneaux, liste maître à gauche, détail à droite, sélection mise en évidence, header navy très sombre, pills, zone de contenu encadrée et overlay | Exploitable comme référence de modale à panneaux ; aucun changement de la modale existante dans le Lot 0. |

La référence 01 ne crée pas une huitième section fonctionnelle « Marché ». Ses codes visuels et éditoriaux servent uniquement au contexte de marché de la section contractuelle `Positionnement marché`.

## Caractéristiques communes à conserver comme références

- header navy pour les grandes cartes éditoriales ;
- icône jaune servant de repère de section ;
- titres et sous-titres en capitales ;
- texte narratif dense pour les synthèses et descriptions ;
- grille d’identité structurée ;
- listes éditoriales avec hiérarchie typographique ;
- filet vertical pour isoler la synthèse narrative ;
- modale à panneaux pour la consultation d’une collection et de son détail.

Ces constats décrivent seulement ce qui est visible. Ils ne fixent aucun token ni aucune mesure.

## Usage futur par section contractuelle

| Section V3 | Références principales | Usage attendu au Lot 1 |
|---|---|---|
| Synthèse du compte | 02 | étudier la densité, le filet vertical, l’icône et la hiérarchie d’ouverture ; |
| Fiche d’identité | 03 | mesurer la grille, l’alignement des libellés/valeurs et la ligne de dynamique ; |
| Positionnement marché | 01, 04 | mesurer les headers, les sous-titres narratifs et les listes de concurrence ; |
| Offres et clientèle | 05, complétée par 01 pour le patron de listes | définir les variantes narratives et listes sans inventer une mise en page d’offres absente des captures ; |
| Chaîne de valeur | 06 | mesurer le rythme des sous-sections et la densité des listes ; |
| Environnement réglementaire | 07, 08 | traiter les deux captures comme les deux parties d’un même composant ; |
| Tendances et actualité | 01 pour le patron éditorial ; aucune capture dédiée | reprendre seulement les caractéristiques visibles pertinentes, sans inventer de référence visuelle manquante ; |
| Modales de consultation | 09 | analyser la structure maître/détail, les panneaux, le header et l’overlay. |

## Éléments explicitement reportés au Lot 1

Le Lot 1 traitera :

- les mesures exactes ;
- les tokens de couleur ;
- les tailles et graisses typographiques ;
- les espacements et largeurs ;
- les interlignes ;
- les rayons, bordures et ombres ;
- les overlays et états de modale ;
- le comportement responsive et la déclinaison Mobile ;
- les vérifications d’accessibilité qui exigent le code ou une interaction réelle.

Les captures seules ne permettent pas de conclure sur le DOM, l’ordre de lecture assistive, la navigation clavier, les focus, le contraste exact ou le reflow. Ces points restent à vérifier pendant la conception détaillée et l’implémentation.

## Exclusions du manifeste

- aucune proposition graphique nouvelle ;
- aucun composant React ;
- aucun style ou token modifié ;
- aucune mesure déduite approximativement ;
- aucune correction du rendu legacy ;
- aucune extrapolation d’un état interactif non visible dans les captures.
