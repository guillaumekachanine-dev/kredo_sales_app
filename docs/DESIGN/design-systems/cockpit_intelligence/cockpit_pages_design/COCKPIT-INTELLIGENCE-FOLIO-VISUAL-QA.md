# Cockpit Intelligence — Plan de QA visuelle FOLIO

Statut : **TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
Date de production : 4 août 2026
Dernière vérification : 4 août 2026
Version : 1.1

Références :
- `docs/design/COCKPIT-INTELLIGENCE-FOLIO-CHARTER.md`
- `docs/design/COCKPIT-INTELLIGENCE-FOLIO-COMPONENT-MAP.md`

---

## 1. Matrice référence → composant

| Réf. capture | Section FOLIO | Section V3 cible | Composant(s) V3 | Éléments à contrôler |
|-------------|--------------|-----------------|-----------------|---------------------|
| 01 | Marché | Positionnement marché | FolioStudySection, FolioEditorialList, FolioNarrativeBlock | header navy, icône gold, sous-titres uppercase, listes denses, densité |
| 02 | Synthèse sectorielle | Synthèse du compte | FolioStudySummary | filet vertical, icône brass, bordure muted, texte narratif long |
| 03 | Fiche d'identité Kredo actuelle | — | — | **EXCLUE** : pas une cible FOLIO ; toute composition future = V3_EXTENSION |
| 04 | Concurrence | Positionnement marché (sous-parties concurrence) | FolioStudySection, FolioEditorialList | noms bold-dash, avantages, positionnement narratif |
| 05 | Clientèle | Offres et clientèle (sous-partie clientèle) | FolioStudySection, FolioEditorialList, FolioNarrativeBlock | profil narratif, segmentation bold, tendances comportementales |
| 06 | Chaîne de valeur | Chaîne de valeur | FolioStudySection, FolioEditorialList, FolioNarrativeBlock | description narrative, maillons, dépendances, vulnérabilités |
| 07 | Réglementations Kredo actuelles | — | — | **EXCLUE** : pas une cible FOLIO ; utiliser code/rendu legacy puis V3_EXTENSION |
| 08 | Certifications et risques Kredo actuels | — | — | **EXCLUE** : pas une cible FOLIO ; utiliser code/rendu legacy puis V3_EXTENSION |
| 09 | Modale Kredo actuelle | — | — | **EXCLUE** : pas une cible FOLIO ; la shell existante n'est qu'une preuve CODE |

Les références canoniques effectivement inspectées sont exclusivement 01, 02, 04, 05 et 06. Les Réf. 03, 07, 08 et 09 n'ont pas été utilisées pour prendre une décision graphique.

---

## 2. Captures de référence inspectées au Lot 1

| Réf. | Fichier | Dimensions d'origine | Recadrage observé | État |
|------|---------|-----------------------|--------------------|------|
| 01 | `référence visuelle.png` | 1004 × 1394 | Bas de la carte Marché recadré | Inspectée |
| 02 | `image 2.png` | 2026 × 912 | Carte de synthèse complète | Inspectée |
| 04 | `image 4).png` | 1006 × 1418 | Bas de la carte Concurrence recadré | Inspectée |
| 05 | `image 5.png` | 1002 × 1422 | Bas de la carte Clientèle recadré | Inspectée |
| 06 | `image 6.png` | 992 × 1402 | Bas de la carte Chaîne de valeur recadré | Inspectée |

Toutes portent un profil Display P3. La géométrie a été lue à l'échelle raster 2× puis normalisée en pixels CSS ; les aplats ont été contrôlés après conversion sRGB.

## 3. Captures obligatoires futures (Lot 5+)

### Par viewport et état

