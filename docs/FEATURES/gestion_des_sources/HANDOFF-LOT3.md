# Handoff — Lot 3 « UI Gérer les sources »

**Chantier :** Gestion des sources · **Lot :** 3 / 6 · **Date :** 2026-08-16
**Statut :** ✅ **livré en repo, synchronisé avec `origin/main`, prêt à committer.**
**Amont :** `PLAN-CHANTIER.md` §3-4, `HANDOFF-LOT1.md`, `HANDOFF-LOT2.md`.
**Aval :** Lot 4 — import de corpus (parseur E3, wizard, RPC `ingest_source_corpus`).

> **Mise à jour finalisation (2026-08-16, plus tard le même jour) :** la migration `family`
> décrite au §8 a été **appliquée en production sous un timestamp différent**
> (`20260816113936`, commit `7072ec57` poussé directement sur `main` en dehors de cette session).
> Le fichier local `20260816120000_079_source_catalog_family_backfill.sql` produit pendant le
> Lot 3 est devenu un doublon obsolète du même UPDATE et a été **supprimé** ; son fichier
> d'assertions a été renommé sur le timestamp canonique
> (`supabase/tests/20260816113936_source_catalog_family_backfill.assertions.sql`) et revérifié
> vert contre la base live, désormais post-application (14/14 sources système avec `family`
> renseignée). Le reste de ce document (§1-7, §9-14) demeure exact — seul le §8 et les mentions
> ponctuelles de « non appliquée » ci-dessous sont donc historiques.

---

## 1. État initial vérifié (préflight)

### Git
- `git status --short` avant modification : working tree propre à l'exception d'un fichier
  handoff non suivi (`HANDOFF-GESTION-DES-SOURCES-2026-08-15 (1).md`, non touché ici).
- HEAD au démarrage : `bdef555f` (style automations). Aucun reset effectué.
- Commit Lot 2 `5d25f3e69e4791fb770e13abc62b352d57f65f4d` confirmé ancêtre de HEAD
  (`git merge-base --is-ancestor` → succès).

### Gate Lot 2 — clos, avec une correction de constat important
Le handoff Lot 2 annonçait *« le VPS tourne la version pré-correctif »*. Vérification directe
au 2026-08-16 :
- `n8n/workflows/veille-hebdomadaire-kredo.json` contient bien les 8 marqueurs attendus
  (`Charger Sources Effectives`, branches `rss`/`site_search`, `Parser Flux Google News`,
  `source_catalog_id`, `on_conflict=workspace_id,digest_date`, `resolution=merge-duplicates`,
  tourniquet re-clé sur `sourceId`).
- `npm run n8n:status` : **`veille-hebdomadaire-kredo.json` → nœuds repo/VPS = 25/25**, une seule
  copie active sur le VPS (3 copies au total, 2 clutter à nettoyer — hors périmètre).
- Base live : `veille_digests` porte des runs au **2026-08-14** et **2026-08-15**
  (`nb_sources_actives=7` chacun, cohérent avec le comportement post-correctif du tourniquet, pas
  le crash pré-correctif documenté en §5bis du handoff Lot 2 sur la source « The Neuron »).
- `veille_articles.source_catalog_id IS NOT NULL` = **5** (contre 0 au moment du handoff Lot 2).

**Conclusion : le VPS tourne la version corrective.** Le handoff Lot 2 était pessimiste ou son
constat a été corrigé entre-temps par un réimport dont ce lot n'a pas la trace. Le Lot 3 a donc
démarré normalement, sans STOP.

### Supabase live (`jvzgmhvwirsbdkjpmvla`)
| Objet | Mesuré |
|---|---|
| `source_catalog` | 14, toutes `origin='system'`, `family IS NULL` sur les 14 |
| `source_corpora` | 1 (système, `scope_kind='system'`) — **0 corpus `scope_kind='sector'`** |
| `source_corpus_items` | 14 (rattachées au corpus système) |
| `v_effective_watch_sources` (`usage_scope='news'`) | 14 |
| `veille_articles.source_catalog_id IS NOT NULL` | 5 / 30 |
| `account_watch_settings.include_sector_corpus` | 12/12 à `true` |

Migrations 077/078 confirmées présentes dans `schema_migrations` via `list_migrations` MCP.

---

## 2. Fichiers créés

