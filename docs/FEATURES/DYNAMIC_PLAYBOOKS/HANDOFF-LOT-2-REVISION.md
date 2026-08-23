# HANDOFF — DYNAMIC PLAYBOOKS — LOT 2

## 1. Statut

**DONE** — sous réserve de la QA visuelle, réservée à Guillaume (`CLAUDE.md` §8). Toutes les
validations automatiques sont vertes, build webpack compris.

**HEAD de départ :** `442adbcc9c9a83c7176ad91eaf44390a72b5b3d5` (handoff Lot 1, poussé en
production). Aucun fichier du périmètre A1 n'avait bougé depuis.

⚠️ **Voir §10 — activité concurrente détectée dans le répertoire de travail**, sans rapport avec ce
lot, non touchée, à signaler.

---

## 2. Objectif du lot

Deux volets, tous deux dans le mode Battle introduit au Lot 1, aucun autre :

1. **Identité visuelle Battle** (nouvelle demande) — le passage Playbook → Battle doit être
   perceptible instantanément par le fond, sans nouvelle palette.
2. **Refonte de Révision** — transformer le contenu actuel de `BattleCardContent` en lecture
   opérationnelle : 6 axes courts et hiérarchisés, distinction forte disponible/manquant, aucune
   invention face aux profils pauvres ou vides.

Hors périmètre, non entamé : configurateur Situation (L3, propriété A2), INTEL-020 (L4), Knowledge
(L5), Mobile dédié (L6).

---

## 3. Identité visuelle Battle

### 3.1 Principe retenu

Le fond de base **ne change pas** : `PLAYBOOK_SIDE_SURFACE` / `PLAYBOOK_MAIN_SURFACE` (les deux
hex hérités du Lot 1, `#0d0f28` / `#0a0b1e`) restent identiques sur les DEUX faces. En mode Battle,
un **dégradé diagonal** est posé PAR-DESSUS, en `background-image` (jamais en `backgroundColor`,
qui aurait remplacé la base) :

```ts
// battle-workspace-model.ts
export const BATTLE_SIDE_TINT_IMAGE =
  "linear-gradient(165deg, color-mix(in srgb, var(--color-cockpit-cobalt) 22%, transparent) 0%, transparent 65%)"

export const BATTLE_MAIN_TINT_IMAGE =
  "linear-gradient(135deg, color-mix(in srgb, var(--color-cockpit-cobalt) 16%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--color-cockpit-cobalt-deep) 14%, transparent) 100%)"
```

Appliqué dans `BattleWorkspace.tsx` via `style={{ backgroundImage: … }}`, à côté (pas à la place)
de la classe Tailwind `PLAYBOOK_*_SURFACE`, sur les **4 conteneurs existants du Lot 1** — aucun
nouveau wrapper :

| Conteneur | Fichier | Teinte |
|---|---|---|
| `<aside>` rail Desktop | `BattleWorkspace.tsx` | `BATTLE_SIDE_TINT_IMAGE` |
| `<main>` zone Desktop | `BattleWorkspace.tsx` | `BATTLE_MAIN_TINT_IMAGE` |
| wrapper Mobile | `BattleWorkspace.tsx` | `BATTLE_MAIN_TINT_IMAGE` |
| wrapper « aucun acteur » | `BattleWorkspace.tsx` | `BATTLE_MAIN_TINT_IMAGE` |

Le tint s'applique **indépendamment de l'onglet actif** (Révision ou Situation) : c'est une
identité du *workspace*, pas de la vue Révision. La face Playbook, dans `SectorPlaybooksModal.tsx`,
n'est pas touchée — **zéro diff sur ce fichier**, vérifié.

### 3.2 Tokens retenus et pourquoi

`--color-cockpit-cobalt` (= `--color-brand-primary`, `#2554B8`) et `--color-cockpit-cobalt-deep`
(= `--color-brand-primary-deep`, `#1E4596`) — déclarés dans le bloc `@theme` **racine** de
`globals.css` (lignes 44-46), donc globalement disponibles, **pas besoin de
`[data-theme="cockpit"]`**. Vérifié avant de les choisir : ce sont **exactement** les tokens que le
reste de l'app utilise déjà pour signaler un module « intelligence / opérationnel »
(`IntelligenceFAB.tsx` : `bg-cockpit-cobalt`/`bg-cockpit-cobalt-deep` pour l'état actif du panneau ;
`ClientIntelligenceMobileView.tsx`, `QualifiedContactsMobileView.tsx` : en-têtes `bg-cockpit-cobalt`
des vues cockpit compte). Réutiliser ce langage plutôt qu'en inventer un — c'est le sens de
« variation subtile du langage chromatique actuel », pas une nouvelle palette.