| ID | Viewport | Section | État | Description |
|----|----------|---------|------|-------------|
| QA-D-01 | Desktop 1440×900 | Synthèse du compte | Dense | Synthèse longue (≥15 lignes), filet visible |
| QA-D-02 | Desktop 1440×900 | Fiche d'identité | Complète | Toutes les valeurs présentes |
| QA-D-03 | Desktop 1440×900 | Positionnement marché | Dense | ≥5 concurrents, ≥5 avantages, positionnement narratif |
| QA-D-04 | Desktop 1440×900 | Offres et clientèle | Dense | ≥4 segments, tendances, besoins non couverts |
| QA-D-05 | Desktop 1440×900 | Chaîne de valeur | Dense | Description longue, ≥5 maillons, vulnérabilités |
| QA-D-06 | Desktop 1440×900 | Env. réglementaire | Dense | ≥5 réglementations, certifications, risques |
| QA-D-07 | Desktop 1440×900 | Tendances et actualité | Avec signaux | 3 signaux + bouton modale |
| QA-D-08 | Desktop 1440×900 | Page complète | Dense | Vue scrollée de haut en bas, toutes sections |
| QA-D-09 | Desktop 1440×900 | Modale signaux | Ouverte | Liste maître + détail sélectionné |
| QA-D-10 | Desktop 1440×900 | Page complète | Vide | Compte sans données FOLIO |
| QA-D-11 | Desktop 1440×900 | Page complète | V1 | Affichage legacy V1 |
| QA-D-12 | Desktop 1440×900 | Page complète | V2 | Affichage legacy V2 |
| QA-D-13 | Desktop 1440×900 | Page complète | V3 | Nouvel affichage V3 complet |
| QA-M-01 | Mobile 390×844 | Synthèse du compte | Dense | Texte long, pas de troncature |
| QA-M-02 | Mobile 390×844 | Fiche d'identité | Complète | Lignes empilées |
| QA-M-03 | Mobile 390×844 | Positionnement marché | Dense | Listes longues |
| QA-M-04 | Mobile 390×844 | Offres et clientèle | Dense | Segments empilés |
| QA-M-05 | Mobile 390×844 | Chaîne de valeur | Dense | Listes longues |
| QA-M-06 | Mobile 390×844 | Env. réglementaire | Dense | Listes longues |
| QA-M-07 | Mobile 390×844 | Tendances et actualité | Avec signaux | Cartes signaux + lien modale |
| QA-M-08 | Mobile 390×844 | Page complète | Dense | Scroll complet |
| QA-M-09 | Mobile 390×844 | Modale signaux | Ouverte | Plein écran |
| QA-M-10 | Mobile 390×844 | Page complète | Vide | État sans données |

---

## 4. Viewports obligatoires

| Viewport | Dimensions | Device | Usage | État Lot 1 |
|----------|-----------|--------|-------|-------------|
| Desktop principal | 1440 × 900 | Desktop | Référence principale | Exécuté — catalogue, Experis, Groupe IDEC, Audemard et état sans FOLIO |
| Desktop large | 1728 × 1117 | Desktop | Vérification captures larges si nécessaire | Non exécuté |
| Desktop compact | 1280 × 800 | Desktop | Vérification `max-w-5xl` | Reporté Lot 5 |
| iPhone 14 | 390 × 844 | Mobile | Référence Mobile | Exécuté — catalogue et détail dense Groupe IDEC |
| iPhone SE | 375 × 667 | Mobile | Petit écran Mobile | Reporté Lot 5 |
| iPad Mini | 768 × 1024 | Tablet | Breakpoint `md:` | Reporté Lot 5 |

La session Browser authentifiée a été reprise le 4 août 2026. Les routes ont été inspectées sans contourner l'authentification et sans écriture : captures viewport, snapshots DOM, styles calculés, recherche réelle et journaux console constituent les preuves d'audit du Lot 1.

---

## 5. Comptes de test

### Profils identifiés en lecture seule

