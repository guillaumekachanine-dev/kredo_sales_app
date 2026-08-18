# IntelligenceSplitModalShell — Charte graphique de référence canonique

> **Statut :** DOCUMENT NORMATIF DE RÉFÉRENCE (PHASE 1)  
> **Commit audité :** `6c151213843d68b1be7ec471ab0da7d73d448fd9`  
> **État git :** Clean (0 modification non commritée)  
> **Horodatage d'audit :** 19 août 2026  
> **Portée :** Définition absolue et non interprétable du langage graphique `IntelligenceSplitModalShell` (Desktop & Mobile hint) et de sa déclinaison analytique `CompanyDocumentsMailAnalyticsPanel`.

---

## 0. STATUT ET AUTORITÉ DU DOCUMENT

Ce document constitue la **spécification canonique exclusive** du composant `IntelligenceSplitModalShell` et des visualisations analytiques qui y prennent place.

1. **Autorité normative :** Toute implémentation ultérieure d'un écran dérivé ou réutilisant ce shell (notamment la modale *« Gérer les sources informationnelles »* ou la page *Synthèse*) doit se conformer **strictement et intégralement** aux règles établies dans cette charte.
2. **Refus de l'interprétation esthétique :** Aucun agent, développeur ou designer ne doit ajouter d'ombres décoratives, modifier les rayons de bordure, inventer de nouvelles couleurs, ou remplacer la densité d'information par un assemblage de cartes flottantes.
3. **Hiérarchie de décision :** En cas de doute, la combinaison **Rendu visuel (Captures REF-A, REF-B, REF-C) + Code source audité + Tokens CSS résolus** fait foi.

---

## 1. SOURCES AUDITÉES

### 1.1 Captures visuelles de référence (Niveau 1)

*   **REF-A — Activité commerciale (Desktop) :** `2048 × 1256 px` (Capture Retina 2x de la modale Desktop `Activité commerciale`). Référence absolue du Shell, du Split 38/62, du Header, de la Navigation gauche et des visualisations standards. Preuve visuelle : `IMAGE_CONFIRMED`.
*   **REF-B — Analytics Mails (Slide 1 Volume) :** `1230 × 848 px` (Capture de `CompanyDocumentsMailAnalyticsPanel` sur le compte ROBERTET, slide *Mails générés*). Référence absolue du fond analytique, des KPI Analytics et du Bar Chart SVG. Preuve visuelle : `IMAGE_CONFIRMED`.
*   **REF-C — Analytics Mails (Slide 2 Objectifs) :** `1224 × 832 px` (Capture de `CompanyDocumentsMailAnalyticsPanel` sur le compte ROBERTET, slide *Répartition des objectifs*). Référence absolue du Donut interactif et de sa liste de sélection. Preuve visuelle : `IMAGE_CONFIRMED`.

### 1.2 Fichiers source code inspectés (Niveau 2 & 3)