```
src/features/source-management/
  domain/source-management-contracts.ts
  data/get-source-management-snapshot.ts
  actions/source-management-actions.ts
  components/SourceManagementLauncher.tsx
  components/SourceManagementDialogDesktop.tsx
  components/SourceManagementDrawerMobile.tsx
  components/SourceBaseList.tsx
  components/SourceCorpusCard.tsx
  components/ManualSourceForm.tsx
  __tests__/source-management-contracts.test.ts
  __tests__/source-management-snapshot.test.ts
  __tests__/source-management-actions.test.ts
  __tests__/source-management-components.test.ts

supabase/migrations/20260816120000_079_source_catalog_family_backfill.sql   (NON appliquée)
supabase/tests/20260816120000_source_catalog_family_backfill.assertions.sql
```

## 3. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `src/components/veille/VeilleHeaderActions.tsx` | Ajout `<SourceManagementLauncher variant="desktop">` ; suppression des champs morts « Familles de sources » / « Catégories surveillées » du dialog « Configurer la veille » et de `activeParameters` |
| `src/components/veille/VeilleActualitesMobile.tsx` | Ajout `<SourceManagementLauncher variant="mobile">` dans `MobilePageHeader.actions` |
| `src/components/veille/veille-desktop-contracts.ts` | `GlobalWatchSettings` réduit à `{enabled, cadence, maxArticles}` ; `parseGlobalWatchSettings`/`validateGlobalWatchSettings` alignés ; helper `stringArray` supprimé (plus de consommateur) |
| `src/components/veille/veille-desktop-contracts.test.ts` | Tests alignés sur le contrat réduit + assertion explicite d'absence des clés mortes |
| `src/components/veille/VeilleActualitesDesktop.tsx` | Prop `sourceManagementSnapshot` reçue et transmise à `VeilleHeaderActions` |
| `src/components/veille/VeilleActualitesPage.tsx` | Prop `sourceManagementSnapshot` reçue et distribuée aux deux vues (Desktop/Mobile) |
| `src/app/(app)/veille/page.tsx` | Appel `getSourceManagementSnapshot()` ajouté au `Promise.all` existant, prop transmise |
| `src/components/veille/mobile/veille-mobile-view-models.test.ts` | Fixture `makeArticle` complétée avec `source_catalog_id: null` — cassée par la régénération de types (voir §6), sans rapport fonctionnel avec le Lot 3 |
| `src/types/database.generated.ts` | Régénéré (`npm run db:types`) — n'incluait pas encore `source_catalog`/`source_corpora`/`source_corpus_items` malgré leur application en Lot 1 |

**Aucun fichier `n8n/` touché. Aucune migration appliquée. Aucun commit créé.**

---

## 4. Architecture Data

`src/features/source-management/data/get-source-management-snapshot.ts` (server-only) :
- Résout le workspace via `profiles.workspace_id` (jamais `private.current_workspace_id()` côté
  client, conforme CLAUDE.md) et dérive `canManage` de `profiles.role IN ('owner','admin')` — le
  même prédicat que `private.is_workspace_admin()`, en lecture seule sur une table `public`.
- Lit `source_catalog` (toutes lignes du workspace, RLS), `source_corpora`
  (`scope_kind='sector'` uniquement — le corpus système `socle-sources-editoriales` n'est **pas**
  redescendu deux fois), `source_corpus_items` des corpus trouvés.
- **Réutilise `v_effective_watch_sources`** (`usage_scope='account_watch'`, filtrée par
  `corpus_id`) pour calculer le nombre de comptes alimentés par corpus, au lieu de réimplémenter
  l'héritage segment→macro côté TypeScript — interdiction explicite du CLAUDE.md respectée
  (vérifiée par test : `not.toContain("parent_id")`).
- `collection_mode` n'est jamais lu en base : dérivé à l'affichage par `deriveCollectionMode()`.
- Un item de corpus est « collectable » si `source.contentTemporality !== 'static'` — reflet
  exact du prédicat dur de la vue effective.
- Retourne `EMPTY_SOURCE_MANAGEMENT_SNAPSHOT` si aucun workspace n'est résolu (session absente),
  jamais une exception qui casserait `/veille`.

Le domaine (`domain/source-management-contracts.ts`) porte les types, le mapping des 6 catégories
KREDO, `normalizeHostname()` (déduplication par hostname : minuscule, sans protocole, sans `www.`,
sans slash final, **et rejette désormais un hostname sans point** — un garde-fou ajouté après un
test qui a révélé que `new URL("https://!!!")` est accepté tel quel par le parseur WHATWG), et
`validateManualSourceInput()`.