| Profil | Compte | Mesures utiles | Usage prévu |
|--------|--------|----------------|-------------|
| **Dense** | Groupe IDEC | Synthèse 2 554 caractères ; JSON 30 599 octets ; 6 concurrents ; 6 segments ; 7 réglementations ; 9 maillons ; 10 signaux | QA-D-01 à 09, QA-M-01 à 09 |
| **Intermédiaire** | Audemard | Synthèse 2 015 caractères ; JSON 25 841 octets ; 5 concurrents ; 6 segments ; 5 réglementations ; 8 maillons ; 8 signaux | Rythme éditorial et grille |
| **Pauvre / Sans FOLIO** | Griesser | Aucun `sector_analysis`, aucun signal et aucun champ d'identité FOLIO exploitable | QA-D-10, QA-M-10 |

Sur l'ensemble des 81 études : synthèses de 1 504 à 3 011 caractères (moyenne 2 143), JSON de 17 647 à 35 159 octets (moyenne 27 260), maximum 6 concurrents, 7 segments, 8 réglementations, 9 certifications, 7 risques de conformité et 10 maillons clés.

Décision densité : afficher toutes les listes jusqu'à 10 items inclus. À partir du 11e item seulement, une disclosure devient une `V3_EXTENSION` acceptable. Le besoin de navigation par ancres Desktop est plausible au vu de la densité, mais son ergonomie reste à vérifier dans le rendu.

---

## 6. États à contrôler

### 6.1 État dense

| Contrôle | Critère de réussite |
|----------|-------------------|
| Texte non tronqué | Aucun `text-overflow`, `line-clamp`, `truncate` actif |
| Scroll vertical | La page scrolle naturellement, pas de scroll bloqué |
| Cartes à hauteur naturelle | La future grille V3 applique `items-start`; le legacy étire actuellement les items d'une même rangée par défaut |
| Listes longues | Jusqu'à 10 items affichés intégralement ; disclosure possible à partir du 11e |
| Filet synthèse | Visible et continu sur toute la hauteur du texte |

### 6.2 État moyen

| Contrôle | Critère de réussite |
|----------|-------------------|
| Rythme éditorial | L'espacement entre sections est cohérent (24px) |
| Densité lisible | Le texte ne paraît ni compressé ni trop aéré |

### 6.3 État pauvre

| Contrôle | Critère de réussite |
|----------|-------------------|
| Sections absentes | Les cartes sans données ne sont pas affichées |
| Message vide | « Données non disponibles. » en italique muted |
| Page minimale | Au moins la synthèse ou un message d'état |

### 6.4 État sans FOLIO

| Contrôle | Critère de réussite |
|----------|-------------------|
| Message clair | « Aucune étude sectorielle d'archive FOLIO n'est disponible pour ce compte. » |
| Pas de carte vide | Aucune carte avec juste un header |

### 6.5 État V1

| Contrôle | Critère de réussite |
|----------|-------------------|
| Lecteur historique | Le contenu V1 est affiché via son propre lecteur |
| Badge | « FOLIO original » ou « V1 » visible |
| Pas de conversion | Le contenu n'est pas reformaté en V3 |

### 6.6 État V2

| Contrôle | Critère de réussite |
|----------|-------------------|
| Lecteur historique | Le contenu V2 est affiché via son propre lecteur |
| Badge | Badge version visible |
| Pas de conversion | Pas de conversion rétroactive |

### 6.7 Futur état V3

| Contrôle | Critère de réussite |
|----------|-------------------|
| 7 sections | Les 7 sections V3 sont présentes dans l'ordre |
| Sources | Marqueurs de source visibles |
| Disclosure sources | Repliable en pied de section |
| États de preuve | Discrets et non dominants |
| Signaux | 3 signaux + accès modale |

---

## 7. Tolérances

### Géométrie

| Mesure | Tolérance | Méthode de contrôle |
|--------|-----------|-------------------|
| Espacements | ±2px | Inspection navigateur (computed styles) |
| Bordures | ±1px épaisseur | Inspection navigateur |
| Rayons | exact (valeur Tailwind) | Code + inspection |
| Largeur conteneur | exacte (`max-w-5xl`) | Code + inspection |
| Icônes | ±1px taille | Inspection |

### Typographie

