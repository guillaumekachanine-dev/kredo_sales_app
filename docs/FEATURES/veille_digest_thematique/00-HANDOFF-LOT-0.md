# Digest thématique — handoff autoportant

- **Date** : 2026-09-06
- **Autorité** : `docs/adr/ADR-0022-digest-thematique-sujet-corpus.md` (**Accepté & Livré**, v2.0)
- **État au 2026-09-06** : **Lot 0 ✅ · Lot 1 ✅ · Lot 2A/2B ✅ · Lot 3 ✅ · Consolidation runtime ✅ · Validé en production (runs 83554 & 83555) · Chantier CLÔTURÉ**.
- **Lire d'abord** : le §2 (« ce qu'il ne faut pas refaire ») et le §11 (« bilan de clôture »).

> **Objectif métier.** Que « Générer un digest » propose un **sujet** (Business, IA, LLM, un segment)
> et un **corpus de sources**, les deux indépendants — pour produire aussi bien un digest
> « IA × Folio AI Tech » qu'un digest « Business × sources Voyage & Séjours ».

---

## 1. Mesures de référence (2026-09-06, live)

À revérifier avant de s'appuyer dessus — ces chiffres dérivent.

```
source_catalog            42   (14 system · 1 manual · 27 corpus)
source_corpora             2   socle-sources-editoriales (system, active)
                               sources-seg-parfumerie-compositions-b2b (sector, DRAFT)
source_corpus_items       42   socle 14/14 news_eligible · parfumerie 2/28 news_eligible
source_collection_metrics 63   ⚠️ contenu faux, cf. DEF-1
veille_digests            10   dernier : 2026-08-28
veille_articles           46
corpus_scope_kind              system | sector          ← 'thematic' AJOUTÉ au Lot 0
veille_digests             UNIQUE (workspace_id, digest_date)   ← REMPLACÉ au Lot 0
                           par UNIQUE (workspace_id, digest_date, topic_key)
```

⚠️ Ce bloc décrit l'état **avant** le Lot 0, sauf les deux lignes marquées. Après H-1, la vue
`v_effective_watch_sources` (news) rend **11 sources et non 15**.

**Sonde d'ingérabilité des flux** (protocole : `curl -L`, parsing XML, date du plus récent) :

| Ensemble | Vivants | Récupérables (URL à corriger) | Morts |
|---|---:|---:|---:|
| Folio AI Tech (11 déclarés) | 5 | 3 | 3 |
| Folio AI Business (11 déclarés) | 5 | 0 | 6 |
| Presse pro sectorielle via `site:` | 7 / 9 | — | 2 |
| Socle KREDO (14) | 6 flux + 4 fantômes | — | — |

Le script est rejouable : `python3 docs/FEATURES/veille_digest_thematique/probe-feeds.py`
(stdlib seule, ne lit pas la base, ne modifie rien). Sa limite est documentée en tête : il ne suit pas
les `308` et son parseur XML est strict — tout `ERR` doit être reconfirmé au `curl -L` avant d'être
déclaré mort.

---

## 2. Ce qu'il ne faut pas refaire

Chaque ligne a coûté une vérification. Ne pas les rejouer.

