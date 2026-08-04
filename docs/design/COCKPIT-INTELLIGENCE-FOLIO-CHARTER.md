# Cockpit Intelligence — Charte graphique FOLIO

Statut : **TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
Date de production : 4 août 2026
Dernière vérification : 4 août 2026
Version : 1.1

---

## A. Définition de la direction graphique

### Périmètre exact

La « direction graphique FOLIO » désigne la grammaire visuelle appliquée aux pages d'analyse sectorielle historiques de KREDO, accessibles aux routes :

- `/legacy/folio/sector-studies` — catalogue des études ;
- `/legacy/folio/sector-studies/[companyId]` — détail d'une étude par compte.

Cette direction graphique ne s'applique ni aux pages CRM, ni aux dashboards opérationnels, ni aux écrans de saisie. Elle se destine exclusivement aux contenus narratifs, analytiques et éditoriaux.

### Références prioritaires

Ordre de priorité (conforme au contrat) :

1. Captures historiques FOLIO jointes ;
2. Rendu réel des routes legacy ;
3. Styles calculés dans le navigateur ;
4. Code source legacy ;
5. Décisions nouvelles strictement nécessaires à V3.

### Distinction fondamentale

| Concept | Ce qu'il désigne | Ce qu'il ne désigne pas |
|---------|-----------------|------------------------|
| Direction graphique | palette, typographie, rythme, géométrie, signatures visuelles | structure des données, contenu éditorial |
| Structure de contenu | les sept sections V3, leurs sous-sections, l'ordre obligatoire | la mise en page ou les tokens visuels |
| Architecture n8n | les workflows de génération Phase 1 et Phase 2 | le rendu, les composants, les mesures visuelles |

### Principes à préserver

- cartes éditoriales blanches bordées ;
- headers navy pleine largeur pour les sections Desktop ;
- pictogrammes jaune (gold) comme repère de section ;
- titres et sous-titres en capitales avec tracking élargi ;
- texte bleu-gris dense et narratif ;
- paragraphes longs et listes éditoriales structurées ;
- noms importants et intitulés en graisse forte ;
- synthèse encadrée avec filet vertical ;
- hiérarchie sobre sans badges décoratifs excessifs ;
- rendu flat, minimaliste et premium ;
- séparation serveur Desktop / Mobile (pas de hide/show CSS) ;
- pas d'ombres fortes — bordures et aplats portent la hiérarchie.

### Principes explicitement non retenus

- dashboards de KPI avec indicateurs numériques dominants ;
- grilles de micro-cartes ou tuiles interactives ;
- couleur orange ou gold utilisée comme couleur dominante ;
- ombres fortes (`shadow-md`, `shadow-lg`) ;
- gradients décoratifs ou effets néon ;
- animations permanentes ou effets 3D ;
- dark mode pour les cartes de contenu ;
- hauteurs de section artificiellement synchronisées ;
- troncature silencieuse du contenu.

---

## B. Sources et méthodologie

### Inventaire des captures inspectées

| Réf. | Section représentée | Statut Lot 1 | Usage autorisé |
|------|--------------------|--------------|-----------------|
| 01 | Marché (→ Positionnement marché V3) | ✅ Canonique, 1004 × 1394 px | Cible graphique historique |
| 02 | Synthèse sectorielle (→ Synthèse du compte V3) | ✅ Canonique, 2026 × 912 px | Cible graphique historique |
| 03 | Fiche d'identité Kredo actuelle | ⛔ Exclue | Ne jamais utiliser comme cible FOLIO |
| 04 | Concurrence et positionnement | ✅ Canonique, 1006 × 1418 px | Cible graphique historique |
| 05 | Clientèle | ✅ Canonique, 1002 × 1422 px | Cible graphique historique |
| 06 | Chaîne de valeur | ✅ Canonique, 992 × 1402 px | Cible graphique historique |
| 07 | Réglementations Kredo actuelles | ⛔ Exclue | Ne jamais utiliser comme cible FOLIO |
| 08 | Certifications et risques Kredo actuels | ⛔ Exclue | Ne jamais utiliser comme cible FOLIO |
| 09 | Modale Kredo actuelle | ⛔ Exclue | Ne jamais utiliser comme cible FOLIO |

Les références 03, 07, 08 et 09 ne sont ni manquantes ni attendues : elles montrent la mise en page Kredo à remplacer. Pour leurs surfaces fonctionnelles, l'ordre de preuve est rendu legacy observé → styles calculés → code legacy → décision `V3_EXTENSION`.

Les cinq fichiers canoniques portent un profil **Display P3** et un rendu raster 2×. Les couleurs citées comme `CAPTURE` ci-dessous ont été contrôlées après conversion vers sRGB ; les mesures géométriques distinguent pixels raster et pixels CSS logiques.

### Routes inspectées

| Route | Méthode d'inspection |
|-------|---------------------|
| `/legacy/folio/sector-studies` | Code source + rendu Browser authentifié ; catalogue, recherche, console et responsive inspectés |
| `/legacy/folio/sector-studies/[companyId]` | Code source + captures historiques + rendu Browser authentifié ; profils Experis, Groupe IDEC, Audemard et état sans FOLIO inspectés |

### Viewports de référence

| Viewport | Dimensions | Usage |
|----------|-----------|-------|
| Desktop principal | 1440 × 900 | Exécuté le 4 août 2026 dans le Browser authentifié |
| Desktop large | 1728 × 1117 | Optionnel, non exécuté |
| iPhone 14 | 390 × 844 | Exécuté le 4 août 2026 dans le Browser authentifié |

### Composants inspectés

| Composant | Fichier | Lignes |
|-----------|---------|--------|
| FolioSectorAnalysisPanel | `src/features/legacy/folio/FolioSectorAnalysisPanel.tsx` | 281 |
| FolioMobileAnalysisSections | `src/features/legacy/folio/FolioMobileAnalysisSections.tsx` | 224 |
| FolioSectorStudyDetail | `src/features/legacy/folio/FolioSectorStudyDetail.tsx` | 98 |
| FolioSectorStudiesCatalogue | `src/features/legacy/folio/FolioSectorStudiesCatalogue.tsx` | 277 |
| FolioBanner | `src/features/legacy/folio/FolioBanner.tsx` | 20 |
| icons | `src/features/legacy/folio/icons.tsx` | 63 |
| types | `src/features/legacy/folio/types.ts` | 65 |
| utils | `src/features/legacy/folio/utils.ts` | 89 |
| folio-loader | `src/features/legacy/folio/folio-loader.ts` | 96 |
| folio-legacy-contracts | `src/lib/intelligence/folio-legacy-contracts.ts` | 201 |
| IntelligenceSplitModalShell | `src/components/intelligence/IntelligenceSplitModalShell.tsx` | 165 |
| CompanyDocumentsModal | `src/components/accounts-contacts/intelligence/CompanyDocumentsModal.tsx` | 1002 |

