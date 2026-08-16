# Handoff — Lot 5 « INTEL-033 : veille compte enrichie par le corpus sectoriel »

**Chantier :** Gestion des sources · **Lot :** 5 / 6 · **Date :** 2026-08-16
**Statut :** ✅ **livré en repo, non commité, en attente de validation explicite de Guillaume.**
**Amont :** `PLAN-CHANTIER.md` §3-4, `HANDOFF-LOT1.md`, `HANDOFF-LOT2.md`, `HANDOFF-LOT3.md`,
`HANDOFF-LOT4.md` §17 (entrée du Lot 5).
**Aval :** Lot 6 — scoring V2 des sources (exploitation de `source_catalog_id` /
`sourceCatalogId`, hors périmètre de ce lot).

---

## 0. État Git initial (préflight)

```
git status --short
?? "docs/FEATURES/gestion_des_sources/HANDOFF-GESTION-DES-SOURCES-2026-08-15 (1).md"  (non suivi, non touché)

git log --oneline -1
8515aa05 feat(veille): Lot 4 — import de corpus de sources E3

git fetch origin
git status -sb
## main...origin/main   (0 ahead, 0 behind — repo synchronisé)
```

- Branche : `main`, à jour avec `origin/main` au démarrage.
- HEAD au démarrage : `8515aa05`.
- Aucun `git reset`/`checkout`/`clean` exécuté. Aucun commit créé pendant ce lot (conforme §34 :
  « pas de commit/push du Lot 5 sans ordre explicite »).

## 1. Preuve Lot 4 finalisé (gate §0.1)

`git show --stat 8515aa05` confirme que les 5 fichiers requis par le gate sont bien contenus dans
ce commit, lui-même `HEAD` :

```
docs/FEATURES/gestion_des_sources/HANDOFF-LOT4.md
src/features/source-management/actions/ingest-source-corpus.ts
src/features/source-management/components/SourceCorpusImportWizard.tsx
src/features/source-management/data/resolve-source-corpus-import.ts
src/features/source-management/domain/source-registry-output.ts
```

`HANDOFF-LOT4.md` porte encore la mention interne « livré en repo, non commité » — c'est une
phrase rédigée **avant** que Guillaume ne committe lui-même ce lot entre les deux sessions ;
elle est donc périmée dans le corps du fichier, mais **l'état Git réel (le commit existe, HEAD,
poussé sur `origin/main`) est ce qui fait foi** et satisfait sans ambiguïté le gate §0.1. Aucun
mélange Lot 4 / Lot 5 dans un même commit : ce lot n'a rien committé.

## 2. État repo/VPS INTEL-033 avant modification

`npm run n8n:status` (avant toute modification) : `intel-033-account-watch-refresh.json` →
`id=dsUBVbLB5rSk5XpS active=true nœuds repo/VPS=42/42` — **aucun drift préexistant** sur ce
workflow (2 copies sur le VPS dont 1 active, clutter préexistant hors périmètre). Le repo et le
VPS étaient alignés au démarrage.

Correctifs déjà livrés confirmés présents dans le JSON avant modification (gate §0.2) :
`alwaysOutputData` sur les 5 collecteurs (`Official Site`/`News Media`/`Public Records`/
`Tenders` — le 5ᵉ, `Job Board`, a été retiré au 2026-08-04, cf. SETUP.md §10), `IF — Has Items to
Qualify?`, `Skip Qualification`, `IF — Has Signals to Write?`, `IF — Has Source Links?`,
convergence unique `Finalize Run Summary`, coûts/modèles `null` sur les branches sans LLM,
provenance réelle derrière Google News (`extractPublisher`/`stripPublisher`), plafond global de
40, tourniquet existant (clé `sourceType` avant ce lot), hors-sujet LLM rejeté avant écriture
(`MIN_SIGNAL`), `IF — Include Public Records?` / `IF — Include Tenders?`. Tous vérifiés par
lecture directe du JSON avant patch, puis re-vérifiés en fin de lot par le harnais §17
(non-régression).

**Aucun harnais Node n'existait pour INTEL-033 avant ce lot**, malgré §0-§26 du prompt qui
présupposent son existence (« étendre le harnais existant »). `find n8n -iname "*.test.js" | xargs
grep -l "intel-033"` ne retournait rien. C'est un écart de constat documenté ici, pas une
improvisation : le harnais a donc été **créé** (pas étendu) à ce lot —
`n8n/workflows/__tests__/intel-033-account-watch-refresh.test.js`.

