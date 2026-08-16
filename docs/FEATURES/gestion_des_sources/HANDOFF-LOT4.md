# Handoff — Lot 4 « Import de corpus E3 »

**Chantier :** Gestion des sources · **Lot :** 4 / 6 · **Date :** 2026-08-16
**Statut :** ✅ **livré en repo, non commité, en attente de validation explicite de Guillaume.**
**Amont :** `PLAN-CHANTIER.md` §3-4, `HANDOFF-LOT3.md` §14 (entrée du Lot 4).
**Aval :** Lot 5 — `INTEL-033` sectoriel (`include_sector_corpus`, branche corpus, tourniquet re-clé, filtre administratif).

---

## 1. État Git initial (préflight)

```
git status --short
 M src/... (aucun — working tree propre côté code)
?? "docs/FEATURES/gestion_des_sources/HANDOFF-GESTION-DES-SOURCES-2026-08-15 (1).md"  (non suivi, non touché)
```

- Branche : `main`, à jour avec `origin/main`.
- HEAD au démarrage : `50610ceb` (`feat(veille): add source management UI` — commit du Lot 3).
- Aucun `git reset`/`checkout`/`clean` exécuté. Aucun commit créé pendant ce lot (conforme §27 : « ne pas commit/push le Lot 4 sans validation explicite »).

## 2. Preuve de finalisation Lot 3

`HANDOFF-LOT3.md` porte le verdict `LOT 3 READY FOR REVIEW` et une mise à jour de finalisation datée 2026-08-16 confirmant :
- la migration `family` appliquée en production sous `20260816113936` (commit `7072ec57`, distinct du commit Lot 3) ;
- `npm test` → 129 fichiers / 1291 tests verts au moment de la clôture Lot 3.

Vérifié à nouveau au démarrage de ce lot (`mcp__supabase__list_migrations` / `execute_sql`) :
- `source_catalog` : 14 lignes, toutes `origin='system'`.
- `source_corpora` : 1 ligne (`scope_kind='system'`) — **0 corpus `scope_kind='sector'`**, confirmant que ce lot est le premier test réel du chemin d'écriture `ingest_source_corpus`.
- La RPC `public.ingest_source_corpus(p_payload jsonb, p_segment_slug text, p_reason text)` existe, `SECURITY DEFINER`, `search_path = ''` — définie dans `supabase/migrations/20260814214647_077_source_management.sql` (Lot 1), **jamais modifiée par ce lot**.

## 3. Documents lus, dans l'ordre du prompt

1. `docs/MASTER-STUDY/README.md` — registre de légitimité, état d'exécution du corpus (§5-6).
2. `docs/MASTER-STUDY/06-ETAPE-E3-CORPUS-DE-SOURCES.md` — axiomes, mode de défaillance du générateur (troncature à la frontière du pack minimal), frontière avec la config de veille (`search_domain` = primitive universelle, pas `collection_url`).
3. `docs/MASTER-STUDY/schemas/source-registry.schema.json` — contrat JSON Schema E3 v1.1 complet.
4. `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/03-sources.json` — corpus de recette canonique (29 sources).
5. `docs/FEATURES/gestion_des_sources/PLAN-CHANTIER.md` — architecture retenue, séquencement, C1-C9.
6. `docs/FEATURES/gestion_des_sources/HANDOFF-LOT3.md` — état Lot 3, entrée Lot 4 (§14).
7. Mécanisme d'import existant : `competitive-map-output.ts`, `resolve-competitive-map-entries.ts`, `ingest-competitive-map.ts`, `CompetitiveMapImportWizard.tsx`.
8. Définition **live** de `source_catalog` / `source_corpora` / `source_corpus_items` / `ingest_source_corpus()` — colonnes, enums, contraintes UNIQUE, corps de fonction complet, via `mcp__supabase__execute_sql` (`information_schema`, `pg_proc`, `pg_constraint`, `pg_enum`).