### Règles d'origine

Chaque valeur porte l'une des origines suivantes :

| Origine | Signification |
|---------|---------------|
| **CAPTURE** | Mesurée ou observée sur une capture historique FOLIO |
| **COMPUTED** | Relevée depuis les styles calculés dans le navigateur |
| **CODE** | Extraite du code source (JSX, CSS, configuration) |
| **V3_EXTENSION** | Décision nouvelle, nécessaire à V3, absente du FOLIO historique |
| **À CONFIRMER** | Valeur incertaine nécessitant vérification |

---

## C. Tokens de couleur

### Palette FOLIO canonique

| Nom fonctionnel | Hex | Variable CSS | Origine | Usage autorisé | Usage interdit | Contraste (approx. WCAG sur blanc) |
|----------------|-----|-------------|---------|---------------|----------------|-------------------------------------|
| Navy principal | `#1E3150` | `--color-edito-navy` | CODE + CAPTURE | Header section Desktop, fond banner, icône Mobile bg @10% | Texte courant sur fond sombre sans contraste suffisant | 10.2:1 ✅ AAA |
| Navy secondaire / Heading | `#243B63` | `--color-edito-heading` | CODE + CAPTURE | Titres de sous-section, labels uppercase | Fond de carte, texte courant | 7.5:1 ✅ AAA |
| Jaune d'accent (Gold) | `#FBBF24` | `--color-edito-gold` | CODE + CAPTURE | Icônes section Desktop (sur navy), titre banner | Texte courant sur blanc, fond de page | 1.9:1 sur blanc ❌ |
| Brass | `#D89B16` | `--color-edito-brass` | CODE + CAPTURE | Icône synthèse, badge FOLIO original | Texte courant sur blanc | 3.2:1 sur blanc ❌ |
| Texte principal (Ink) | `#1E293B` | `--color-edito-ink` | CODE | Texte dominant, texte sur brass clair | — | 13.6:1 ✅ AAA |
| Texte courant (Body) | `#334155` | `--color-edito-body` | CODE + CAPTURE | Paragraphes, listes, valeurs | Titres principaux | 8.0:1 ✅ AAA |
| Texte secondaire (Muted) | `#64748B` | `--color-edito-muted` | CODE | Métadonnées, états vides, filet synthèse | Texte d'information critique | 4.7:1 ✅ AA |
| Fond de page réellement visible | `#F4F2ED` | `--color-canvas` | CODE + CAPTURE | Canvas des routes legacy dans l'application | — | — |
| Canvas edito secondaire | `#F8FAFC` | `--color-edito-canvas` | CODE | Surfaces secondaires explicites ; non observé comme fond de page dans les cinq captures | — | — |
| Fond de carte (Surface) | `#FFFFFF` | `--color-edito-surface` | CODE + CAPTURE | Carte, zone de contenu | — | — |
| Bordure | `#CBD5E1` | `--color-edito-border` | CODE + CAPTURE | Bordures de carte, séparateurs, tags | — | — |
| Chip / Tag neutre | `#F1F5F9` | `--color-edito-chip` | CODE | Tags challengers, fonds neutres discrets | — | — |
| Chip soft | `#F8FAFC` | `--color-edito-chip-soft` | CODE | Tags leaders, surfaces très discrètes | — | — |
| Amber soft | `#FEF3C7` | `--color-edito-amber-soft` | CODE | Tags émergents, signaux secondaires | — | — |
| Overlay modale | `slate-950/65` | inline | CODE | Fond modale, backdrop-blur-md | — | — |
| Fond modale | `#0f122c` | inline | CODE | Intérieur modale split | — | — |

Contrôle colorimétrique des aplats des captures après conversion Display P3 → sRGB : navy `#1E3250`, heading `#243C63`, body `#334156`, border `#CBD5E1`, gold `#FBC024`, brass `#D89B18`. Les écarts d'un à deux niveaux par canal sont des arrondis de conversion de profil ; les valeurs CSS ci-dessus restent les valeurs de référence à implémenter. Le canvas mesuré `#F4F2EE` correspond au token `#F4F2ED` à un niveau près.

### Variantes thème edito-bright-cockpit

Le Cockpit Intelligence utilise un thème légèrement différent :

| Token | Valeur cockpit | Valeur FOLIO legacy | Différence |
|-------|---------------|---------------------|------------|
| canvas | `#F4F2ED` | `#F8FAFC` | Plus chaud (parcheminé) |
| surface | `#FDFCFA` | `#FFFFFF` | Très légèrement crème |
| border | `#DBE0EB` | `#CBD5E1` | Plus doux |
| heading | `#1A2540` | `#243B63` | Plus sombre |
| body | `#526074` | `#334155` | Plus clair |
| muted | `#93A0B0` | `#64748B` | Plus clair |

> **Décision V3** : la palette FOLIO legacy `edito-*` est la référence. Le thème cockpit est une adaptation contextuelle. Les composants V3 de l'onglet Entreprise DOIVENT utiliser les tokens `edito-*` définis dans `globals.css`. Origine : **CODE**.

### États de preuve — V3_EXTENSION

| État | Usage | Couleur suggérée | Origine |
|------|-------|-----------------|---------|
| Confirmé | Fait vérifié par source indépendante | Subtil : icône `edito-brass` ou coche discrète | V3_EXTENSION |
| Partiellement confirmé | Preuve incomplète | Subtil : icône `edito-muted` | V3_EXTENSION |
| Non publié | Affirmation sans source identifiable | Subtil : texte `edito-muted`, style italique | V3_EXTENSION |
| Déclaration institutionnelle | Discours revendiqué | Subtil : guillemets, couleur `edito-muted` | V3_EXTENSION |