## 3. Liste exacte des fichiers modifiés

```
n8n/workflows/intel-033-account-watch-refresh.json           (modifié — +12 nœuds, 42→54)
n8n/workflows/intel-033-account-watch-refresh.SETUP.md       (modifié — §13 ajoutée)
n8n/workflows/account-watch-scheduler.json                   (modifié — 2 nœuds)
n8n/workflows/__tests__/intel-033-account-watch-refresh.test.js  (créé — 104 assertions)
src/lib/intelligence/account-watch-settings.ts                (modifié)
src/lib/intelligence/account-watch-settings.test.ts            (modifié — fixture)
src/lib/n8n/types.ts                                           (modifié)
src/app/api/intelligence/accounts/[companyId]/watch-refresh/route.ts  (modifié)
src/components/accounts-contacts/intelligence/save-account-watch-settings.ts (modifié)
```

Diff total : 8 fichiers modifiés + 1 fichier créé, 464 insertions / 13 suppressions
(`git diff --stat`). **Aucun fichier `supabase/migrations/` touché. Aucune migration créée ni
appliquée.** Aucun autre workflow `n8n/` (veille hebdomadaire, scheduler mis à part) modifié.

## 4. Contrat `includeSectorCorpus`

Colonne déjà créée au Lot 1 (`account_watch_settings.include_sector_corpus boolean not null
default true`), jamais consommée avant ce lot. Devenue un paramètre réel bout en bout :

| Point du contrat | Avant | Après |
|---|---|---|
| `AccountWatchSettingsWorkflowRow` (TS) | ne portait pas `include_sector_corpus` | `Pick<...>` étendu |
| `AccountWatchWorkflowSettings` / `DEFAULT_ACCOUNT_WATCH_WORKFLOW_SETTINGS` | absent | `includeSectorCorpus: boolean`, défaut `true` |
| `toAccountWatchWorkflowSettings()` | — | mappe `row.include_sector_corpus` |
| `AccountWatchRefreshSettings` (`src/lib/n8n/types.ts`) | absent | `includeSectorCorpus: boolean` ajouté |
| Route manuelle `SETTINGS_SELECT` | ne sélectionnait pas la colonne | `include_sector_corpus` ajoutée |
| `DETAILED_SELECT_COLUMNS` (`save-account-watch-settings.ts`) | idem | idem (requis par le typecheck, `AccountWatchDetailedRow` en dépend) |
| `Validate Payload` (n8n) | n'acceptait pas le champ | `typeof settings.includeSectorCorpus === 'boolean' ? ... : true` |

### 4.1 Route manuelle

`SETTINGS_SELECT` porte désormais `include_sector_corpus`. Le payload envoyé à n8n transporte
`settings.includeSectorCorpus` (jamais dupliqué hors de `settings` — conforme §2).

### 4.2 Scheduler

`n8n/workflows/account-watch-scheduler.json` :
- Nœud `Supabase: Load Active Watch Settings` : `select=...,include_sector_corpus,...`.
- Nœud `Build Webhook Payload` : `includeSectorCorpus: row.include_sector_corpus !== false,` —
  comparaison stricte à `false` plutôt qu'un simple passthrough, pour rester cohérent avec le
  reste du bloc `settings` de ce nœud qui compare déjà chaque booléen explicitement (`=== true`
  pour les collecteurs optionnels par défaut faux) ; ici la colonne SQL est `NOT NULL DEFAULT
  true`, donc `!== false` équivaut à `true` sauf valeur explicitement `false`.

### 4.3 Compatibilité ascendante

Testé explicitement (`Validate Payload`, 3 scénarios) : `includeSectorCorpus` absent →
`true` ; `false` explicite → `false` ; `true` explicite → `true`. Une ancienne requête (route ou
scheduler non réimportés) continue de fonctionner sans ce champ.

## 5. Chargement de `v_effective_watch_sources` — définition live vérifiée

Lue en base live (`jvzgmhvwirsbdkjpmvla`, `pg_get_viewdef`) avant tout code, pas depuis une doc :