*   [`src/components/intelligence/IntelligenceSplitModalShell.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L1-L165)
*   [`src/features/commercial-activity/CommercialActivityModal.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityModal.tsx#L1-L279)
*   [`src/features/commercial-activity/CommercialActivityNavigation.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityNavigation.tsx#L1-L29)
*   [`src/features/commercial-activity/CommercialActivityFilters.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L1-L188)
*   [`src/features/commercial-activity/CommercialActivityOverview.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityOverview.tsx#L1-L30)
*   [`src/features/commercial-activity/CommercialActivityRhythm.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityRhythm.tsx#L1-L112)
*   [`src/features/commercial-activity/CommercialActivityDistribution.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityDistribution.tsx#L1-L19)
*   [`src/features/commercial-activity/CommercialActivityOutcomes.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityOutcomes.tsx#L1-L133)
*   [`src/features/commercial-activity/CommercialActivityAccounts.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityAccounts.tsx#L1-L14)
*   [`src/components/accounts-contacts/intelligence/CompanyDocumentsModal.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsModal.tsx#L1-L1147)
*   [`src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L1-L489)
*   [`src/components/accounts-contacts/intelligence/company-documents-mail-analytics.ts`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/company-documents-mail-analytics.ts#L1-L237)
*   [`src/app/globals.css`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/app/globals.css#L1-L2669)

---

## 2. HIÉRARCHIE DES RÉFÉRENCES

Le système s'articule autour de deux références complémentaires et non interchangeables :

### Référence A — Activité commerciale (`REF-A`)
Définit la **grammaire globale du contenant Shell** (`SHELL_GLOBAL`, `HEADER`, `LEFT_NAV`, `FILTER_BAR`, `FORM_CONTROL`, `KPI_STANDARD`, `DATAVIZ_STANDARD`). C'est la structure d'accueil dense, sobre et professionnelle pour les modales de travail bilatérales.

### Référence B — Analytics Mails (`REF-B`, `REF-C`)
Définit spécifiquement la **grammaire analytique avancée** pour la future page Synthèse (`SYNTHESIS_ANALYTICS`, `SYNTHESIS_KPI`, `SYNTHESIS_CAROUSEL`, `SYNTHESIS_BAR_CHART`, `SYNTHESIS_DONUT`). Elle apporte le traitement de surface par gradients subtils, le carousel horizontal sans empilement et les visualisations DataViz interactives.

---

## 3. PHILOSOPHIE VISUELLE

1. **Obscurité immersive & Densité professionnelle :** Un fond bleu nuit profond (`#0f122c`) ancré sur un backdrop obscurci (`rgba(2, 6, 23, 0.65)` avec flou de 12px), évitant la fatigue visuelle tout en mettant en valeur les micro-touches d'or brass (`#C89A2B`).
2. **Hiérarchie par la bordure et la transparence :** La séparation entre sections et panneaux s'effectue par des liserés d'opacité ultra-fine (`border-white/5` soit `rgba(255,255,255,0.05)`) et des aplats à faible opacité (`bg-white/[0.04]`), et non par des ombres portées lourdes ou des cartes opaques empilées.
3. **Typographie de précision :** Emploi rigoureux de chiffres à largeur fixe (`tabular-nums`) pour toutes les données financières et métriques, associé à des étiquettes en capitales à très faible corps (10px) et espacement des lettres augmenté (`tracking-[0.12em]`).
4. **DataViz épurée et interactive :** Des graphiques SVG et HTML intégrés à la surface, refusant toute bibliothèque lourde tierce, proposant des animations fluides de 200–300ms avec respect strict des préférences de mouvement réduit (`motion-reduce`).

---

## 4. ANATOMIE CANONIQUE DU SHELL

```text
[Backdrop fixed inset-0 bg-slate-950/65 backdrop-blur-md z-50]
 └── [Modal Frame flex h-[80vh] max-h-[750px] w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0f122c] shadow-2xl]
      ├── [Header shrink-0 h-[65px] px-6 py-4 border-b border-white/5]
      │    ├── [Title Zone: Title (16-18px 700) + Subtitle (12px muted)]
      │    └── [Close Button: size-11 (44x44px) rounded-lg hover:bg-white/5]
      │
      └── [Body flex min-h-0 flex-1 items-stretch]
           ├── [Left Navigation Pane: width 38% (nominal) border-r border-white/5 overflow-y-auto]
           │    └── [Navigation Items: gap-2, padding 12px, rounded-xl]
           │
           └── [Right Content Pane: flex-1 bg-slate-950/20 flex-col overflow-hidden]
                ├── [Filter Bar: border-b border-white/5 px-5 py-3]
                └── [Active Content Area: flex-1 overflow-y-auto overscroll-y-contain p-5/p-6]
```

---

## 5. DIMENSIONS ET GÉOMÉTRIE

| Élément | Périmètre | Valeur CSS calculée | Classe Tailwind source | Preuve | Source |
|---|---|---|---|---|---|
| Contenant max-width | `SHELL_GLOBAL` | `1024px` | `max-w-5xl` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L117`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L117) |
| Contenant hauteur Desktop | `SHELL_GLOBAL` | `80vh` (max `750px`) | `h-[80vh] max-h-[750px]` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L117`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L117) |
| Contenant Mobile | `SHELL_GLOBAL` | `100dvh` / `100vw` | `fixed inset-0 h-dvh max-h-none w-full max-w-none` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L118`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L118) |
| Ratio Split Gauche | `LEFT_NAV` | `38%` (largeur fixe relative) | `style={{ width: "38%" }}` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L45`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L45) |
| Ratio Split Droite | `RIGHT_PANE` | `62%` (`flex-1 min-w-0`) | `flex-1 min-w-0` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L156`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L156) |
| Hauteur Header | `HEADER` | `~65px` (`py-4` + contenu) | `px-6 py-4` | `BROWSER_COMPUTED` | [`IntelligenceSplitModalShell.tsx:L123`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L123) |
| Bouton Fermer | `HEADER` | `44 × 44 px` | `size-11` (11 × 4px) | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L137`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L137) |
| Icône Navigation | `LEFT_NAV` | `32 × 32 px` | `size-8` | `CODE_EXACT` | [`CommercialActivityNavigation.tsx:L20`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityNavigation.tsx#L20) |
| Hauteur Filtres Desktop | `FILTER_BAR` | `32px` | `h-8` | `CODE_EXACT` | [`CommercialActivityFilters.tsx:L58`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L58) |
| Hauteur Control Mobile | `FORM_CONTROL` | `44px` | `min-h-11` | `CODE_EXACT` | [`CommercialActivityFilters.tsx:L58`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L58) |

---

## 6. PALETTE ET TOKENS

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │ PALETTE SYSTEME INTELLIGENCE MODAL SHELL                               │
 ├──────────────────────────┬──────────────────────┬──────────────────────┤
 │ Rôle sémantique          │ Valeur Hex / RGBA    │ Source Token         │
 ├──────────────────────────┼──────────────────────┼──────────────────────┤
 │ Modal Frame Background   │ #0F122C              │ Hardcoded canonique  │
 │ Backdrop Overlay         │ rgba(2, 6, 23, 0.65) │ bg-slate-950/65      │
 │ Right Pane Surface       │ rgba(2, 6, 23, 0.20) │ bg-slate-950/20      │
 │ Brand Brass (Accent Gold)│ #C89A2B              │ --color-brand-brass  │
 │ Brand Brass Hover        │ #A67A1E              │ --color-brand-brass-h│
 │ Text Heading (Pure White)│ #FFFFFF              │ text-white           │
 │ Text Muted (Slate Slate) │ #93A0B0              │ --color-muted        │
 │ Status Danger (Red)      │ #BE3E3E              │ --color-status-danger│
 └──────────────────────────┴──────────────────────┴──────────────────────┘
```

### Table exhaustive des couleurs résolues

| Usage Sémantique | Périmètre | Code / Classe | Valeur résolue | Token originel | Preuve |
|---|---|---|---|---|---|
| Fond Backdrop | `SHELL_GLOBAL` | `bg-slate-950/65` | `rgba(2, 6, 23, 0.65)` | Slate 950 alpha 0.65 | `TOKEN_RESOLVED` |
| Fond Modale | `SHELL_GLOBAL` | `bg-[#0f122c]` | `rgb(15, 18, 44)` | `#0f122c` (Midnight Navy) | `CODE_EXACT` |
| Fond Panneau Droit | `SHELL_GLOBAL` | `bg-slate-950/20` | `rgba(2, 6, 23, 0.20)` | Slate 950 alpha 0.20 | `TOKEN_RESOLVED` |
| Surface Analytique | `SYNTHESIS_ANALYTICS` | `bg-[radial-gradient(...)]` | `rgba(201,154,46,0.18)` vers `rgba(255,255,255,0.01)` | Gradient radial brass | `CODE_EXACT` |
| Surface KPI Analytics | `SYNTHESIS_KPI` | `bg-white/[0.03]` | `rgba(255, 255, 255, 0.03)` | White alpha 0.03 | `CODE_EXACT` |
| Surface Nav Hover | `LEFT_NAV` | `hover:bg-white/[0.04]` | `rgba(255, 255, 255, 0.04)` | White alpha 0.04 | `CODE_EXACT` |
| Surface Nav Active | `LEFT_NAV` | `bg-brand-brass/10` | `rgba(200, 154, 43, 0.10)` | Brand Brass alpha 0.10 | `TOKEN_RESOLVED` |
| Bordure Nav Active | `LEFT_NAV` | `border-brand-brass/40` | `rgba(200, 154, 43, 0.40)` | Brand Brass alpha 0.40 | `TOKEN_RESOLVED` |
| Fond Icône Active | `LEFT_NAV` | `bg-brand-brass/20` | `rgba(200, 154, 43, 0.20)` | Brand Brass alpha 0.20 | `TOKEN_RESOLVED` |
| Texte Primaire | `SHELL_GLOBAL` | `text-white` | `#FFFFFF` | White | `CODE_EXACT` |
| Texte Muted / Subtitle | `HEADER` | `text-muted` | `#93A0B0` | `--color-muted` | `TOKEN_RESOLVED` |
| Texte Atténué 50% | `LEFT_NAV` | `text-white/50` | `rgba(255, 255, 255, 0.50)` | White alpha 0.50 | `CODE_EXACT` |
| Texte Atténué 45% | `FILTER_BAR` | `text-white/45` | `rgba(255, 255, 255, 0.45)` | White alpha 0.45 | `CODE_EXACT` |
| Texte Atténué 35% | `SHELL_GLOBAL` | `text-white/35` | `rgba(255, 255, 255, 0.35)` | White alpha 0.35 | `CODE_EXACT` |
| Status Variation Positif| `KPI_STANDARD` | `text-brand-brass` | `#C89A2B` | `--color-brand-brass` | `TOKEN_RESOLVED` |
| Status Variation Négatif| `KPI_STANDARD` | `text-status-danger` | `#BE3E3E` | `--color-status-danger` | `TOKEN_RESOLVED` |

---

## 7. TYPOGRAPHIE

### Tableau canonique des niveaux typographiques

| Rôle typographique | Périmètre | Font Family | Size (px) | Weight | Line Height | Case / Tracking | Color | Tabular Nums |
|---|---|---|---|---|---|---|---|---|
| Titre Modal | `HEADER` | Inter / Sans | `18px` (`sm:text-lg`) | `700` | `1.25` (`leading-tight`) | Normal / Normal | `#FFFFFF` | Non |
| Sous-titre Modal | `HEADER` | Inter / Sans | `12px` (`text-xs`) | `400` | `1.25` (`leading-tight`) | Normal / Normal | `#93A0B0` | Non |
| Titre Item Nav | `LEFT_NAV` | Inter / Sans | `12px` (`text-[12px]`) | `600` | `1.375` (`leading-snug`) | Normal / Normal | `#FFFFFF` | Non |
| Desc Item Nav | `LEFT_NAV` | Inter / Sans | `10px` (`text-[10px]`) | `400` | `1.375` (`leading-snug`) | Normal / Normal | `rgba(255,255,255,0.50)` | Non |
| Label Filtre | `FILTER_BAR` | Inter / Sans | `10px` (`text-[10px]`) | `600` | `1.0` | Uppercase / `0.1em` | `rgba(255,255,255,0.45)` | Non |
| Valeur Select / Input | `FORM_CONTROL`| Inter / Sans | `11px` (`text-[11px]`) | `500` | Normal | Normal / Normal | `#FFFFFF` | Non |
| Label KPI Standard | `KPI_STANDARD` | Inter / Sans | `10px` (`text-[10px]`) | `600` | `1.0` | Uppercase / `0.12em`| `rgba(255,255,255,0.45)` | Non |
| Valeur KPI Standard | `KPI_STANDARD` | Inter / Sans | `24px` (`text-2xl`) | `700` | `1.2` | Normal / Normal | `#FFFFFF` | **Oui** |
| Badge Variation KPI | `KPI_STANDARD` | Inter / Sans | `10px` (`text-[10px]`) | `600` | Normal | Normal / Normal | `#C89A2B` / `#BE3E3E` | **Oui** |
| Label KPI Analytics | `SYNTHESIS_KPI`| Inter / Sans | `11px` (`text-[11px]`) | `400` | Normal | Uppercase / `0.14em`| `rgba(255,255,255,0.42)` | Non |
| Valeur KPI Analytics | `SYNTHESIS_KPI`| Inter / Sans | `20px` (`text-xl`) | `600` | `1.2` | Normal / Normal | `#FFFFFF` | **Oui** |
| Titre Section Content| `RIGHT_PANE` | Inter / Sans | `14px` (`text-sm`) | `600` | `1.25` | Normal / Normal | `#FFFFFF` | Non |
| Sub-description Content| `RIGHT_PANE` | Inter / Sans | `11px` (`text-[11px]`) | `400` | `1.375` | Normal / Normal | `rgba(255,255,255,0.45)` | Non |
| Annotation Axe X | `DATAVIZ_STANDARD`| Inter / Sans| `9px` (`text-[9px]`) | `400` | Normal | Normal / Normal | `rgba(255,255,255,0.40)` | Non |
| Texte Central Donut | `SYNTHESIS_DONUT`| Inter / Sans| `24px` (`text-2xl`) | `600` | `1.2` | Normal / Normal | `#FFFFFF` | **Oui** |

---

## 8. ÉCHELLE D’ESPACEMENT

```md
| Usage | Valeur canonique | Classe Tailwind | Source / Contexte |
|---|---|---|---|
| Padding Wrapper Outer Desktop | `16px` | `p-4` | `IntelligenceSplitModalShell:L106` |
| Padding Header Desktop | `24px` H / `16px` V | `px-6 py-4` | `IntelligenceSplitModalShell:L123` |
| Padding Left Navigation Pane | `16px` | `p-4` | `CommercialActivityNavigation:L15` |
| Gap entre Items Navigation | `8px` | `space-y-2` | `CommercialActivityNavigation:L15` |
| Padding Interne Item Nav | `12px` H / `12px` V | `px-3 py-3` | `CommercialActivityNavigation:L19` |
| Gap Icône / Titre Nav | `12px` | `gap-3` | `CommercialActivityNavigation:L19` |
| Padding Barre Filtres | `20px` H / `12px` V | `px-5 py-3` | `CommercialActivityFilters:L138` |
| Gap entre Contrôles Filtres | `12px` | `gap-3` | `CommercialActivityFilters:L60` |
| Padding Panneau Contenu Droit | `20px` (sm: `24px`) | `p-5 sm:p-6` | `CommercialActivityOverview:L19` |
| Gap Grille KPI | `16px` | `gap-4` | `CommercialActivityOverview:L20` |
| Gap Section / Graphique | `24px` | `space-y-6` | `CommercialActivityOverview:L19` |
```

---

## 9. BORDURES, RADII ET PROFONDEUR

### 9.1 Inventaire des Radii

*   **Modal Frame Contenant :** `24px` (`rounded-3xl`) Desktop. Mobile: `0px` (`rounded-none`). Preuve : [`IntelligenceSplitModalShell.tsx:L117`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L117).
*   **Item Navigation Gauche :** `12px` (`rounded-xl`). Preuve : [`CommercialActivityNavigation.tsx:L19`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityNavigation.tsx#L19).
*   **Conteneur d'icône Nav / Close Button :** `8px` (`rounded-lg`). Preuve : [`CommercialActivityNavigation.tsx:L20`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityNavigation.tsx#L20).
*   **Champ / Select Formulaire :** `8px` (`rounded-lg`). Preuve : [`CommercialActivityFilters.tsx:L58`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L58).
*   **Segmented Control Container :** `8px` (`rounded-lg`). Option active: `6px` (`rounded-md`). Preuve : [`CommercialActivityOverview.tsx:L21`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityOverview.tsx#L21).
*   **Capsule Segmented Control Analytics :** `9999px` (`rounded-full`). Preuve : [`CompanyDocumentsMailAnalyticsPanel.tsx:L406`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L406).
*   **Carte KPI Analytics Mails :** `18px` (`rounded-[18px]`). Preuve : [`CompanyDocumentsMailAnalyticsPanel.tsx:L383`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L383).
*   **Donut Center Overlay Card :** Circle parfait (`rounded-full`, `106 × 106 px`). Preuve : [`CompanyDocumentsMailAnalyticsPanel.tsx:L276`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L276).
*   **Sommet des barres de graphique :** `2px` (`rounded-t-sm`) pour barres standards, `10px` (`rx="10"`) pour SVG Analytics.

### 9.2 Grammaire des Bordures

*   **Périphérie Modal Frame :** `border border-white/10` (`rgba(255, 255, 255, 0.10)`).
*   **Séparateurs Header / Nav / Filters :** `border-white/5` (`rgba(255, 255, 255, 0.05)`).
*   **Liseré Bas KPI Standard :** `border-b border-white/8` (`rgba(255, 255, 255, 0.08)`).
*   **Bordure Accent Actif Nav :** `border-brand-brass/40` (`rgba(200, 154, 43, 0.40)`).
*   **Barre Planifiée Graphique :** `border border-dashed border-white/25` (`rgba(255, 255, 255, 0.25)` dashed).

---

## 10. HEADER

### Composants & Proportions
Le Header est une zone fixe (`shrink-0`) de `65px` de hauteur environ.
*   **Zone Titre / Sous-titre :** occupe tout l'espace disponible (`flex-1 min-w-0`). Troncature automatique avec `truncate`.
*   **Action de fermeture :** bouton carré `44 × 44 px` (`size-11`) aligné à droite, avec zone tactile confortable.
*   **Header Actions optionnels :** injection possible via la prop `headerActions` (ex: badge d'état, logo client ou bouton de retour).

---

## 11. NAVIGATION GAUCHE

### Item Inactif
*   Surface : `bg-transparent` | Bordure : `border-transparent`
*   Texte Titre : `text-white/75` (12px 600) | Description : `text-white/50` (10px 400)
*   Icône Box : `bg-white/[0.05]` `text-white/60` (32 × 32 px)
*   Chevron : `text-white/30`, translation au survol (`group-hover:translate-x-0.5`).

### Item Actif
*   Surface : `bg-brand-brass/10` (`rgba(200, 154, 43, 0.10)`)
*   Bordure : `border-brand-brass/40` (`rgba(200, 154, 43, 0.40)`)
*   Texte Titre : `text-white` (`#FFFFFF`) | Description : `text-white/50`
*   Icône Box : `bg-brand-brass/20` `text-brand-brass` (`#C89A2B`)
*   Chevron : `text-brand-brass` (`#C89A2B`), position fixe `translate-x-0`.

---

## 12. FILTRES ET CHAMPS

*   **Structure :** disposés horizontalement en bas de la barre de filtres (`flex flex-wrap items-end gap-3`).
*   **Libellés :** au-dessus du champ (`grid gap-1.5`), en minuscules capitalisées (10px uppercase, `tracking-[.1em]`, `text-white/45`).
*   **Select & Inputs :** hauteur `32px` (`h-8`), fond sombre semi-transparent `bg-white/[.04]`, liseré `border-white/10`, texte blanc `11px` medium.
*   **Focus State :** surbrillance de bordure `focus-visible:border-brand-brass/60` et anneau `focus-visible:ring-2 focus-visible:ring-brand-brass/30`.

---

## 13. KPI — FAMILLE STANDARD (`Commercial Activity`)

Cette famille privilégiant la **densité et la légèreté visuelle** n'utilise **PAS** de carte conteneur fermée.

```text
 ┌─────────────────────────────────────────────────────────┐
 │ ACTIVITÉS RÉALISÉES                                     │ 10px uppercase text-white/45
 │ 34                                               +12,5% │ 24px bold text-white + 10px brass
 └─────────────────────────────────────────────────────────┘ Border-bottom border-white/8
```

1.  **Label :** 10px font-semibold uppercase `tracking-[0.12em] text-white/45`.
2.  **Ligne de Mesure :** `flex items-baseline justify-between gap-2 mt-2`.
3.  **Chiffre Clé :** 24px `font-heading font-bold tabular-nums text-white`.
4.  **Badge Variation :** 10px `font-semibold tabular-nums`. Positif = `text-brand-brass` (`#C89A2B`), Négatif = `text-status-danger` (`#BE3E3E`).
5.  **Séparateur :** simple filet inférieur `border-b border-white/8 pb-3`.

---

## 14. DATAVIZ — FAMILLE STANDARD

*   **Graphique d'activité dans le temps :** conteneur horizontal de `224px` de hauteur (`h-56`) sur au minimum `520px` de largeur.
*   **Double barre par période :**
    *   *Réalisé :* barre empilée par nature d'activité (`flex-col justify-end`), top-radius `2px`, fond de slot `bg-white/[0.05]`.
    *   *Planifié :* barre adjacente droite occupant `28%` du slot, bordure pointillée `border-dashed border-white/25`, fond `bg-white/[0.08]`.
*   **Palette catégorielle des barres :**
    *   Prospection : `var(--color-dataviz-1)` (`#2554B8`)
    *   Client actif : `var(--color-dataviz-2)` (`#C89A2B`)
    *   Recrutement : `var(--color-dataviz-4)` (`#719A5A`)
    *   Management : `var(--color-dataviz-5)` (`#7B6BB2`)
    *   Interne : `var(--color-dataviz-6)` (`#D4B26A`)

---

## 15. PAGE SYNTHÈSE — GRAMMAIRE ANALYTICS

La future page Synthèse s'inspire du panneau `CompanyDocumentsMailAnalyticsPanel` :
*   **Fond analytique :** surface baignée d'un halo ambré très doux (`radial-gradient` origine top right, `#C99A2E` à 18% d'opacité) sur dégradé linéaire sombre.
*   **Rail horizontal (Carousel) :** évite la surcharge verticale en plaçant les deux grands angles d'analyse (ex: *Mails* et *Objectifs*) côte à côte.

---

## 16. KPI — FAMILLE ANALYTICS (`Mails Analytics`)

À l'inverse des KPI Standards, cette famille utilise des **cartes individuelles fermées et douces** :
*   Grille : `grid gap-2 sm:grid-cols-3`
*   Surface : `rounded-[18px] bg-white/[0.03] px-3.5 py-3`
*   Label : `text-[11px] uppercase tracking-[0.14em] text-white/42`
*   Valeur numérique : `text-xl font-semibold text-white` (20px)
*   Valeur textuelle (ex: "Obtenir un RDV") : `text-base font-semibold leading-tight text-white` (16px)

---

## 17. SEGMENTED CONTROLS

### Modèle Capsule Analytics (Nav Visualisations)
*   Wrapper externe : `inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5`
*   Bouton Actif : `bg-white text-heading rounded-full px-2.5 py-1 text-[11px] font-semibold`
*   Bouton Inactif : `text-white/62 hover:text-white rounded-full px-2.5 py-1 text-[11px] font-semibold`

---

## 18. CAROUSEL HORIZONTAL ANALYTICS

*   **Principe de composition :**
    *   Viewport : `relative overflow-hidden`
    *   Track : `flex min-h-[26rem] w-[200%] transition-transform duration-300 ease-out`
    *   Slide 1 (Volume) : `w-1/2 shrink-0 pr-4`, affiché avec `transform: translateX(0%)`.
    *   Slide 2 (Objectifs) : `w-1/2 shrink-0 pl-4`, affiché avec `transform: translateX(-50%)`.
*   **Extension à N slides :** Pour 3 slides, `w-[300%]`, slide width `w-1/3`, offsets `0%`, `-33.33%`, `-66.66%`.

---

## 19. HISTOGRAMME SVG (« Mails générés »)

*   **Dimensions viewBox :** `0 0 920 388`
*   **Paddings internes :** top `22px`, right `16px`, bottom `54px`, left `24px` (hauteur utile = `312px`).
*   **Barres :** largeur max `42px` (`barWidth`), rayon supérieur/inférieur `rx="10"`.
*   **Couleur & Opacité :** `fill="var(--color-brand-brass)" opacity={0.94}` (`#C89A2B`).
*   **Reflet supérieur :** rectangle overlay `height={Math.min(18, valueHeight)} rx="10" fill="rgba(255,255,255,0.18)"`.
*   **Étiquette de valeur :** au-dessus de chaque barre (`textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(255,255,255,0.92)"`).

---

## 20. DONUT INTERACTIF (« Répartition des objectifs »)

*   **Dimensions & Géométrie :** viewBox `0 0 220 220`, rayon central `74px`, épaisseur de trait `strokeWidth = 28px`.
*   **Segment sélectionné :** surépaisseur à `32px` (`strokeWidth + 4`) et opacité max à `1.0`.
*   **Pourcentages :** affichés au centre de l'arc si le ratio est $\ge 9\%$ (`fill="rgba(255,255,255,0.72)" fontSize="11" fontWeight="600"`).
*   **Centre du Donut :** disque overlay `106 × 106 px`, `rounded-full bg-[#111735]/95 shadow-[0_10px_30px_rgba(0,0,0,0.28)]` affichant l'objectif sélectionné, sa valeur et son unité.
*   **Liste synchronisée (à droite) :** rangées interactives `rounded-[16px] px-3 py-1.5`. Rangée active : `bg-white/[0.08]`.

---

## 21. PALETTE DATAVIZ CANONIQUE

| Token DataViz | Hex résolu | Rôle & Association sémantique |
|---|---|---|
| `--color-dataviz-1` | `#2554B8` | Cobalt Marque / Prospection / Volume principal |
| `--color-dataviz-2` | `#C89A2B` | Brass Or / Client Actif / Objectif dominant |
| `--color-dataviz-3` | `#63A6E8` | Bleu Ciel / Présentation d'offre |
| `--color-dataviz-4` | `#719A5A` | Vert Sauge / Recrutement / Soumission profil |
| `--color-dataviz-5` | `#7B6BB2` | Violet Améthyste / Management / Prochaines étapes |
| `--color-dataviz-6` | `#D4B26A` | Sable Ocre / Interne / Répartition secondaire |
| `--color-dataviz-7` | `#B37D53` | Terre Cuite / Relance & Réactivation |

---

## 22. ÉTATS INTERACTIFS

```md
| Composant | Default | Hover | Active / Selected | Focus Visible |
|---|---|---|---|---|
| Close Button | `text-muted` | `bg-white/5 text-white` | `bg-white/10` | `ring-2 ring-brand-brass/60` |
| Item Nav | `border-transparent text-white/75` | `border-white/10 bg-white/[0.04] text-white` | `border-brand-brass/40 bg-brand-brass/10 text-white` | `ring-2 ring-brand-brass/40` |
| Select / Field | `border-white/10 bg-white/[.04] text-white` | `border-white/20` | — | `border-brand-brass/60 ring-2 ring-brand-brass/30` |
| Segmented Button| `text-white/62` | `text-white` | `bg-white text-heading font-semibold` | `ring-2 ring-brand-brass/50` |
| Objective Row | `bg-transparent` | `bg-white/[0.04]` | `bg-white/[0.08]` | `ring-1 ring-white/20` |
```

---

## 23. ANIMATIONS ET TRANSITIONS

*   **Modale (Apparition) :** `animate-in fade-in duration-200` (200ms ease-out).
*   **Panneaux & Carousel (Glissement) :** `transition-all duration-300 ease-out` / `transition-transform duration-300 ease-out`.
*   **Survol boutons & lignes :** `transition-colors duration-150` ou `duration-200`.
*   **Hauteur des Barres / Arcs SVG :** `transition-[height] duration-300` / `transition-all duration-200`.
*   **Guard Accessibilité Movement :** `motion-reduce:animate-none motion-reduce:duration-0 motion-reduce:transition-none` sur **chaque** élément animé.

---

## 24. ACCESSIBILITÉ (`ACCESSIBILITY`)

1.  **Sémantique Dialog :** `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`, `aria-describedby={subtitleId}`.
2.  **Focus Trap & Restoration :** Piège de focus actif géré par `dialogFocusTrapDestination()`. Mémorisation et restitution du focus sur l'élément appelant au démontage.
3.  **Composants graphiques SVG :** Présence systématique de `role="img"`, `<title>`, `<desc>` et alternatives `sr-only` avec `aria-live="polite"` pour annoncer la mise à jour des données.
4.  **Boutons interactifs DataViz :** `aria-pressed={isSelected}` sur tous les triggers de segmented control et de donut.

---

## 25. INVARIANTS / PARAMÉTRABLE / CONTEXTUEL / INTERDIT

### `INVARIANT` (Strictement obligatoire)
*   Structure du shell (Backdrop flouté + Modal frame rounded-3xl `#0f122c`).
*   Hiérarchie typographique et d'espacement.
*   Logique active/inactive de la navigation gauche (liseré brass + fond 10%).
*   Usage des chiffres `tabular-nums` pour les données numériques.
*   Guard motion-reduce sur toutes les transitions.

### `PARAMETRABLE` (Adaptable selon la feature)
*   Largeur relative de la navigation gauche (`leftPaneWidth`, par défaut `38%`).
*   Contenu des filtres de la barre supérieure.
*   Nombre et libellés des items de navigation.
*   Nombre de KPI et types de graphiques dans le panneau droit.

### `CONTEXTUAL` (Propre à certains écrans)
*   Fond avec dégradé ambré `radial-gradient` (exclusif à la vue analytique Synthèse / Mails).
*   Presence du carousel horizontal (exclusif aux visualisations multiples Synthèse).

### `INTERDIT` (Proscrit)
*   Changer la couleur de fond du shell (`#0f122c`).
*   Multiplier les cartes fermées opaques dans les vues bilatérales standards.
*   Introduire des ombres portées blanches ou colorées arbitraires.
*   Utiliser des bibliothèques de chart tierces (Recharts, Chart.js, etc.).
*   Utiliser des valeurs HEX directes hors tokens canoniques.

---

## 26. RÈGLES DE TRANSPOSITION VERS UNE NOUVELLE FEATURE

Lors de l'implémentation future d'une nouvelle modale (ex: *« Gérer les sources informationnelles »*) :
1.  **Conserver le conteneur `IntelligenceSplitModalShell` intact** sans modifier ses classes internes.
2.  **Composer la navigation gauche** avec la primitive `group flex w-full items-center gap-3 rounded-xl border px-3 py-3` en appliquant les états actif/inactif documentés au §11.
3.  **Créer la page Synthèse** en utilisant le fond `SYNTHESIS_ANALYTICS` et le carousel horizontal `SYNTHESIS_CAROUSEL` à 2 ou 3 slides.
4.  **Adapter uniquement la couche de données métier**, sans altérer les tailles de polices, les marges ou la palette DataViz.

---

## 27. PRÉPARATION À UN FUTUR THÈME LIGHT

Bien que la version Light ne soit pas conçue en Phase 1, les rôles sémantiques sont isolés :
*   `modal-bg` : `#0f122c` (Dark) $\rightarrow$ `#FFFFFF` (Futur Light)
*   `right-pane-bg` : `rgba(2,6,23,0.20)` (Dark) $\rightarrow$ `#F8FAFC` (Futur Light)
*   `text-primary` : `#FFFFFF` (Dark) $\rightarrow$ `#1A2540` (Futur Light)
*   `text-muted` : `#93A0B0` (Dark) $\rightarrow$ `#64748B` (Futur Light)
*   `active-accent` : `#C89A2B` (Invariable — Brand Brass)

---

## 28. ANTI-PATTERNS (À NE JAMAIS FAIRE)

1.  **Le « Dashboard de cartes empilées » :** Enfermer chaque KPI et chaque paragraphe dans une boîte opaque fermée avec ombre portée.
2.  **L'augmentation arbitraire de padding :** Passer les paddings de `px-5 py-3` à `p-8` "pour aérer", ce qui casse la densité d'information.
3.  **L'invention de nuances de couleurs :** Introduire un `#1e293b` ou un `#3b82f6` au lieu de `var(--color-dataviz-1)` ou `#0f122c`.
4.  **L'empilement vertical de gros graphiques :** Mettre deux graphiques de 300px l'un sous l'autre dans le panneau droit, forçant un scroll vertical pénible au lieu d'utiliser le carousel horizontal.
5.  **L'animation non débrayable :** Omettre `motion-reduce:animate-none` sur une transition de slide ou de barre SVG.

---

## 29. MATRICE DE TRAÇABILITÉ

| ID Règle | Périmètre | Règle / Valeur canonique | Preuve | Fichier & Ligne Source |
|---|---|---|---|---|
| DS-001 | `SHELL_GLOBAL` | Fond modale `#0f122c` | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`IntelligenceSplitModalShell.tsx:L117`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L117) |
| DS-002 | `SHELL_GLOBAL` | Backdrop `bg-slate-950/65` + `backdrop-blur-md` | `CODE_EXACT` + `TOKEN_RESOLVED` | [`IntelligenceSplitModalShell.tsx:L106`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L106) |
| DS-003 | `SHELL_GLOBAL` | Dimensions Desktop `max-w-5xl` (1024px) / `h-[80vh]` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L117`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L117) |
| DS-004 | `HEADER` | Header `border-b border-white/5 px-6 py-4` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L123`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L123) |
| DS-005 | `HEADER` | Titre 18px bold text-white / Sous-titre 12px text-muted | `CODE_EXACT` + `TOKEN_RESOLVED` | [`IntelligenceSplitModalShell.tsx:L129-L130`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L129-L130) |
| DS-006 | `LEFT_NAV` | Split ratio Gauche `38%` / Droite `62%` | `CODE_EXACT` | [`IntelligenceSplitModalShell.tsx:L45`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/intelligence/IntelligenceSplitModalShell.tsx#L45) |
| DS-007 | `LEFT_NAV` | Item Nav actif `border-brand-brass/40 bg-brand-brass/10` | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CommercialActivityNavigation.tsx:L19`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityNavigation.tsx#L19) |
| DS-008 | `FILTER_BAR` | Label filtre 10px uppercase `text-white/45` `tracking-[.1em]` | `CODE_EXACT` | [`CommercialActivityFilters.tsx:L57`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L57) |
| DS-009 | `FORM_CONTROL`| Select `h-8 rounded-lg border-white/10 bg-white/[.04]` | `CODE_EXACT` | [`CommercialActivityFilters.tsx:L58`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityFilters.tsx#L58) |
| DS-010 | `KPI_STANDARD`| KPI sans carte opaque, 24px bold tabular-nums + badge 10px | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CommercialActivityOverview.tsx:L13`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityOverview.tsx#L13) |
| DS-011 | `DATAVIZ_STANDARD`| Barres réalisées solides + barres planifiées 28% dashed | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CommercialActivityOverview.tsx:L23-L25`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/features/commercial-activity/CommercialActivityOverview.tsx#L23-L25) |
| DS-012 | `SYNTHESIS_ANALYTICS`| Gradient radial brass `#C99A2E` 18% sur linear gradient | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CompanyDocumentsMailAnalyticsPanel.tsx:L381`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L381) |
| DS-013 | `SYNTHESIS_KPI`| Cartes KPI Analytics `rounded-[18px] bg-white/[0.03]` | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CompanyDocumentsMailAnalyticsPanel.tsx:L383`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L383) |
| DS-014 | `SYNTHESIS_CAROUSEL`| Carousel horizontal `w-[200%]` `transition-transform 300ms` | `CODE_EXACT` | [`CompanyDocumentsMailAnalyticsPanel.tsx:433`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L433) |
| DS-015 | `SYNTHESIS_BAR_CHART`| Histogramme SVG viewBox 920×388, rx=10, fill brass 94% | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CompanyDocumentsMailAnalyticsPanel.tsx:L89-L176`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L89-L176) |
| DS-016 | `SYNTHESIS_DONUT`| Donut 220×220 r=74 stroke=28/32 + center card 106×106 | `CODE_EXACT` + `IMAGE_CONFIRMED` | [`CompanyDocumentsMailAnalyticsPanel.tsx:L218-L323`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/src/components/accounts-contacts/intelligence/CompanyDocumentsMailAnalyticsPanel.tsx#L218-L323) |

---

## 30. CHECKLIST DE REPRODUCTION PIXEL-PERFECT

### Shell & Structure
- [ ] Le backdrop utilise `bg-slate-950/65` avec `backdrop-blur-md`.
- [ ] La modale Desktop mesure `max-w-5xl` (1024px) avec hauteur `80vh` (max `750px`).
- [ ] Le fond de modale est exactement `#0f122c`.
- [ ] Le rayon de bordure externe est `rounded-3xl` (24px) avec filet `border-white/10`.
- [ ] Le split fixe la navigation gauche à `38%` et le contenu à `62%`.

### Header & Navigation
- [ ] Le header mesure ~65px de haut avec séparation `border-white/5`.
- [ ] Le titre est en 18px font-bold `text-white` et le sous-titre en 12px `text-muted` (`#93A0B0`).
- [ ] Les items de navigation ont un rayon `rounded-xl` (12px), padding `px-3 py-3` et gap `12px`.
- [ ] L'item actif affiche une bordure `border-brand-brass/40`, un fond `bg-brand-brass/10` et une icône `bg-brand-brass/20 text-brand-brass`.

### Controls & Filtres
- [ ] Les labels de filtres sont en 10px uppercase `tracking-[.1em] text-white/45`.
- [ ] Les champs select/input font 32px de haut (`h-8`) avec fond `bg-white/[.04]` et bordure `border-white/10`.
- [ ] Le focus affiche l'anneau brass `focus-visible:ring-brand-brass/30`.

### KPI & Graphiques
- [ ] Les KPI Standards n'ont pas de boîte fermée opaque, uniquement un filet `border-b border-white/8`.
- [ ] Les chiffres clés utilisent la police heading en 24px bold avec `tabular-nums`.
- [ ] Les barres de réalisé ont un sommet arrondi à 2px (`rounded-t-sm`).
- [ ] Les barres de planifié sont adjacentes, occupent 28% du slot avec bordure pointillée `border-dashed border-white/25`.
- [ ] Le carousel analytique translate le track `w-[200%]` via `translateX(0%)` / `translateX(-50%)` en 300ms ease-out.
- [ ] Les visualisations respectent toutes la directive `motion-reduce:animate-none`.