> Les états de preuve restent discrets. Aucun badge coloré dominant. L'objectif est de signaler sans transformer la page en mosaïque.

---

## D. Typographie

### Famille de police

| Police | Variable CSS | Graisses chargées | Usage | Origine |
|--------|-------------|-------------------|-------|---------|
| **Lato** | `--font-sans` | 400 (regular), 700 (bold) | Tout le texte FOLIO legacy et cockpit (labels, prose, titres) | CODE |
| **Manrope** | `--font-heading` | 500, 600, 700 | Titres généraux KREDO (hors contexte FOLIO) | CODE |

> **IMPORTANT** : Le thème `edito-bright-cockpit` remplace `--font-heading` par `--font-sans`, ce qui signifie que **tout le contenu FOLIO et cockpit utilise Lato**. Origine : CODE.

### Fallback

```
font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
```

### Hiérarchie typographique

| Élément | Desktop | Mobile | Graisse | Casse | Tracking | Interligne | Origine |
|---------|---------|--------|---------|-------|----------|------------|---------|
| Titre de page | `text-xl` / `text-2xl` (20-24px) | `text-xl` (20px) | 700 | normal | `tracking-tight` | tight | CODE |
| Sous-titre contexte | `text-xs` / `text-sm` (12-14px) | `text-xs` (12px) | 500 | normal | normal | normal | CODE |
| Titre de grande section (header navy) | `text-xs` (12px) | `text-xs` (12px) | 700 | **uppercase** | `tracking-wider` | default | CODE + CAPTURE |
| Titre de synthèse | `text-xs` (12px) | `text-xs` (12px) | 700 | **uppercase** | `tracking-wider` | default | CODE + CAPTURE |
| Sous-titre éditorial (sous-section) | `text-[11px]` | `text-[10px]` | 700 | **uppercase** | `tracking-wider` / `tracking-wide` | default | CODE + CAPTURE |
| Label de fiche d'identité | `text-[11px]` | `text-[10px]` | 700 | **uppercase** | `tracking-wider` | default | CODE |
| Valeur | `text-xs` (12px) | `text-xs` (12px) | 400 | normal | normal | relaxed | CODE |
| Corps narratif | `text-sm` (14px) | `text-xs` (12px) | 400 | normal | normal | `leading-relaxed` | CODE + CAPTURE |
| Liste éditoriale | `text-xs` (12px) | `text-xs` (12px) | 400 | normal | normal | default / relaxed | CODE + CAPTURE |
| Noms importants dans les listes | `text-xs` (12px) | `text-xs` (12px) | 700 (`<strong>`) | normal | normal | default | CODE + CAPTURE |
| Métadonnée | `text-[10px]` | `text-[10px]` | 700 | **uppercase** | `tracking-wider` | default | CODE |
| Source / provenance | `text-[9px]` | `text-[9px]` | 700-900 (`font-black`) | **uppercase** | `tracking-wider` | default | CODE |
| État de preuve | — | — | — | — | — | — | V3_EXTENSION |
| Tags | `text-[9px]`–`text-[10px]` | identique | 400-500 | normal | normal | default | CODE |

### Règles de paragraphes

- Corps narratif : `leading-relaxed` (1.625) — Origine : CODE + CAPTURE
- Largeur de lecture maximale : `max-w-5xl` (~1024px avec padding) — Origine : CODE
- Aucune troncature par défaut — les sections longues s'étendent naturellement — Origine : CAPTURE + CODE
- Les mots-clés et noms importants sont en `<strong>` / `font-bold` — Origine : CAPTURE

### Règles de listes

- Listes à puces : `list-disc`, indentation `pl-4` (16px) Desktop, `pl-4` (16px) Mobile — Origine : CODE
- Espacement entre items : `space-y-0.5` (2px) à `space-y-1.5` (6px) selon contexte — Origine : CODE
- Format éditorial : `**Nom** — description` pour les concurrents, réglementations, segments — Origine : CAPTURE + CODE
- Aucun nombre d'items figé : les listes s'étendent selon la densité des données — Origine : décision FOLIO confirmée par les captures

### Hiérarchie des titres (HTML)

| Niveau | Élément visuel | Composant |
|--------|---------------|-----------|
| `<h1>` | Nom du compte | FolioSectorStudyDetail (un seul par page) |
| `<h3>` | Titre de section (dans le header navy) | Section (Desktop), Section (Mobile) |
| Pas de `<h2>` | — | Le bandeau ne contient pas de heading sémantique |
| `<span>` uppercase | Sous-titre éditorial | InfoRow, BulletList labels |

> V3_EXTENSION : vérifier que la hiérarchie `h1 > h2 > h3` est correcte pour l'accessibilité lors de l'implémentation V3.

### Comportements Desktop et Mobile

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Taille corps | `text-sm` (14px) | `text-xs` (12px) |
| Taille label | `text-[11px]` | `text-[10px]` |
| Interligne corps | `leading-relaxed` | `leading-relaxed` |
| Casse titres | uppercase | uppercase |
| Police | Lato 400/700 | Lato 400/700 |

---

## E. Espacements et géométrie

### Unité de base

Échelle de référence : **4px** (multiples de 4).
Grille dominante : 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 px.
Origine : CODE.

### Conteneur principal

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Largeur maximale | `max-w-5xl` (1024px) | CODE |
| Padding horizontal | `px-4` (16px) | CODE |
| Padding vertical | `py-6` (24px) | CODE |
| Espacement vertical entre modules | `space-y-6` (24px) | CODE |
| Centrage | `mx-auto` | CODE |

### Carte Section Desktop

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Rayon | `rounded-lg` (8px) | CODE |
| Bordure | `border border-[#CBD5E1]` (1px) | CODE |
| Fond | `bg-[#FFFFFF]` | CODE |
| Overflow | `overflow-hidden` | CODE |
| Header — fond | `bg-[#1E3150]` | CODE + CAPTURE |
| Header — padding | `px-3.5 py-2.5` (14px × 10px) | CODE |
| Header — bordure basse | `border-b border-[#CBD5E1]` (1px) | CODE |
| Header — gap icône-texte | `gap-1.5` (6px) | CODE |
| Header — hauteur rendue | 38px CSS (76px raster 2×, bordures incluses) | CODE + CAPTURE |
| Body — padding | `p-4` (16px) | CODE |
| Body — espacement vertical | `space-y-4` (16px) | CODE |