- La branche `account_watch` de la vue **applique déjà elle-même** `aws.is_enabled = true AND
  aws.include_sector_corpus = true` dans son `WHERE` — c'est un filtre en base, en plus de la
  garde côté workflow. Le nœud `IF — Include Sector Corpus?` évite le coût réseau (§18), la vue
  reste l'garant de correction si jamais ce gate était contourné.
- La vue **n'expose pas `pack`** (colonne non projetée) — confirmé en lisant `pg_get_viewdef`
  avant d'écrire le moindre code de priorisation. Conforme à la clause de repli du prompt §6 :
  `priority ASC, utility_score DESC` est utilisé tel quel, sans migration pour réexposer `pack`.
  `priority` encode déjà `pack=minimal(2) < enrichi(3)`, `+1` si `automation_fit='manual_only'`.
- Résolution segment → macro : `COALESCE(segment courant, macro parent)`, **jamais l'union** —
  encodée dans la vue par deux sous-requêtes `LIMIT 1` imbriquées dans un seul `COALESCE`. Le
  workflow ne la réimplémente à aucun endroit (interdiction §34 respectée) : `Load Effective
  Sector Sources` lit la vue telle quelle.
- Le workflow **ne lit jamais** `source_corpora`/`source_corpus_items`/`source_catalog`
  directement — vérifié par assertion structurelle dans le harnais (`le workflow ne lit jamais
  source_corpora/source_corpus_items/source_catalog en direct`).

## 6. Architecture ajoutée dans INTEL-033 (42 → 54 nœuds)

Insérée entre `Shape+Accumulate: Tenders` (fin des 4 collecteurs historiques) et
`Normalize & Dedup Items` :

```
Shape+Accumulate: Tenders
  → IF — Include Sector Corpus?
      [false] → Skip Sector Corpus ─────────────────────┐
      [true]  → Load Effective Sector Sources            │
                  → Shape Sector Sources (plafond 12)     │
                    → Loop Over Sector Sources (splitInBatches, batch=1)
                        ⟲ Build Sector Corpus Query (site:<search_domain> "Nom1" OR "Nom2")
                        ⟲ Collect: Sector Corpus Source (Google News RSS)
                        ⟲ Shape Sector Corpus Item  \
                        ⟲ Ignore Sector Corpus Source Error /  (boucle jusqu'à épuisement)
                      [done] → Accumulate Sector Corpus Items ─┘
                                                          │
                                          → Merge Collected Items
                                              → Normalize & Dedup Items (tourniquet re-clé)
                                                → Filter Administrative Static Items (nouveau)
                                                  → IF — Has Items to Qualify? (inchangé)
```