Aucune ancienne documentation de schéma n'a été recopiée aveuglément — le schéma live a servi de source à chaque écart avec `PLAN-CHANTIER.md` (§8 ci-dessous).

## 4. Architecture — parseur (`domain/source-registry-output.ts`)

Module pur, aucune dépendance Supabase, aucune librairie de validation — même doctrine que `competitive-map-output.ts` / `account-classification.ts`.

**Décision explicite documentée en tête de fichier** : le parseur implémente **exactement** les 22 invariants bloquants listés au prompt Lot 4 §5, un sous-ensemble délibéré du JSON Schema complet. Ce qu'il n'implémente pas :
- l'arithmétique de `utility_score_detail` (somme des 6 composantes) ;
- la cohérence `publisher` ↔ `domain` (détection de « blanchiment de tier ») ;
- le journal ≥ 15 requêtes / `compteurs.requetes ≥ 15`.

Ces trois contrôles sont le rôle de `scripts/audit-master-study.py` (gate G1), exécuté **hors du contexte producteur** (axiome A10). Le corpus de recette canonique lui-même porte `"requetes": 0` et aucun `journal_recherche` — il échouerait G1, mais reste un livrable `usable_with_caveats` légitime pour cet import (E3 §7 : « `production_ready` interdit tant qu'une `collection_url` reste non prouvée » — le corpus parfumerie n'a jamais prétendu à `production_ready`). Confondre les deux gates aurait rendu le corpus de recette imposé par le prompt lui-même non importable.