### Grille Desktop

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Colonnes | `grid-cols-1 md:grid-cols-2` (1 col Mobile, 2 Desktop) | CODE |
| Gap | `gap-6` (24px) | CODE |
| Alignement vertical legacy | `stretch` par défaut de CSS Grid ; les cartes d'une même rangée peuvent prendre la hauteur de la plus dense | CODE |
| Largeur d'une carte au conteneur max | 484px CSS (968px raster 2×) | CODE + CAPTURE |

> **Divergence documentée** : `edito_bright_design.md` demande des hauteurs naturelles, mais la grille legacy n'applique pas `items-start`. Le futur rendu V3 devra choisir explicitement `items-start` pour éviter l'étirement ; cette correction est une **V3_EXTENSION**, pas une propriété démontrée par les captures.

### Synthèse (pleine largeur)

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Rayon | `rounded-lg` (8px) | CODE |
| Bordure | `border border-[#64748B]` (1px, plus forte que les cartes) | CODE |
| Fond | `bg-[#FFFFFF]` | CODE |
| Padding | `p-5` (20px) | CODE |
| Icône | 16px × 16px, `text-[#D89B16]` (brass) | CODE + CAPTURE |
| Gap icône-titre | `gap-2` (8px) | CODE |
| Marge titre-filet | `mb-3` (12px) | CODE |
| Filet vertical | `border-l-2` (2px CSS ; 4px raster 2×), `border-[#64748B]` | CODE + CAPTURE |
| Padding filet | `pl-4` (16px) | CODE |
| Espacement paragraphes | `space-y-3` (12px) | CODE |
| Taille texte | `text-sm` (14px), `leading-relaxed` | CODE + CAPTURE |
| Largeur rendue au conteneur max | 992px CSS (1984px raster 2×) | CODE + CAPTURE |

### Header de page / Identité

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Layout | `flex flex-col sm:flex-row sm:items-center sm:justify-between` | CODE |
| Gap | `gap-4` (16px) | CODE |
| Padding | `p-5` (20px) | CODE |
| Rayon | `rounded-xl` (12px) | CODE |
| Bordure | `border border-border` (1px) | CODE |
| Fond | `bg-surface` | CODE |
| Ombre | `shadow-sm` (toléré uniquement ici) | CODE |

### Banner FOLIO (archive)

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Marge basse | `mb-6` (24px) | CODE |
| Rayon | `rounded-lg` (8px) | CODE |
| Bordure | `border border-[#CBD5E1]` (1px) | CODE |
| Fond | `bg-[#1E3150]` (navy) | CODE |
| Padding | `p-4` (16px) | CODE |
| Ombre | `shadow-sm` | CODE |
| Badge | `rounded`, bg `#D89B16`, text `#1E293B`, `text-[9px]` font-black uppercase | CODE |
| Titre | `text-xs`, font-bold, uppercase, tracking-wider, `text-[#FBBF24]` | CODE |
| Texte | `text-xs`, `text-[#CBD5E1]`, leading-relaxed | CODE |

### Mobile — Surface unifiée

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Fond | `bg-[#FFFFFF]` | CODE |
| Padding | `p-4` (16px) | CODE |
| Rayon | `rounded-xl` (12px) | CODE |
| Bordure | `border border-[#CBD5E1]` (1px) | CODE |
| Espacement entre sections | `space-y-6` (24px) | CODE |

### Mobile — Section

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Séparateur | `border-b border-border` (1px), sauf dernier (`last:border-0 last:pb-0`) | CODE |
| Padding bas | `pb-4` (16px) | CODE |
| Espacement interne | `space-y-2` (8px) | CODE |
| Icône container | `h-6 w-6` (24px), `rounded-md`, `bg-[#1E3150]/10` | CODE |
| Icône | `h-3.5 w-3.5` (14px), `text-[#1E3150]` | CODE |
| Gap icône-titre | `gap-2` (8px) | CODE |
| Indentation contenu | `pl-8` (32px) | CODE |
| Espacement sous-items | `space-y-3` (12px) | CODE |

### Modale split (patron)

| Propriété | Valeur | Origine |
|-----------|--------|---------|
| Overlay | `bg-slate-950/65`, `backdrop-blur-md` | CODE |
| Padding overlay Desktop | `p-4` (16px) | CODE |
| Padding overlay Mobile | `p-0` | CODE |
| Container Desktop | `h-[80vh]`, `max-h-[750px]`, `max-w-5xl` | CODE |
| Container Mobile | `fixed inset-0`, `h-dvh`, plein écran | CODE |
| Rayon Desktop | `rounded-3xl` (24px) | CODE |
| Rayon Mobile | `rounded-none` | CODE |
| Fond | `bg-[#0f122c]` | CODE |
| Bordure | `border border-white/10` | CODE |
| Header padding Desktop | `px-6 py-4` (24px × 16px) | CODE |
| Header padding Mobile | `px-4`, `pt-[max(0.75rem,env(safe-area-inset-top))]`, `pb-3` | CODE |
| Pane gauche largeur | `38%` (par défaut) | CODE |
| Pane gauche bordure | `border-r border-white/5` | CODE |
| Bouton fermeture | `size-11` (44px) — conforme touch target 44px | CODE |
| Fermeture Échap | Oui, `event.key === "Escape"` | CODE |
| Piège focus | Oui, focus trap complet avec Tab/Shift+Tab | CODE |
| `aria-modal` | `true` | CODE |
| `role` | `dialog` | CODE |
| Scroll | `overflow-y-auto` sur pane gauche, `overflow-hidden` sur pane droite | CODE |

### Largeur maximale du contenu

| Contexte | Valeur | Origine |
|----------|--------|---------|
| Page étude détail | `max-w-5xl` (1024px) | CODE |
| Page catalogue | `max-w-7xl` (1280px) | CODE |
| Modale split | `max-w-5xl` (1024px) | CODE |

### Comportement des sections longues

