# ADR-0022 — Digest thématique : le Sujet et le Corpus sont deux axes indépendants

- **Statut** : **Accepté** (Guillaume Kasanin, 2026-09-06 — Lot 0 implémenté dans la foulée)
- **Version** : 1.1 — §3.2 corrigé à l'implémentation (`generation_mode` nullable)
- **Date** : 2026-09-06
- **Décideur** : Guillaume Kasanin
- **Portée** : Veille & digest · Gestion des sources · Workflow `veille-hebdomadaire-kredo` · Missions d'intelligence (effet de bord)
- **S'appuie sur** : ADR-0020 (missions d'intelligence — doctrine « le métier en TypeScript, n8n en exécuteur »), ADR-0006 (adaptive)
- **Ne remplace pas** : ADR-0020. Un digest **n'est pas** une mission (§3.3).

> ### Décision
>
> Un digest est le produit de **deux axes orthogonaux** :
> le **Sujet** (« qu'est-ce que je retiens ? ») et le **Corpus** (« où est-ce que je cherche ? »).
>
> Le Sujet est un **preset serveur versionné en TypeScript**. Le Corpus est une **ligne
> `source_corpora`**. Le navigateur ne choisit que deux identifiants ; le serveur résout les
> sources, assemble le cadrage, et refuse un corpus vide.
>
> **n8n ne gagne aucun métier dans ce chantier.**

---

## 1. Contexte

### 1.1 Ce qui existe et fonctionne

| Brique | État vérifié live le 2026-09-06 |
|---|---|
| `source_catalog` | 42 lignes — 14 `system`, 1 `manual`, 27 `corpus` |
| `source_corpora` | 2 — `socle-sources-editoriales` (`system`, active) et `sources-seg-parfumerie-compositions-b2b` (`sector`, **draft**) |
| `source_corpus_items` | 42 |
| `v_effective_watch_sources` | Union de 3 branches (socle news, corpus news, account_watch), dédoublonnée par `DISTINCT ON … ORDER BY priority` |
| Wizard d'import E3 | `SourceCorpusImportWizard` + `parseSourceRegistryOutput` + `resolveSourceCorpusImport` + RPC `ingest_source_corpus` |
| Workflow digest | `veille-hebdomadaire-kredo`, **deux déclencheurs** (cron lundi 6 h + webhook `veille-ia-marche-on-demand`) convergeant sur un pipeline unique |
| UI de lancement | `VeilleHeaderActions` (Desktop) et `VeilleActualitesMobile:124` (Mobile), toutes deux sur `POST /api/n8n/trigger` avec `{ schemaVersion: 1, triggerMode: "manual" }` |

La conclusion opérationnelle est que **le socle de gestion des sources n'est pas à construire**.
Le chantier porte sur le lancement, pas sur les données de référence.

### 1.2 Quatre défauts constatés en instruisant cet ADR

Aucun n'est causé par le chantier ; tous le contraignent.

**DEF-1 — Les métriques de collecte sont fausses.**
`Préparer Métriques Sources` agrège `items_collected` depuis `$('Enrichir avec Métadonnées Source').all()`.
Ce nœud est **à l'intérieur de la boucle `splitInBatches`** : `.all()` n'y rend que les items de la
**dernière itération**. Mesure : sur les 4 derniers runs, 15 lignes écrites par run, `sum(items_collected) = 1`
par run — alors que le digest du 28/08 a évalué 8 candidats et retenu 4 articles.
`v_source_effectiveness_30d`, lue par `get-source-management-snapshot.ts:72`, **affiche donc une
efficacité de source nulle et fausse pour toutes les sources**. Choisir un corpus « en connaissance de
cause » est aujourd'hui impossible.

**DEF-2 — Quatre sources fantômes au socle.**
`a16z`, `Anthropic News`, `The Batch`, `The Neuron` sont actives, sans `collection_url`, donc collectées
en `site:` via Google News **France**. Sonde du 2026-09-06 : 0 item pour a16z / The Neuron, 3 items
vieux de 53 jours pour Anthropic, 1 item de 2024 pour The Batch. Elles gonflent `nb_sources_actives`
sans jamais contribuer un article.

**DEF-3 — Un mécanisme de cadrage écrit et jamais lu.**
`workspaces.settings.veille` porte `interestTopics[]`, `intention`, `exclusions`, `depth`, `maxArticles`,
`sourceFamilyOverrides`, écrits par `GlobalWatchSettingsDialog` + `saveGlobalWatchSettingsAction`.
Le workflow **n'interroge jamais la table `workspaces`** — ses 13 appels REST portent sur
`sector_intelligence`, `v_effective_watch_sources`, `companies`, `account_issues`, `account_facts`,
`opportunities`, `v_active_account_signals`, `v_sector_knowledge_resolved`, `veille_articles`,
`veille_digests`, `source_collection_metrics`, `ai_intelligence_runs`, `rpc`.
Le commentaire de `VeilleHeaderActions.tsx:123` — « le workflow résout le cadrage métier côté serveur
depuis `workspaces.settings` » — est **faux**.

**DEF-4 — `getLatestVeilleDigest()` trie sur `digest_date` seul**, sans départage. Indéterminisme dès
deux digests le même jour.

### 1.3 Trois contraintes dures découvertes

**C-1 — La déduplication est globale et aveugle au sujet.**
`Récupérer Hash Articles Vus` lit **tous** les `veille_articles.url_hash` des **21 derniers jours**, sans
filtre. `Dédup + Filtre Récence` applique en plus une fenêtre de publication de **7 jours** et un plafond
de 40 candidats après tourniquet par source.
Conséquence directe : **un second digest, sur un autre sujet, dans la même fenêtre de 21 jours, ne
peut pas revoir un article déjà consommé.** C'est ce qui explique la courbe observée sur les
relances rapprochées de mi-août — 40 → 7 → 4 → 3 → 1 candidat — et les deux exécutions du 02/09
qui n'ont produit aucun digest. **Ce n'est pas une panne : c'est le comportement nominal.**

**C-2 — Un second digest le même jour détruit le premier.**
`veille_digests` porte `UNIQUE (workspace_id, digest_date)`, et `Créer Digest` upserte avec
`on_conflict=workspace_id,digest_date` + `Prefer: resolution=merge-duplicates`, suivi de
`replace_veille_digest_articles()` qui passe les articles précédents en `superseded_at`.

**C-3 — Les corpus E3 ne sont pas des corpus de presse.**
Le seul corpus sectoriel existant (Parfumerie, 28 items) compte **2 items `news_eligible`**
(`eur-lex.europa.eu`, `ted.europa.eu`), **0 flux RSS** et 8 sources `static` interdites de veille par
règle dure. Ce sont des corpus de **preuve OSINT compte** — Pappers, INPI, BOAMP, EFSA, ECHA, Insee.

---

## 2. Ce que la sonde d'ingérabilité établit (2026-09-06)

Protocole : `GET` du flux avec suivi de redirection, parsing XML, comptage d'items, date du plus récent.

### 2.1 Corpus Folio

| Corpus | Déclaré actif | Exploitable tel quel | Récupérable en corrigeant l'URL | Mort |
|---|---:|---:|---:|---:|
| Folio AI **Tech** | 11 | **5** | **3** | 3 |
| Folio AI **Business** | 11 | **5** | 0 | 6 |

- **Exploitables tel quel (Tech)** : OpenAI (J-2), Google AI (J-3), AWS ML (J-1), Hugging Face (J-2), MIT News AI (J-3).
- **URL à corriger (Tech)** : Microsoft AI `410 Gone` → `blogs.microsoft.com/feed/` (⚠️ périmètre élargi à tout Microsoft) · NVIDIA tag AI répond 200 avec **0 item** → `developer.nvidia.com/blog/category/generative-ai/feed/` (100 items) · DeepMind → `deepmind.google/blog/rss.xml` (100 items).
- **Morts (Tech)** : Anthropic `404` (y compris `/rss.xml`), IBM Think (redirige vers du HTML), Meta AI `400`.
- **Exploitables (Business)** : Sequoia (via `308`, 50 items), WIRED AI (J-0), One Useful Thing (J-5), Finxter (J-10), Lex Fridman (502 items, **2 Mo**).
- **Morts (Business)** : a16z `404`, Superhuman `404`, The Batch `404`, Ben's Bites `404`, Not A Bot (DNS), The Neuron (redirige vers une 404 HTML).

### 2.2 Le repli `site:` ne rattrape pas les sources anglophones

Testé sur les 10 flux Folio tombés, en `hl=fr&gl=FR&ceid=FR:fr` (ce que code en dur
`Construire Requête Collecte`) : **6 sur 10 rendent 0 item**, les 4 autres rendent 1 à 7 items vieux de
53 à 810 jours. Testé en `hl=en&gl=US` : 1 item.

👉 **Un flux RSS mort est une source morte.** Le repli `site_search` ne vaut que pour la presse
francophone. C'est la cause de DEF-2.

### 2.3 La presse professionnelle sectorielle, elle, fonctionne

| Domaine | Items | Dernier |
|---|---:|---|
| `usinenouvelle.com` | 100 | J-0 |
| `lembarque.com` | 100 | J-1 |
| `vipress.net` | 100 | J-1 |
| `tourmag.com` | 100 | J-1 |
| `seto.to` | 51 | J-5 |
| `adn-tourisme.fr` | 100 | J-12 |
| `fieec.fr` | 77 | J-11 |
| `filiere-electronique.fr` | 28 | **J-136** |
| `echotouristique.com` | **0** | — |

### 2.4 Santé du socle actuel

6 flux vivants et frais (ActuIA, ChannelNews, Journal du Net, L'Usine Digitale, LeMagIT, Finextra),
VentureBeat en `429` au moment de la sonde, Premium Beauty News sans `pubDate` standard, plus les
4 fantômes de DEF-2.

**Gain net réel du chantier Folio : +11 sources vivantes** (7 Tech, 4 Business), soit un socle qui
passe de ~10 flux réellement productifs à ~21.

---

## 3. Décision

### 3.1 Le Sujet est un preset serveur, pas une donnée

```ts
// src/features/veille/domain/digest-presets.ts
export const DIGEST_PRESETS = {
  global: { label: "Veille IA & Marché", framing: /* le blocContexteKredo actuel, extrait de n8n */ },
  ia:     { label: "Intelligence artificielle", … },
  llm:    { label: "LLM & modèles", … },
} as const
```

Un sujet porte : `label`, `intent`, `focus`, `exclusions`, `defaultCorpusSlug`, `version`.
Les sujets sectoriels sont **dérivés dynamiquement** de `sector_intelligence WHERE level='segment'` :
un nouveau segment devient sélectionnable sans migration.

Pas de table `digest_topics`. Pas d'enum SQL — `topic_key` reste du `text` (le coût d'un `ALTER TYPE`
et la cascade de `Record<enum, …>` documentée pour `intelligence_document_type` ne se justifient pas ici).

### 3.2 `topic_key` porte le slug, et entre dans la clé d'unicité

> **Appliqué le 2026-09-06.** Le SQL fait foi dans
> `supabase/migrations/20260905233218_digest_thematique_veille_digests_topic.sql`, jamais dans ce
> document — un extrait recopié ici dériverait.

```sql
ALTER TABLE veille_digests
  ADD COLUMN topic_key       text NOT NULL DEFAULT 'global',
  ADD COLUMN topic_sector_id uuid NULL REFERENCES sector_intelligence(id),
  ADD COLUMN source_corpus_id uuid NULL REFERENCES source_corpora(id),
  ADD COLUMN generation_mode text NULL;   -- voir l'écart ci-dessous

ALTER TABLE veille_digests DROP CONSTRAINT veille_digests_workspace_id_digest_date_key;
ALTER TABLE veille_digests ADD CONSTRAINT veille_digests_ws_date_topic_key
  UNIQUE (workspace_id, digest_date, topic_key);
```

**Écart assumé à l'implémentation — `generation_mode` est NULLABLE**, et non
`NOT NULL DEFAULT 'scheduled'` comme le disait la première rédaction. Les 10 digests antérieurs
n'ont pas de provenance reconstituable : **une seule corrélation avec `ai_intelligence_runs` sur
10**, et plusieurs digests hors du créneau cron sans run tracé. `NULL` dit « inconnu » ; backfiller
à `'scheduled'` aurait inventé un fait sur au moins cinq lignes. Le workflow renseigne la colonne
systématiquement à partir du Lot 2.

`topic_key` vaut `'global'`, une clé du registre (`'ia'`, `'llm'`), **ou le slug du segment**
(`'seg-parfumerie-compositions-b2b'`) — jamais la valeur littérale `'segment'`, qui ferait entrer en
collision deux segments différents le même jour.

**Pourquoi pas un index unique partiel `WHERE generation_mode='scheduled''`** : PostgREST ne sait pas
émettre la clause `WHERE` qu'exige l'inférence d'index partiel dans `ON CONFLICT`. L'upsert du
workflow cesserait de fonctionner. La clé à trois colonnes préserve l'idempotence du cron
(`topic_key='global'`) **et** donne une sémantique lisible : un digest par sujet et par jour, une
relance du même sujet le même jour remplace le précédent.

### 3.3 Un digest n'est pas une mission d'intelligence

Le moteur ADR-0020 raisonne sur un **corpus interne déjà collecté** (`veille_period`, `delivery_period`,
`account_context`…). Aucun de ses 9 providers ne va chercher une ressource externe. Un digest **collecte**.
Le moteur de missions est donc le mauvais hôte — mais **sa doctrine est le bon patron**, et c'est elle
qu'on applique : preset serveur, sélecteurs validés, refus explicite d'un corpus vide, trace en
`input_snapshot`.

### 3.4 La résolution des sources est serveur ; le payload v2 transporte le résultat

```
POST /api/n8n/trigger  { workflowId: "veille-ia-marche-on-demand",
                         input: { schemaVersion: 2, triggerMode: "manual",
                                  topicKey, corpusId } }
        ↓  le navigateur n'envoie ni URL, ni prompt, ni liste de sources
resolveDigestSources()      ← miroir de resolveWatchAnalysisSources() (INTEL-021 V2)
assembleDigestFraming()     ← miroir de assembleMissionPrompt() (ADR-0020)
   refus si : topicKey hors registre · corpus inconnu / non `is_current` / non `active`
             · 0 source résolue (jamais d'appel LLM sans matière)
```

**Bénéfice décisif** : ajuster le cadrage d'un sujet devient un commit TypeScript, **pas un réimport
VPS manuel**. Le repo compte déjà 12 workflows patchés non réimportés ; ce chantier n'en ajoutera
qu'un seul, et une seule fois.

### 3.5 Le mode corpus lit une vue dédiée, jamais `v_effective_watch_sources` filtrée

`v_effective_watch_sources` déduplique par `DISTINCT ON (usage_scope, company_id, source_id)
ORDER BY priority` : une source `origin='system'` gagne toujours, avec `corpus_id = NULL`. Filtrer
cette vue sur `corpus_id = X` **éliminerait précisément les sources partagées avec le socle** — OpenAI,
One Useful Thing.

Le mode corpus lit donc une vue dédiée `v_corpus_news_sources`, qui réapplique **en SQL, une seule
fois**, les garde-fous : `activation_state='active'`, `is_current`, `enabled_for_news` ignoré (§3.6),
`sci.is_enabled`, `sci.news_eligible`, `sc.content_temporality <> 'static'`, `sc.is_active`,
`validation_status NOT IN ('rejected','unreachable')`. Jamais recopiés dans un nœud Code n8n.

### 3.6 Un corpus thématique s'importe avec `enabled_for_news = false`

La branche 2 de l'union de `v_effective_watch_sources` fait entrer **tout** corpus `active` +
`enabled_for_news` dans le digest du **cron**. Activer Folio AI Tech sans précaution ferait passer le
digest hebdomadaire de 14 à ~25 sources **sans que personne ne l'ait décidé**.
Le mode corpus lisant `v_corpus_news_sources`, ce drapeau ne lui est pas nécessaire.

### 3.7 La déduplication devient scopée par sujet

`Récupérer Hash Articles Vus` filtre désormais sur les digests **du même `topic_key`** :

```
veille_articles → join veille_digests → where digest.topic_key = <sujet du run>
                                    and veille_articles.created_at >= now() - 21 days
```

Sans cela, C-1 rend la fonctionnalité **inutilisable** : le second sujet lancé dans la fenêtre de
21 jours reviendrait vide. Le prix assumé : un même article peut apparaître dans deux digests de
sujets différents. C'est le comportement attendu — ce sont deux lectures différentes du même fait.

### 3.8 Pas de digest sectoriel sur un corpus E3

Un corpus de digest sectoriel est un objet **distinct** : 3 à 6 sources **éditoriales**
(`scope_kind='sector'`, presse professionnelle), pas les 28 registres OSINT d'une Master Study.
Tant qu'aucun corpus de ce type n'est actif, **le groupe « Segments » du sélecteur de sujet reste
masqué**. On ne livre pas une promesse que la matière ne sert pas — c'est la leçon du chantier B
du MASTER-STUDY, annulé pour matière fabriquée.

### 3.9 Convergence des formats au resolver, jamais au parseur

`parseSourceRegistryOutput` impose `meta.segment_slug`, `meta.version === "1.1"`, ≥ 8 sources,
`src_id` en `SRC-\d{3}`, packs disjoints **et** couvrant exactement l'ensemble des sources, et des
`familles_sectorielles_obligatoires` (presse + fédération + régulateur) qui doivent résoudre. Une
liste de 11 flux RSS n'y passe qu'en **fabriquant** un segment, un régulateur et une partition de
packs.

Le point de convergence est donc plus bas : un mini-parseur `thematic-source-list-v1` (~40 lignes)
qui rejoint `resolveSourceCorpusImport` (dédoublonnage par hostname, déjà écrit) puis la RPC
d'écriture élargie.

**Pas d'adaptateur « legacy V1 ».** Les deux référentiels Markdown candidats ont des exports JSON
tronqués : Électronique déclare 15 sources au tableau et n'en exporte que **7**, avec un
`extended_pack` de 8 identifiants qui ne résolvent vers rien ; Tourisme déclare 13 et en exporte **5**,
sous le plancher de 8. Un adaptateur importerait la moitié du corpus et échouerait quand même aux
invariants. Les 3 à 5 sources de presse utiles se saisissent via `ManualSourceForm`, qui existe.

### 3.10 `settings.veille` est absorbé, pas doublé

- `interestTopics[]` → **supprimé**, remplacé par le Sujet.
- `sourceFamilyOverrides` → **supprimé**, remplacé par le Corpus.
- `intention`, `exclusions`, `maxArticles` → conservés comme **surcharge du preset `global`**, lus
  côté serveur au lancement. Ils deviennent enfin effectifs (corrige DEF-3).

---

## 4. Options écartées

### Option B — `topic_key` + prompt de cadrage côté n8n

| Dimension | Évaluation |
|---|---|
| Complexité immédiate | Faible |
| Coût par itération | **Élevé** — un réimport VPS manuel par ajustement de cadrage |
| Conformité | **Contredit ADR-0020**, accepté et livré (L0→L6) |
| Testabilité | Nulle en `npm test` ; les harnais n8n sont hors périmètre de `vitest` |

Écartée : c'est le retour du métier dans l'exécuteur, exactement ce qu'ADR-0020 a démonté.

### Option C — Le digest devient une mission d'intelligence

Écartée : aucun provider de corpus ne collecte de ressource externe (§3.3). Il faudrait inventer un
provider « collecteur », c'est-à-dire déplacer la collecte web dans un moteur conçu pour raisonner
sur de l'interne.

### Option D — Multi-corpus, pondération, constructeur de corpus

Écartée pour la V1. Un sujet, un corpus. La combinatoire n'a de valeur qu'une fois qu'on sait ce que
chaque corpus rend — ce que DEF-1 empêche aujourd'hui de mesurer.

---

## 5. Conséquences

**Ce qui devient plus simple**
- Ajouter un sujet = une entrée dans un objet TypeScript + un test.
- Ajouter un segment à KREDO le rend automatiquement sélectionnable comme sujet.
- Le cadrage éditorial redevient versionné, relisible en revue de code et testable.

**Ce qui devient plus difficile**
- La page `/veille` cesse d'avoir « un » flux : lecture, archives et flux mobile doivent porter le sujet.
- La mission `veille-analyse-mensuelle` doit être scopée (§6, effet de bord).
- Un digest par sujet et par jour multiplie le coût LLM d'autant. La clé d'unicité sert aussi de garde-fou.

**Ce qu'il faudra revisiter**
- La dédup scopée par sujet (§3.7) peut produire de la redondance perçue entre sujets voisins
  (`ia` et `llm` sur le même corpus). À mesurer après deux semaines d'usage réel.
- La pondération multi-corpus, une fois DEF-1 corrigé et l'efficacité par source enfin mesurable.

---

## 6. Effet de bord à traiter dans le même chantier

`veillePeriodProvider` (`src/features/intelligence-missions/data/corpus/veille-period-provider.ts`)
sélectionne **tous** les digests de la période. Dès le premier digest thématique, la mission
`veille-analyse-mensuelle` avalerait de la veille hors sujet dans son corpus. Le sélecteur
`veille_period` doit accepter un `topicKeys?: string[]`, avec `['global']` par défaut.

---

## 7. Actions

1. [ ] **Préalable d'hygiène** — neutraliser les 4 sources fantômes (DEF-2) ; corriger les 3 URL Folio récupérables ; ouvrir le correctif DEF-1 (métriques agrégées hors boucle).
2. [ ] **Lot 0** — migration (colonnes + clé d'unicité + `v_corpus_news_sources` + RPC d'ingestion élargie), registre `DIGEST_PRESETS`, contrat `DigestLaunchInputV2`, `resolveDigestSources`, `assembleDigestFraming`.
3. [ ] **Lot 1** — mini-parseur thématique, deux corpus Folio nettoyés, import en `draft` puis activation avec `enabled_for_news=false`.
4. [ ] **Lot 2** — branche v2 dans `/api/n8n/trigger` ; workflow acceptant v1 **et** v2 ; dédup scopée ; `on_conflict` à trois colonnes. **Un seul réimport VPS.**
5. [ ] **Lot 3** — modale Desktop, `DigestLaunchSheetMobile`, lecture par sujet, tri déterministe (DEF-4), scope de `veille_period`.
6. [ ] Consigner dans `docs/init-projet/DECISIONS_LOG.md` et en tête de `docs/JOURNAL-SESSIONS.md`.

Détail d'exécution : `docs/FEATURES/veille_digest_thematique/00-HANDOFF-LOT-0.md`.
