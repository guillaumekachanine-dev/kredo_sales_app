# Digest thématique — handoff autoportant

- **Date** : 2026-09-06
- **Autorité** : `docs/adr/ADR-0022-digest-thematique-sujet-corpus.md` (Proposé)
- **État au 2026-09-06** : **préalable d'hygiène H-1 fait · Lot 0 fait** (5 migrations appliquées,
  5 modules TypeScript, 27 tests). **Reprendre au Lot 1.** Rien n'est commité.
- **Lire d'abord** : le §2 (« ce qu'il ne faut pas refaire ») avant toute ligne de code.

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


## 5. Lot 1 — Les deux corpus Folio (≈ ½ journée)

### 5.1 Format d'entrée

```json
{
  "format": "thematic-source-list-v1",
  "name": "Folio AI Tech",
  "slug": "folio-ai-tech",
  "snapshot_date": "2026-09-06",
  "sources": [
    { "name": "OpenAI — News", "rssUrl": "https://openai.com/news/rss.xml",
      "homepage": "https://openai.com/news/", "newsEligible": true },
    { "name": "Anthropic — News", "rssUrl": null, "homepage": "https://www.anthropic.com/news",
      "newsEligible": false, "exclusionReason": "feed-404 (sonde 2026-09-06)" }
  ]
}
```

Parseur `src/features/source-management/domain/thematic-source-list.ts` (~40 lignes), puis
**`resolveSourceCorpusImport` inchangé** (dédoublonnage par hostname déjà écrit) puis la RPC du §4.2.

### 5.2 Contenu à importer, corrigé par la sonde

**`folio-ai-tech`** — 8 `newsEligible`, 3 désactivées :

| Source | URL retenue | `newsEligible` |
|---|---|---|
| OpenAI — News | `https://openai.com/news/rss.xml` | ✅ (déjà au socle → l'item pointera la ligne existante) |
| Google — AI | `https://blog.google/technology/ai/rss/` | ✅ |
| AWS — ML Blog | `https://aws.amazon.com/blogs/machine-learning/feed/` | ✅ |
| Hugging Face | `https://huggingface.co/blog/feed.xml` | ✅ |
| MIT News — AI | `https://news.mit.edu/rss/topic/artificial-intelligence2` | ✅ |
| Microsoft | **`https://blogs.microsoft.com/feed/`** (l'URL Folio répond `410`) | ✅ ⚠️ périmètre élargi à tout Microsoft |
| NVIDIA | **`.../blog/category/generative-ai/feed/`** (le flux `tag/artificial-intelligence` rend 0 item) | ✅ |
| Google DeepMind | **`https://deepmind.google/blog/rss.xml`** | ✅ |
| Anthropic · IBM Think · Meta AI | — | ❌ `exclusionReason` renseigné |

**`folio-ai-business`** — 5 `newsEligible`, 6 désactivées :

| Source | URL | `newsEligible` |
|---|---|---|
| Sequoia Capital | `https://www.sequoiacap.com/feed` (redirige en `308`, suivi OK) | ✅ |
| WIRED — AI | `https://www.wired.com/feed/tag/ai/latest/rss` | ✅ |
| One Useful Thing | `https://www.oneusefulthing.org/feed` | ✅ (déjà au socle) |
| Finxter | `https://blog.finxter.com/feed/` | ✅ |
| Lex Fridman | `https://lexfridman.com/feed/podcast/` | ⚠️ 502 items / 2 Mo — **arbitrer** : pertinence commerciale faible, coût de parsing élevé |
| a16z · Superhuman · The Batch · Ben's Bites · Not A Bot · The Neuron | — | ❌ |
| MIT Tech Review · The Information · FT | — | ❌ (`unsupported-html`, `auth-required`) |

Import en `draft` → contrôle dans `SourceCorpusDetailView` → activation avec **`enabled_for_news = false`**.

### 5.3 Corpus de presse sectorielle (facultatif, même lot)

Trois sources par secteur suffisent, saisies via `ManualSourceForm` sans `collection_url`
(collecte `site:` — validée par la sonde sur ces domaines francophones) :

- **Électronique** : `lembarque.com` (J-1), `vipress.net` (J-1), `usinenouvelle.com` (J-0).
- **Voyage & Séjours** : `tourmag.com` (J-1), `seto.to` (J-5), `adn-tourisme.fr` (J-12).
- À écarter : `echotouristique.com` (0 item indexé), `filiere-electronique.fr` (J-136).

---

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
