# HANDOFF — DYNAMIC PLAYBOOKS — LOT 1

## 1. Statut

**DONE** — sous réserve de la QA visuelle, qui revient à Guillaume (`CLAUDE.md` §8 :
« La QA visuelle est faite par Guillaume, sauf s'il donne explicitement la main sur un
navigateur »). Script de recette en §9.

Toutes les validations automatiques sont vertes, **build webpack compris**.

---

## 2. Objectif du lot

Sortir « Battle Cards » de la navigation par sections du Playbook et en faire un **mode**
à part entière de la même modale, atteint par un retournement, avec un retour symétrique.

Hors périmètre, non entamé : refonte visuelle de Révision (L2), configurateur Situation (L3),
INTEL-020 (L4), Knowledge (L5), Mobile dédié (L6).

**HEAD de départ :** `bf8a646fc6be9dd153c544ac7974d6adfc38dda0` (handoff Lot 0).
Aucun fichier applicatif n'avait bougé depuis — le constat du Lot 0 était exact.

---

## 3. Fichiers modifiés

### Créés (5)

| Fichier | Rôle | Lignes |
|---|---|---|
| `src/features/business-intelligence/playbooks/battle-workspace-model.ts` | Socle **pur** : types, constantes de timing, `resolveBattleActor`, machine du retournement, clés de sections. Aucun JSX, aucun DOM — seule partie exerçable par `vitest`. | 96 |
| `src/features/business-intelligence/playbooks/BattleWorkspace.tsx` | Mode Battle : rail + zone principale (Desktop), sélecteur + contenu (Mobile). Frontière Mobile du L6. | 160 |
| `src/features/business-intelligence/playbooks/BattleAccountRail.tsx` | Rail des comptes (Desktop), purement présentationnel. | 81 |
| `src/features/business-intelligence/playbooks/BattleModeSwitcher.tsx` | Bascule Révision / Situation (`role="tablist"`). | 59 |
| `src/features/business-intelligence/playbooks/BattleSituationView.tsx` | **Point de montage A2** — contrat de props gelé + état d'attente honnête. | 61 |

### Modifiés (3)

| Fichier | Nature |
|---|---|
| `SectorPlaybooksModal.tsx` | État de mode + retournement + action d'entrée + bascule sur `content`. **Les 6 sections Playbook sont inchangées, JSX à l'identique.** |
| `BattleCardsSection.tsx` | **Structurel uniquement** : le wrapper de sélection est retiré, `BattleCardContent` et `BattleCardsEmptyState` sont exportés. Le **corps de la fiche est byte-identique** — sa refonte est le périmètre du L2. |
| `__tests__/sector-playbooks-modal.test.ts` | +13 tests Lot 1. Les 6 tests existants sont intacts. |

### Non touchés (vérifié par `git diff`)

```
src/components/intelligence/IntelligenceSplitModalShell.tsx   → aucun diff
package.json / package-lock.json                              → aucun diff
src/lib/**  ·  src/features/competitive-map/**  ·  n8n/**  ·  supabase/**
```

---

## 4. Décisions prises

### D1.1 — Le retournement passe par `content`, pas par `leftPane`/`rightPane`

**Problème :** le shell rend, côté Desktop, `<aside>` + `<main>` côte à côte. Faire pivoter chacun
sur son propre axe donnerait deux volets tournant indépendamment — pas un retournement de carte.

**Solution :** la modale passe désormais `leftPane={null} rightPane={null}` et fournit `content`,
dans lequel elle reproduit **à l'identique** le gabarit split du shell. La surface de rotation
devient unique et couvre les deux volets.

Ce n'est pas un contournement : `content` est un point d'extension documenté du shell
(*« Preserves the full-width category screen used by the Documents modal »*) et
`CompanyDocumentsModal.tsx:785-786` utilise déjà exactement `leftPane={null} rightPane={null}`.
**Le shell n'est pas modifié**, conformément à l'interdit du lot et au Lot 0 §13.

### D1.2 — Une seule face montée à la fois, via `key={mode}`

