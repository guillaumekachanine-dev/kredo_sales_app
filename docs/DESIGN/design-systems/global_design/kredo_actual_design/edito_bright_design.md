# `edito_bright_design`

## Statut

Référence graphique canonique KREDO pour les interfaces éditoriales claires.

- **Identifiant à employer dans les prompts** : `edito_bright_design`
- **Source visuelle de référence** : `/legacy/folio/sector-studies/18fdb6ed-91e0-4655-8e2a-140e870c3e38`
- **Compte support** : CEGEMA
- **Nature** : design éditorial premium, lumineux, structuré et analytique
- **Mode** : clair uniquement

Lorsqu'une demande mentionne `edito_bright_design`, l'agent de codage doit lire ce document avant toute modification UI et appliquer les règles ci-dessous. La simple mention de cet identifiant vaut sélection explicite de ce design system.

---

## 1. Intention

`edito_bright_design` sert à présenter des contenus riches, narratifs ou analytiques sans donner l'impression d'un dashboard opérationnel dense.

Le rendu doit évoquer :

- une note de cabinet de conseil ;
- un rapport éditorial premium ;
- une fiche d'analyse structurée ;
- une lecture calme, hiérarchisée et immédiatement compréhensible.

La couleur structure la lecture mais ne décore pas. Le navy porte les titres et en-têtes, le brass signale les éléments importants, les gris bleutés organisent les niveaux de texte.

---

## 2. Périmètre recommandé

Utiliser ce système pour :

- études sectorielles et analyses de marché ;
- rapports, synthèses exécutives et diagnostics ;
- fiches de référence, playbooks et documents de conseil ;
- pages de lecture longues avec plusieurs chapitres ;
- modules d'intelligence nécessitant un thème clair et éditorial.

Ne pas l'utiliser par défaut pour :

- tableaux CRM très opérationnels ;
- kanbans, plannings ou écrans transactionnels denses ;
- pages sombres de la famille Intelligence ;
- drawers d'action rapide ;
- écrans où la priorité est la vitesse de saisie plutôt que la lecture.

---

## 3. Sources d'implémentation à consulter

La référence est construite à partir de ces fichiers :

- `src/features/legacy/folio/FolioSectorStudyDetail.tsx`
- `src/features/legacy/folio/FolioSectorAnalysisPanel.tsx`
- `src/features/legacy/folio/FolioMobileAnalysisSections.tsx`
- `src/features/legacy/folio/FolioBanner.tsx`
- `src/features/legacy/folio/icons.tsx`

La route de référence distribue deux composants distincts selon l'appareil. Cette séparation fait partie du système et ne doit pas être remplacée par un composant Desktop chargé puis masqué en CSS sur Mobile.

---

## 4. Données et structure de contenu

Le design est indépendant de Supabase, mais il suppose des contenus structurés par sections.

La page source affiche sept familles de contenu :

1. synthèse sectorielle ;
2. marché ;
3. acteurs ;
4. chaîne de valeur ;
5. réglementation ;
6. concurrence ;
7. clientèle.

Le système doit fonctionner avec toute taxonomie équivalente : une synthèse principale, puis plusieurs chapitres analytiques composés de valeurs, listes, tags ou paragraphes.

### Règles Data

- Ne jamais créer une table uniquement pour appliquer ce design.
- Conserver la source de vérité métier existante.
- Filtrer les valeurs absentes ou non exploitables avant le rendu.
- Ne pas afficher de carte vide lorsque toute une section est absente.
- Préserver les listes et paragraphes : ne pas transformer automatiquement un texte narratif en KPI.

---

## 5. Palette canonique

Les valeurs ci-dessous décrivent la référence visuelle. Dans les composants, utiliser des tokens sémantiques Tailwind/CSS et non des couleurs hexadécimales répétées.