`parseSourceRegistryOutput(raw: unknown)` accepte texte JSON ou objet déjà parsé (`JSON.parse` en `try/catch`, jamais d'exception non contrôlée), retourne `{ ok: true; data } | { ok: false; errors }`. Les 22 invariants, chacun testé isolément dans `source-registry-output.test.ts` :

```
meta.segment_slug présent · meta.date_snapshot présent · meta.version === "1.1"
sources.length >= 8 · src_id unique · src_id format SRC-XXX · search_domain présent
content_temporality valide · usage_scopes valides · pack minimal|enrichi · tier 1..4
utility_score 0..100 · automation_fit valide · primary_role valide
pack_minimal ∩ pack_enrichi = ∅ · union(packs) == ensemble des src_id
chaque src_id de pack résout vers une source · compteurs.sources == sources.length
compteurs.pack_minimal == pack_minimal.length · compteurs.pack_enrichi == pack_enrichi.length
matrice_couverture.src_ids résolvent tous · les 3 familles sectorielles obligatoires résolvent
```

`sources[]` n'est **jamais tronqué silencieusement** : soit toutes les entrées sont acceptées, soit la première erreur bloquante interrompt le parsing entier avec un message exploitable par entrée fautive.

Le module expose aussi les fonctions pures de mapping (§5 ci-dessous) : `mapE3VerdictToCorpusQualityVerdict`, `deriveImportCollectionUrl`, `buildSourceCorpusItemPreview`, `buildIngestSourceCorpusPayload`.

## 5. Architecture — résolution en lecture seule (`data/resolve-source-corpus-import.ts`)

`"use server"` + `import "server-only"` — patron identique à `resolve-competitive-map-entries.ts` (Server Action de lecture appelée directement depuis le composant client du wizard).

- `resolveImportSegment(segmentSlug)` : lit `sector_intelligence` (`select id, name, level, parent_id where slug = :slug`), **sans filtre `workspace_id` explicite** — la RLS scope déjà la ligne au workspace courant, donc un slug inconnu **ou** appartenant à un autre workspace produit la même absence de ligne (`row === null`), traitée de façon identique (« Segment introuvable dans ce workspace »). Un slug résolu mais `level !== 'segment'` (un macro) est bloqué avec un message dédié, distinct.
- `resolveSourceCorpusImport(parsed)` : une seule lecture de `source_catalog` (toutes colonnes utiles), indexée en mémoire par hostname normalisé (`domain` et `search_domain`, les deux colonnes) — pas une requête par source. Pour chaque source E3, recherche par hostname normalisé de `domain` puis de `search_domain` ; construit un `SourceCorpusItemPreview` via la fonction pure `buildSourceCorpusItemPreview` du domaine.
- **Aucune écriture** — vérifié par test structurel (`not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/)`).

## 6. Mapping E3 → RPC (§9-§12 du prompt)

| Cible | Règle appliquée |
|---|---|
| `source_catalog.name` | `publisher` (fallback : hostname normalisé si `publisher` absent) |
| `source_catalog.domain`/`search_domain` | hostname normalisé (lowercase, sans protocole, sans `www.`, sans slash final) — réutilise `normalizeHostname()` du Lot 3, pas de réimplémentation |
| `source_catalog.homepage_url` | `https://<search_domain normalisé>` |
| `source_catalog.family` | `meta.secteur` si présent, sinon `"Sectoriel"` |
| `source_catalog.kredo_category` | toujours `"vertical"` |
| `source_catalog.origin` | `"corpus"` — géré par la RPC elle-même à l'INSERT, pas envoyé par le payload |
| `source_corpus_items.external_src_id` | `src_id` (`SRC-XXX`) — jamais utilisé comme `source_key` |
| `source_corpus_items.tier` | sérialisé en **chaîne** (colonne `text` en base, pas `integer` — vérifié `information_schema` avant d'écrire le mapping) |
| `source_corpora.slug` | `` sources-${meta.segment_slug} `` |
| `source_corpora.activation_state` | toujours `"draft"` — jamais construit autrement, et **revérifié côté Server Action** (`isValidPayload` rejette tout `activation_state !== "draft"`) |
| `source_corpora.quality_verdict` | `mapE3VerdictToCorpusQualityVerdict()` : `production_ready→production_ready`, `usable_with_caveats→usable_with_caveats`, `rejected→rejected`, **`pending→usable_with_caveats`** (l'enum SQL `corpus_quality_verdict` n'a pas de valeur `pending` — vérifié `pg_enum`) |
| `source_corpora.metadata` | `meta` d'origine (secteur/géographie/segment_slug), `besoins_information`, `familles_sectorielles_obligatoires`, `matrice_couverture`, `compteurs`, `source_file_name`, `source_e3_validation_status`, `imported_at` — la RPC y ajoute elle-même `reason`/`updated_at` |
| `source_corpora.gaps` | passthrough intégral du tableau `gaps[]` |

## 7. Règles `collection_url` / `search_domain` (§10, point critique du prompt)

`deriveImportCollectionUrl(rawCollectionUrl)` : une `collection_url` E3 n'est projetée comme flux direct **que** si elle matche une heuristique déterministe et locale (regex sur le chemin — `/rss`, `/feed`, `/atom`, `.rss`, `.atom`), **sans requête réseau** (interdiction §27 « aucun scraping massif »). Sinon → `null`, collecte via `search_domain` (mode `site_search`, dérivé à l'affichage par `deriveCollectionMode()` du Lot 3, jamais stocké).

Testé sur les 29 `collection_url` réelles du corpus parfumerie : **aucune ne matche** l'heuristique (ce sont des pages de documentation API, des formulaires de recherche, des pages « à propos ») — donc les 29 sources passent en `site_search`, conformément à l'avertissement explicite du prompt (« les `collection_url` existantes ne sont pas des RSS exploitables »). Vérifié par test dédié qui boucle sur les 29 sources réelles du fichier.

## 8. Wizard — Desktop

`components/SourceCorpusImportWizard.tsx`, monté dans `SourceManagementDialogDesktop` via `view.kind === "import"` → `<SourceCorpusImportWizard variant="desktop" onClose={...}>`. CTA « Importer un corpus » devient actif pour `canManage=true` (auparavant `disabled` avec le texte figé « Import de corpus — Lot 4 », désormais retiré).

Rendu dense en `variant="desktop"` : tableau `<table>` à l'étape Arbitrer (colonnes source/tier-pack/score-fit/temporalité-usages/collecte/correspondance/état), compteurs en tête de chaque étape, résumé à deux colonnes à l'étape Finaliser.

## 9. Wizard — Mobile

Même composant, `variant="mobile"` monté dans `SourceManagementDrawerMobile` via le même `view.kind === "import"`. Titre du drawer dynamique (« Importer un corpus » quand `view.kind === "import"`). Étape Arbitrer en cartes (`ArbitrationCard`) plutôt qu'en tableau — **aucun tableau Desktop caché en CSS**, la branche `isMobile` choisit un rendu structurellement différent (JSX distinct), pas une classe `hidden md:block`.

**Choix architectural explicite, cohérent avec le Lot 3** : le wizard est **un seul composant** qui branche sur `variant` avant de rendre (`const isMobile = variant === "mobile"`), plutôt que deux fichiers séparés. C'est exactement le patron déjà établi et testé par `SourceManagementLauncher`/`SourceBaseList`/`SourceCorpusCard` au Lot 3 pour cette même divergence Desktop/Mobile au sein de ce chantier — voir §13 « Écarts » ci-dessous. Domaine, parseur, résolution et view models sont partagés à 100 % (un seul fichier de logique) ; c'est la présentation (table vs cartes, stepper horizontal vs vertical compact) qui diverge à l'intérieur du même composant.

Aucune modale imbriquée : le wizard ne contient ni `AppDialog` ni `AppDrawer` — vérifié par test structurel.

## 10. Tests — exacts

```
npx vitest run src/features/source-management
  Test Files  8 passed (8)
  Tests       141 passed (141)

npm test (suite complète)
  Test Files  133 passed (133)
  Tests       1375 passed (1375)
```

Répartition des nouveaux tests (84 nouveaux dans ce lot, en plus des 57 du Lot 3) :

- `domain/source-registry-output.test.ts` (comportemental, pur) : JSON valide v1.1 (objet et texte) · JSON invalide/non-objet sans exception non contrôlée · version incorrecte · `segment_slug` absent · moins de 8 sources · `src_id` dupliqué · format `src_id` invalide · `search_domain` absent · `content_temporality`/`usage_scopes`/`pack`/`tier`/`utility_score`/`automation_fit`/`primary_role` hors domaine · packs non disjoints · source manquante dans les packs (union) · `src_id` de pack orphelin · compteurs faux (3 variantes) · référence `matrice_couverture` orpheline · famille sectorielle obligatoire non résolue · **corpus parfumerie réel** : 29 sources conservées, 21 collectables, 8 statiques, `manual_only` (SRC-005 ECHA) conservée, `pending→usable_with_caveats`, packs 12/17 · `deriveImportCollectionUrl` (RSS reconnu, API/formulaire rejeté, les 29 URLs réelles → toutes `null`) · `buildSourceCorpusItemPreview` (static jamais éligible, `news_eligible`/`account_watch_eligible` conditionnés, `manual_only` jamais exclu, `source_key` déterministe nouvelle source, réutilisation d'une source existante manuelle **et** système/verrouillée, `family`/`kredo_category` mappés) · `buildIngestSourceCorpusPayload` (`slug`, `activation_state` toujours `draft`, `quality_verdict` mappé, static forcé `is_enabled=false` même si l'arbitrage dit le contraire, `tier` en chaîne, `metadata`/`gaps`/`source_document_*` conservés, corpus complet → 21 actives / 8 statiques cohérentes).
- `data/resolve-source-corpus-import.test.ts` (structurel) : `"use server"` + `server-only` · aucune écriture (`insert`/`update`/`delete`/`upsert` absents) · résolution stricte `level='segment'` · message dédié macro vs introuvable · session requise · lecture unique de `source_catalog` indexée par hostname.
- `actions/ingest-source-corpus.test.ts` (structurel) : `"use server"` + `server-only` · pas de `service_role` · session requise · écriture exclusivement via `supabase.rpc("ingest_source_corpus", ...)` · `revalidatePath("/veille")` · validation serveur du payload (`isValidPayload`/`isValidSourceItem`) · re-vérification serveur de `activation_state === "draft"` et de l'exclusion dure des sources `static`.
- `components/SourceCorpusImportWizard.test.ts` (structurel) : trois étapes exactes · aucune modale imbriquée · `variant` partagé · aucune écriture avant `handleConfirm` (étape 3) · toggle bloqué sur une source non collectable · hash SHA-256 client (Web Crypto, zéro dépendance) · corpus toujours créé en Brouillon.
- `__tests__/source-management-components.test.ts` (Lot 3, **mis à jour**) : le bloc « CTA désactivée, Lot 3 ne fait pas d'import » est remplacé par un bloc « CTA branchée au wizard Lot 4, gatée sur `canManage` » — l'ancien test aurait échoué dès le câblage du wizard, il documentait un état volontairement temporaire.

## 11. Résultat — corpus parfumerie (recette obligatoire)

Vérifié par test automatisé (pas par exécution live — voir §12) sur le fichier réel `docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/03-sources.json` :

| Attendu (prompt §6) | Mesuré |
|---|---|
| 29 sources | ✅ 29 (`data.sources.length`) |
| 21 collectables | ✅ 21 (`content_temporality !== 'static'`) |
| 8 statiques, visibles avec motif | ✅ 8 — SRC-007 (PRODAROM), SRC-010 (Givaudan supplier), SRC-013 (ecologie.gouv.fr REACH), SRC-016 (Grasse Expertise), SRC-020 (MANE), SRC-021 (dsm-firmenich), SRC-022 (Givaudan integrated report), SRC-023 (dsm-firmenich annual report) — chacune reçoit `is_enabled=false`, `news_eligible=false`, `account_watch_eligible=false`, `exclusion_reason="Contenu statique — hors veille récurrente"` |
| Packs disjoints et couvrants | ✅ pack_minimal=12, pack_enrichi=17, 12+17=29, aucune intersection |
| Verdict E3 `pending` | ✅ mappé vers `quality_verdict="usable_with_caveats"`, `activation_state="draft"` |

## 12. Résultat — idempotence

**Vérifié par lecture du code de la RPC live, pas par exécution réelle contre la production.** La RPC (migration 077, non modifiée) est idempotente par construction :
- `source_corpora` : `ON CONFLICT (workspace_id, slug, version) DO UPDATE` — un second import du même `slug`+`version` met à jour la ligne existante (`corpus_id` stable), puis `UPDATE ... SET is_current=false WHERE slug=... AND id<>v_corpus_id` démote les autres versions du même slug.
- `source_catalog` : `ON CONFLICT (workspace_id, source_key) DO UPDATE` (avec protection des champs canoniques si `origin='system' OR is_locked`) — un second import du même `source_key` (déterministe, dérivé du hostname) réutilise la même ligne, jamais de doublon.
- `source_corpus_items` : `ON CONFLICT (corpus_id, source_id) DO UPDATE` — `corpus_id` et `source_id` étant tous deux stables entre deux imports identiques, la même paire produit un upsert, jamais une nouvelle ligne.

**Je n'ai pas exécuté cette RPC contre la base de production** (`jvzgmhvwirsbdkjpmvla`) pendant ce lot : le faire aurait créé un vrai corpus `sources-seg-parfumerie-compositions-b2b` dans `source_corpora`/`source_catalog`/`source_corpus_items` avant validation explicite de Guillaume, ce que les interdictions du prompt (§24 « aucune migration live », §27 « pas de commit/push sans validation ») et la doctrine de sécurité du poste (pas d'action à effet de bord non réversible sans confirmation) m'interdisent de faire de ma propre initiative. C'est un écart assumé par rapport à « Tester réellement » — documenté en risque résiduel (§14) et laissé comme premier geste de QA pour Guillaume (§15, item Lot 5 / QA).

