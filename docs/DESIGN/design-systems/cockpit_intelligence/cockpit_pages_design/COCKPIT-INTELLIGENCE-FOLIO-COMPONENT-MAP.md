# Cockpit Intelligence — Cartographie des composants FOLIO V3

Statut : **TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
Date de production : 4 août 2026
Dernière vérification : 4 août 2026
Version : 1.1

Référence : `docs/design/COCKPIT-INTELLIGENCE-FOLIO-CHARTER.md`

---

## Conventions

- **Responsabilité** : ce que le composant affiche ou fait.
- **Données attendues** : les champs ou structures consommés.
- **Origine des données** : Supabase, computed, props, V3 contract.
- **Variante Desktop** / **Mobile** : rendu différencié ou identique.
- **Composant existant réutilisable** : un composant déjà dans le dépôt.
- **Nouveau composant** : à créer au Lot 5 (aucun composant n'est créé au Lot 1).
- **Tokens** : variables CSS ou classes Tailwind utilisées.
- **États** : chargement, vide, erreur, historique V1/V2, V3.
- **Contraintes de densité** : comportement avec des contenus très longs.
- **Accessibilité** : exigences WCAG spécifiques.
- **Responsive** : règles de breakpoint ou adaptation.

Les seules cibles graphiques historiques sont les Réf. 01, 02, 04, 05 et 06. Les Réf. 03, 07, 08 et 09 montrent la mise en page Kredo actuelle et sont exclues. Tout composant sans couverture par l'une des cinq références doit être fondé sur le rendu legacy, les styles calculés, le code ou marqué `V3_EXTENSION`.

---

## 1. FolioStudySummary

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Synthèse narrative d'ouverture du compte. Texte dense, pleine largeur, avant les sections détaillées. Reprend la logique de la « Synthèse sectorielle » FOLIO (capture 02). |
| **Données attendues** | Texte narratif long (paragraphes + listes éventuelles). Champ V3 : `syntheseDuCompte.contenu` (à définir au Lot 2). |
| **Origine des données** | `ai_intelligence_results.content` (V3), fallback `metadata.sector_analysis.synthese_sectorielle` (legacy) |
| **Variante Desktop** | Carte blanche, bordure muted `#64748B`, padding 20px, icône brass Compass 16px, titre « Synthèse du compte » uppercase, filet vertical `border-l-2 border-[#64748B]` à gauche du texte, `text-sm leading-relaxed text-[#334155]`. |
| **Variante Mobile** | Section avec icône dans carré navy@10% (24px), titre navy uppercase, contenu indenté 32px, `text-xs leading-relaxed`. Pas de filet vertical. **V3_EXTENSION** graphique fondée sur le composant legacy Mobile (CODE), faute de capture Mobile canonique. |
| **Composant existant réutilisable** | Synthèse dans `FolioSectorAnalysisPanel.tsx` (L92-117) et `FolioMobileAnalysisSections.tsx` (L145-161). |
| **Nouveau composant** | `FolioStudySummary` (Desktop) + sous-composant Mobile intégré dans `FolioStudyMobileSections`. |
| **Tokens** | `edito-brass`, `edito-heading`, `edito-body`, `edito-muted`, `edito-border`, `edito-surface` |
| **État chargement** | Skeleton : rectangle shimmer pleine largeur avec filet vertical. |
| **État vide** | « Synthèse non disponible. » en italique muted. |
| **État erreur** | Message centré avec bouton retry discret. |
| **État V1/V2** | Afficher `synthese_consultant` (V1) ou `synthese_sectorielle` (V2) via lecteur historique. Badge « FOLIO original ». |
| **Dépendance V3** | Texte narratif + sources rattachées + état de preuve. |
| **Contraintes densité** | Aucune hauteur maximale. Le texte peut faire 20+ lignes. Pas de troncature. |
| **Accessibilité** | Heading `<h2>` ou `<h3>` selon hiérarchie de page. Filet décoratif (`aria-hidden`). |
| **Responsive** | Desktop : filet + padding 20px. Mobile : pas de filet, indent 32px. |

---

## 2. FolioStudySection

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Conteneur générique pour une section éditoriale (sections 2 à 7). Header navy + body blanc. |
| **Données attendues** | `icon`, `title`, `children` (contenu libre). |
| **Origine des données** | Props. Le contenu est injecté par le composant parent. |
| **Variante Desktop** | Carte `rounded-lg`, `border border-[#CBD5E1]`, `overflow-hidden`. Header navy pleine largeur. Body `p-4 space-y-4`. |
| **Variante Mobile** | Non utilisé directement — le Mobile utilise `FolioStudyMobileSection`. |
| **Composant existant réutilisable** | `Section` dans `FolioSectorAnalysisPanel.tsx` (L56-76). |
| **Nouveau composant** | `FolioStudySection` (renommage et extraction). |
| **Tokens** | `edito-navy`, `edito-gold`, `edito-border`, `edito-surface` |
| **État chargement** | Skeleton avec header navy + lignes shimmer dans le body. |
| **État vide** | Ne pas afficher la carte si le contenu est intégralement absent. |
| **État erreur** | Message d'erreur dans le body, header conservé. |
| **État V1/V2** | Contenu legacy affiché avec badge. |
| **Dépendance V3** | Structure de contenu par section. |
| **Contraintes densité** | Le body s'étend sans limite. Pas de `max-h`. |
| **Accessibilité** | Titre dans le header = `<h3>`. Icône `aria-hidden`. |
| **Responsive** | Desktop : carte avec header navy. Mobile : composant séparé. Dans une grille V3, le conteneur doit déclarer `items-start` pour éviter l'étirement par défaut observé dans le legacy — V3_EXTENSION. |

---

## 3. FolioStudySectionHeader

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | En-tête navy d'une carte section Desktop. |
| **Données attendues** | `icon` (composant SVG), `title` (string). |
| **Origine des données** | Props statiques. |
| **Variante Desktop** | `bg-[#1E3150]`, `px-3.5 py-2.5`, `border-b border-[#CBD5E1]`. Icône gold 14px, titre blanc uppercase bold 12px tracking-wider. |
| **Variante Mobile** | Non utilisé — le Mobile a sa propre structure (icône dans carré + titre navy). |
| **Composant existant réutilisable** | En-tête dans le composant `Section` de `FolioSectorAnalysisPanel.tsx` (L67-72). |
| **Nouveau composant** | Peut être extrait comme sous-composant de `FolioStudySection`. |
| **Tokens** | `edito-navy`, `edito-gold`, `edito-border` |
| **État chargement** | N/A — le header est toujours affiché. |
| **État vide** | N/A. |
| **État erreur** | N/A. |
| **Accessibilité** | Le titre est un `<span>` avec style visuel, mais sémantiquement lié au `<h3>` du conteneur. |
| **Responsive** | Desktop uniquement. |

---

## 4. FolioStudySubheading

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Sous-titre éditorial précédant un groupe de données au sein d'une section. |
| **Données attendues** | `label` (string). |
| **Origine des données** | Props statiques. |
| **Variante Desktop** | `text-[11px]`, bold, uppercase, tracking-wider, `text-[#243B63]`. |
| **Variante Mobile** | `text-[10px]`, bold, uppercase, tracking-wide, `text-[#243B63]`. |
| **Composant existant réutilisable** | Labels dans `InfoRow`, `BulletList`, `SectionRows`. |
| **Nouveau composant** | `FolioStudySubheading` (extraction). |
| **Tokens** | `edito-heading` |
| **Accessibilité** | Utiliser un `<h4>` si sémantiquement approprié, sinon `<p>` avec role. |
| **Responsive** | Taille réduite sur Mobile. |

---

## 5. FolioNarrativeBlock

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Bloc de texte narratif dense : paragraphes et/ou listes au sein d'une section. |
| **Données attendues** | Texte brut ou blocs structurés (paragraphes + listes). |
| **Origine des données** | Parsing du contenu V3 ou legacy (`buildSyntheseBlocks`, `parseNarrativeBlocks`). |
| **Variante Desktop** | `text-sm text-[#334155] leading-relaxed`, `space-y-3` entre blocs. |
| **Variante Mobile** | `text-xs text-body leading-relaxed`, `space-y-2` entre blocs. |
| **Composant existant réutilisable** | Le rendu inline dans `FolioSectorAnalysisPanel.tsx` (L102-114) et Mobile (L147-157). |
| **Nouveau composant** | `FolioNarrativeBlock`. |
| **Tokens** | `edito-body` |
| **Contraintes densité** | Aucune limite de longueur. Les paragraphes ne sont jamais tronqués. |
| **Accessibilité** | Listes rendues avec `<ul>/<li>`. Paragraphes avec `<p>`. |
| **Responsive** | Taille ajustée automatiquement. |

---

## 6. FolioEditorialList

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Liste à puces avec label bold-dash optionnel. Format : « **Nom** — description ». |
| **Données attendues** | `label` (string), `items` (string[]). Chaque item peut contenir un nom en gras suivi d'un tiret et d'une description. |
| **Origine des données** | Props. Items filtrés (retire « Non trouvé », nulls). |
| **Variante Desktop** | Label `text-[11px]` bold uppercase. Liste `list-disc pl-4 space-y-0.5 text-xs text-[#334155]`. Noms en `<strong>`. |
| **Variante Mobile** | Label `text-[10px]` bold uppercase. Liste `list-disc pl-4 space-y-1.5 text-xs text-body leading-relaxed`. |
| **Composant existant réutilisable** | `BulletList` (Desktop, L41-54), `LabeledBullets` (Mobile, L71-86). |
| **Nouveau composant** | `FolioEditorialList` (unification). |
| **Tokens** | `edito-heading`, `edito-body` |
| **Contraintes densité** | Pas de limite historique. Maximum Supabase observé : 10 items dans une famille de liste. Afficher intégralement jusqu'à 10 ; disclosure optionnelle à partir du 11e item (V3_EXTENSION). |
| **Accessibilité** | `<ul>/<li>` sémantique. `<strong>` pour les noms importants. |
| **Responsive** | Espacement et taille ajustés. |

---

## 7. FolioIdentityGrid

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Grille de fiche d'identité : paires label/valeur. |
| **Données attendues** | Tableau de `{ label, value }`. Valeurs filtrées. |
| **Origine des données** | Données relationnelles Supabase prioritaires, enrichissement V3 secondaire. |
| **Variante Desktop** | Grille 2 colonnes. Label uppercase `text-[11px]` bold. Valeur `text-xs`. Séparateur horizontal léger entre lignes. **V3_EXTENSION** : aucune capture historique canonique ne couvre la fiche d'identité. |
| **Variante Mobile** | Lignes empilées (label au-dessus, valeur en dessous). **V3_EXTENSION** fondée sur le patron `SectionRows` (CODE). |
| **Composant existant réutilisable** | `InfoRow` (Desktop, L13-25), `SectionRows` (Mobile, L38-55). |
| **Nouveau composant** | `FolioIdentityGrid` (Desktop) + `FolioIdentityRowsMobile`. |
| **Tokens** | `edito-heading`, `edito-body`, `edito-border` |
| **État vide** | « Données d'identité non disponibles. » |
| **Accessibilité** | Utiliser `<dl>/<dt>/<dd>` pour les paires label/valeur. |
| **Responsive** | Desktop : 2 colonnes. Mobile : empilé. |

---

## 8. FolioIdentityRowsMobile

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Version Mobile de la grille d'identité : lignes empilées. |
| **Données attendues** | Identiques à `FolioIdentityGrid`. |
| **Variante Mobile** | `space-y-2.5`. Label `text-[10px]` bold uppercase. Valeur `text-xs leading-relaxed`. **V3_EXTENSION** graphique fondée sur le code legacy. |
| **Composant existant réutilisable** | `SectionRows` (L38-55 de `FolioMobileAnalysisSections.tsx`). |
| **Nouveau composant** | `FolioIdentityRowsMobile` (si séparé de `FolioIdentityGrid`). |
| **Tokens** | `edito-heading`, `edito-body` |
| **Accessibilité** | `<dl>/<dt>/<dd>` sémantique. |

---

## 9. FolioSourceMarker — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Marqueur inline `[1]`, `[2]` rattachant une affirmation à sa source. |
| **Données attendues** | `sourceIndex` (number), `onClick` ou lien vers disclosure. |
| **Origine des données** | Mapping V3 source_refs → index dans la section. |
| **Variante Desktop** | Exposant cliquable, `text-[9px]`, couleur `edito-brass`, cursor pointer. |
| **Variante Mobile** | Identique, taille `text-[9px]`. |
| **Nouveau composant** | `FolioSourceMarker`. |
| **Tokens** | `edito-brass` |
| **Accessibilité** | `<sup>` sémantique. `aria-label="Source [n]"`. Cible cliquable ≥ 24px. |

---

## 10. FolioSourceDisclosure — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Liste repliable des sources d'une section. |
| **Données attendues** | `sources` : tableau de `{ index, url, titre, date, methode, fiabilite }`. |
| **Origine des données** | `intelligence_sources` + `intelligence_source_links`. |
| **Variante Desktop** | `<details>` natif. Summary : « Sources — n ». Contenu : liste numérotée. `text-[10px]`, muted. |
| **Variante Mobile** | Identique, `text-[10px]`. Fermé par défaut. |
| **Nouveau composant** | `FolioSourceDisclosure`. |
| **Tokens** | `edito-muted`, `edito-border` |
| **Accessibilité** | `<details>/<summary>` natif. Focus visible sur summary. |

---

## 11. FolioEvidenceState — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Signal visuel de l'état de preuve d'une affirmation. |
| **Données attendues** | `state` : `"confirmed" | "partial" | "unpublished" | "institutional"`. |
| **Origine des données** | `account_facts.confidence`, résultats de vérification V3. |
| **Variante Desktop** | Icône discrète (check, warning, guillemets) ou texte italique. Pas de badge coloré dominant. |
| **Variante Mobile** | Identique. |
| **Nouveau composant** | `FolioEvidenceState`. |
| **Tokens** | `edito-brass` (confirmé), `edito-muted` (partial, unpublished), `edito-body` (institutional) |
| **Accessibilité** | `aria-label` décrivant l'état. Ne pas coder l'information uniquement par couleur. |

---

## 12. AccountSignalsCompactList — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Liste des 3 derniers signaux significatifs dans la section « Tendances et actualité ». |
| **Données attendues** | `signals` : tableau de `{ titre, date, snippet, score, sources }`. |
| **Origine des données** | `account_signals` triés par date/score. |
| **Variante Desktop** | Cartes compactes empilées. Titre bold, date muted, snippet `text-xs`. Lien « Voir tous les signaux ». |
| **Variante Mobile** | Cartes empilées, taille réduite. |
| **Nouveau composant** | `AccountSignalsCompactList`. |
| **Tokens** | `edito-heading`, `edito-body`, `edito-muted`, `edito-border` |
| **Contraintes densité** | Maximum 3 signaux visibles. Le reste est accessible via modale. |
| **Accessibilité** | Liste sémantique. Lien « Voir tous » avec focus visible. |

---

## 13. AccountSignalsMobileCards — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Version Mobile des cartes de signaux. |
| **Données attendues** | Identiques à `AccountSignalsCompactList`. |
| **Variante Mobile** | Cartes empilées, touch target 44px, texte `text-xs`. |
| **Nouveau composant** | `AccountSignalsMobileCards`. |
| **Tokens** | `edito-heading`, `edito-body`, `edito-muted`, `edito-border` |
| **Accessibilité** | Touch targets ≥ 44px. |

---

## 14. AccountSignalsModal — V3_EXTENSION

| Aspect | Spécification |
|--------|--------------|
| **Responsabilité** | Modale exhaustive de tous les signaux du compte. |
| **Données attendues** | Liste complète des signaux avec métadonnées et sources. |
| **Origine des données** | `account_signals`. |
| **Variante Desktop** | Patron `IntelligenceSplitModalShell`. Liste maître (38%) : signaux triés. Détail (62%) : contenu complet + sources. |
| **Variante Mobile** | Modale plein écran. Navigation liste → détail. |
| **Composant existant réutilisable** | `IntelligenceSplitModalShell` (patron). |
| **Nouveau composant** | `AccountSignalsModal` (contenu injecté dans la shell). |
| **Tokens** | Palette modale (overlay, fond sombre, bordures `white/5`) |
| **État vide** | « Aucun signal disponible. » |
| **Accessibilité** | Focus trap, Échap, `aria-modal`, restauration focus. Touch targets 44px Mobile. |

---

## Synthèse des composants

| # | Composant | Nouveau | Existant réutilisable | V3 | Desktop | Mobile |
|---|-----------|---------|----------------------|-----|---------|--------|
| 1 | FolioStudySummary | ✅ | ✅ (synthèse legacy) | Non | ✅ | ✅ |
| 2 | FolioStudySection | ✅ | ✅ (`Section`) | Non | ✅ | — |
| 3 | FolioStudySectionHeader | ✅ | ✅ (inline) | Non | ✅ | — |
| 4 | FolioStudySubheading | ✅ | ✅ (inline) | Non | ✅ | ✅ |
| 5 | FolioNarrativeBlock | ✅ | ✅ (inline) | Non | ✅ | ✅ |
| 6 | FolioEditorialList | ✅ | ✅ (`BulletList`, `LabeledBullets`) | Non | ✅ | ✅ |
| 7 | FolioIdentityGrid | ✅ | ✅ (`InfoRow`) | V3_EXTENSION | ✅ | — |
| 8 | FolioIdentityRowsMobile | ✅ | ✅ (`SectionRows`) | V3_EXTENSION | — | ✅ |
| 9 | FolioSourceMarker | ✅ | — | V3 | ✅ | ✅ |
| 10 | FolioSourceDisclosure | ✅ | — | V3 | ✅ | ✅ |
| 11 | FolioEvidenceState | ✅ | — | V3 | ✅ | ✅ |
| 12 | AccountSignalsCompactList | ✅ | — | V3 | ✅ | — |
| 13 | AccountSignalsMobileCards | ✅ | — | V3 | — | ✅ |
| 14 | AccountSignalsModal | ✅ | ✅ (shell) | V3 | ✅ | ✅ |

> **Note** : aucun composant React n'est créé au Lot 1. Ce document est un inventaire architectural pour le Lot 5.

> **Note Mobile** : faute de capture historique Mobile canonique, toutes les décisions graphiques Mobile sont des `V3_EXTENSION`, même lorsqu'elles réutilisent une structure technique legacy (`CODE`).