| Token recommandé | Valeur de référence | Usage |
|---|---:|---|
| `edito-canvas` | `#F8FAFC` | arrière-plan secondaire très léger |
| `edito-surface` | `#FFFFFF` | cartes et zone principale |
| `edito-navy` | `#1E3150` | en-têtes de cartes, bandeaux, icônes Mobile |
| `edito-heading` | `#243B63` | titres de sections et micro-labels |
| `edito-ink` | `#1E293B` | texte très fort et texte sur brass clair |
| `edito-body` | `#334155` | texte courant |
| `edito-muted` | `#64748B` | métadonnées, états vides, traits de synthèse |
| `edito-border` | `#CBD5E1` | bordures principales |
| `edito-chip` | `#F1F5F9` | tags neutres |
| `edito-chip-soft` | `#F8FAFC` | tags ou surfaces discrètes |
| `edito-brass` | `#D89B16` | accents, icônes fortes, bordures ciblées |
| `edito-gold` | `#FBBF24` | icônes sur fond navy, titre de bandeau sombre |
| `edito-amber-soft` | `#FEF3C7` | tags émergents ou signal secondaire |

### Usage des couleurs

- Le navy est réservé aux en-têtes, bandeaux, icônes et titres structurants.
- Le brass et le gold sont des accents, jamais la couleur dominante d'une page.
- Le gold ne doit pas servir de texte courant sur fond blanc.
- Le corps de texte reste gris bleuté, jamais noir pur.
- Les bordures sont visibles et participent à la structure ; elles remplacent les ombres lourdes.

### Industrialisation des tokens

Lors de la première implémentation hors dossier Legacy, ajouter les alias `--color-edito-*` nécessaires dans `src/app/globals.css`, puis utiliser les classes Tailwind générées (`bg-edito-navy`, `text-edito-body`, etc.).

Ne pas recopier les hexadécimaux dans chaque composant. La page Legacy constitue la source visuelle, pas le modèle de duplication des couleurs en dur.

---

## 6. Typographie

Le système utilise la famille typographique globale KREDO. La hiérarchie repose sur la graisse, la casse et l'espacement des lettres.

### Échelle recommandée

| Élément | Desktop | Mobile | Traitement |
|---|---|---|---|
| Titre de page | `text-2xl` | `text-xl` | gras, tracking serré |
| Sous-titre / contexte | `text-sm` | `text-xs` | medium, couleur body |
| Titre de section | `text-xs` | `text-xs` | gras, uppercase, tracking wider |
| Label analytique | `text-[11px]` | `text-[10px]` | gras, uppercase, tracking wide |
| Texte courant | `text-sm` | `text-xs` | leading-relaxed |
| Tags | `text-[9px]` à `text-[10px]` | idem | medium ou bold selon importance |
| Métadonnées | `text-[10px]` | `text-[10px]` | bold, muted |

### Principes

- Les titres de section sont courts et nominaux.
- L'uppercase est réservé aux titres de module, labels et badges.
- Le texte narratif conserve une largeur confortable et un `leading-relaxed`.
- Ne pas multiplier les tailles : la hiérarchie vient surtout du contraste navy/body/muted.

---

## 7. Layout Desktop — Analyse éditoriale

### Conteneur principal

Référence :

```tsx
<div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
```

Règles :

- largeur maximale contenue, jamais plein écran sans nécessité ;
- marge verticale régulière de 24 px ;
- lecture centrée ;
- pas de sidebar interne supplémentaire.

### En-tête d'identité

Composition :

- surface blanche ;
- bordure `edito-border` ;
- rayon `rounded-xl` ;
- logo à gauche ;
- titre + sous-titre ;
- badge de provenance et date à droite ;
- `shadow-sm` autorisée uniquement ici si elle reste presque imperceptible.

L'en-tête doit identifier immédiatement l'entité, le type d'analyse et la date.

### Bandeau éditorial

Le bandeau sombre sert à signaler une provenance, un caveat ou un statut documentaire important.

Composition :

- fond navy ;
- bordure claire ;
- badge brass ;
- titre gold ;
- explication courte en gris clair.

Il ne doit pas devenir un bloc promotionnel ou un CTA.

### Synthèse principale

La synthèse est pleine largeur et précède les chapitres détaillés.