### 3.3 Mécanisme du dégradé

`color-mix(in srgb, var(--token) X%, transparent)` — **le même mécanisme que `globals.css` utilise
déjà** pour toutes ses teintes translucides (`color-mix(in srgb, var(--color-brand-brass) 78%,
transparent)` à la ligne 454, etc.). Rien de nouveau introduit dans le repo, seulement réappliqué
à un nouvel endroit.

- **Rail (side)** : un seul stop, 22 % de cobalt s'estompant vers transparent à 165° — une pointe
  de teinte en coin, discrète, cohérente avec la densité déjà élevée du rail (liste de comptes).
- **Zone principale (main)** : deux stops à 135°, cobalt (16 %) puis, à l'opposé, cobalt-deep
  (14 %) — un balayage diagonal traversant toute la surface, qui reste perceptible quel que soit le
  cadrage de l'écran (contrairement à un dégradé radial ancré à un seul coin, qu'un viewport recadré
  pourrait ne jamais montrer).

Aucune ombre, aucun effet glossy, aucun highlight — un unique calque de dégradé mat.

### 3.4 Pourquoi ce choix plutôt que les autres pistes du brief

- **Changement de couleur brutal** (nouvelle `backgroundColor`) : rejeté — le brief le proscrit
  explicitement, et il aurait cassé « le mode Playbook conserve son apparence actuelle » si le même
  mécanisme avait dû être partagé.
- **Teinte plate uniforme** (`background-color` mixé) : rejetée — nécessitait de mixer contre le hex
  de base, donc de le référencer une seconde fois comme littéral ; le calque additif en
  `background-image` garde le hex de base **source unique**, jamais dupliqué.
- **Dégradé radial ancré à un coin** : rejeté au profit du diagonal corner-to-corner, plus fiable
  visuellement (voir §3.3).
- **Combinaison surface + accent de profondeur** : c'est ce qui est livré — le double stop du dégradé
  `main` (cobalt → transparent → cobalt-deep) *est* l'accent de profondeur demandé, sans ombre.

### 3.5 Contraste

Le texte reste blanc/blanc-translucide (`text-white`, `text-white/70`…) sur un fond qui demeure
extrêmement sombre (les deux hex de base ont une luminance quasi nulle) : un dégradé à 14–22 % de
cobalt mixé à `transparent`, en couche additive, ne fait que nuancer légèrement la teinte sans
jamais remonter la luminance vers une zone où le contraste blanc deviendrait un problème. Aucun
calcul de contraste n'a révélé de zone sous le seuil AA — la marge est large (les valeurs de départ
sont > 15:1).

### 3.6 Test de non-régression

`sector-playbooks-modal.test.ts`, describe *« Teinte Battle — uniquement des tokens KREDO »* :
assertion regex qu'aucune des deux chaînes ne contient de `#hex` ni de `rgb(`/`rgba(`, qu'elles
contiennent toutes deux `color-mix(in srgb` et une référence `var(--color-cockpit-cobalt…)`, et
qu'elles diffèrent entre elles (rail ≠ zone principale). Casse immédiatement si quelqu'un
réintroduit un jour un hex en dur dans ce dégradé.

---

## 4. Refonte de Révision

### 4.1 Architecture

`BattleCardContent` (`BattleCardsSection.tsx`) est réécrit autour de deux primitives
présentationnelles locales, réutilisées par toutes les sections :

- **`RevisionSection`** — icône (emoji, `aria-hidden`) + label sobre en majuscules + enfants
  empilés. Trois tons de label : `brass` (défaut, sections d'opportunité), `alert` (Points de
  vigilance), `neutral` (Chantiers, À qualifier — information secondaire).
- **`RevisionBullet`** — une petite carte par fait, jamais un paragraphe. Six tons de fond :
  `brass`, `neutral`, `alert`, `muted`, `positive`, `warning`.

Les 6 axes de préparation, dans l'ordre exact du cadrage §2 :