---

## 5. Architecture Desktop

`SourceManagementLauncher` (`variant="desktop"`) → bouton `Button` (icône `source_parameters.png`,
existe réellement dans `public/icons_set/` — trouvé par `find`, aucune icône inventée) → ouvre
`SourceManagementDialogDesktop` (`AppDialog`, `sm:max-w-[54rem]`).

Deux sections, exactement au périmètre §6 du prompt :
- **A — Sources actualités IT** : header avec compteur d'actives, bouton `+ Ajouter une source`
  (visible seulement si `canManage`), `SourceBaseList` (`variant="table"`) groupée par
  `kredo_category` dans l'ordre canonique, une source `system`/`is_locked` n'affiche jamais
  d'action (« Socle verrouillé »), une source `manual` a modifier/activer-désactiver/supprimer
  (confirmation à deux temps, pas de `window.confirm`).
- **B — Sources veille sectorielle** : `SourceCorpusCard` par corpus `scope_kind='sector'`. État
  vide propre puisqu'aucun corpus sectoriel n'existe encore en base — texte explicite renvoyant
  au Lot 4, CTA « Importer un corpus » **`disabled`**, jamais de faux succès simulé.

`ManualSourceForm` est un état interne du Dialog (`view: {kind:"list"|"create"|"edit"}`), jamais
une modale imbriquée — vérifié par test (`not.toContain("AppDialog"|"AppDrawer")`).

---

## 6. Architecture Mobile

`MobilePageHeader.actions` (déjà prévu par le composant, jamais utilisé jusqu'ici) reçoit
`<SourceManagementLauncher variant="mobile">` → `IconButton size="sm"` (44×44px hors breakpoint
`sm:`, seul contexte où ce composant est monté) → `SourceManagementDrawerMobile`
(`AppDrawer side="right" width="wide"` — `w-full` sur un viewport 390px, donc quasi plein écran).

Mêmes deux sections, `SourceBaseList`/`SourceCorpusCard` en `variant="cards"` : cartes `<details>`
avec disclosure progressive, actions au pouce (boutons pleine largeur possibles, touch targets
`h-11` par défaut sur les composants `Button`/`IconButton` du design system).

**Aucun composant Desktop n'est jamais monté côté mobile et réciproquement** — le launcher
branche sur `variant` avant de retourner du JSX (deux `return` distincts, jamais les deux shells
dans le même arbre). Vérifié par test structurel dédié.

---

## 7. Actions serveur

`actions/source-management-actions.ts` — exactement les 8 actions mandatées, aucune de plus :
`createManualSourceAction`, `updateManualSourceAction`, `setManualSourceActiveAction`,
`deleteManualSourceAction`, `setCorpusActivationAction`, `setCorpusNewsEnabledAction`,
`setCorpusAccountWatchEnabledAction`, `setCorpusItemEnabledAction` (+ un utilitaire
`reactivateManualSourceAction`, alias de `setManualSourceActiveAction(id, true)` pour le flux de
réactivation §9).

Chaque action : session utilisateur (`supabase.auth.getUser()`) → workspace résolu via
`profiles` → pré-contrôle `role IN ('owner','admin')` côté serveur (message clair, pas une
redirection silencieuse) → écriture avec un `.eq("origin","manual")` ou
`.eq("scope_kind","sector")` en ceinture-bretelles → **la RLS reste le garde final** réel (les 4
policies `is_workspace_admin() AND origin/scope_kind <> 'system'` de la migration 077).
`revalidatePath("/veille")` après chaque écriture. Aucun `service_role`.

Dédoublonnage (`createManualSourceAction`) : recherche sur `domain` **et** `search_domain`
normalisés avant tout `INSERT`. Trois issues : succès, doublon `manual`+inactif → payload
`duplicate` exploité par `ManualSourceForm` pour proposer la réactivation, doublon
`system`/`corpus`/`manual`+actif → refus explicite sans réactivation proposée.

---

## 8. Migration `family` — créée, non appliquée

`supabase/migrations/20260816120000_079_source_catalog_family_backfill.sql` : `UPDATE` idempotent
scopé `origin='system' AND (family IS NULL OR btrim(family)='')`, valeurs alignées sur les 6
familles historiques du nœud `Config Sources KREDO` (préservées dans la mémoire du chantier via
`PLAN-CHANTIER.md`/le prompt Lot 3). Aucune migration existante modifiée.

**Validée par dry-run `BEGIN…ROLLBACK` sur la base live** (MCP Supabase) : les 14 sources
reçoivent bien leur famille attendue, puis rollback confirmé (`select count(*) where family is
null` → 14, inchangé). **Non appliquée** — attend l'ordre explicite de Guillaume.

Tant qu'elle n'est pas appliquée, l'UI affiche « Non renseignée » pour la colonne Famille (jamais
une valeur inventée côté React — vérifié par test).