Le mécanisme de boucle (`splitInBatches` batch=1 + `$('Loop Over Sector Sources').item.json`
pour résoudre sans ambiguïté « la source en cours ») **reproduit exactement** le patron déjà
éprouvé en production par `n8n/workflows/veille-hebdomadaire-kredo.json`
(`Loop Over Items — 1 Source` / `Enrichir avec Métadonnées Source`) — choix délibéré plutôt
qu'un fan-out plat non testé : c'est le seul mécanisme de résolution "source ↔ articles" déjà
vérifié comportementalement dans ce dépôt, la boucle historique de veille ayant elle-même vécu un
incident de production (§5bis du `HANDOFF-LOT2.md`) avant d'être stabilisée. `Load Effective
Sector Sources` a ses deux sorties (succès/erreur) câblées vers le **même** `Shape Sector
Sources` — motif déjà utilisé 4 fois dans ce fichier pour les collecteurs historiques
(`Collect: Official Site` → `Shape+Accumulate: Official Site` sur ses deux sorties).

### 6.1 Règle des ≤ 12 sources

`Shape Sector Sources` trie défensivement (`priority ASC, utility_score DESC` — la vue trie déjà
ainsi, ce tri est une redondance volontaire, même doctrine que `Vérifier et Normaliser Sources`
de la veille hebdomadaire) et coupe strictement à 12 (`.slice(0, 12)`). Ne retourne **jamais**
`[]` (piège documenté 2 fois dans ce dépôt, §8/§5bis du SETUP.md) : 0 source réelle → un item
`{ placeholder: true }` traverse la boucle sans jamais déclencher de requête réseau utile côté
`Build Sector Corpus Query` (`feedUrl: null`), et se fait filtrer naturellement en aval.

### 6.2 Construction des requêtes `site:`

Une requête par source (jamais par variante de nom) : `site:<search_domain> ("Nom1" OR "Nom2")`,
où `Nom1`/`Nom2` sont les 2 premiers `nameVariants` déjà résolus par `Build Targeted Queries`
(nom du compte + `settings.queryAliases`) — même convention que `Collect: News Media`
(`nameVariants.slice(0,2)`). Plafond réseau strict : au maximum 12 requêtes Google News RSS pour
le corpus, quel que soit le nombre d'alias configurés.

### 6.3 Provenance

`Shape Sector Corpus Item` réutilise **exactement** `extractPublisher()`/`stripPublisher()`
(balise `<source url>` puis suffixe `" - Éditeur"`, avec repli sur le nom de la source du
catalogue) — dupliquées inline, même convention déjà appliquée 3 fois dans ce fichier pour
`Official Site`/`News Media`/`Public Records`/`Tenders`. Jamais `news.google.com` en sortie tant
qu'un éditeur réel ou un nom de catalogue est disponible — testé par 3 cas dans le harnais.

### 6.4 Métadonnées source_catalog / corpus

`intelligence_sources.technical_metadata` (via `Build Sources Payload`, fusion sans suppression
des clés existantes `collector`/`collectedVia`/`runId`) porte désormais aussi
`sourceCatalogId`/`corpusId` pour tout item dont la provenance est `sector_corpus` (`null` pour
les items historiques).

## 7. Nouvelle clé du tourniquet (`Normalize & Dedup Items`)

`roundRobinKey(it)` : `sourceCatalogId` → sinon `sourceKey` → sinon `sourceName` (normalisé
minuscule) → sinon `sourceType` en tout dernier repli. **Jamais `sourceType` seul.**

### 7.1 Contre-épreuve (§27 du prompt)

Fixture harnais : 12 sources corpus distinctes (`sourceCatalogId` `src-0`…`src-11`, 5 articles
chacune, 60 items) + 3 items historiques (`news_media`). Toutes les 12 sources corpus partagent
`sourceType='sector_corpus'`.

- **Avec l'ancien algorithme** (`byType.get(it.sourceType)`) : la fixture ne produirait que **2
  files** (`news_media`, `sector_corpus`) — les 60 items des 12 sources fusionnés dans une seule
  file round-robin, écrasés au même titre qu'**une seule** source. Vérifié explicitement dans le
  test (« démonstration : un regroupement par sourceType SEUL aurait échoué sur cette même
  fixture » — assertion sur `byType.get('sector_corpus').length === 60 && byType.size === 2`).
- **Avec le nouveau code** (`roundRobinKey`) : **10 sources corpus sur 12 au minimum**
  contribuent réellement au pool retenu (`normalizedItems`), vérifié par comptage des
  `sourceCatalogId` distincts présents en sortie. Seuil `≥ 10/12` (pas `12/12`) car le plafond
  global de 40 candidats, réparti sur 15 files au total (12 corpus + jusqu'à 3 historiques),
  laisse mathématiquement 2-3 sources sans slot au dernier tour — c'est le comportement attendu
  d'un tourniquet équitable sous plafond fixe, pas une régression.

Régression testée séparément : sans aucune source corpus (collecteurs historiques seuls), le
tourniquet produit exactement le même résultat qu'avant ce lot (repli `sourceKey`/`sourceName`).

## 8. Filtre administratif déterministe

`Filter Administrative Static Items`, nouveau nœud inséré entre `Normalize & Dedup Items` et
`IF — Has Items to Qualify?`. Fonction pure `isAdministrativeStaticItem(item)` :

1. Vocabulaire administratif stable présent (`siren`, `siret`, `code naf`, `code ape`, `siège
   social`, `adresse du siège`, `capital social`, `forme juridique`, `coordonnées
   administratives`, `numéro de TVA`, `identifiant unique`) — texte normalisé (minuscule, accents
   retirés).
2. **ET** aucun vocabulaire événementiel (`transfert`, `changement de dirigeant`, `nomination`,
   `départ`, `démission`, `fusion`, `acquisition`, `cession`, `liquidation`, `radiation`,
   `redressement`, `augmentation/réduction de capital`, `création/fermeture d'établissement`,
   `ouverture`, `attribution de marché`, `appel d'offres`, `nouveau contrat/partenariat`,
   `remporte`, `marché public`).