| # | Piège | Pourquoi |
|---|---|---|
| P-1 | Filtrer `v_effective_watch_sources` sur `corpus_id` | `DISTINCT ON … ORDER BY priority` : une source aussi présente au socle ressort `origin='system'`, `corpus_id = NULL`. Le filtre **supprimerait** OpenAI et One Useful Thing du corpus Folio. |
| P-2 | Faire passer une liste Folio par `parseSourceRegistryOutput` | Le parseur exige `meta.segment_slug`, `version='1.1'`, ≥ 8 sources, `SRC-\d{3}`, packs disjoints couvrant exactement l'ensemble, et un régulateur + une fédération + une presse qui résolvent. Y entrer impose de **fabriquer** ces valeurs. |
| P-3 | Écrire un adaptateur « legacy V1 » pour les deux référentiels Markdown | Leurs exports JSON sont tronqués : Électronique 7 sources exportées sur 15 (`extended_pack` = 8 orphelins), Tourisme 5 sur 13. L'import perdrait la moitié du corpus **et** échouerait quand même. |
| P-4 | Importer un corpus thématique avec `enabled_for_news = true` | La branche 2 de `v_effective_watch_sources` le ferait entrer **dans le digest du cron**, qui passerait silencieusement de 14 à ~25 sources. |
| P-5 | Un index unique partiel `WHERE generation_mode='scheduled'` | PostgREST ne peut pas émettre la clause `WHERE` requise par l'inférence d'index partiel dans `ON CONFLICT`. L'upsert du workflow casserait. |
| P-6 | `topic_key = 'segment'` + `sector_id` | Deux segments différents le même jour entreraient en collision sur la clé d'unicité. `topic_key` porte **le slug**. |
| P-7 | Livrer le digest sectoriel sur un corpus Master Study | 2 items `news_eligible` sur 28, 0 flux RSS, 8 sources `static` interdites. Le digest serait vide. |
| P-8 | Compter sur le repli `site:` pour une source anglophone morte | `Construire Requête Collecte` code en dur `hl=fr&gl=FR&ceid=FR:fr`. Mesuré : 0 item pour 6 des 10 flux Folio tombés, et 1 à 7 items vieux de 53 à 810 jours pour les 4 autres. |
| P-9 | Déployer le front v2 avant le workflow | `Valider Signature & Payload` lève `input doit valoir { schemaVersion: 1, triggerMode: "manual" }`. Le bouton actuel casserait à l'instant du déploiement. |
| P-10 | Croire `v_source_effectiveness_30d` | Elle affiche 0 partout. Cf. DEF-1. |
| P-11 | `DROP` + `CREATE` d'une fonction `SECURITY DEFINER` sans revérifier `proacl` | Rencontré au Lot 0 sur `ingest_source_corpus` : les DEFAULT PRIVILEGES de Supabase **réaccordent `EXECUTE` à `anon`** au `CREATE`, et `REVOKE … FROM public` ne le retire pas. Toujours relire `pg_proc.proacl` après un DROP/CREATE et révoquer `anon` nommément — même faille que `20260818092506_harden_get_manager_summary_facts_privileges`. |

---

## 3. Préalable d'hygiène (≈ 1 h, indépendant du reste)

Sans lui, on construit une sélection de corpus sur des compteurs faux.

**H-1 — ✅ FAIT (migration `20260905233054_neutralize_ghost_news_sources.sql`).** `a16z`,
`Anthropic News`, `The Batch`, `The Neuron` passées en `validation_status = 'unreachable'`, avec la
raison et la date de sonde dans `last_error`. Dry-run en transaction `ROLLBACK` avant application.
Mesure : `v_effective_watch_sources` (news) passe de **15 à 11 sources**. Réversible : repasser à
`'valid'` dès qu'une URL de flux valide est connue.

**H-2 — Corriger DEF-1 (métriques).** Dans `Préparer Métriques Sources`, `items_collected` agrège
`$('Enrichir avec Métadonnées Source').all()`, nœud **intérieur à la boucle `splitInBatches`** :
`.all()` n'y rend que la dernière itération. Accumuler dans une variable de run (ou lire un nœud
post-boucle) au lieu de `.all()` sur un nœud de boucle.
⚠️ Ce correctif touche le workflow → **le grouper avec le réimport du Lot 2**, pas avant.

**H-3 — VentureBeat : indécidable depuis ce poste, laissée active.** Deux essais espacés →
`429` les deux fois. Mais la sonde tourne depuis le Mac de Guillaume, pas depuis l'IP du VPS n8n,
et DEF-1 rend les métriques de collecte inexploitables pour trancher. **Ne pas la neutraliser sur
cette base** : la réponse viendra du correctif H-2, une fois les métriques justes.

---

## 4. Lot 0 — Contrat et données — ✅ FAIT le 2026-09-06

Boucle de validation passée en entier : `typecheck` ✅ · `test` **2250/2250 sur 233 fichiers** ✅ ·
`check:server-boundary` ✅ · `lint` (fichiers touchés) ✅ · `build` ✅ (`.next/` purgé avant).
`test:n8n` non requis : aucun fichier de `n8n/workflows/` n'a été touché.