Assertions dédiées : `supabase/tests/20260816120000_source_catalog_family_backfill.assertions.sql`
(complétude post-backfill + non-régression sur les sources non-système).

---

## 9. Nettoyage des faux paramètres

`sourceFamilies`/`categories` supprimés de `GlobalWatchSettings`, `DEFAULT_GLOBAL_WATCH_SETTINGS`,
`parseGlobalWatchSettings`, `validateGlobalWatchSettings`, du dialog « Configurer la veille » de
`VeilleHeaderActions.tsx`. `saveGlobalWatchSettingsAction` (fichier non touché) continue de
merger `{...currentSettings, veille: validation.data}` — aucune régression sur la préservation des
autres clés de `workspaces.settings`, vérifié par test de non-régression.

---

## 10. Tests — exacts

```
npx vitest run src/features/source-management
  Test Files  4 passed (4)
  Tests       57 passed (57)

npm test (suite complète)
  Test Files  129 passed (129)
  Tests       1291 passed (1291)
```

Couverture (structurelle pour data/actions/composants — convention du repo, `readFileSync` +
assertions ciblées ; comportementale pour le domaine pur) :
- snapshot : server-only, aucune liste hardcodée, corpus système jamais redescendu en section B,
  réutilisation de `v_effective_watch_sources` (pas de réimplémentation segment→macro),
  `collection_mode` toujours dérivé, source `static` jamais collectable, snapshot vide sans
  session.
- domaine : `normalizeHostname` (protocole/www/slash/casse, rejet des hôtes invalides, égalité
  d'URLs équivalentes), `deriveCollectionMode`, `buildManualSourceKey` (déterministe, dérivé du
  domaine), les 6 catégories dans l'ordre canonique, `validateManualSourceInput` (cas valides
  avec/sans RSS, chacun des 4 champs obligatoires rejeté isolément, RSS invalide rejeté).
- actions : `"use server"` + `server-only`, pas de `service_role`, auth + workspace + rôle
  owner/admin pré-vérifiés, aucune écriture possible sur une source système/verrouillée ou un
  corpus non-sectoriel, `revalidatePath` sur les 8 mutations, réactivation exposée.
- composants : verrouillage visuel du socle système, groupement par catégorie, fallback
  « Non renseignée » sans invention, confirmation à deux temps avant suppression, badge
  « Hors veille récurrente » pour une source `static`, `manual_only` jamais spécial-casé en
  exclusion, les trois toggles de corpus + la modulation par item, doublon → proposition de
  réactivation, formulaire jamais en dialog imbriqué, CTA « Importer un corpus » désactivé sans
  faux succès, launcher Desktop/Mobile sans double montage, suppression effective des champs
  morts dans `VeilleHeaderActions`/`veille-desktop-contracts`.

```
npm run typecheck            ✅ 0 erreur
npm run check:server-boundary ✅ tous les modules important le client serveur portent server-only
npx eslint <fichiers touchés> ✅ 0 erreur, 0 warning
npm run build                 ✅ compilé, exit 0 (le bruit "Dynamic server usage" affiché pendant
                                  la génération est préexistant, sur des routes hors périmètre —
                                  `/missions`, `/legacy/folio/sector-studies` — qui utilisent
                                  `cookies()`/`headers()`, non touchées par ce lot)
```

`npm run test:n8n` non exécuté : aucun fichier de `n8n/workflows/` modifié dans ce lot (règle
CLAUDE.md — à exécuter seulement si un workflow est touché).

---

## 11. QA restante (Guillaume)

Desktop 1440×900 et Mobile 390×844, sur `/veille` avec une session authentifiée `owner`/`admin` :