| Mesure | Tolérance | Méthode de contrôle |
|--------|-----------|-------------------|
| Taille police | exacte (valeur Tailwind) | Computed styles |
| Graisse | exacte (400 ou 700) | Computed styles |
| Casse | exacte (uppercase ou normal) | Code |
| Interligne | exacte (valeur Tailwind) | Computed styles |
| Letter-spacing | exacte (valeur Tailwind) | Computed styles |

### Couleur

| Mesure | Tolérance | Méthode de contrôle |
|--------|-----------|-------------------|
| Couleur hexadécimale | ±1/canal (ex. `#1E3150` → `#1D3050` à `#1F3250`) | Computed styles ou pipette |
| Opacité | ±5% | Computed styles |

### Contraste

| Mesure | Exigence | Méthode de contrôle |
|--------|----------|-------------------|
| Texte courant / fond | WCAG AA (4.5:1) | Outil de contraste (axe, Lighthouse) |
| Texte large (≥18px) / fond | WCAG AA (3:1) | Outil de contraste |
| Icônes / fond | 3:1 minimum | Outil de contraste |

---

## 8. Contrôles d'accessibilité

### Focus visible

| Contrôle | Critère |
|----------|---------|
| Bouton fermeture modale | Focus ring `brand-brass/60`, 2px |
| Liens | Focus visible par outline ou ring |
| Disclosure sources | Focus visible sur `<summary>` |
| Signaux cliquables | Focus visible |

### Ordre de tabulation

| Contrôle | Critère |
|----------|---------|
| Page principale | Ordre logique : header → synthèse → sections → signaux |
| Modale | Tab circule uniquement dans la modale (focus trap) |
| Marqueurs source | Tabbables dans l'ordre de lecture |
| Disclosure | `<summary>` tabbable, contenu tabbable une fois déplié |

### Fermeture par Échap

| Contrôle | Critère |
|----------|---------|
| Modale signaux | Se ferme immédiatement |
| Modale documents | Se ferme immédiatement |
| Disclosure sources | Ne se ferme PAS par Échap (comportement natif `<details>`) |

### Piège de focus dans les modales

| Contrôle | Critère |
|----------|---------|
| Tab depuis dernier élément | Retourne au premier |
| Shift+Tab depuis premier | Retourne au dernier |
| Éléments cachés | Exclus du cycle (`aria-hidden`, `display:none`) |
| Focus initial | Sur le bouton de fermeture |
| Restauration | Au focus précédent à la fermeture |

### Ordre de lecture assistive

| Contrôle | Critère |
|----------|---------|
| Hiérarchie headings | `<h1>` → `<h2>`/`<h3>` → `<h4>` sans saut |
| Listes | `<ul>/<li>` sémantique |
| Labels identité | `<dl>/<dt>/<dd>` pour les paires |
| Icônes | `aria-hidden="true"` |
| Filet vertical | Décoratif, `aria-hidden` |

### Touch targets

| Contrôle | Critère |
|----------|---------|
| Bouton fermeture modale | ≥44px (vérifié : `size-11` = 44px) |
| Liens modale | ≥44px zone cliquable |
| Marqueurs source | ≥24px zone cliquable (exposants) |
| Cartes signal Mobile | ≥44px hauteur |
| Disclosure summary | ≥44px hauteur |

### Zoom 200%

| Contrôle | Critère |
|----------|---------|
| Texte lisible | Aucun chevauchement à 200% zoom |
| Layout préservé | Le conteneur `max-w-5xl` se comporte correctement |
| Pas de scroll horizontal | Le contenu reflow sans overflow-x |
| Images/icônes | Pas de pixellisation (SVG) |

### Réduction de mouvement

| Contrôle | Critère |
|----------|---------|
| `prefers-reduced-motion` | Toutes les animations respectent ce media query |
| Modale | `animate-in fade-in` désactivée avec `motion-reduce:animate-none` (vérifié dans le code) |
| Transitions | `motion-reduce:transition-none` sur les transitions CSS |
| Skeleton loading | Si animé, respect du flag |

---

## 9. Contrôles de débordement et reflow