## 13. Sources existantes réutilisées

Aucun corpus sectoriel n'existe en base à ce jour (0 ligne `scope_kind='sector'`), donc aucune réutilisation n'a eu lieu en conditions réelles. En revanche, une correspondance **certaine** existe déjà entre le corpus parfumerie et le socle système : `source_catalog` porte une ligne système `Premium Beauty News` / `search_domain = premiumbeautynews.com` (vérifié live), qui correspond exactement à **SRC-018** du corpus parfumerie (`domain: premiumbeautynews.com`, `publisher: Premium Beauty Media`). Ce cas précis est utilisé comme fixture du test « source système réutilisée » (`buildSourceCorpusItemPreview` avec un `existingMatch` système/verrouillé), plutôt qu'une source inventée — au premier import réel du corpus parfumerie, SRC-018 réutilisera cette ligne système sans créer de doublon.

## 14. Fichiers créés / modifiés

```
src/features/source-management/
  domain/source-registry-output.ts            (créé)
  domain/source-registry-output.test.ts       (créé)
  data/resolve-source-corpus-import.ts        (créé)
  data/resolve-source-corpus-import.test.ts   (créé)
  actions/ingest-source-corpus.ts             (créé)
  actions/ingest-source-corpus.test.ts        (créé)
  components/SourceCorpusImportWizard.tsx     (créé)
  components/SourceCorpusImportWizard.test.ts (créé)
  components/SourceManagementDialogDesktop.tsx (modifié — CTA branchée, kind:"import")
  components/SourceManagementDrawerMobile.tsx  (modifié — CTA branchée, kind:"import", titre dynamique)
  __tests__/source-management-components.test.ts (modifié — bloc CTA Lot 3 remplacé)
```