- [ ] Ouverture/fermeture du launcher (bouton header desktop, icône header mobile)
- [ ] 14 sources système affichées, groupées par catégorie, verrouillées visuellement
- [ ] Colonne Famille : « Non renseignée » sur les 14 (migration 079 non appliquée)
- [ ] Ajout d'une source manuelle (avec et sans flux RSS)
- [ ] Doublon détecté sur une source déjà existante (proposer réactivation si manuelle inactive)
- [ ] Activation/désactivation, modification, suppression (confirmation) d'une source manuelle
- [ ] Section « Sources veille sectorielle » : état vide propre, CTA Importer visiblement désactivé
- [ ] Mobile : touch targets, disclosure des corpus (n/a tant qu'aucun corpus n'existe), aucun
      débordement horizontal, aucun composant Desktop chargé (vérifier via DevTools réseau/DOM)
- [ ] Confirmer visuellement qu'un profil `sales`/`recruiter`/`viewer` ne voit pas le bouton
      « + Ajouter une source » (`canManage=false`) et qu'une tentative d'écriture directe est
      refusée par la RLS

Aucune QA visuelle n'a été faite par l'agent, conforme à la méthode de travail (§8 CLAUDE.md).

---

## 12. Risques résiduels

| Risque | Statut |
|---|---|
| `family` reste `NULL` sur les 14 sources tant que la migration 079 n'est pas appliquée | Attendu — l'UI gère proprement le cas (« Non renseignée »), pas bloquant pour la QA |
| Aucun corpus `scope_kind='sector'` en base | La section B n'a donc pas pu être testée sur données réelles au-delà de l'état vide — le Lot 4 (import) sera le premier test réel de `SourceCorpusCard`/des toggles corpus |
| 2 copies « clutter » du workflow veille sur le VPS (`n8n:status`) | Dette préexistante, hors périmètre Lot 3, déjà notée aux lots précédents |
| Tests structurels par `readFileSync` (convention du repo) | Ils vérifient la présence du bon code, pas le rendu réel — la QA visuelle de Guillaume reste la seule vérification comportementale complète |
| `veille-mobile-view-models.test.ts` modifié | Corrige une régression de typecheck révélée par la régénération `db:types` (colonne `source_catalog_id` du Lot 2, jamais reflétée en types avant ce lot), sans lien fonctionnel avec le Lot 3 lui-même |

---

## 13. Différences avec PLAN-CHANTIER / le prompt Lot 3

- Le prompt Lot 3 liste `SourceManagementLauncher.tsx` comme fichier partagé unique : implémenté
  avec un prop `variant: "desktop"|"mobile"` qui branche AVANT le `return`, garantissant qu'un
  seul des deux shells est jamais monté — conforme à l'invariant « deux composants distincts »
  sans dupliquer le fichier trigger.
- `SourceBaseList`/`SourceCorpusCard` sont paramétrés par `variant: "table"|"cards"` plutôt que
  dupliqués Desktop/Mobile — ce sont les « composants feuilles partagés » explicitement demandés
  par la convention adaptive du chantier ; seuls les shells (`Dialog`/`Drawer`) sont distincts.
- Le prompt demandait `actions/ingest-source-corpus.ts` et `SourceCorpusImportWizard.tsx` dans
  l'arborescence de référence de `PLAN-CHANTIER.md` §3.5 — **ces deux fichiers appartiennent
  explicitement au Lot 4** selon le corps du prompt Lot 3 (§11) et n'ont pas été créés ici.
- Snapshot fetché une seule fois au niveau `page.tsx` (comme tout le reste des données `/veille`)
  plutôt que via un chargement à la demande à l'ouverture du dialog — cohérent avec le patron déjà
  en place pour `globalWatchSettings`/`globalWatchHealth`, volumétrie négligeable (14 sources + 0
  corpus aujourd'hui).

## 14. Entrée du Lot 4

- `src/features/source-management/domain/source-registry-output.ts` (parseur
  `source-registry.schema.json` v1.1, miroir de `competitive-map-output.ts`).
- `src/features/source-management/data/resolve-source-corpus-import.ts` (résolution lecture seule).
- `src/features/source-management/components/SourceCorpusImportWizard.tsx` (3 étapes
  Préparer → Arbitrer → Finaliser, calqué sur `CompetitiveMapImportWizard.tsx`).
- `src/features/source-management/actions/ingest-source-corpus.ts` → `rpc('ingest_source_corpus')`.
- Recette : corpus parfumerie (`docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/03-sources.json`,
  29 sources, 21 collectables attendues, 8 `static` exclues nommément).
- Le Lot 3 est prêt à consommer un corpus réel dès son import : `SourceCorpusCard` et les 4
  actions de modulation corpus n'ont besoin d'aucune modification pour cela.

---

## Verdict

**LOT 3 READY FOR REVIEW**