| Contrôle | Critère |
|----------|---------|
| Texte long dans label | Le label se wrappe sans overflow |
| Texte long dans valeur | La valeur se wrappe sans overflow |
| Liste très longue | Pas de overflow-y:hidden involontaire |
| Nom de concurrent très long | Wrapping naturel dans `<li>` |
| Synthèse très longue | Le filet vertical s'étend avec le contenu |
| Modale avec beaucoup de signaux | Scroll dans le panneau maître |
| Tags nombreux | `flex-wrap` sans overflow |

---

## 10. Contrôles de sections longues

| Contrôle | Critère |
|----------|---------|
| Section avec 11+ items | La carte s'étend sans `max-h`; la disclosure V3 éventuelle reste accessible au clavier |
| Synthèse 30+ lignes | Le filet vertical couvre tout le texte |
| Page totale > 3000px | Le scroll fonctionne normalement |
| Grille 2 colonnes asymétrique | V3 : `items-start` confirme des hauteurs naturelles ; legacy : étirement par défaut documenté |
| Pas de disclosure forcée | Les items restent visibles sauf disclosure V3 explicite |

---

## 11. Registre capture / rendu / computed / code / décision

| Élément | Capture canonique | Rendu actuel | Style calculé | Code | Décision |
|---------|--------------------|--------------|----------------|------|----------|
| Filet synthèse | Réf. 02 : 4px raster à 2× = **2px CSS** | Visible sur Experis et Groupe IDEC | Rail à 950px, `padding-left: 16px` ; `border-l-2` confirmé par code | `border-l-2` | Conserver 2px ; CAPTURE + RENDU + CODE concordent |
| Header navy | Réf. 01/04/05/06 : 76px raster = **38px CSS**, bordures incluses | Experis capturé à 1440×900 | **37px** rendus sur la section Marché | `py-2.5` + line-height 16px + bordures 1px | Écart de 1px dans la tolérance ; conserver le contrat 38px |
| Padding header | Environ 28px × 20px raster = **14px × 10px CSS** | Concordance visuelle sur Experis | Header contenu dans une carte 484px ; padding conforme au code | `px-3.5 py-2.5` | Conserver |
| Icône header | Trait visible 22–26px raster dans une boîte logique **14px** | Visible sur Marché | Concordance visuelle | `w-3.5 h-3.5`, stroke 2 | Conserver 14px |
| Couleurs d'aplat | Après P3→sRGB : navy `#1E3250`, gold `#FBC024`, body `#334156`, border `#CBD5E1` | Concordance visuelle avec Experis | Blanc `rgb(255,255,255)`, bordure `rgb(203,213,225)`, texte Lato | `#1E3150`, `#FBBF24`, `#334155`, `#CBD5E1` | Conserver les tokens CODE ; écarts P3/sRGB documentés |
| Carte en grille | Réf. 01/04/05/06 : **484px CSS** de large au conteneur max | Experis et Audemard capturés | **484px**, rayon 8px, bordure 1px | `(992px - 24px) / 2 = 484px` | Conserver largeur et gap |
| Synthèse pleine largeur | Réf. 02 : **992px CSS** de large ; bordure 1px ; padding 20px | Experis capturé | **992px**, bordure 1px `rgb(100,116,139)`, rayon 8px, padding 20px | conteneur 1024px avec `px-4`, `p-5`, bordure 1px | Conserver |
| Hauteur des cartes d'une rangée | Non démontrable par les recadrages unitaires | Audemard : paires à 1 017px, 1 145px puis 1 299px | Étirement Grid confirmé | aucun `items-start` | `items-start` reste une V3_EXTENSION recommandée |
| Fiche d'identité | Aucune capture canonique | Non capturé | Non disponible | Aucun composant de fiche dans la page legacy ; seulement `InfoRow` | Toute grille 2 colonnes = V3_EXTENSION |
| Réglementation détaillée | Aucune capture canonique | Non capturé | Non disponible | Structure et listes disponibles dans le legacy | Réutiliser la structure ; graphisme nouveau = V3_EXTENSION |
| Modale signaux/documents | Aucune capture canonique | Non capturé | Non disponible | `IntelligenceSplitModalShell` et `CompanyDocumentsModal` | Réutiliser contraintes et interactions ; graphisme = V3_EXTENSION |