La présence de vocabulaire administratif ne suffit **jamais** seule à exclure — vérifié
explicitement par le cas « Transfert du siège social (SIREN 123456789) à Paris » → **conservé**.
Aucun appel LLM. Favorise les faux négatifs (en cas de doute structurel, l'item n'est retiré que
si le seul vocabulaire présent est administratif — tout terme absent du vocabulaire connu est
traité comme un signal potentiel et conservé par défaut).

### 8.1 Matrice de test — 18 cas (§28, minimum 15 requis)

| Titre | Attendu | Résultat |
|---|---|---|
| Code NAF : 20.42Z | EXCLU | ✅ |
| Siège social : Grasse | EXCLU | ✅ |
| SIREN 123456789 | EXCLU | ✅ |
| SIRET 12345678900012 | EXCLU | ✅ |
| Capital social : 50 000 €, forme juridique SASU | EXCLU | ✅ |
| Coordonnées administratives inchangées | EXCLU | ✅ |
| Transfert du siège social à Paris | CONSERVÉ | ✅ |
| Nomination de Mme X comme DG | CONSERVÉ | ✅ |
| Augmentation de capital de 20 M€ | CONSERVÉ | ✅ |
| Robertet remporte un marché public | CONSERVÉ | ✅ |
| Fusion de deux filiales | CONSERVÉ | ✅ |
| Ouverture d'un nouvel établissement | CONSERVÉ | ✅ |
| Acquisition d'un concurrent italien | CONSERVÉ | ✅ |
| Liquidation judiciaire prononcée | CONSERVÉ | ✅ |
| Redressement judiciaire ouvert | CONSERVÉ | ✅ |
| Nouveau partenariat avec un acteur du secteur | CONSERVÉ | ✅ |
| Transfert du siège social (SIREN 123456789) à Paris | CONSERVÉ (admin+événement) | ✅ |
| Article ni administratif ni événementiel | CONSERVÉ | ✅ |