### 4.1 Migrations appliquées et versionnées

Les fichiers locaux portent **le timestamp réellement enregistré** dans `schema_migrations`
(piège CLAUDE.md n°6). Réconciliation vérifiée avant et après : **193 fichiers locaux = 193 versions
en prod, zéro divergence** — la dérive 159/158 que décrit encore CLAUDE.md est résorbée.

| Version | Fichier | Contenu |
|---|---|---|
| `20260905233054` | `neutralize_ghost_news_sources` | H-1 (voir §3) |
| `20260905233150` | `digest_thematique_corpus_scope_thematic` | `corpus_scope_kind += 'thematic'`, **migration isolée** (PostgreSQL interdit d'utiliser une valeur d'enum dans la transaction qui l'ajoute) |
| `20260905233218` | `digest_thematique_veille_digests_topic` | 4 colonnes, clé d'unicité à 3 colonnes, 3 index, vue `v_corpus_news_sources` |
| `20260905233343` | `digest_thematique_ingest_source_corpus_scope_kind` | RPC élargie : `p_scope_kind` avec `DEFAULT 'sector'` |
| `20260905233404` | `harden_ingest_source_corpus_revoke_anon` | correctif de la précédente — cf. **P-11** |

**Écart assumé — `generation_mode` est NULLABLE**, contre le texte initial de l'ADR. Provenance
non reconstituable sur les 10 digests antérieurs (1 corrélation avec `ai_intelligence_runs` sur 10) :
`NULL` = inconnu, plutôt qu'un `'scheduled'` inventé. ADR-0022 §3.2 corrigé en conséquence.

**RPC élargie, sans rupture** : `DROP` puis `CREATE` avec un 4ᵉ paramètre défaulté — et non
`CREATE OR REPLACE`, qui aurait créé une surcharge et rendu l'appel à 3 arguments ambigu (42725).
`ingestSourceCorpusAction` continue de fonctionner **sans modification**. `p_scope_kind='thematic'`
⇒ segment interdit, `sector_id = NULL`, `enabled_for_news = false` ; `'system'` ⇒ refus.

Contrôle live après migrations : `v_corpus_news_sources` rend **10 sources** (le socle, tous flux
RSS) ; le corpus Parfumerie en est absent, comme attendu — il est en `draft`.

### 4.2 Modules TypeScript livrés

| Fichier | Rôle |
|---|---|
| `src/features/veille/digest/domain/digest-presets.ts` | `DIGEST_PRESETS` (`global`, `ia`, `llm`) + `buildSectorDigestPreset()` pour les sujets sectoriels, dérivés du slug de segment |
| `src/features/veille/digest/domain/assemble-digest-framing.ts` | assemblage du cadrage — pur |
| `src/features/veille/digest/domain/digest-launch-contracts.ts` | `DigestLaunchInputV2` + `parseDigestLaunchInput()` — validation de **forme** uniquement |
| `src/features/veille/digest/data/resolve-digest-launch.ts` | `server-only` — résout sujet, corpus, sources et cadrage ; **refuse un corpus vide** |
| `src/features/veille/digest/data/get-digest-launch-options.ts` | `server-only` — sujets et corpus sélectionnables, avec le compte de sources par corpus |

**Le test qui compte : l'identité byte-à-byte.** `assemble-digest-framing.test.ts` lit
`n8n/workflows/veille-hebdomadaire-kredo.json`, extrait le littéral `blocContexteKredo` du nœud
« Build Contexte KREDO » et le compare à la sortie du preset `global`. La comparaison n'est donc
pas faite contre une copie manuelle qui dériverait : **si quelqu'un modifie le nœud n8n sans
mettre à jour le registre TypeScript, le test tombe.** C'est la garantie que le passage au payload
v2 ne changera pas le digest hebdomadaire existant.

27 tests sur les trois fichiers de `src/features/veille/digest/__tests__/`.

### 4.3 Ce que le Lot 0 ne fait PAS

Rien n'est branché : aucune route, aucun composant, aucun nœud n8n ne consomme encore ces modules.
Le comportement de l'application est **strictement inchangé** — à une exception près, voulue et
mesurée : les 4 sources fantômes ne sont plus collectées (H-1).


## 5. Lot 1 — Corpus Folio — ✅ CODE FAIT le 2026-09-06 · ⏳ IMPORT À FAIRE

Boucle de validation passée en entier : `typecheck` ✅ · `test` **2279/2279 sur 234 fichiers** ✅ ·
`check:server-boundary` ✅ · `lint` ✅ · `build` ✅.

### 5.1 Le geste qui reste — 2 minutes, par Guillaume

**Je ne peux pas importer les corpus moi-même** : `ingest_source_corpus` appelle
`private.require_authenticated_user()` puis `is_workspace_admin()`. Une connexion service-role n'a
pas d'`auth.uid()`. L'import se fait donc par le wizard, connecté :

> Veille → Gestion des sources → Importer un corpus → déposer
> `docs/FEATURES/veille_digest_thematique/corpora/folio-ai-tech.sources.json`, puis
> `folio-ai-business.sources.json` → Analyser → Arbitrer → Confirmer.
> Le corpus est créé en **brouillon** ; l'activer ensuite depuis sa fiche.

**Le chemin d'écriture est déjà prouvé.** Un payload thématique représentatif (3 sources, dont une
source socle réutilisée et une source écartée) a été passé à la RPC **sous l'identité d'un
utilisateur authentifié, en transaction `ROLLBACK`** : `3 sources_upserted, 3 items_upserted`,
puis annulation vérifiée (2 corpora, 42 sources, 0 thématique en base). Sont donc validés en
conditions réelles : le segment vide accepté pour un corpus thématique, les `tier`/`utility_score`
à `NULL`, le tableau `usage_scopes` vide, et la réutilisation d'une clé de source existante.