La couche de retournement porte `key={mode}` : au point médian React démonte l'ancienne face et
monte la nouvelle. Les deux arbres ne coexistent jamais (exigence §3 du lot), et la face entrante
peint directement dans son état « arrivée du côté opposé » — pas de flash.

Séquence : `leaving` (rotateY ±90°, opacité 0, 160 ms `ease-in`) → échange du contenu →
`entering` (remontée à ∓90°, `transition: none`) → double `requestAnimationFrame` →
`idle` (rotateY 0, opacité 1, 160 ms `ease-out`).

**320 ms au total**, dans la cible 280–340 ms de la note de cadrage §11. Asserté en test.

### D1.3 — `prefers-reduced-motion` lu au clic, pas en état dérivé

`window.matchMedia("(prefers-reduced-motion: reduce)")` est interrogé **dans le gestionnaire
d'événement**, jamais stocké en état. Aucun risque de désynchronisation à l'hydratation, aucun
effet supplémentaire.

En mode réduit : **même machine à états, rotation forcée à 0**, demi-durée ramenée à 90 ms → il ne
reste qu'un fondu simple, exactement ce que demande le cadrage §11. Un `motion-reduce:` Tailwind
n'aurait pas suffi : les styles inline du retournement l'emportent sur les classes.

### D1.4 — Le compte sélectionné vit au-dessus du retournement

`selectedActorId` est porté par `SectorPlaybooksModal`, pas par `BattleWorkspace` — qui est
démonté pendant le mode Playbook. Sans cela, le critère « le compte sélectionné n'est pas modifié
par le flip » serait faux au premier aller-retour. `resolveBattleActor()` se replie sur le premier
acteur si l'identifiant devient invalide, **jamais sur un autre segment**.

L'onglet Révision/Situation, lui, reste interne à `BattleWorkspace` et se réinitialise sur un
aller-retour : c'est un état intra-mode, et le figer maintenant présumerait du jeu d'onglets que
le L3 arrêtera.

### D1.5 — Retrait du wrapper `BattleCardsSection`

Le wrapper portait sa propre sélection (`useState`), un rail Desktop et un sélecteur Mobile. Or la
sélection remonte au-dessus du retournement (D1.4) : le conserver aurait créé **un second état de
sélection parallèle**, explicitement interdit. Son rail est devenu `BattleAccountRail`, son
sélecteur Mobile est passé dans `BattleWorkspace`, pilotés par l'état unique.

Le fichier garde son nom et **le corps de la fiche n'est pas touché** : c'est un déplacement de
structure, pas la refonte visuelle du L2.

### D1.6 — Le retour permanent est dans l'en-tête du shell

`← Revenir au Playbook` est passé via `headerActions` plutôt que dans une barre interne au
workspace. Motifs : le cadrage §6.1 demande une action **permanente** (une barre interne
disparaîtrait au défilement) ; l'en-tête n'appartient pas à la surface qui pivote, donc il ne
tourne pas — ce qui est le comportement correct pour du chrome de modale ; et cela n'ajoute aucune
barre redondante. Sur Mobile, un `← Revenir au Playbook` pleine largeur est **aussi** dans le pied
de page, à portée de pouce.

### D1.7 — Les deux fonds hérités sont centralisés

`#0d0f28` et `#0a0b1e` n'ont pas de token `@theme` (dette antérieure à ce lot, `globals.css` étant
hors périmètre). Les répéter dans les composants Battle aurait multiplié les occurrences **et**
risqué un saut de teinte pendant le retournement. Ils sont donc exportés une fois depuis
`battle-workspace-model.ts` (`PLAYBOOK_SIDE_SURFACE` / `PLAYBOOK_MAIN_SURFACE`).

**Bilan net : 3 occurrences de HEX avant → 2 après.** Aucune couleur nouvelle n'est introduite.

### D1.8 — Le focus clavier est reposé après le retournement

Le bouton qui déclenche le retournement vit dans la face démontée au point médian : sans
traitement, le focus retombe sur `<body>` et **sort du piège à focus du shell**. La couche de
retournement porte donc `tabIndex={-1}` et reçoit le focus quand la nouvelle face se pose. Le
piège du shell reste cohérent : la couche n'étant pas dans sa liste de focusables, `Tab` repart au
premier élément de la nouvelle face.