- Aucune hauteur fixe : les sections s'étendent naturellement. Origine : CODE.
- Aucune troncature silencieuse. Origine : CODE + spécification Lot 0.
- La grille CSS utilise l'étirement par défaut des items ; dans une même rangée, les cartes peuvent donc être visuellement étirées à la hauteur de la plus dense. Aucune hauteur fixe n'est déclarée, mais l'absence de `items-start` signifie que l'affirmation « hauteurs non synchronisées » n'est pas garantie. Origine : CODE.
- Le scroll vertical de la page gère les sections très longues. Origine : CODE.

---

## F. Composants historiques

### Carte éditoriale (Section Desktop)

**Fichier** : `FolioSectorAnalysisPanel.tsx`, composant `Section` (L56-76)

| Propriété | Spécification | Origine |
|-----------|--------------|---------|
| Container | `rounded-lg`, `border border-[#CBD5E1]`, `bg-[#FFFFFF]`, `overflow-hidden` | CODE |
| Header | `bg-[#1E3150]`, `px-3.5 py-2.5`, `border-b border-[#CBD5E1]` | CODE + CAPTURE |
| Icône header | `w-3.5 h-3.5`, `text-[#FBBF24]` (gold) | CODE + CAPTURE |
| Titre header | `text-xs`, font-bold, uppercase, tracking-wider, `text-[#FFFFFF]` | CODE + CAPTURE |
| Body | `p-4`, `space-y-4` | CODE |

### Header navy

Le header navy est un bandeau en-tête de carte pleine largeur. Il ne doit pas devenir un composant autonome détaché d'une carte.

Caractéristiques mesurées :
- Fond : `#1E3150` — Origine : CODE + CAPTURE
- Texte : blanc, uppercase, bold, 12px — Origine : CODE + CAPTURE
- Icône : gold `#FBBF24`, 14px × 14px, stroke 2px — Origine : CODE + CAPTURE
- Gap : 6px entre icône et texte — Origine : CODE
- Padding : 14px horizontal, 10px vertical — Origine : CODE + CAPTURE
- Hauteur totale : 38px CSS, bordures incluses — Origine : CODE + CAPTURE (76px raster à 2×)

### Pictogramme jaune

Icônes SVG outline (stroke), 14-16px, stroke-width 2.

| Section | Icône | Origine |
|---------|-------|---------|
| Synthèse sectorielle | Compass (cercle + check) | CODE |
| Marché | BarChart2 (barres) | CODE + CAPTURE |
| Acteurs | Users (personnes) | CODE |
| Chaîne de valeur | Link2 (chaîne) | CODE + CAPTURE |
| Réglementation | Shield (bouclier + check) | CODE |
| Concurrence | Swords (flamme) | CODE + CAPTURE |
| Clientèle | Target (cible concentrique) | CODE + CAPTURE |

Couleur Desktop : `#FBBF24` (gold sur navy) — Origine : CODE + CAPTURE
Couleur Mobile : `#1E3150` (navy sur fond navy@10%) — Origine : CODE

### Synthèse avec filet vertical

**Fichier** : `FolioSectorAnalysisPanel.tsx` (L92-117)

| Propriété | Spécification | Origine |
|-----------|--------------|---------|
| Container | `rounded-lg`, `border border-[#64748B]`, `bg-[#FFFFFF]`, `p-5` | CODE |
| Bordure | Plus forte que les cartes standards (muted vs border) | CODE |
| Icône | Compass, 16px, `text-[#D89B16]` (brass) | CODE + CAPTURE |
| Titre | `text-xs`, font-bold, uppercase, tracking-wider, `text-[#243B63]` | CODE + CAPTURE |
| Filet | `border-l-2 border-[#64748B]` (2px CSS ; 4px raster à 2×) | CODE + CAPTURE |
| Contenu | `text-sm`, `text-[#334155]`, `leading-relaxed` | CODE + CAPTURE |
| Paragraphes | `space-y-3` (12px) | CODE |
| Listes | `list-disc`, `pl-5`, `space-y-1.5` | CODE |

### Paragraphe narratif

Texte dense, multi-phrases, sans troncature.
- Taille : `text-sm` (14px) Desktop, `text-xs` (12px) Mobile
- Couleur : `#334155`
- Interligne : `leading-relaxed`
- Pas de `line-clamp` ou `truncate`
- Origine : CODE + CAPTURE

### Sous-titre éditorial

Label uppercase précédant un groupe de données.
- Taille : `text-[11px]` Desktop, `text-[10px]` Mobile
- Graisse : bold (700)
- Casse : uppercase
- Tracking : wider
- Couleur : `#243B63`
- Origine : CODE + CAPTURE

### Liste simple (BulletList)

**Fichier** : `FolioSectorAnalysisPanel.tsx` (L41-54)

- Label uppercase en en-tête
- `list-disc`, `pl-4`, `space-y-0.5`
- `text-xs`, `text-[#334155]`
- Items filtrés (retire « Non trouvé »)
- Origine : CODE

### Liste avec libellé fort

Format : `**Nom** — description` (concurrents, réglementations, segments).
- `<strong>` pour le nom
- Tiret cadratin `—` suivi de la description
- Origine : CODE + CAPTURE

### Fiche d'identité / Grille d'identité

**Note** : la Réf. 03 est explicitement exclue des cibles FOLIO. Le legacy observé dans le code ne possède pas de fiche d'identité dans la page d'étude sectorielle ; `InfoRow` est seulement le patron label/valeur interne aux sections analytiques.

**Fichier** : composant `InfoRow` dans `FolioSectorAnalysisPanel.tsx` (L13-25)

| Propriété | Spécification | Origine |
|-----------|--------------|---------|
| Layout | Empilé verticalement (label au-dessus, valeur en dessous) | CODE |
| Label | `text-[11px]`, bold, uppercase, tracking-wider, `text-[#243B63]` | CODE |
| Valeur | `text-xs`, `text-[#334155]` | CODE |
| Espacement | `space-y-1` (4px) | CODE |
| Valeurs multiples | `join(" · ")` — séparateur point médian | CODE |

Pour la grille d'identité V3 :
- Desktop : grille à deux colonnes — **V3_EXTENSION** ;
- Mobile : lignes empilées — **V3_EXTENSION**, en réutilisant le patron de code `SectionRows` ;
- ligne de dynamique pleine largeur — **V3_EXTENSION** ;
- les mesures exactes restent à valider lors de l'implémentation V3.

### Tags

