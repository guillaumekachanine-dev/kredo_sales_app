# Handoff — Lot 2 « Branchement veille hebdomadaire »

**Chantier :** Gestion des sources · **Lot :** 2 / 6 · **Date :** 2026-08-15
**Statut :** ✅ **livré en repo, correctif d'incident inclus. Non commité/poussé.** Un test
manuel sur le VPS (hors protocole, initiative de Guillaume) a révélé un bug bloquant, corrigé
le jour même — voir §5bis. **Le VPS tourne actuellement la version pré-correctif** : à
réimporter avant tout run planifié.
**Amont :** `PLAN-CHANTIER.md` §9, `HANDOFF-LOT1.md`, `HANDOFF-LOT0.md` §6 (décisions actées).
**Aval :** Lot 3 — UI « Gérer les sources ». Ne pas commencer avant validation du Lot 2 en
production.

---

## 1. État initial réellement observé

Avant toute modification, vérifié contre le repo et Supabase live (`jvzgmhvwirsbdkjpmvla`) :

- `git status --short` : working tree propre.
- HEAD = `9804b11d66869625e91514b80a10f331db14a831` (le handoff de reprise l'annonçait comme
  minimum requis — correspondance exacte).
- Migrations `20260814214647_077_source_management` et `20260814214750_078_…` présentes dans
  `schema_migrations` (confirmé via `list_migrations`).
- `source_catalog=14`, `source_corpora=1`, `source_corpus_items=14`,
  `v_effective_watch_sources` (`usage_scope=news`) = 14, `veille_articles.source_catalog_id`
  non nul = **0**, `veille_articles` total = 25, `workspaces` = 1.

Aucun écart avec le handoff de reprise fourni : ces chiffres correspondent exactement à ceux
annoncés. Rien à documenter comme divergence.

---

## 2. Fichiers modifiés