- carte blanche ;
- bordure légèrement plus forte que les cartes secondaires ;
- icône brass ;
- titre navy ;
- filet vertical muted à gauche du texte ;
- paragraphes et listes conservés dans leur ordre.

### Grille de chapitres

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

Chaque chapitre utilise une carte éditoriale :

- bordure nette ;
- fond blanc ;
- rayon `rounded-lg` ;
- en-tête navy sur toute la largeur ;
- icône gold ;
- contenu interne avec 16 px de padding ;
- espacement vertical de 16 px entre groupes.

Les cartes ne doivent pas être forcées à la même hauteur si leur contenu est de densité différente.

---

## 8. Layout Mobile — Lecture continue

Le Mobile n'est pas une réduction des cartes Desktop.

### Structure

- une seule surface blanche principale ;
- bordure et rayon `rounded-xl` ;
- sections empilées ;
- séparateurs horizontaux ;
- aucun en-tête de carte navy pleine largeur ;
- icône navy dans un carré clair de 24 × 24 px ;
- titre de section navy à côté ;
- contenu indenté de 32 px.

Référence :

```tsx
<section className="space-y-2 border-b border-edito-border pb-4 last:border-0 last:pb-0">
  <div className="flex items-center gap-2">
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-edito-navy/10" />
    <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy" />
  </div>
  <div className="space-y-3 pl-8">...</div>
</section>
```

### Règles Mobile

- composants Mobile dédiés, distribués côté serveur ;
- texte courant `text-xs` et `leading-relaxed` ;
- listes verticales plutôt que nuages de tags lorsque la densité devient élevée ;
- pas de tableau horizontal ;
- aucune information critique uniquement accessible au hover ;
- actions éventuelles avec cible tactile minimale de 44 px.

---

## 9. Composants visuels

### `EditoBrightIdentityHeader`

Responsabilité : identité de l'entité, contexte, date, provenance.

### `EditoBrightNotice`

Responsabilité : caveat documentaire, provenance, lecture seule ou niveau de confiance.

### `EditoBrightExecutiveSummary`

Responsabilité : texte de synthèse pleine largeur, paragraphes et listes.

### `EditoBrightSectionCard` — Desktop

Responsabilité : chapitre analytique avec en-tête navy.

### `EditoBrightMobileSection` — Mobile

Responsabilité : chapitre continu avec icône, séparateur et indentation.

### `EditoBrightLabelValue`

Responsabilité : label uppercase court + valeur narrative.

### `EditoBrightTagList`

Responsabilité : catégories, acteurs ou statuts courts. Ne pas l'utiliser pour des phrases longues.

Ces composants peuvent être créés uniquement lorsqu'au moins deux pages réelles les réutilisent. Pour une page isolée, conserver des composants locaux simples afin d'éviter une abstraction prématurée.

---

## 10. Icônes

- style line icon ;
- taille 14 à 16 px ;
- stroke homogène ;
- aucune illustration 3D ;
- Desktop : gold sur navy ;
- Mobile : navy sur fond navy à 10 % ;
- une icône par chapitre, toujours liée au sens du contenu.

Réutiliser les icônes déjà disponibles dans le projet avant d'en ajouter de nouvelles.

---

## 11. Bordures, rayons et ombres

| Élément | Rayon | Bordure | Ombre |
|---|---|---|---|
| Identité | `rounded-xl` | default | `shadow-sm` tolérée |
| Bandeau | `rounded-lg` | default | `shadow-sm` tolérée |
| Carte Desktop | `rounded-lg` | default | aucune |
| Surface Mobile | `rounded-xl` | default | aucune |
| Tag | `rounded` | fine | aucune |
| Icône Mobile | `rounded-md` | aucune | aucune |

Règle : les bordures et aplats portent la hiérarchie. Les ombres ne doivent jamais devenir le langage principal.

---

## 12. Densité et rythme

Échelle dominante : 4 / 6 / 8 / 12 / 16 / 24 px.

- espace entre grands modules : 24 px ;
- padding d'une carte : 16 à 20 px ;
- espace entre groupes internes : 16 px ;
- espace label → valeur : 2 à 4 px ;
- espace entre items de liste : 4 à 6 px ;
- gap d'une grille Desktop : 24 px.