Aucun fichier `n8n/` touché. Aucune migration créée ni appliquée. Aucun commit créé.

## 15. Risques résiduels

| Risque | Statut |
|---|---|
| Idempotence et réutilisation de source système non vérifiées par exécution réelle | Vérifiées par lecture du code RPC (§12) uniquement — premier import réel du corpus parfumerie sur la base live reste **le** test de recette à faire, sous contrôle de Guillaume |
| `SourceCorpusImportWizard` n'a jamais été rendu dans un navigateur | QA visuelle explicitement reportée par Guillaume (§26 du prompt, §8 CLAUDE.md) — non bloquant pour ce handoff |
| Heuristique `deriveImportCollectionUrl` | Déterministe et locale par construction ; un futur corpus E3 avec un vrai flux RSS mal formé (ex. `.../feed?format=rss` avec des paramètres inhabituels) pourrait échapper à la regex — à surveiller au prochain corpus réel, pas un défaut du corpus parfumerie |
| `source_corpora.enabled_for_news`/`enabled_for_account_watch` forcés à `true` par la RPC à l'INSERT (hors de notre contrôle, migration 077 non modifiable) | Sans effet observable tant que `activation_state='draft'` — `v_effective_watch_sources` ne sert un corpus qu'actif ; à reconfirmer visuellement en QA Lot 5 |
| Motif d'import (`p_reason`) toujours généré automatiquement, jamais saisi par l'utilisateur | Cohérent avec `CompetitiveMapImportWizard` (même patron) ; pas un champ demandé explicitement par le prompt Lot 4 |