Non demandé par le lot — mais c'est une régression que le retournement **crée**, donc elle
appartient au lot qui l'introduit.

---

## 5. Point de montage livré pour A2 — critère bloquant

**Fichier : `src/features/business-intelligence/playbooks/BattleSituationView.tsx`.**

C'est le seul fichier qu'A2 réécrit au Lot 3. Il n'aura à toucher **ni `SectorPlaybooksModal.tsx`,
ni `BattleWorkspace.tsx`, ni aucun composant du L1**.

```ts
export type BattleSituationViewProps = {
  actor: CompetitiveMapActor           // .id → competitive_map_entries.id
                                       // .companyId → companies.id (NOT NULL, jamais nul)
                                       // .details → projection de profile_json
  knowledge: SectorKnowledgeReadModel  // .segmentId / .segmentName
                                       // .painPoints[] / .regulatory[] / .events[] (avec id)
                                       // .playbook → personas / objections / entry_points / roi_arguments
  isMobile: boolean
  onBackToRevision: () => void
}
```

**Pourquoi un fichier et pas une prop :** une prop `renderSituation` aurait dû traverser
`SectorPlaybooksModal`, donc être posée par ses deux appelants
(`BusinessIntelligenceDesktop.tsx`, `BusinessIntelligenceMobile.tsx`) — deux fichiers hors du
périmètre d'A2. Un module importé directement par `BattleWorkspace` donne la même frontière sans
aucun câblage de props.

Le composant est **déjà monté et exercé** : l'onglet « Situation » de `BattleModeSwitcher` le rend
avec le compte réellement sélectionné. Ce n'est pas un stub mort — la frontière est parcourue dès
aujourd'hui, ce qui garantit qu'elle fonctionne quand A2 en remplira le corps.

Rappel du Lot 0 §5 : A2 chargera les contacts CRM, `account_issues` et les offres **pour le compte
actif uniquement**, jamais pour tout le segment.

---

## 6. Data / Supabase

- **Lecture effectuée :** aucune. Le mode Battle consomme `competitiveActors`, déjà chargés côté
  serveur par Business Intelligence et transmis en props (`workspace.competitiveMap.actors`).
- **Nouveau fetch :** **aucun.** Vérifié : `grep -rn "createClient\|fetch(\|supabase\|use server"`
  sur `playbooks/` ne remonte rien.
- **Migration :** **non.**
- **Écriture Supabase :** **aucune.**
- **Segment actif :** inchangé, toujours issu du workspace. Aucun `activeSegment` parallèle, aucun
  `localStorage`, aucun store Zustand, aucun picker local — invariant D5 du cadrage tenu.

---

## 7. n8n

- **Modifié :** **non.** Aucun fichier de `n8n/**` n'est touché.
- **Import VPS requis :** **non.**

---

## 8. Tests exécutés

| Commande | Résultat |
|---|---|
| `npm run typecheck` | ✅ **vert** |
| `npm test` | ✅ **199 fichiers, 1940 tests** (avant le lot : 1927 — **+13**) |
| `npx vitest run src/features/business-intelligence` | ✅ 33 fichiers, 257 tests |
| `npm run check:server-boundary` | ✅ vert |
| `npx eslint src/features/business-intelligence/playbooks/ …` | ✅ **0 problème sur les fichiers du lot** |
| `npm run lint` (dépôt entier) | 420 erreurs / 1162 warnings — **baseline pré-existante inchangée**, aucune sur les fichiers du lot (vérifié par `grep` sur la sortie) |
| `npm run build` (Turbopack) | ✅ exit 0 |
| `npm run build:webpack` | ✅ exit 0 — *« Compiled successfully in 11.1s »* |

`build:webpack` a été passé délibérément : `CLAUDE.md` en fait la **seule application réelle** de
la frontière serveur/client, que Turbopack tolère en silence. Les composants Battle importent
`SectorKnowledgeReadModel` depuis un module `server-only` — en `import type`, donc effacé au
build ; le webpack le confirme plutôt que de le supposer.

### Les 13 tests ajoutés