Le système doit paraître aéré sans gaspiller l'espace. Ne pas ajouter de grands espaces décoratifs vides.

---

## 13. Interactions et mouvement

Le système est d'abord un système de lecture.

- transitions courtes uniquement sur liens, boutons ou éléments réellement interactifs ;
- aucun mouvement permanent ;
- aucun gradient animé ;
- aucun effet de profondeur spectaculaire ;
- hover discret : variation de texte, bordure ou fond ;
- respect de `prefers-reduced-motion` si une animation ponctuelle est ajoutée.

---

## 14. Accessibilité

- conserver un contraste AA minimum ;
- ne pas utiliser brass/gold comme texte courant sur blanc ;
- ne pas coder une information uniquement par couleur ;
- titres de sections dans un ordre sémantique cohérent ;
- listes rendues avec `ul`/`li` ;
- boutons et liens avec focus visible ;
- Mobile : cibles tactiles de 44 px minimum pour toute action.

---

## 15. Ce qu'il faut reproduire

- palette navy + brass + gris bleutés ;
- en-têtes de cartes navy sur Desktop ;
- synthèse pleine largeur avant les détails ;
- grille analytique à deux colonnes Desktop ;
- lecture continue à sections séparées sur Mobile ;
- labels uppercase courts ;
- surfaces blanches et bordures structurantes ;
- accent coloré limité aux points d'attention.

## 16. Ce qu'il ne faut pas reproduire

- les couleurs hexadécimales en dur dans chaque nouveau composant ;
- les références textuelles « FOLIO » hors contexte Legacy ;
- une grille de cartes Desktop identique sur Mobile ;
- des tags contenant des paragraphes ;
- des cartes vides ;
- des ombres fortes ;
- de l'orange ou du gold sur tous les titres ;
- des dashboards remplis de KPI si le contenu est narratif.

---

## 17. Contrat d'activation pour l'agent

Lorsqu'un prompt contient `edito_bright_design`, l'agent doit :

1. lire ce document ;
2. inspecter les fichiers sources listés en section 3 ;
3. identifier les données et la structure de contenu existantes ;
4. proposer ou produire une vue Desktop analytique et une vue Mobile dédiée ;
5. employer les tokens sémantiques du système ;
6. préserver la palette, le rythme, la hiérarchie et les restrictions ;
7. ne pas modifier Supabase sauf nécessité métier indépendante du design ;
8. vérifier Desktop et Mobile séparément.

La mention de ce nom ne demande pas de recopier la page Legacy à l'identique. Elle demande de reprendre son langage graphique et ses principes de composition en les adaptant au contenu cible.

---

## 18. Checklist de validation

### Data

- [ ] Les données réelles et les états absents sont compris.
- [ ] Aucune table n'a été créée pour un besoin purement visuel.
- [ ] Les sections vides sont supprimées proprement.

### Desktop

- [ ] Contenu centré et largeur de lecture maîtrisée.
- [ ] Synthèse principale pleine largeur.
- [ ] Chapitres en grille 2 colonnes lorsque pertinent.
- [ ] En-têtes navy, icônes gold, contenu clair.
- [ ] Bordures visibles, ombres minimales.

### Mobile

- [ ] Composant Mobile dédié.
- [ ] Une surface continue avec séparateurs.
- [ ] Pas de composant Desktop caché en CSS.
- [ ] Texte et listes lisibles sans scroll horizontal.
- [ ] Actions éventuelles accessibles au toucher.

### Qualité

- [ ] Aucun hexadécimal dupliqué dans les composants nouveaux.
- [ ] Pas de dépendance graphique ajoutée.
- [ ] Pas de sur-ingénierie ni de primitive générique créée pour un seul usage.
- [ ] Typecheck et lint ciblé passent.

---

## 19. Version

- **Version** : 1.0
- **Créée le** : 18 juillet 2026
- **Source figée** : route Legacy FOLIO CEGEMA et composants associés sur `main`
- **Propriétaire fonctionnel** : KREDO