| Icône | Label | Champs source | Ton |
|---|---|---|---|
| ⚡ | Pourquoi maintenant | `details.triggers[]` | brass |
| 🎯 | Angle d'entrée | `actor.angleEntree` + `details.traductionCommerciale[]` | brass |
| 👤 | À qui parler | `details.coucheEsn[]` | brass |
| 🛡 | Points de vigilance | `details.lignesRouges[]` | alert (rose) |
| 🧩 | Chantiers | `details.chantiersTechnologiques[]` + `details.iaAnnonceVsDeploye` | neutral |
| ⚖ | Forces / vulnérabilités | `actor.forces` / `actor.vulnerability` | grille 2 colonnes, `positive`/`warning` |

Plus, hors décompte des 6 axes (voir §5) :

| Icône | Label | Champ | Toujours affiché si présent |
|---|---|---|---|
| ❓ | À qualifier | `details.trous[]` | oui, y compris à l'état « éparse » |

**Aucune donnée nouvelle** : les 6 axes sont exactement les 6 sections déjà projetées par
`present-competitive-map-workspace.ts` (Lot 0), simplement réordonnées, redécoupées (Forces et
Vulnérabilités séparées de Chantiers, qui n'a plus à porter trois familles de contenu à la fois) et
recouvertes d'un chrome cohérent.

### 4.2 Ce qui a changé par rapport à l'ancien découpage

L'ancienne section unique « Chantiers & Éléments de diagnostic » mélangeait Forces, Vulnérabilité,
IA (annoncé vs déployé) et Chantiers technologiques dans un même bloc en grille. Le cadrage §2
demande deux sections distinctes : **🧩 Chantiers** (technologiques/organisationnels) et
**⚖ Forces/vulnérabilités** (lecture visuellement équilibrée). Séparés en conséquence — `IA (annoncé
vs déployé)` rejoint Chantiers (c'est une observation technologique, pas une force/faiblesse), la
grille 2 colonnes est conservée mais réservée exclusivement à Forces/Vulnérabilités, ce qui la rend
enfin « visuellement équilibrée » comme demandé, plutôt que diluée dans trois autres types de
contenu.

### 4.3 Densité et hiérarchie typographique

- Petites cartes (`p-2.5`, `text-xs`, `rounded-lg`) plutôt que des blocs pleine largeur.
- Un label de section = une ligne, `text-[10px] uppercase tracking-wider font-bold` — jamais de
  sous-titre sur deux lignes.
- Chaque bullet reste un fait unique, jamais concaténé avec un autre.
- Aucun long paragraphe : le texte le plus long possible (`forces`, `vulnerability`, un item de
  `traductionCommerciale`) est une phrase, affichée telle quelle, sans troncature artificielle ni
  invention de résumé.

---

## 5. Profils riches, pauvres, vides — la partie la plus délicate du lot

### 5.1 Le socle : `assessBattleCardRichness` (pur, testé)

Ajouté à `battle-workspace-model.ts`, aux côtés de `resolveBattleActor` et de la machine du
retournement — c'est la seule extension logique de ce lot, et la seule partie exerçable par
`vitest` sans DOM.

```ts
export type BattleCardRichness = "empty" | "sparse" | "rich"

export function classifyBattleCardRichness(filledAxisCount: number, hasKnownGaps: boolean): BattleCardRichness {
  if (filledAxisCount > 0) return "rich"
  return hasKnownGaps ? "sparse" : "empty"
}

export function assessBattleCardRichness(actor: CompetitiveMapActor): BattleCardAssessment {
  // compte les 6 axes ci-dessus (§4.1), EXCLUT `trous` du décompte
  // { richness, filledAxisCount, totalAxisCount: 6, hasKnownGaps }
}
```

**`trous` (À qualifier) est délibérément exclu du décompte des 6 axes.** Lister des inconnues n'est
pas une donnée exploitable — c'est un constat de lacune. Si `trous` comptait comme un axe rempli,
une Battle Card dont *seul* `trous` est renseigné serait présentée comme « riche », ce qui
contredirait directement l'exigence « ne jamais masquer artificiellement le manque de données ».
Testé explicitement (*« n'accorde jamais à trous la valeur d'un axe rempli »*).

### 5.2 Les trois états, mesurés contre la réalité de la base (Lot 0 §10.4)

| État | Condition | Rendu | Cas réel mesuré |
|---|---|---|---|
| **`rich`** | ≥ 1 axe sur 6 rempli | Sections présentes rendues normalement, sections absentes silencieusement omises (comme avant). Si < 6/6, un repère quantitatif discret dans l'en-tête (« N/6 axes »). | Robertet (Compositions & ingrédients B2B) : 6/6 |
| **`sparse`** | 0 axe rempli, mais `trous` non vide | Bandeau compact « Aucun élément de préparation formalisé… » + section ❓ À qualifier seule | À vérifier en QA sur *Spatial, défense & systèmes critiques* — 9/10 entrées ont `trous` mais très peu d'autres axes (Lot 0 : 1 seul trigger, 0 traduction, 0 couche ESN sur tout le segment) |
| **`empty`** | 0 axe rempli, 0 `trous` | Message unique, net : « Battle Card pas encore enrichie » | Les 5 entrées de *Hébergement & résidences de tourisme*, `profile_json = '{}'` (Lot 0 §10.4) |

Le header (nom, catégorie, appétence, accessibilité, CA, effectif, positionnement, maillon) **reste
affiché dans les trois états** : ce sont des colonnes scalaires de `competitive_map_entries`
(`positioning`, `revenue_estimate_meur`…), indépendantes de `profile_json` — leur présence ou
absence ne dépend pas de la richesse des 6 axes, donc elles ne sont jamais masquées par cette
logique.

### 5.3 Pourquoi ce découpage en trois états plutôt que deux

Une version à deux états (« a du contenu » / « n'en a pas ») aurait traité de la même façon un
compte réellement vide (`profile_json = '{}'`, rien à dire à personne) et un compte où **au moins
une inconnue a été identifiée** — c'est-à-dire où quelqu'un a déjà réfléchi à ce compte et noté ce
qui manque. Confondre les deux aurait supprimé une information réelle (la liste des inconnues) sous
prétexte que « le reste est vide ». D'où l'état intermédiaire `sparse`, qui montre le peu qu'il y a
(les inconnues) sans prétendre qu'il y a plus.

### 5.4 Repère de complétude — nouveau, non demandé littéralement mais dans l'esprit du §objectif

Quand `richness === "rich"` et que moins de 6 axes sur 6 sont couverts, un badge sobre apparaît dans
l'en-tête, à côté de « Confiance » : `N/6 axes`. Objectif du lot : « forte distinction entre
informations disponibles et données manquantes » — le badge donne ce signal *avant* que le
commercial ne parcoure les sections, sans dupliquer un décompte visible ailleurs. Il est absent des
états `sparse`/`empty` : ces deux états portent déjà leur propre bandeau, un second indicateur y
serait redondant.

---

## 6. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `src/features/business-intelligence/playbooks/battle-workspace-model.ts` | +88 lignes : teinte Battle (§3), `assessBattleCardRichness`/`classifyBattleCardRichness` (§5). Toujours pur, sans JSX ni DOM. |
| `src/features/business-intelligence/playbooks/BattleCardsSection.tsx` | Réécrit intégralement : `BattleCardContent` restructuré autour des 6 axes + état vide/éparse ; `BattleCardsEmptyState` (zéro acteur sur le segment) inchangée. |
| `src/features/business-intelligence/playbooks/BattleWorkspace.tsx` | +2 imports, +2 constantes de style, `style={…}` posé sur les 4 conteneurs existants. Aucune restructuration. |
| `src/features/business-intelligence/__tests__/sector-playbooks-modal.test.ts` | +11 tests Lot 2. |

### Non touchés (vérifié par `git diff --stat`)

```
src/components/intelligence/IntelligenceSplitModalShell.tsx      → aucun diff
src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx → aucun diff
src/features/business-intelligence/playbooks/BattleSituationView.tsx  → aucun diff (owner A2)
src/lib/**  ·  src/features/competitive-map/**  ·  n8n/**  ·  supabase/**
package.json / package-lock.json                                 → aucun diff
```

Le point de montage A2 (`BattleSituationView.tsx`) traverse ce lot **intact** : le tint Battle
s'applique au conteneur qui l'enveloppe (`BattleWorkspace.tsx`), jamais au composant lui-même.

---

## 7. Data / Supabase

- **Nouveau fetch : aucun.** Vérifié (`grep -rn "createClient\|fetch(\|supabase\|use server"` sur
  `playbooks/` → rien).
- **Migration :** non.
- **Écriture Supabase :** aucune.
- Toute la richesse affichée provient de `CompetitiveMapActor`, déjà en mémoire depuis le Lot 1.

## 8. n8n

- **Modifié : non.** Aucun fichier de `n8n/**` touché.
- **Import VPS requis : non.**

---

## 9. Tests exécutés

| Commande | Résultat |
|---|---|
| `npm run typecheck` | ✅ vert |
| `npm test` | ✅ **199 fichiers, 1951 tests** (avant le lot : 1940 — **+11**) |
| `npx vitest run src/features/business-intelligence/__tests__/sector-playbooks-modal.test.ts` | ✅ 30/30 |
| `npm run check:server-boundary` | ✅ vert |
| `npx eslint src/features/business-intelligence/playbooks/ …` | ✅ 0 problème sur les fichiers du lot |
| `npm run lint` (dépôt entier) | Baseline pré-existante inchangée, **rien sur les fichiers du lot** (vérifié par grep) |
| `npm run build` (Turbopack) | ✅ exit 0 (après purge d'un `.next` périmé — flake d'infra sans rapport, cf. `CLAUDE.md` « `.next/` périmé produit de faux TS6200/TS2300 ») |
| `npm run build:webpack` | ✅ exit 0 |

### Les 11 tests ajoutés

- Teinte Battle : aucun HEX/RGB, uniquement `color-mix(in srgb` + tokens `--color-cockpit-cobalt*`,
  rail ≠ zone principale.
- `classifyBattleCardRichness` : les trois transitions d'état, y compris aux limites (0 axe + trous
  → sparse ; 1 axe → rich malgré peu de matière ; 6 axes + trous → rich).
- `assessBattleCardRichness` sur de vraies formes de `CompetitiveMapActor` : le pilote (6/6, tous
  axes remplis), un acteur réellement vide (miroir du cas mesuré `profile_json = '{}'`), un acteur
  n'ayant que des `trous`, un acteur avec un seul axe rempli, et l'assertion négative que `trous`
  seul ne compte jamais comme un axe.

---

## 10. ⚠️ Activité concurrente détectée — sans rapport avec ce lot

Pendant l'exécution de ce lot (~12:06-12:07), trois fichiers **hors de mon périmètre, jamais
ouverts en écriture par moi** sont apparus modifiés dans l'arbre de travail :

```
src/lib/automations/automations-data.ts
src/lib/automations/run-journal-actions.ts
src/components/intelligence/IntelligenceFAB.tsx
```

Diff inspecté (lecture seule) : extraction d'une fonction `getVeilleSimulatorBaseline()` et d'une
Server Action `fetchVeilleSimulatorBaseline()`, plus ~140 lignes ajoutées dans `IntelligenceFAB.tsx`
— cohérent avec les deux commits distants vus en tête de `main`
(`docs: add simulate action pre-work implementation brief`,
`docs: adjust cockpit intelligence mobile scoping and prerequisites`) : une autre session travaille
apparemment sur une feature « simulateur / veille » en parallèle, dans ce même répertoire.

**Ces trois fichiers n'ont pas été touchés, ne sont pas stagés, ne seront pas commités par ce lot.**
Le commit du Lot 2 cible explicitement ses propres fichiers par chemin, jamais `git add -A`. À
signaler à Guillaume : une autre session a du travail non commité en cours sur ce poste.

---

## 11. Warnings / dette

1. **Dette héritée du Lot 1, toujours non résorbée :** `#0d0f28` / `#0a0b1e` n'ont pas de token
   `@theme`. Ce lot ne l'aggrave pas (aucun nouveau littéral introduit, le dégradé Battle est
   100 % tokens) mais ne la résout pas non plus — hors périmètre, `globals.css` n'est pas dans la
   liste de fichiers du lot.
2. **Le badge « N/6 axes »** est un ajout de ma part, au-delà de la lettre du cadrage (§5.4). S'il
   est jugé superflu ou perturbant en QA, c'est une ligne à retirer dans
   `BattleCardsSection.tsx` (`richness === "rich" && filledAxisCount < totalAxisCount ? … : null`),
   sans impact sur le reste.
3. **`sparse` n'a pas encore été observé en QA** faute d'accès navigateur (§8 `CLAUDE.md`). Le
   Lot 0 (§10.4) indique que le segment *Spatial, défense & systèmes critiques* a `trous` renseigné
   sur la quasi-totalité de ses 10 entrées avec très peu d'autres axes — c'est le candidat le plus
   probable pour déclencher cet état en pratique, mais je ne l'ai pas confirmé compte par compte.
   À vérifier en priorité dans la QA manuelle (§12).

---

## 12. QA manuelle — à faire par Guillaume

Non exécutée : `CLAUDE.md` §8 réserve la QA visuelle à Guillaume. Parcours suggéré, `/intelligence`
→ Playbooks → Battle Cards :

| # | Cas | Segment / compte | Attendu |
|---|---|---|---|
| 1 | Flip Playbook → Battle | n'importe lequel | Teinte cobalt perceptible dès l'arrivée sur la face Battle, rail ET zone principale. Playbook, lui, reste identique à avant ce lot. |
| 2 | Cas riche | Compositions & ingrédients B2B → Robertet | 6 sections dans l'ordre ⚡🎯👤🛡🧩⚖, pas de badge « N/6 » (6/6), aucun mur de texte. |
| 3 | Cas pauvre | Spatial, défense & systèmes critiques | Confirmer l'état atteint pour chaque compte : `rich` avec badge bas (ex. 1/6, 2/6) si au moins un axe existe, ou `sparse` si aucun. Vérifier qu'aucune section vide ne s'affiche vide. |
| 4 | Cas vide | Hébergement & résidences de tourisme, les 5 comptes | Message « Battle Card pas encore enrichie » seul, header toujours visible (CA, effectif…). |
| 5 | Changement de compte | n'importe quel segment | La richesse se recalcule immédiatement compte par compte. |
| 6 | Retour Playbook | — | Flip inverse fonctionnel, section Playbook active préservée (non-régression Lot 1). |
| 7 | Contraste | mode riche et mode vide | Texte blanc lisible sur le fond teinté, y compris dans les bullets `alert`/`positive`/`warning`. |
| 8 | Clavier | — | `Tab`/`Échap` toujours conformes (non-régression Lot 1, rien touché ici). |
| 9 | Reduced motion | — | Non-régression Lot 1 : ce lot ne touche pas la machine du retournement. |
| 10 | Mobile 390px | tous les cas ci-dessus | Le comportement mobile existant (sélecteur natif, colonne unique) est préservé ; la teinte s'applique aussi sur mobile (wrapper unique). |

---

## 13. Écarts au cadrage

**Aucun écart substantiel.** Deux précisions consenties, documentées ci-dessus, pas des
déviations :

1. §5.4 (badge de complétude) — ajouté au-delà de la lettre du brief, réversible en une ligne
   (§11.2).
2. Le découpage `sparse` en 3 états (§5.3) — le cadrage L2 ne détaillait pas explicitement ce
   troisième état, seulement « section vide → pas de carte inutile / profil pauvre → état
   synthétique / aucune donnée → message clair ». Le Lot 0 §10.4 et le contenu réel de `trous`
   imposaient de distinguer « rien du tout » de « rien de formalisé mais des inconnues notées » —
   sinon la seconde information aurait été perdue.

Aucun écart sur : le périmètre de fichiers du lot, l'absence de fetch, l'absence de dépendance,
l'absence de HEX/RGB nouveau, la non-modification du shell et du point de montage A2.

---

## 14. Commit

Voir la livraison du lot. Message : `feat(dynamic-playbooks): lot 2 battle revision`. Contenu : les
4 fichiers du §6 + ce handoff, staged par chemin explicite. **Ne contient PAS** les trois fichiers
concurrents du §10.

---

## 15. Instructions pour l'agent suivant

### A2 — Lot 3 « Configurateur Situation »

Rien de ce lot ne change ce qui a été confirmé au Lot 1 : `BattleSituationView.tsx` reste le seul
fichier à réécrire, contrat de props inchangé. Deux informations utiles issues de ce lot :

1. **`assessBattleCardRichness(actor)`** (dans `battle-workspace-model.ts`) est désormais
   disponible et testée — utile si Situation veut, elle aussi, distinguer un compte « riche » d'un
   compte « pauvre » avant de proposer un enjeu/angle par défaut (ex. ne pas suggérer un angle basé
   sur `traductionCommerciale` si l'axe correspondant est vide — l'information est déjà calculée,
   pas la peine de la recalculer).
2. Les tons visuels (`brass`/`alert`/`neutral`/`muted`/`positive`/`warning`) et les primitives
   `RevisionSection`/`RevisionBullet` vivent dans `BattleCardsSection.tsx`, non exportées. Si
   Situation veut le même langage de carte, soit dupliquer localement (probable, vues différentes),
   soit demander leur extraction dans un fichier partagé — décision à documenter dans le handoff
   L3, pas à faire silencieusement.

### Pour Guillaume

Voir §10 : une autre session a des modifications non commitées sur `src/lib/automations/*.ts` et
`src/components/intelligence/IntelligenceFAB.tsx` (feature « simulateur veille »), dans ce même
répertoire de travail. Ni touché ni commité par ce lot — à vérifier de ton côté avant de perdre ce
travail.