Portent sur le socle pur (`vitest` n'a pas de jsdom : `include: ["src/**/*.test.ts"]`).

- `battle_cards` absent des clés de sections, liste à 6 entrées ;
- `isBattleModeAvailable` sur segment vide / peuplé ;
- `resolveBattleActor` : liste vide, sans choix, choix conservé, **`companyId` et `details`
  préservés**, repli sur identifiant hors segment ;
- retournement : durée totale dans 280–340 ms, repli reduced-motion plus court, direction dérivée
  du mode visé, rotations sortie/entrée par côtés opposés, remise à plat, opacité.

---

## 9. QA manuelle — **à faire par Guillaume**

Non exécutée de mon côté : `CLAUDE.md` §8 réserve la QA visuelle à Guillaume et interdit d'ouvrir
un navigateur de ma propre initiative. Ce qui est vérifiable statiquement l'a été (§10).

Parcours : `/intelligence` → segment **Compositions & ingrédients B2B** (le seul des trois à avoir
un `profile_json` riche, cf. Lot 0 §10.4) → bouton **Playbooks**.

| # | Étape | Attendu |
|---|---|---|
| 1 | Ouverture du Playbook | 6 sections dans le rail, **plus de « Battle Cards »** dans la liste. Bloc d'entrée « Battle Cards · N comptes cartographiés » **sous** le rail. |
| 2 | Entrée Battle | Retournement ~320 ms, un seul contenu visible à tout instant, aucun flash blanc. Titre → « Battle Cards — <segment> ». |
| 3 | Changement de compte | Le rail met à jour la fiche. Repère brass à gauche de la ligne active. |
| 4 | Retour Playbook | Retournement inverse. La section Playbook active est celle d'avant. |
| 5 | 2ᵉ aller-retour | **Le compte sélectionné à l'étape 3 est toujours actif** (critère D1.4). |
| 6 | `Échap` | Ferme la modale depuis les deux modes. `Tab` reste piégé dans la modale, y compris juste après un retournement. |
| 7 | Reduced motion (macOS → Accessibilité → Réduire les animations) | **Aucune rotation**, fondu court uniquement. |
| 8 | Mobile 390 px | Sélecteur natif de compte, bascule Révision/Situation pleine largeur, `← Revenir au Playbook` en pied de page, zones tactiles ≥ 44 px. Le Playbook mobile est inchangé. |
| 9 | Segment sans cartographie (**Hébergement & résidences de tourisme**) | Le bloc d'entrée Battle **n'apparaît pas** (`isBattleModeAvailable` faux). |
| 10 | Onglet « Situation » | État d'attente sobre nommant le compte actif — preuve que la frontière A2 est branchée. |

---

## 10. Vérifications statiques passées

```
IntelligenceSplitModalShell.tsx  → aucun diff
package.json / package-lock.json → aucun diff (aucune dépendance d'animation)
src/lib/** · competitive-map/** · n8n/** · supabase/**  → aucun diff
playbooks/ : aucun createClient / fetch( / supabase / "use server"
HEX en dur : 3 avant → 2 après
```

---

## 11. Warnings / dette

1. **Dette héritée, non traitée (hors périmètre) :** `#0d0f28` / `#0a0b1e` n'ont toujours pas de
   token `@theme`. Le lot les a **centralisés** (D1.7) sans les résorber — `globals.css` n'est pas
   dans son périmètre. À traiter dans un lot design dédié, pas ici.
2. **Piège à focus pendant les 160 ms de sortie :** le shell filtre les focusables sur
   `getClientRects().length > 0` ; un élément pivoté à 90° peut encore en avoir. Un `Tab` tiré
   pile pendant la sortie peut donc viser un élément invisible. `pointerEvents: none` couvre la
   souris, D1.8 couvre l'après-retournement. Fenêtre de 160 ms, non bloquant — signalé plutôt que
   sur-corrigé.
3. **L'onglet Battle se réinitialise sur « Révision »** à chaque aller-retour (D1.4). Volontaire.
   Si le L3 ou le L6 juge qu'il doit persister, c'est trois lignes à remonter dans la modale.
4. **Piste laissée au Lot 2, non implémentée :** le Lot 0 §10.4 a mesuré que **5 entrées sur 23**
   ont un `profile_json` vide. Un repère discret dans le rail éviterait au commercial d'ouvrir une
   fiche vide. Je ne l'ai pas fait : les états vides de Révision sont le périmètre du L2, et
   l'anticiper aurait préempté sa conception.
5. **`npm run lint` global reste rouge** (420 erreurs pré-existantes, surtout `no-explicit-any`
   dans `src/lib/**`). Sans rapport avec ce lot, et hors de son périmètre de fichiers.

---

## 12. Écarts au cadrage

**Un seul, mineur et assumé.**

**§ « Battle Workspace », schéma ASCII du lot** — la maquette place `← Revenir au playbook` sur une
barre à l'intérieur du workspace, au-dessus du rail. Livré dans l'**en-tête de la modale**
(`headerActions`) : justification en D1.6 — le cadrage §6.1 demande une action *permanente*, et une
barre interne au workspace disparaîtrait au défilement. Sur Mobile, l'action est **en plus**
présente en pied de page. Le comportement demandé est donc tenu, à un emplacement plus robuste.

**Aucun écart** sur : les invariants D1→D9 de la note de cadrage, les interdits de fichiers du lot,
l'absence de dépendance, l'absence de fetch, l'absence d'état de segment parallèle.

**Note sur le skill `frontend-design`** invoqué avec la commande : ses consignes génériques
(« choisir une direction esthétique audacieuse », polices distinctives, nouvelle palette)
**contredisent `CLAUDE.md`**, qui verrouille la palette Cobalt Franc, interdit les HEX en dur et
les dépendances d'animation. `CLAUDE.md` fait autorité et prime. J'en ai retenu la **méthode**
— intention du mouvement, hiérarchie spatiale, soin du détail (repère de sélection, chevron animé
au survol, `tabular-nums` sur les scores) — appliquée **à l'intérieur** du langage visuel existant.

---

## 13. Commit

Voir la livraison du lot. Message : `feat(dynamic-playbooks): lot 1 battle workspace shell`.
Contenu : les 8 fichiers du lot + ce handoff. Rien d'autre.

---

## 14. Instructions pour l'agent suivant

### A1 — Lot 2 « Refonte Révision » (même agent, enchaînement direct)

1. Vérifier le HEAD et que `playbooks/**` n'a pas bougé depuis ce handoff.
2. Cible : **`BattleCardContent`** dans `BattleCardsSection.tsx` — c'est désormais le seul
   composant de rendu de fiche. Le rail, la sélection et le mode ne sont plus son problème.
3. Données : strictement `CompetitiveMapActor.details`. **Aucun fetch.**
4. Traiter les états vides **en premier**, pas en dernier : le segment *Hébergement & résidences de
   tourisme* a ses 5 entrées à `profile_json = '{}'`, et *Spatial, défense* n'a quasiment aucune
   section (Lot 0 §10.4).
5. Le repère « fiche vide » dans le rail (§11.4) se pose dans `BattleAccountRail.tsx` si le L2 le
   retient.
6. Ne pas toucher à `SectorPlaybooksModal.tsx` : le L2 n'en a aucun besoin.

### A2 — Lot 3 « Configurateur Situation »

1. **Un seul fichier à réécrire : `BattleSituationView.tsx`.** Contrat de props en §5, gelé.
2. Le compte actif est déjà résolu et transmis — ne pas réintroduire de sélection.
3. Déclarer `BattleSituation` dans `battle-situation-contract.ts` (nouveau), **pas** dans
   `src/lib/n8n/types.ts` : c'est A3 qui l'y branche au Lot 4 (Lot 0 §13).
4. Le chemin **sans contact CRM** est le cas majoritaire (15 comptes sur 23) : le traiter en
   première classe, pas en erreur.
5. **Ne pas écrire l'ouverture de `ManageCollections*` avant l'arbitrage du risque R-A du Lot 0**
   (deux `IntelligenceSplitModalShell` imbriqués → double `onClose` sur `Échap`). Ce lot n'a rien
   fait qui atténue ce risque : il reste entier.