### 5.2 Contenu des deux corpus, corrigé par la sonde

| Corpus | Sources | Éligibles | Écartées |
|---|---:|---:|---:|
| `folio-ai-tech` | 11 | **8** | 3 |
| `folio-ai-business` | 14 | **4** | 10 |

Trois URL ont été corrigées par rapport au référentiel Folio d'origine, sinon le corpus arrivait
mort : Microsoft (`/ai/feed/` répond `410` → `blogs.microsoft.com/feed/`, ⚠️ périmètre élargi à tout
Microsoft), NVIDIA (`tag/artificial-intelligence` répond 200 avec **0 item** →
`category/generative-ai/feed/`), DeepMind (`discover/blog/rss.xml` → `blog/rss.xml`).

Lex Fridman est **écarté volontairement** malgré un flux vivant : 502 items pour 2 Mo par requête,
format podcast, faible densité d'angle commercial. Décision réversible dans le fichier.

Toute source écartée porte un `exclusionReason` daté — le parseur **refuse** une exclusion sans
motif, et refuse aussi un motif sur une source active. Une source non éligible ne peut pas être
réactivée depuis le wizard : cela se fait dans le JSON, donc en revue de code.

Après import, `folio-ai-tech` apporte **7 sources nouvelles** et `folio-ai-business` **3** : OpenAI
et One Useful Thing sont déjà au socle et seront réutilisées, pas dupliquées (dédoublonnage par
hostname, `www.` retiré).

### 5.3 Ce qui a été écrit

| Fichier | Rôle |
|---|---|
| `domain/thematic-source-list.ts` | parseur `thematic-source-list-v1`, preview et payload — pur |
| `domain/corpus-import-view.ts` | vue normalisée : les deux formats se projettent sur le même modèle d'écran |
| `data/resolve-source-corpus-import.ts` | `resolveThematicSourceListImport()` ajouté ; l'index hostname est désormais partagé par les deux chemins |
| `actions/ingest-source-corpus.ts` | 4ᵉ paramètre `scopeKind` (défaut `"sector"`), validations conditionnelles, `p_scope_kind` transmis |
| `components/SourceCorpusImportWizard.tsx` | aiguillage par la clé `format`, présentation pilotée par la vue normalisée |
| `corpora/folio-ai-*.sources.json` | les deux corpus |

**Le point de convergence est le résolveur et la RPC, jamais le parseur** (ADR-0022 §3.9). Les deux
contrats d'entrée restent étanches : aucun champ E3 n'est fabriqué pour un corpus thématique —
`tier`, `primary_role` et `utility_score` partent à `NULL`, et les colonnes SQL sont nullables.