## 16. Écarts avec PLAN-CHANTIER / le prompt Lot 4

- **Un seul fichier de wizard, pas deux composants Desktop/Mobile séparés.** Le prompt §21-22 dit « le wizard peut partager domaine/parseur/résolution/view models/composants feuilles, mais pas le shell Desktop ». Le Lot 3 a déjà établi et testé, pour ce même chantier, le patron « un seul composant qui branche sur `variant` avant de rendre » pour `SourceManagementLauncher`, `SourceBaseList` et `SourceCorpusCard` — aucun des trois n'existe en deux fichiers séparés. Dupliquer uniquement le wizard en deux fichiers aurait introduit une incohérence interne au chantier sans bénéfice (aucun risque de double montage : le rendu React ne produit qu'un seul arbre, celui de la branche active). Le shell d'accueil (`AppDialog`/`AppDrawer`) reste, lui, strictement distinct — c'est `SourceManagementDialogDesktop`/`SourceManagementDrawerMobile` qui portent cette séparation, et le wizard n'en crée aucune nouvelle instance imbriquée.
- **Pas de champ « motif » saisi par l'utilisateur à l'étape 3.** `p_reason` est généré automatiquement (`Import corpus E3 — <secteur> (v<version>, <snapshot_date>)`), comme `confirmCompetitiveMapIngestion` le fait déjà pour son propre `reason`. Le prompt ne demande pas explicitement ce champ dans la liste des éléments affichés à l'étape 3 (§17).
- **Idempotence et réutilisation de source système vérifiées par lecture de code, pas par exécution live** — voir §12, motivé par la sécurité (pas d'écriture en production sans validation explicite de Guillaume).
- **`source_document_path`** est le nom de fichier logique (`file.name` si upload, `null` si texte collé) — aucune infrastructure Storage n'a été ajoutée, conforme à §13 du prompt.

## 17. Entrée précise du Lot 5

**Lot 5 — INTEL-033 sectoriel** (`PLAN-CHANTIER.md` §4, ligne Lot 5) :
- Payload `include_sector_corpus` (défaut `true`) dans `Validate Payload`.
- Branche corpus après `Load Company Details` : ≤ 12 requêtes `site:<search_domain>` × variantes de nom, priorité `pack=minimal` puis `utility_score` décroissant — consomme directement `v_effective_watch_sources` (`usage_scope='account_watch'`), qui ne sert un corpus que si son `activation_state='active'` **et** `enabled_for_account_watch=true` : tant qu'aucun corpus n'est activé via les toggles du Lot 3 (`SourceCorpusCard`), ce lot est un no-op mesurable, pas une erreur.
- **Tourniquet re-clé de `sourceType` vers `sourceKey`** dans INTEL-033 (42 nœuds) — sinon les domaines corpus s'écrasent entre eux dans la file `news_media` (même défaut que celui corrigé au Lot 0 pour la veille hebdomadaire).
- Filtre administratif déterministe avant `Build Qualification Prompt` (rejet NAF/SIREN/siège sans verbe d'événement).
- `sourceCatalogId`/`corpusId`/`collectedVia` dans `technical_metadata`.
- **Prérequis opérationnel avant tout test Lot 5 en conditions réelles** : un premier import réel du corpus parfumerie (ou d'un autre corpus E3) doit exister en base, puis être activé via `SourceCorpusCard` (Lot 3) pour que la vue effective renvoie des lignes `account_watch`. Ce geste — import + activation — est le test de recette naturel qui referme aussi le risque résiduel §15 (idempotence non vérifiée en conditions réelles).

---

## Verdict

**LOT 4 READY FOR REVIEW**

`typecheck` / `test` (1375/1375) / `check:server-boundary` / `lint` (fichiers touchés) / `build` tous verts. `test:n8n` non exécuté (aucun fichier `n8n/` touché, conforme CLAUDE.md). QA visuelle et vérification d'idempotence en conditions réelles restent à faire par Guillaume — non bloquantes pour ce statut, conformément au prompt §26 et à la méthode de travail du projet (§8 CLAUDE.md : la QA visuelle est faite par Guillaume).