**Fichier** : `TagList` dans `FolioSectorAnalysisPanel.tsx` (L27-39)

| Catégorie | Fond | Texte | Bordure | Taille | Origine |
|-----------|------|-------|---------|--------|---------|
| Leaders | `#F8FAFC` | `#334155` | `#CBD5E1` | `text-[10px]` | CODE |
| Challengers | `#F1F5F9` | `#475569` | `#CBD5E1` | `text-[10px]` | CODE |
| Émergents | `#FEF3C7` | `#1E293B` | `#D89B16/30` | `text-[10px]` | CODE |

Géométrie : `px-2 py-0.5 rounded` (8px × 2px, rayon 4px).

> Les tags sont utilisés uniquement dans la section Acteurs (legacy). Les captures FOLIO des autres sections (Concurrence, Clientèle, etc.) n'utilisent PAS de tags — elles utilisent des listes éditoriales. Origine : CAPTURE.

### Séparateurs

- Desktop : entre cartes par le gap de la grille (24px)
- Mobile : `border-b border-border` entre sections, sauf dernier
- Aucun séparateur horizontal visible à l'intérieur des cartes Desktop
- Origine : CODE

### État vide

```tsx
<p className="text-xs italic text-[#64748B]">Données non disponibles.</p>
```
- Texte italique, taille xs, couleur muted
- Origine : CODE

### Modale maître/détail (patron)

**Fichier** : `IntelligenceSplitModalShell.tsx`

Se référer à la section E (Modale split) pour les mesures géométriques complètes.

Caractéristiques structurelles :
- **Overlay** : sombre avec backdrop-blur — Origine : CODE
- **Panneau maître** (gauche) : 38% de largeur, scroll indépendant, bordure droite fine — Origine : CODE
- **Panneau détail** (droite) : flex-1, fond légèrement plus sombre (`bg-slate-950/20`) — Origine : CODE
- **Header** : titre, sous-titre optionnel, actions, bouton fermeture 44px — Origine : CODE
- **Ligne sélectionnée** : gérée par le contenu injecté (pas par la shell) — CODE
- **Bouton de fermeture** : rond 44px, hover `bg-white/5`, focus ring brass — Origine : CODE
- **Accessibilité** : `role="dialog"`, `aria-modal`, piège focus, Échap, restauration du focus — Origine : CODE

---

## G. Extensions V3

Les éléments suivants sont **explicitement marqués V3_EXTENSION**. Ils n'existent pas dans le FOLIO historique et doivent être conçus pour V3 sans prétendre être des caractéristiques historiques.

### Marqueur de source `[1]`, `[2]`, etc.

- **Responsabilité** : rattacher une affirmation à sa source dans un système de notes
- **Style recommandé** : exposant cliquable, couleur `edito-brass`, taille `text-[9px]` ou `text-[10px]`
- **Comportement** : au clic, ouvre ou scrolle vers la disclosure des sources
- **Contrainte** : ne pas transformer le texte en hyperlien bleu standard
- Origine : **V3_EXTENSION**

### Disclosure « Sources — n »

- **Responsabilité** : liste repliable des sources consultées pour une section
- **Style recommandé** : `<details>` natif ou composant disclosure, titre en uppercase, icône discrète
- **Position** : en pied de section, après le dernier contenu
- **État replié** : montre uniquement « Sources — n » avec un chevron
- **État déplié** : liste numérotée des sources avec URL, date, méthode
- Origine : **V3_EXTENSION**

### État confirmé