| Fichier | Nature |
|---|---|
| `n8n/workflows/veille-hebdomadaire-kredo.json` | Restructuré — 20 → 25 nœuds |
| `n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js` | Réécrit — 29 → 60 assertions (dont 3 issues de l'incident §5bis) |
| `n8n/workflows/veille-hebdomadaire-kredo.SETUP.md` | Mis à jour (chaîne, modes de collecte, dettes) |
| `docs/FEATURES/gestion_des_sources/PLAN-CHANTIER.md` | Statuts Lot 1/2 mis à jour |
| `docs/FEATURES/gestion_des_sources/HANDOFF-LOT1.md` | Créé — Lot 1 n'avait pas de handoff dédié |
| `docs/FEATURES/gestion_des_sources/HANDOFF-LOT2.md` | Ce fichier |

**Aucun fichier de `src/` touché. Aucune migration nouvelle. Aucune application sur Supabase
ou sur le VPS n8n.**

---

## 3. Changements par nœud

### 3.1 Supprimé

- **`Config Sources KREDO`** — le tableau de 14 sources codées en dur (dont 4 commentées
  `SANS_RSS`) a disparu du workflow.

### 3.2 Nouveaux nœuds

| Nœud | Rôle |
|---|---|
| `Charger Sources Effectives (Supabase)` | `GET v_effective_watch_sources?usage_scope=eq.news&order=priority.asc,utility_score.desc`, credential `supabaseApi` (même que les autres appels Supabase du workflow) |
| `Vérifier et Normaliser Sources` | Échoue explicitement (`throw`) si la vue renvoie 0 ligne — pas de digest vide silencieux. Sinon trie côté code (défensif, en plus du tri SQL) et normalise le contrat interne (`sourceId`, `sourceKey`, `sourceName`, `searchDomain`, `collectionUrl`, `collectionMode`, `family`, `kredoCategory`, `origin`, `corpusId`) |
| `Construire Requête Collecte` (`runOnceForEachItem`) | Calcule l'URL de collecte réelle : `collectionUrl` si `collectionMode='rss'`, sinon `https://news.google.com/rss/search?q=site:<searchDomain>&hl=fr&gl=FR&ceid=FR:fr` |
| `Router Mode Collecte` (IF) | Aiguille sur `collectionMode === 'site_search'` |
| `Récupérer Flux Google News` | `httpRequest` GET, réponse en texte brut (`responseFormat: text`), `onError: continueErrorOutput` |
| `Parser Flux Google News` | Extraction par expression régulière des `<item>` (volontairement simple, pas de scraping massif) ; **déballe l'éditeur réel** depuis `<source url="…">Nom</source>` |

### 3.3 Modifiés

| Nœud | Changement |
|---|---|
| `Explode Sources` | Inchangé fonctionnellement, lit désormais la sortie de `Vérifier et Normaliser Sources` |
| `Lire Flux RSS` | `url` devient `{{ $json.feedUrl }}` (calculé par `Construire Requête Collecte`) au lieu de `{{ $json.rssUrl }}` |
| `Enrichir avec Métadonnées Source` | Commun aux deux branches. En `site_search`, préfère `item.realPublisher` (déballé) ; sinon retombe sur la source du catalogue. **N'écrit jamais `news.google.com` comme éditeur.** Porte désormais `sourceId`, `family`, `collectedVia` |
| `Ignorer Source En Erreur` | Message adapté aux nouveaux champs (`collectionUrl`/`searchDomain` au lieu de `rssUrl`) ; comportement structurel inchangé (item `{skipped:true}`, jamais un tableau vide) |
| `Dédup + Filtre Récence + Préfiltre Qualité` | **Tourniquet re-clé sur `sourceId`** (uuid `source_catalog`), avec repli `sourceKey` puis `sourceName` pour robustesse seulement. Sortie enrichie de `sourceCatalogId` et `roundRobinKey`. Plafond 40 et logique round-robin du Lot 0 inchangés — pas de retour à un cap positionnel |
| `Construire Prompt Analyse` | Le prompt demande désormais à Sonnet d'échoir le champ `id` (`art_0`…) sur chaque article de sa réponse — clé stable pour le mapping aval |
| `Parser Digest Final` | Le rapprochement `sourceArticles ↔ réponse Sonnet` se fait **par `id`** (avec repli sur l'index si le modèle omet le champ), plus par simple position. Propage `sourceCatalogId` et `collectedVia` |
| `Créer Digest` | URL : `…/veille_digests?on_conflict=workspace_id,digest_date`. Header `Prefer: resolution=merge-duplicates,return=representation` (au lieu de `return=representation` seul). `workspace_id` lu depuis `$('Build Contexte KREDO').first().json.workspaceId` au lieu d'un UUID en dur répété |
| `Préparer Lignes Articles` | Ajoute `source_catalog_id` à chaque ligne insérée dans `veille_articles`. `workspace_id` lu depuis `Build Contexte KREDO`, plus de second UUID en dur |

`Build Contexte KREDO` reste la **seule** source de `workspaceId` (elle le définissait déjà) —
`Créer Digest` et `Préparer Lignes Articles` la lisent désormais au lieu de répéter le même
UUID littéral. Aucune migration de durcissement DB n'était nécessaire pour cela.

---

## 4. Tests et résultats exacts

```
node n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js   60 ok · 0 échec(s)
node --check sur les 13 nœuds Code du workflow                    13/13 OK
npm run typecheck                                                  ✅ (rien dans src/ touché)
npm test                                                            ✅ 121 fichiers · 1222 tests · 0 échec
npm run check:server-boundary                                       ✅
npx eslint n8n/workflows/__tests__/veille-hebdomadaire-kredo.test.js ✅ 0 erreur, 0 warning
npm run build                                                        ✅ compilé, 0 erreur
npm run test:n8n                                                    ✅ 7 harnais, tous verts (les deux échecs
                                                                        préexistants documentés au Lot 0,
                                                                        intel-020/intel-040, sont déjà résolus —
                                                                        vérifié : exit code 0 sur les 7 fichiers)
npm run n8n:status                                                  ⚠️ DRIFT attendu : nœuds repo/VPS = 25/20
                                                                        (le VPS tourne encore l'ancien workflow)
```

Le harnais couvre, en plus du Lot 0 (tourniquet, plafond, dédup, régressions, cas limites) :
lecture de la vue (filtre, tri, contrat de sortie, échec explicite si 0 ligne), les deux modes
de collecte (`rss` calcule directement l'URL, `site_search` construit la requête Google News),
le déballage de provenance (avec et sans balise `<source>`, jamais `news.google.com` en sortie),
le tourniquet re-clé sur `sourceId` avec repli `sourceKey`, la propagation de
`source_catalog_id` jusqu'aux lignes `veille_articles`, le mapping stable par `id` face à un
LLM qui réordonnerait sa réponse, l'idempotence du digest (`on_conflict`, header `Prefer`,
méthode `POST` conservée), et l'absence de secret en clair dans le workflow.

---

## 5. Différences avec le handoff de reprise

Aucune divergence de fond. Deux précisions d'implémentation, cohérentes avec le mandat mais non
détaillées dans le handoff :

1. **La branche `site_search` ne réutilise pas le nœud `rssFeedRead` natif d'n8n.** Le contrat
   de provenance (« récupérer l'éditeur réel via les métadonnées RSS ») exige de lire la balise
   `<source url="…">`, dont le support par le parseur RSS interne d'n8n (`rss-parser`) sur ce
   champ précis n'est pas garanti dans la version installée. Pour rester **testable et
   déterministe** (conforme à « un comportement réellement exécuté dans le harnais », pas une
   simple recherche de chaîne), la branche `site_search` récupère le flux en texte brut
   (`httpRequest`, `responseFormat: text`) et l'extrait par expression régulière dédiée, plutôt
   que par le nœud `rssFeedRead`. Simple, robuste, et vérifié par 6 assertions dédiées à la
   provenance.
2. **`workspace_id` n'est pas éliminé de la fonction, il est dérivé une seule fois.** Le
   handoff interdisait d'introduire un second UUID en dur et de toucher aux migrations 077/078
   sans nécessité. `Build Contexte KREDO` définissait déjà `workspaceId` ; les deux autres nœuds
   le lisent maintenant par expression au lieu de répéter le littéral. Aucune migration 079
   n'était nécessaire.

---

## 5bis. Incident de smoke test VPS — 2026-08-15, corrigé le jour même

Guillaume a importé la version repo du workflow sur le VPS pour un test réel (hors du
protocole §7, de sa propre initiative) et déclenché un run manuel. **Résultat observé :**
l'exécution s'affiche « Succeeded » dans l'UI n8n, mais s'arrête net après le nœud
`Parser Flux Google News` sur l'itération de la source « The Neuron » — aucun nœud ne
s'exécute après lui, la boucle ne reprend pas.

**Cause racine.** `site:theneuron.ai` sur Google News RSS renvoie un flux XML **valide mais
sans aucun `<item>`** (domaine mal indexé par Google News — un cas légitime, documenté dans
`PLAN-CHANTIER.md` §6 comme risque accepté, mais son *effet mécanique* n'avait pas été
anticipé). `Parser Flux Google News` retournait alors `[]`. Or dans ce workflow — comme
déjà documenté pour `Ignorer Source En Erreur` depuis le Lot 0 — **un nœud Code qui ne
produit aucun item en sortie arrête l'exécution n8n**, y compris la boucle sur les sources
suivantes. Le run n'a donc traité qu'une partie des 14 sources avant de s'arrêter
silencieusement, sans jamais atteindre `Dédup`, `Créer Digest` ni les 13 sources restantes.

**Correctif appliqué (même session) :** `Parser Flux Google News` renvoie désormais **au
moins un item** même à 0 résultat — un placeholder sans `title`/`link`, qui traverse
`Enrichir avec Métadonnées Source` puis se fait filtrer naturellement par le préfiltre de
qualité de `Dédup + Filtre Récence + Préfiltre Qualité` (`a.link && a.title`), sans jamais
devenir un candidat ni polluer les métriques d'erreur. Testé explicitement par 3 nouvelles
assertions (une régression directe de cet incident) — harnais passé de 57 à 60 assertions,
toutes vertes. Build/typecheck/test/server-boundary/lint/`test:n8n` revérifiés verts après
correctif.

**Point d'attention pour le prochain smoke run :** ce correctif traite le symptôme mécanique
(la boucle ne doit jamais s'arrêter). Il ne garantit pas que `site:theneuron.ai` (ni les
3 autres domaines `site_search`) remontera effectivement des articles — c'est un risque
accepté dès la conception (`PLAN-CHANTIER.md` §6 : « Google News `site:` ne renvoie rien sur
un domaine institutionnel → attendu et acceptable, tracé »). Vérifier au prochain run réel
combien des 4 sources `site_search` contribuent effectivement des candidats.

---

## 6. Risques résiduels

| Risque | Statut |
|---|---|
| Le VPS tourne (au moment de la rédaction) la version pré-correctif du workflow, importée hors protocole pour un test | À réimporter avec le correctif §5bis avant tout run planifié — voir protocole §7 |
| `site:theneuron.ai` (et potentiellement les 3 autres domaines `site_search`) peut structurellement ne jamais remonter de résultat via Google News | Risque accepté à la conception, mécaniquement neutralisé (§5bis) ; à observer sur plusieurs runs réels avant d'envisager une dépriorisation ou un marquage `unreachable` de ces sources |
| `v_effective_watch_sources` sans `workspace_id` dans sa projection | Documenté au Lot 1, non traité ici (mono-workspace, RLS + service_role suffisent aujourd'hui) — voir `PLAN-CHANTIER.md` §9.3 pour le traitement futur |
| `Récupérer Secteurs Actifs` charge les 53 fiches sans filtre | Dette antérieure, hors périmètre du Lot 2 |
| `family` est `NULL` sur les 14 sources système (jamais peuplé par le seed du Lot 1) | Sans impact fonctionnel — le contrat mappe le champ, il est simplement vide aujourd'hui. À peupler si le Lot 3 (UI) en a besoin pour l'affichage |

---

## 7. Protocole de déploiement (à exécuter uniquement sur ordre explicite de Guillaume)

1. **Sauvegarder/lire le workflow VPS actif** (`id=nVgAbHYvMplbLxAW`, cf. `HANDOFF-LOT0.md` §2.5)
   avant tout patch — exporter son JSON actuel pour référence.
2. **Importer/patcher la même copie active**, pas créer une troisième copie — le VPS porte déjà
   2 copies (1 active) d'après le dernier `n8n:status`.
3. **Préserver** `active`, le cron `0 6 * * 1`, `settings`/`timezone` et les credentials liés.
   **Ne jamais envoyer `settings:{}`** si cela écrase les settings existants.
4. Réassocier les credentials sur les nœuds qui en portent un : `supabaseApi` (désormais 5
   nœuds : `Récupérer Secteurs Actifs`, `Charger Sources Effectives (Supabase)`,
   `Récupérer Hash Articles Vus`, `Créer Digest`, `Créer Articles`) et l'API Anthropic (2
   nœuds, inchangé). `Récupérer Flux Google News` n'a besoin d'aucun credential.
5. **Smoke run réel** depuis `/veille` → « Actualiser » (ou déclenchement manuel dans n8n).
6. Vérifier en base :
   ```sql
   select digest_date, nb_candidats_evalues, nb_sources_actives
   from veille_digests order by digest_date desc limit 1;
   -- attendu : nb_candidats_evalues = 40, nb_sources_actives proche de 14

   select count(*) from veille_articles
   where source_catalog_id is not null
   and created_at > now() - interval '1 hour';
   -- attendu : > 0 — c'est la preuve directe que le Lot 2 est branché

   select source_name, count(*) from veille_articles
   where digest_id = (select id from veille_digests order by digest_date desc limit 1)
   group by 1 order by 2 desc;
   -- attendu : aucune ligne "news.google.com" — la provenance réelle doit apparaître
   ```
7. **Rejouer le run une seconde fois** le même jour (déclenchement manuel) : vérifier qu'une
   seule ligne `veille_digests` subsiste pour `(workspace_id, digest_date)` — c'est le gate P0
   d'idempotence.
8. **Seulement ensuite**, si demandé explicitement : commit, push, et mise à jour de
   `npm run n8n:status` pour confirmer 25/25.

---

## 8. Verdict

**LOT 2 READY FOR REVIEW.**

Repo cohérent (typecheck/test/server-boundary/lint/build verts, harnais n8n 60/60, `test:n8n`
7/7), aucune UI ni Lot 4/5 entamés, décisions actées respectées (`search_domain` primitive,
`manual_only` déprioritise sans exclure, plafond 40 intact, round-robin par source jamais
positionnel). Reste bloquant avant valeur réelle : le réimport manuel sur le VPS (§7) — sans
lui, la veille tourne encore avec l'ancien code, exactement comme documenté pour le Lot 0.