⚠️ **Deux types partagés ont été élargis** : `SourceCorpusItemPreview.mappedKredoCategory` et
`IngestSourceCorpusSourceItem.kredo_category` passent de `"vertical"` à `KredoSourceCategory`, et
quatre champs du payload deviennent nullables. Le chemin E3 est inchangé : l'action exige toujours
`kredo_category === 'vertical'` et les quatre champs de preuve **quand `scopeKind === 'sector'`**.

### 5.4 Corpus de presse sectorielle — non fait, volontairement

Rien n'a été saisi pour l'Électronique ni le Tourisme. Ce sont 3 sources par secteur à créer via
`ManualSourceForm` (sans `collection_url`, collecte `site:`), et cela n'a d'intérêt qu'une fois le
Lot 2 en place — sans quoi aucun digest ne peut les cibler. Domaines validés par la sonde :
`lembarque.com`, `vipress.net`, `usinenouvelle.com` · `tourmag.com`, `seto.to`, `adn-tourisme.fr`.


## 6. Lot 2 — Lancement serveur + n8n (≈ 1 journée, **un seul réimport VPS**)

### 6.1 `src/app/api/n8n/trigger/route.ts`

Nouvelle branche, calquée ligne pour ligne sur le bloc « 3quater » (INTEL-021 V2, `route.ts:257`) :

```
if (workflowId === "veille-ia-marche-on-demand" && input.schemaVersion === 2) {
  parseDigestLaunchInput → resolveDigestSources → assembleDigestFraming
  → triggerN8nRun({ input: envelope, inputSnapshot: trace })
}
```

`inputSnapshot` porte le sujet, le corpus et **la liste des sources retenues** : c'est la trace qui
permettra plus tard de dire pourquoi un digest était pauvre.

### 6.2 Workflow `veille-hebdomadaire-kredo` — 5 nœuds touchés

| Nœud | Modification |
|---|---|
| `Valider Signature & Payload` | accepter `schemaVersion` **1 ou 2** (P-9) ; propager `topicKey`, `corpusId`, `sources`, `framing` |
| `Résoudre Contexte Déclenchement` | ajouter `topicKey` (défaut `'global'`), `generationMode` |
| `Vérifier et Normaliser Sources` | v2 → lire les sources du payload ; v1 et cron → `v_effective_watch_sources` inchangé. **Conserver le throw sur 0 source.** |
| `Build Contexte KREDO` | `framing.block ?? blocContexteKredo` |
| `Récupérer Hash Articles Vus` | **filtrer sur le `topic_key` du run** (ADR-0022 §3.7) — jointure `veille_digests`, sinon le 2ᵉ sujet revient vide |
| `Créer Digest` | `on_conflict=workspace_id,digest_date,topic_key` + écriture des 4 colonnes |

Plus le correctif H-2 (métriques), groupé dans le même réimport.

**Ordre de déploiement impératif : workflow réimporté d'abord, front ensuite.**

### 6.3 Vérification

`npm run test:n8n` — les harnais ne sont **pas** couverts par `npm test`. Lire le **compteur final
d'assertions**, jamais le seul code de sortie (piège documenté : `intel-020` et `intel-040` ont vécu
avec 117 assertions muettes).

---

## 7. Lot 3 — UI et lecture (≈ 1 journée)

**Desktop** — `VeilleHeaderActions` : la modale existante, deux `select` groupés (Thématiques /
Segments), le compte de sources venant de `getDigestLaunchOptions()` et **non plus de
`latestDigest.nb_sources_actives`**, qui est le compte du run précédent. Un corpus `draft` est
visible mais non sélectionnable. Groupe « Segments » masqué tant qu'aucun corpus de presse
sectorielle n'est actif (ADR-0022 §3.8).

**Mobile** — `DigestLaunchSheetMobile`, même contrat, présentation distincte (ADR-0006) ; déplacer
l'appel de `VeilleActualitesMobile:124` vers le contrat partagé. Cibles tactiles ≥ 44 px.