### Desktop, Mobile et accessibilité : contrôles réellement exécutés

| Domaine | Vérifié | Non vérifié / limite |
|---------|---------|---------------------|
| Desktop | 1440×900 réel ; catalogue, recherche 81 → 1, navigation vers l'étude, Experis, Groupe IDEC, Audemard, vide, scroll, DOM, computed styles ; zéro warning/erreur console | Modale non ouverte dans ce parcours legacy |
| Mobile | 390×844 réel ; détail dense sans overflow de page ni texte coupé ; catalogue sans overflow de page | Catalogue : tableau interne défilable horizontalement (292px visibles sur 1 101px), action hors champ initial |
| Modale | `role="dialog"`, `aria-modal`, focus initial, trap Tab/Shift+Tab, Échap, restauration du focus et bouton 44px confirmés dans le code ; 7 tests unitaires ciblés passent | Exécution Browser, scroll interne et fermeture tactile reportés au Lot 5 |
| Sémantique | `h1`, `h3`, `ul/li` et liens accessibles présents ; focus visible sur la recherche | `html lang="en"` incorrect pour le contenu français ; `Tab` observé sur le même champ au lieu du contrôle suivant |
| Touch targets | Recherche Desktop 34px ; Mobile 42px ; selects Mobile 39,5px | Tous sont sous la cible 44px et doivent être corrigés en V3 |
| Zoom / contraste | Reflow équivalent 200 % testé à 720×450 sans overflow de page ; tokens visuels comparés aux références | Zoom natif, axe/Lighthouse et contraste automatisé reportés au Lot 5 |

Les variantes Mobile reprises dans V3 sont toutes des `V3_EXTENSION` graphiques faute de capture historique Mobile canonique. Cette revue ne constitue pas une déclaration de conformité WCAG.

---

## 12. Checklist de validation finale

### Pré-implémentation (Lot 1)

- [x] Charte graphique documentée
- [x] Component map documentée
- [x] Plan de QA défini
- [x] Réf. 01, 02, 04, 05 et 06 inspectées à leur résolution d'origine
- [x] Réf. 03, 07, 08 et 09 explicitement exclues comme cibles graphiques
- [x] Styles calculés navigateur vérifiés
- [x] Comptes de test Supabase identifiés en lecture seule
- [x] Desktop 1440×900 et Mobile 390×844 exécutés
- [x] Interaction réelle et console exécutées
- [x] État dense, intermédiaire et sans FOLIO exécutés
- [x] Comparaison simultanée Réf. 01/02 ↔ rendu Experis exécutée
- [x] Écarts accessibilité Lot 1 consignés (`lang`, tabulation, 44px, tableau Mobile)

### Post-implémentation (Lot 5+)

- [ ] Toutes les captures QA-D-* réalisées
- [ ] Toutes les captures QA-M-* réalisées
- [ ] Divergences captures historiques documentées
- [ ] Contraste AA vérifié (Lighthouse ou axe)
- [ ] Focus visible testé clavier
- [ ] Focus trap modale testé
- [ ] Échap modale testé
- [ ] Touch targets 44px vérifiés
- [ ] Zoom 200% vérifié
- [ ] `prefers-reduced-motion` vérifié
- [ ] Ordre tabulation vérifié
- [ ] Hiérarchie headings vérifiée
- [ ] Reflow sans scroll-x vérifié
- [ ] Sections longues testées (≥11 items ou maximum de données disponible)
- [ ] États V1/V2/V3/vide/erreur testés

> Aucun test Playwright permanent n'est créé au Lot 1 et aucune dépendance n'a été ajoutée. La passe Browser authentifiée est achevée ; les écarts observés sont reportés comme critères de correction des Lots d'implémentation. Le Lot 1 est **TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**.