- Affirmation vérifiée par source indépendante
- Signal : icône check discrète ou absence de marqueur (l'état par défaut est « confirmé »)
- Origine : **V3_EXTENSION**

### État partiellement confirmé

- Preuve incomplète ou contradictoire
- Signal : icône avertissement discrète, texte muted
- Origine : **V3_EXTENSION**

### Affirmation non publiée

- Aucune source identifiable
- Signal : texte en italique, couleur muted, mention « non publié »
- Origine : **V3_EXTENSION**

### Fraîcheur / Dernière date de vérification

- Date de dernière vérification par section ou par fait
- Style recommandé : métadonnée en pied de section, `text-[10px]`, muted
- Origine : **V3_EXTENSION**

### Trois signaux significatifs

- Section « Tendances et actualité » : 3 signaux maximum visibles, puis accès à la liste complète
- Style recommandé : carte compacte avec date, titre, snippet
- Origine : **V3_EXTENSION**

### Modale des signaux (accès à la liste exhaustive)

- Reprend le patron IntelligenceSplitModalShell
- Liste maître : signaux triés par date, titre, score
- Détail : contenu complet du signal avec sources
- Origine : **V3_EXTENSION**

### Distinction fait / analyse / déclaration institutionnelle

- Signal typographique discret (pas de badge coloré)
- Fait : normal
- Analyse : préfixe ou marqueur « Analyse : »
- Déclaration : guillemets + attribution
- Origine : **V3_EXTENSION**

### État de chargement

- Skeleton ou shimmer reprenant la géométrie de la carte éditoriale
- Fond : `edito-chip` (#F1F5F9) animé
- Durée maximale : respect `prefers-reduced-motion`
- Origine : **V3_EXTENSION**

### État d'erreur

- Carte avec message d'erreur centré, icône discrète, bouton de retry
- Pas de bannière rouge agressive
- Origine : **V3_EXTENSION**

### État de contenu historique V1/V2

- Affichage du contenu selon son lecteur historique
- Badge discret « FOLIO original » ou « V1 » / « V2 »
- Pas de conversion rétroactive
- Origine : **V3_EXTENSION**

---

## H. Desktop

### Principe directeur

La vue Desktop est une **vue d'analyse** conçue pour la lecture dense et la compréhension approfondie d'un compte.

### Largeur optimale

- `max-w-5xl` (1024px) centré — Origine : CODE
- Padding horizontal : 16px — Origine : CODE
- Largeur effective de lecture : ~992px — Origine : CODE

### Ordre des sept sections V3

1. **Synthèse du compte** — pleine largeur, filet vertical, icône brass
2. **Fiche d'identité** — grille 2 colonnes, labels/valeurs, dynamique pleine largeur — **V3_EXTENSION**
3. **Positionnement marché** — carte éditoriale (reprend visuels Marché + Concurrence)
4. **Offres et clientèle** — carte éditoriale (reprend visuels Clientèle)
5. **Chaîne de valeur** — carte éditoriale
6. **Environnement réglementaire** — carte éditoriale structurée depuis le code legacy ; certifications et risques sont des **V3_EXTENSION** graphiques, les Réf. 07-08 étant exclues
7. **Tendances et actualité** — paragraphe analytique + 3 signaux + accès modale

### Navigation par ancres

- Justifiée si le nombre de sections (7) et leur longueur rendent le scroll pénible
- Recommandation : navigation optionnelle par ancres en haut de page ou sticky sidebar
- Ne pas imposer un mécanisme de tabs qui masquerait des sections — l'intégralité doit être visible par scroll
- Origine : **V3_EXTENSION** — À CONFIRMER

### Grille des sections 3-7

- Les sections 3 à 7 peuvent être disposées en `grid-cols-2` comme dans le legacy.
- Le legacy laisse CSS Grid étirer les items d'une même rangée. Pour respecter l'objectif V3 d'une hauteur naturelle par carte, la future grille devra déclarer `items-start` — **V3_EXTENSION**.
- La disposition exacte (toutes en grille 2, certaines pleine largeur) sera arrêtée au Lot 5
- Origine : CODE + décision Lot 1

### Gestion des très longues sections

- Aucune hauteur maximale : `overflow: visible`, pas de `max-h`
- Aucune troncature : pas de `line-clamp`, `text-overflow`, `truncate`
- Le maximum observé sur les 81 études FOLIO est de 10 éléments dans une même famille de liste (maillons clés), puis 9 certifications et 8 éléments sur plusieurs familles.
- Jusqu'à 10 items inclus : tout afficher, sans disclosure. À partir du 11e item : disclosure optionnelle « Voir tous les [n] éléments » — **V3_EXTENSION**.
- Les paragraphes narratifs ne sont jamais tronqués quelle que soit leur longueur
- Origine : CODE + CAPTURE + SUPABASE_READ_ONLY + V3_EXTENSION

### Grille d'identité Desktop

- Deux colonnes : label / valeur — **V3_EXTENSION**
- Labels en uppercase, valeurs en regular — le traitement typographique réutilise le patron `InfoRow` (**CODE**)
- Ligne de dynamique pleine largeur en bas — **V3_EXTENSION**
- Aucune de ces règles de composition ne doit être présentée comme issue d'une capture historique.

### Disclosure des sources

- En pied de chaque section : `<details>` repliable « Sources — n »
- Fermé par défaut
- Origine : V3_EXTENSION

### Modale maître/détail

- Patron : IntelligenceSplitModalShell
- Usage : signaux, documents
- Pas de modification du patron existant
- Origine : CODE

### Comportement du scroll

- Scroll vertical natif de la page
- Pas de scroll horizontal
- Le header de page reste fixe ou disparaît au scroll (à décider au Lot 5)
- Origine : CODE

### Hauteurs de cartes

Le code legacy n'impose aucune hauteur fixe, mais CSS Grid applique `align-items: stretch` par défaut. Les cartes d'une même rangée peuvent donc être visuellement synchronisées. La règle de hauteur naturelle souhaitée pour V3 exige `items-start` et reste une **V3_EXTENSION** à vérifier au Lot 5.

---

## I. Mobile

### Principe directeur

La vue Mobile est une **vue synthétique et actionnable**, optimisée pour la lecture en déplacement.

### Composants Mobile dédiés

- `FolioMobileAnalysisSections` est un composant distinct de `FolioSectorAnalysisPanel`
- Le serveur distribue l'un ou l'autre selon le device
- Aucun composant Desktop chargé puis caché en CSS
- Origine : CODE

> Aucune capture historique Mobile canonique n'a été fournie. Le composant legacy Mobile est une preuve de structure et de contraintes techniques (**CODE**), pas une cible historique. Toute reprise graphique de ce patron dans V3 reste une **V3_EXTENSION**.

### Même ordre sémantique

Les sept sections V3 apparaissent dans le même ordre que Desktop :
1. Synthèse du compte
2. Fiche d'identité
3. Positionnement marché
4. Offres et clientèle
5. Chaîne de valeur
6. Environnement réglementaire
7. Tendances et actualité

### Structure Mobile

- Une seule surface blanche continue (`bg-[#FFFFFF]`, `rounded-xl`, `border border-[#CBD5E1]`)
- Sections empilées, séparées par `border-b border-border`
- Pas de header navy pleine largeur (différence majeure avec Desktop)
- Icône navy dans un carré clair 24×24px (`bg-[#1E3150]/10`, `rounded-md`)
- Titre de section navy à côté de l'icône
- Contenu indenté de 32px (`pl-8`)
- Origine : CODE

### Contraintes Mobile

| Contrainte | Spécification | Origine |
|-----------|--------------|---------|
| Aucune table dense | Les données sont en lignes empilées, pas en tableau | CODE |
| Aucun scroll horizontal | Tout le contenu s'adapte à la largeur de l'écran | CODE |
| Touch targets | ≥ 44px pour tout élément interactif | CODE (bouton fermeture modale = 44px) |
| Grille d'identité | Transformée en lignes empilées (label au-dessus, valeur en dessous) | CODE |
| Sources repliables | `<details>` ou composant disclosure | V3_EXTENSION |
| Modale plein écran | `fixed inset-0`, pas de rounded, `h-dvh` | CODE |
| Liste puis détail | Modale split Mobile : liste plein écran, puis détail plein écran | CODE |
| Typographie lisible | `text-xs` (12px) minimum pour le corps, `leading-relaxed` | CODE |
| Densité réduite | Moins d'items visibles que Desktop, sans perte de sens | CODE |

### Breakpoints

| Breakpoint | Tailwind | Comportement |
|-----------|----------|-------------|
| < 768px | Avant `md:` | Vue Mobile (composant dédié, serveur-routed) |
| ≥ 768px | `md:` et au-delà | Vue Desktop |

> **Note** : le breakpoint réel est déterminé côté serveur par `getDashboardDevice()`, pas par un media query CSS. Origine : CODE.

---

## J. Relocalisation des blocs existants

### Organisation

| Aspect | Décision |
|--------|----------|
| **Page cible** | Espace relationnel du Cockpit Intelligence (onglet « Contacts » ou sous-vue dédiée) |
| **Desktop** | Panneau latéral ou section dans l'onglet contacts/CRM du compte |
| **Mobile** | Section empilée dans la vue Mobile du même onglet |
| **Point d'entrée** | Navigation secondaire du Cockpit Intelligence |
| **Intitulé** | « Organisation » |
| **Mode d'ouverture** | Navigation directe (pas de modale) |
| **Données conservées** | Directions, interlocuteurs, contacts, données CRM — intégralement |
| **Composant réutilisable** | Composants existants de la fiche contacts |
| **Justification UX** | L'organisation est une donnée relationnelle, pas une analyse générée. Elle doit vivre là où les contacts et les directions sont gérés. |
| **Perte de données** | Aucune |

### Activités opérationnelles

| Aspect | Décision |
|--------|----------|
| **Page cible** | Diagnostic process / Audit complet |
| **Desktop** | Section dans le diagnostic process ou entrée dans l'onglet « Activité » du Cockpit |
| **Mobile** | Section empilée dans la vue Mobile correspondante |
| **Point d'entrée** | Navigation secondaire du Cockpit Intelligence, ou entrée dans le diagnostic |
| **Intitulé** | « Activités opérationnelles » |
| **Mode d'ouverture** | Navigation directe |
| **Données conservées** | Diagnostic process, accès à l'audit complet — intégralement |
| **Composant réutilisable** | Composants existants du diagnostic |
| **Justification UX** | Les activités opérationnelles sont des données process, pas de l'intelligence éditoriale. Elles doivent rester rattachées au diagnostic et à l'audit. |
| **Perte de données** | Aucune |

### Relation commerciale

| Aspect | Décision |
|--------|----------|
| **Page cible** | Timeline CRM / Espace opportunités du compte |
| **Desktop** | Section dans l'onglet « Relation commerciale » ou « Opportunités » du Cockpit |
| **Mobile** | Section empilée dans la vue Mobile correspondante |
| **Point d'entrée** | Navigation secondaire du Cockpit Intelligence |
| **Intitulé** | « Relation commerciale » |
| **Mode d'ouverture** | Navigation directe |
| **Données conservées** | Timeline CRM, opportunités, engagements, contacts prioritaires — intégralement |
| **Composant réutilisable** | Composants existants de la timeline et des opportunités |
| **Justification UX** | La relation commerciale est une donnée CRM vivante et transactionnelle. Elle n'a pas sa place dans un flux éditorial analytique statique. |
| **Perte de données** | Aucune |

> **Contrainte commune** : aucun de ces trois blocs ne doit être transformé en contenu généré. Ils restent des données relationnelles ou process, gérées par leurs composants existants.

---

## K. Densité réellement observée (Supabase, lecture seule)

Requête exécutée le 4 août 2026 sur `public.companies.metadata.sector_analysis` et comptage associé de `account_signals`. Toutes les requêtes ont commencé par `WITH` ; aucune écriture, RPC, migration ou génération de types n'a été effectuée.

| Indicateur | Minimum | Moyenne | Maximum observé |
|------------|---------|---------|-----------------|
| Synthèse | 1 504 caractères | 2 143 caractères | 3 011 caractères |
| JSON `sector_analysis` | 17 647 octets | 27 260 octets | 35 159 octets |
| Tendances / facteurs / freins | — | — | 8 / 8 / 8 |
| Concurrents directs | — | — | 6 |
| Segments clientèle | — | — | 7 |
| Réglementations en vigueur | — | — | 8 |
| Certifications / risques de conformité | — | — | 9 / 7 |
| Maillons clés | — | — | 10 |

Profils retenus pour la QA : Groupe IDEC (dense : synthèse 2 554 caractères, JSON 30 599 octets, 10 signaux), Audemard (intermédiaire : synthèse 2 015 caractères, JSON 25 841 octets, 8 signaux) et Griesser (pauvre : aucune analyse FOLIO, aucun signal). Les identifiants techniques ne sont pas recopiés dans les livrables.

Cette densité justifie une lecture longue et une navigation par ancres optionnelle sur Desktop. Elle ne justifie pas de replier les listes actuellement observées : la disclosure ne devient pertinente qu'au-delà du maximum actuel de 10 items.

---

## L. Stratégie de QA visuelle (résumé)

Se référer au document dédié `COCKPIT-INTELLIGENCE-FOLIO-VISUAL-QA.md` pour la matrice complète.

Principes :
- Comparaison capture historique → rendu implémenté
- Tolérance géométrique : ±2px sur les espacements, ±1px sur les bordures
- Contrôle typographique : taille, graisse, casse, interligne
- Contrôle couleur : ±1 valeur hexadécimale par canal (ex. `#1E3150` toléré de `#1D3050` à `#1F3250`)
- Accessibilité : contraste AA, focus visible, piège focus modale, touch targets 44px, zoom 200%
- Pas de tests Playwright permanents dans le Lot 1

### État d'exécution du Lot 1

- cinq captures canoniques inspectées à la résolution d'origine : **oui** ;
- code legacy, contrats, parsers, tokens, polices et modales inspectés : **oui** ;
- profils Supabase riche, intermédiaire et pauvre mesurés en lecture seule : **oui** ;
- Browser in-app, session authentifiée, DOM et styles calculés : **oui** ;
- Desktop 1440 × 900 et Mobile 390 × 844 rendus : **oui**, sans overflow de page sur les détails dense et intermédiaire ;
- interaction catalogue et console : **oui** — recherche 81 → 1 étude, ouverture du détail, aucun warning/erreur console ;
- reflow équivalent 200 % à 720 × 450 : **oui**, sans overflow de page ;
- clavier : focus visible confirmé, mais `Tab` reste sur la recherche du catalogue au lieu d'avancer ;
- accessibilité : `html lang="en"` confirmé et cibles de formulaires mesurées à 34 px Desktop puis 39,5–42 px Mobile, donc sous 44 px ;
- modale : contrats et sept tests unitaires confirmés ; exécution Browser de la modale, Échap et restauration du focus reportés au Lot 5.

La passe Browser authentifiée requise au Lot 1 est terminée. Les écarts observés sont documentés comme contraintes de mise en œuvre V3 ; le statut devient **TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**.