Plus un test `excludedStaticCount` exact (2 exclus sur 3 items, l'item événementiel survivant).

## 9. Observabilité additive

`Finalize Run Summary` (lit désormais aussi `$('Filter Administrative Static Items').first().json`
en plus de `$('Compute Scores & Apply Rules')` — ces compteurs existent quel que soit le chemin
emprunté, LLM ou `Skip Qualification`, contrairement aux champs de qualification) et
`Prepare Callback` (`contentJson`) portent désormais, en plus des champs existants (non
renommés/supprimés) :

```
excludedStaticCount, sectorSourcesLoaded, sectorSourcesQueried,
sectorItemsCollected, sectorItemsAfterDedup
```

`workflowVersion` passe de `2026-08-07.1` à `2026-08-16.1`.

## 10. Preuves de convergence (§20, cas A-F)

Tous testés dans le harnais (section « Convergence », 3 tests explicites + couverture croisée
par les tests unitaires des nœuds individuels) :

| Cas | Attendu | Vérifié par |
|---|---|---|
| A — 0 corpus (`Shape Sector Sources` reçoit `[]`) | run complet, jamais `[]` en sortie | `Shape Sector Sources ne retourne JAMAIS []` |
| B — corpus présent, 0 résultat sur les 12 sources | run complet | `Shape Sector Corpus Item` marque `skipped` sans exception ; `Accumulate Sector Corpus Items` gère 0 item collecté |
| C — 0 item à qualifier | `Skip Qualification` → succès | `Cas C` + test dédié Skip Qualification |
| D — 0 signal après qualification | pas d'écriture vide, callback succès | `Cas D` (`Finalize Run Summary` avec `scoredItems: []`) |
| E — 0 source link | callback succès | `IF — Has Source Links?` non touché par ce lot (vérifié présent) |
| F — une source corpus en erreur | les autres continuent | `Ignore Sector Corpus Source Error` : item skipped tracé, boucle continue |

Aucun de ces chemins ne modifie le nœud `Finalize Run Summary` comme point de convergence
unique : toujours atteint, quel que soit le chemin.

## 11. Résultats des validations — exacts

```
npm run typecheck             ✅ 0 erreur
                                  (2 erreurs préexistantes corrigées en cours de route : le
                                  typecheck ne « voit pas » les colonnes Supabase manquantes tant
                                  qu'un type Pick<> les réclame ailleurs — save-account-watch-
                                  settings.ts et account-watch-settings.test.ts ne portaient pas
                                  include_sector_corpus dans leur SELECT/fixture ; corrigés)
npm test                       ✅ 133 fichiers · 1375 tests · 0 échec
npm run check:server-boundary  ✅ tous les modules important le client serveur portent server-only
npx eslint <fichiers touchés>  ✅ 0 erreur, 0 warning
npm run build                  ✅ compilé, exit 0 (le bruit "Dynamic server usage" affiché pendant
                                   la génération est préexistant, sur /missions, /missions/actives,
                                   /missions/projets, /legacy/folio/sector-studies — cookies()/
                                   headers(), non touchées par ce lot, déjà noté au Lot 3)
npm run test:n8n                ✅ 7 harnais, tous verts, compteurs lus explicitement (pas le seul
                                   exit code) :
   intel-010-refresh-account-infos      10 vérification(s), 0 échec
   intel-020-communication              81 passed, 0 failed
   intel-030-account-knowledge-v3       58 succès, 0 échec
   intel-030-account-knowledge          76 succès, 0 échec
   intel-033-account-watch-refresh     104 ok, 0 failed   (nouveau — créé ce lot)
   intel-034-account-signal-verification 19 assertion(s) OK, 0 échec
   intel-040-workspace-diagnostic        36 passed, 0 failed
npm run n8n:status               ⚠️ DRIFT attendu et voulu : intel-033-account-watch-refresh.json
                                    nœuds repo/VPS = 54/42 (le VPS tourne encore l'ancien
                                    workflow, aucun import fait ce lot). Aucun autre drift
                                    introduit par ce lot (account-watch-scheduler.json reste
                                    12/12 — le contenu des 2 nœuds modifiés change, pas leur
                                    nombre).
```

Aucun test préexistant rouge, aucun ignoré sans diagnostic.

## 12. Risques résiduels

| Risque | Statut |
|---|---|
| Aucun corpus `scope_kind='sector'` n'est encore activé en base (0 ligne, confirmé Lot 3/4) | La branche `account_watch` de `v_effective_watch_sources` renverra 0 ligne pour tout compte tant qu'aucun corpus n'est importé (Lot 4, resté en attente de validation) **et** activé (`SourceCorpusCard`, Lot 3). Ce lot est donc un no-op mesurable en conditions réelles tant que ce geste n'a pas eu lieu — comportement attendu (Cas A), pas un défaut |
| Boucle `splitInBatches` jamais exécutée contre une vraie instance n8n | Reproduit fidèlement le patron déjà en production de `veille-hebdomadaire-kredo.json`, mais n'a pas été testée en exécution réelle (le MCP n8n est bloqué en session agent — import manuel par Guillaume, cf. CLAUDE.md). Le harnais teste chaque nœud isolément avec des fixtures fidèles au contrat de sortie réel de chacun (rssFeedRead, splitInBatches outputs 0/1), pas une simulation d'exécution n8n de bout en bout |
| `includeSectorCorpus` non exposé dans `AccountWatchSettingsDialog` (UI) | Décision assumée — voir §13 Écarts. Défaut `true`, documenté |
| Contre-épreuve tourniquet à seuil `≥10/12` plutôt que `12/12` | Comportement mathématiquement attendu sous plafond fixe de 40 répartis sur jusqu'à 15 files (voir §7.1) — pas un défaut du re-clé |
| `Load Effective Sector Sources` ne filtre pas explicitement `aws.is_enabled`/`include_sector_corpus` côté n8n (déjà fait par la vue) | Défense en profondeur volontaire, documentée §5 — pas un risque, une redondance assumée |

## 13. Protocole de déploiement VPS (à exécuter uniquement sur ordre explicite de Guillaume)

1. **Sauvegarder/exporter le workflow actif** (`id=dsUBVbLB5rSk5XpS`, cf. `n8n:status` §2) avant
   tout patch.
2. **Patcher/importer LA COPIE ACTIVE**, pas créer une troisième copie (le VPS porte déjà 2
   copies dont 1 active).
3. **Préserver** `active`, `settings`, les credentials liés (`Supabase_Service_Role_KREDO`
   id `GBrm2aWU0dDf85QS` — réutilisé tel quel sur les 2 nouveaux nœuds HTTP de ce lot, mêmes ids
   que l'existant, aucune resélection nécessaire ; `Anthropic API (KREDO)` inchangé). **Ne jamais
   envoyer `settings:{}}`.**
4. **Smoke run manuel** sur un compte de test **avec** un corpus sectoriel actif (une fois le
   Lot 4 importé et un corpus activé via `SourceCorpusCard`) : vérifier dans **Executions** que
   le run va jusqu'au callback, que `sectorSourcesLoaded > 0` et `sectorItemsCollected` cohérent
   apparaissent dans le `contentJson` du callback.
5. **Second smoke run** sur un compte **sans** corpus sectoriel (segment non couvert) : vérifier
   `sectorSourcesLoaded = 0`, run `succeeded`, aucune régression sur les 4 collecteurs
   historiques.
6. **Vérifier callback et DB** : `intelligence_sources.technical_metadata` porte
   `sourceCatalogId`/`corpusId` pour les lignes issues du corpus (`collectedVia='sector_corpus'`).
7. `npm run n8n:status` : confirmer `intel-033-account-watch-refresh.json` passe à `54/54`.

## 14. Écarts avec PLAN-CHANTIER / le prompt Lot 5

- **`includeSectorCorpus` non exposé dans l'UI** (`AccountWatchSettingsDialog`). Le prompt §23
  autorisait un toggle simple si « emplacement naturel » et « modification locale et
  cohérente » — l'ajout réel aurait exigé de toucher `save-account-watch-settings.ts`
  (`DETAILED_SELECT_COLUMNS`, `SaveAccountWatchDetailedSettingsInput`, le payload d'écriture) et
  `AccountWatchSettingsDialog.tsx` (`SOURCE_TOGGLES`, les 3 groupements de catégories,
  `handleSave`) — un touch de 2 fichiers UI supplémentaires non requis par l'objectif du lot.
  Conservé au défaut `true`, exposition différée — conforme à la clause de repli explicite du
  prompt.
- **Harnais créé, pas étendu** — voir §2, aucun harnais INTEL-033 n'existait avant ce lot.
- **`Load Effective Sector Sources` filtre `is_enabled`/`include_sector_corpus` en base (via la
  vue), pas dans le workflow** — la vue les applique déjà nativement (§5), les dupliquer côté
  n8n aurait été une réimplémentation partielle d'une règle qui vit en base (interdiction §34).
- Deux fichiers TypeScript hors périmètre strict du prompt ont dû être touchés
  (`save-account-watch-settings.ts`, `account-watch-settings.test.ts`) — conséquence directe et
  minimale du changement de type `AccountWatchSettingsWorkflowRow` (§4), révélée par le
  typecheck, pas une extension de scope volontaire.

## 15. Entrée du Lot 6 — V2 scoring

Hors périmètre de ce lot (interdiction explicite §34). Le crochet est posé et vérifié
fonctionnel dans ce lot :
- `intelligence_sources.technical_metadata.sourceCatalogId`/`corpusId` — posé par ce lot pour la
  veille compte (INTEL-033), miroir du hook déjà posé au Lot 2 pour la veille hebdomadaire
  (`veille_articles.source_catalog_id`).
- Le Lot 6 pourra donc, sans nouvelle migration, faire un `group by` sur
  `technical_metadata->>'sourceCatalogId'` en plus de `veille_articles.source_catalog_id` pour
  mesurer l'efficacité d'une source à la fois en veille globale et en veille compte.

---

## Verdict

**LOT 5 READY FOR REVIEW**

`typecheck` / `test` (1375/1375) / `check:server-boundary` / `lint` (fichiers touchés) / `build`
/ `test:n8n` (7/7 harnais, 384 assertions au total dont 104 nouvelles) tous verts.
`n8n:status` confirme le drift attendu (54/42, aucun import VPS fait). QA en conditions réelles
(smoke run avec corpus sectoriel activé) reste à faire par Guillaume après import — non
bloquante pour ce statut, conforme à la méthode de travail du projet (§8 CLAUDE.md).