**Lecture**
- `getLatestVeilleDigest()` : `order('digest_date', desc).order('created_at', desc)` (DEF-4).
- `/veille` : filtre par sujet (chips), badge sujet sur les archives, flux mobile transverse conscient du sujet.
- `veillePeriodProvider` + `parseCorpusSelector('veille_period')` : `topicKeys?: string[]`, défaut
  `['global']`, sinon la mission `veille-analyse-mensuelle` avale les digests thématiques.

---

## 8. Boucle de validation

`typecheck` → `test` → **`test:n8n`** (dès que `n8n/workflows/` est touché) → `check:server-boundary`
→ `lint` (fichiers touchés) → `build`.

Rappels : `tsc` ne voit pas une valeur importée d'un module `server-only` par un composant client —
seul `build` le révèle. Purger `.next/` avant de conclure à une régression `TS6200`/`TS2300`.

---

## 9. Ce qui est hors périmètre, assumé

Multi-corpus et pondération · constructeur de corpus dans l'UI · parseur Markdown générique ·
table `digest_topics` · adaptateur legacy V1 · digest sectoriel sur corpus E3 ·
correction du `ceid` figé en `FR:fr` (à rouvrir si des sources anglophones sans flux deviennent nécessaires).

---

## 10. Point de reprise

Si la session s'interrompt : l'état d'avancement se lit dans `git log` et dans
`supabase/migrations/`. Aucun état n'est stocké ailleurs que dans le code et la base.
Le premier geste d'une reprise est de rejouer les mesures du §1 — elles dérivent.

---

## 11. Clôture & Bilan de Livraison (2026-09-06)

Le chantier ADR-0022 est entièrement **livré, consolidé et validé en production**.

### 11.1 État d'avancement final des lots

- **H-1 & Lot 0 (Contrat et Schéma Supabase)** : ✅ Livré. 5 migrations appliquées, 4 sources fantômes neutralisées, clé d'unicité `UNIQUE(workspace_id, digest_date, topic_key)`, 4 colonnes sur `veille_digests`, vue `v_corpus_news_sources`, RPC `ingest_source_corpus` durcie, registre de presets `DIGEST_PRESETS`.
- **Lot 1 (Parseur thématique & Corpus Folio)** : ✅ Livré. Parseur `thematic-source-list-v1`, vue d'import normalisée, Wizard d'import branché, corpus Folio AI Tech et AI Business versionnés.
- **Lot 2A & 2B (Gateway Next.js V2 & Workflow n8n)** : ✅ Livré. Branche V2 dans `/api/n8n/trigger`, `resolveDigestLaunch`, workflow `KREDO — Veille IA & Marché` (`veille-ia-marche-on-demand`) supportant V1 et V2, déduplication 21 jours scopée par `topic_key`, upsert 3 colonnes, correction DEF-1 / H-2 des métriques de collecte (post-boucle).
- **Lot 3 (UI Desktop & Mobile, Lecture thématique)** : ✅ Livré. `VeilleHeaderActions` Desktop, `DigestLaunchSheetMobile` Mobile, lecture filtrée par chips sur `/veille`, badges sur les archives, tri déterministe, isolation du provider `veillePeriodProvider`.
- **Consolidation runtime post-smoke test** : ✅ Livré (`9a00995a3b0ab17823eb4aef25bb29599b588f48`). Sonnet `max_tokens = 12000`, `timeout = 180000`, parser durci sans remplacement destructif des quotes avec refus de `stop_reason === "max_tokens"`, sérialisation `jsonBody` `={{ { ... } }}` dans `Créer Digest`.

### 11.2 Smoke tests de production validés

1. **Run 83554 (`ia` × `folio-ai-tech`)** : `succeeded` — Digest *« IA en entreprise : de l'infrastructure au terrain, la preuve par l'usage »*, 8 candidats évalués, 8 sources actives, qualité éditoriale validée.
2. **Run 83555 (`llm` × `folio-ai-tech`)** : `succeeded` — Digest *« LLM & agents : de la démo au déploiement multicanal »*, 8 candidats évalués, 8 sources actives, 5 articles retenus, 4 URLs communes partagées sans collision de déduplication.

### 11.3 Statut final
Chantier clos au 2026-09-06.
