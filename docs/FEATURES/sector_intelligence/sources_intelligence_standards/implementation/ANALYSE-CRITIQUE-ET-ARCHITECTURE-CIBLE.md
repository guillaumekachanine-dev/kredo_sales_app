# Gestion des sources & corpus réutilisables — analyse critique, audit et architecture cible

**Date :** 2026-08-13
**Statut :** proposition d'architecture — aucune modification appliquée (dépôt, Supabase, n8n)
**Branche d'audit :** `codex/bi-competitive-environment` (HEAD `68bc16d0`) · base live `jvzgmhvwirsbdkjpmvla` lue le 2026-08-13
**Documents analysés :** `sources_intelligence_standards/` (01, 04, README, `sector_sources_lists/`), `Cahier_implementation_Gestion_des_sources_KREDO.docx` (ci-après « le cahier »)

---

## 0. Verdict en une page

| Question | Réponse |
|---|---|
| La feature est-elle justifiée ? | **Oui**, mais pas pour la raison affichée. Le problème n'est pas « les sources sont codées en dur » — c'est que **le pipeline ne peut pas absorber plus de sources**. Voir §2.1. |
| Le cahier ChatGPT est-il exploitable ? | **En partie.** Le modèle de données est correct dans ses grandes lignes et le contrat 1.1 est sa meilleure contribution. Mais son audit est daté, sa recette n'attrape pas le seul bug bloquant, et sa séquence de lots construit l'UI avant que quoi que ce soit ne consomme la table. |
| Faut-il 3 tables ? | **Oui** — la demande (« corpus réutilisables ») exige que le corpus soit une entité versionnée. Mais **pas la vue** : une fonction paramétrée. Voir §4. |
| Peut-on démarrer ? | **Oui, après le Lot 0'** — qui n'existe pas dans le cahier et qui est le préalable réel : réparer le générateur de référentiels et corriger le plafond du pipeline. |
| Risque n°1 | Livrer une feature qui **ne change rien de visible** : les sources de corpus n'atteindront jamais le LLM tant que `slice(0,40)` reste positionnel. |

---

## 1. Analyse de la fonctionnalité imaginée

### 1.1 Ce qui est juste dans l'intention

L'intuition centrale — **séparer « où l'on peut chercher » de « ce qu'on a effectivement trouvé »** — est correcte et c'est le bon moment pour la poser. Elle est validée par la base :

- `intelligence_sources` compte **441 lignes** dont **366 pointent sur `news.google.com`**. Ce n'est pas un registre de sources, c'est un journal de collecte. Sa RLS ne porte qu'une policy `SELECT` : elle est structurellement inéditable.
- Aucune ligne n'y est réutilisable : `source_key` est unique à 439/441 (`account_scan:news:<hash>`), c'est-à-dire une clé de dédoublonnage d'article, pas une identité de source.

La notion de **corpus réutilisable dans plusieurs contextes** est également le bon objet produit : c'est ce qui distingue cette feature d'une simple liste de flux RSS paramétrable. Un corpus porte une qualification (tier, rôle, score) qui a du sens indépendamment de l'usage qu'on en fait.

### 1.2 Ce que la formulation masque

**Le mot « source » recouvre trois objets différents** qui ne sont jamais distingués, ni dans le standard 1.0, ni dans le cahier :

| Objet | Exemple | Ce qu'on en fait |
|---|---|---|
| **Un endpoint collectable** | `https://www.lemagit.fr/rss` | On l'appelle, il rend des items |
| **Un domaine de restriction** | `lemagit.fr` dans `site:lemagit.fr` | On l'injecte dans une requête d'un *autre* collecteur |
| **Une autorité éditoriale** | LeMagIT, T3, `corroboration` | On lui attache une force probante |

Le cahier les fusionne dans une seule ligne `source_catalog` avec `collection_mode ∈ {rss, site_search, api, manual_only}`. Ça tient tant que le mapping est 1↔1. Il ne l'est pas : **une même autorité peut être à la fois un flux RSS pour la veille globale et un domaine de restriction pour la veille compte**, avec deux `collection_url` différentes. Le modèle du cahier force alors deux lignes catalogue pour une seule autorité — et casse le dédoublonnage qu'il prétend garantir (`unique (workspace_id, canonical_url)`).

**Correctif retenu :** `collection_url` devient nullable et s'accompagne de `search_domain`. Une ligne = une autorité ; ses modes de collecte sont des attributs, pas son identité. Voir §4.1.

### 1.3 Le point aveugle : la provenance est déjà perdue

366 lignes de preuve sur 441 ont pour domaine `news.google.com`. Le nom de l'éditeur ne survit que dans `source_name` en texte libre (`"Presse"`, `"BFM"`, `"Les Echos"`).

**Conséquence directe sur la feature :** construire un corpus qui qualifie LeMagIT en T3 `corroboration` n'a **aucun effet vérifiable** si la preuve écrite en base porte `news.google.com`. Tout l'appareil tier/rôle/score reste infalsifiable. Le cahier mentionne d'ajouter `collectedVia` dans `technical_metadata` — nécessaire mais insuffisant : il faut **résoudre le domaine réel de l'éditeur** à partir de l'item Google News avant écriture, sinon la traçabilité corpus → preuve reste déclarative.

C'est un préalable, pas une amélioration.

---

## 2. Audit de l'existant

### 2.1 🔴 Le bug bloquant : le plafond de candidats est déjà saturé

`veille-hebdomadaire-kredo.json`, nœud `Dédup + Filtre Récence + Préfiltre Qualité` :

```js
const capped = filtered.slice(0, 40);   // ← troncature POSITIONNELLE
```

Les items s'accumulent dans l'ordre du tableau `sources` via la boucle `Loop Over Items — 1 Source`. La troncature garde donc **les premières sources du tableau**, pas les meilleurs candidats.

Mesure en base — les 4 digests produits à ce jour :

| digest_date | nb_sources_actives | nb_candidats_evalues | articles |
|---|---|---|---|
| 2026-08-10 | 14 | **40** | 5 |
| 2026-08-03 | 14 | **40** | 5 |
| 2026-07-13 | 14 | **40** | 5 |
| 2026-07-07 | 14 | **40** | 5 |

**Le plafond est atteint à 100 % sur 4 runs sur 4, avec seulement 14 sources.** À ~15-25 items par flux RSS, les 40 candidats sont consommés par les 2 à 4 premières sources du tableau. Les 10 dernières — dont `Finextra` et `Premium Beauty News`, les deux seules sources verticales — **ne contribuent déjà rien aujourd'hui**.

Le cahier prescrit, Lot 3 : *« Conserver le plafond de candidats avant classement LLM »*. Appliqué tel quel, un corpus de 15 à 30 sources ajouté derrière le socle produirait **exactement zéro candidat**, de façon déterministe et silencieuse. La recette du cahier ne l'attrape pas : elle vérifie que la vue renvoie les bonnes lignes (§7.1 « Activation corpus validé → ses seules sources éligibles apparaissent dans la vue news »), jamais que ces lignes atteignent le digest.

C'est le seul défaut du cahier qui, non corrigé, rend la feature entière inopérante.

### 2.2 🔴 Les « 4 collecteurs » d'INTEL-033 sont un seul collecteur

Le cahier écrit : *« INTEL-033 · Collecteurs effectifs : site officiel, presse, registres publics, marchés publics »*. Lecture des nœuds :

| Nœud | Type | URL réelle |
|---|---|---|
| `Collect: Official Site` | httpRequest | `{{ $json.company.website }}` — GET brut |
| `Collect: News Media` | rssFeedRead | `news.google.com/rss/search?q="<nom>"` |
| `Collect: Public Records` | rssFeedRead | `news.google.com/rss/search?q="<nom>" ("annonce légale" OR bodacc OR ...)` |
| `Collect: Tenders` | rssFeedRead | `news.google.com/rss/search?q="<nom>" ("marché public" OR "appel d'offres" ...)` |

**« Registres publics » n'interroge aucun registre.** C'est une recherche Google News par mots-clés. Idem pour « marchés publics » : ni BOAMP, ni TED, ni DILA.

Conséquences pour l'architecture :

1. La distinction `collection_mode ∈ {rss, site_search}` est **fausse pour la veille compte** : tout y est déjà `site_search` via Google News. Le corpus n'y ajoute pas un collecteur, il **paramètre le seul collecteur existant** avec une liste de domaines.
2. Le cahier promet une « branche corpus » produisant « au maximum 12 recherches `site:domain` ». Cela porte INTEL-033 de 3 à 15 appels Google News RSS par compte et par run. Avec 12 comptes suivis en cadence hebdomadaire, c'est un facteur 5 sur le volume d'appels sortants vers un endpoint non contractuel et agressivement rate-limité. **Aucun budget ni backoff n'est prévu.**
3. `include_public_records` et `include_tenders` sont à `false` sur **12/12 lignes** de `account_watch_settings` : les deux branches concernées n'ont jamais tourné en production. Les valider en recette revient à activer du code jamais exercé.

### 2.3 🟠 La dette « Configurer la veille » est plus profonde que décrite

Le cahier identifie `sourceFamilies` / `categories` comme des champs libres qui ne pilotent rien. Exact. Mais :

- `workspaces.settings` vaut **`{}`** en base. Aucun réglage n'a jamais été persisté.
- `maxArticles` (défaut 40) n'est lu par **aucun** nœud : le plafond est la constante `40` du §2.1.
- Le workflow n'a qu'un `scheduleTrigger`, pas de webhook. Le bouton « Actualiser » poste `input: { settings }` vers `/api/n8n/trigger` — **le payload n'est consommé nulle part**.

Donc **la totalité de la modale « Configurer la veille » est décorative**, pas seulement deux champs. Le cahier ne propose de supprimer que les deux champs et de conserver `enabled` / `cadence` / `maxArticles` — qui resteraient tout aussi morts.

**Meilleure décision :** ne pas supprimer `maxArticles`, le **brancher** comme budget du quota (§5.1). La dette se rembourse en connectant, pas en masquant.

### 2.4 🟠 Régression silencieuse : perte de `secteurDefaut` et `confiance`

Le nœud `Config Sources KREDO` porte 5 attributs par source. L'annexe B du cahier n'en reprend que 3 :

| Attribut existant | Repris dans le cahier ? | Usage réel |
|---|---|---|
| `name`, `rssUrl` | ✅ | — |
| `categorieDefaut` | ✅ (`kredo_category`) | — |
| `homepage` | ⚠️ (`homepage_url`, non seedé) | — |
| **`secteurDefaut`** | ❌ **absent** | propagé jusqu'à `veille_articles.secteur_principal` |
| **`confiance`** (`verifie` / `tres_probable` / `a_tester`) | ❌ **absent** | qualification éditoriale du flux |

`secteurDefaut` traverse `Enrichir avec Métadonnées Source` → `Dédup` → le prompt de classement. Le supprimer dégrade l'attribution sectorielle des articles. Le contrat de lecture n8n proposé (§5.4 du cahier) ne le contient pas non plus.

### 2.5 🟠 `Récupérer Secteurs Actifs` : le vrai problème de coût du workflow

Nœud non mentionné par le cahier. Il fait `GET /sector_intelligence?select=name` — **sans filtre** — et concatène les noms dans le prompt système :

```
Ses cibles (ICP) ... sur les secteurs actuellement couverts par KREDO : ${secteursActifs}.
```

`sector_intelligence` compte **53 lignes** (15 macro + 38 segments). Le prompt reçoit donc une liste de 53 secteurs, macro et segments mélangés, présentée comme « les secteurs couverts ». C'est à la fois coûteux, faux (aucun n'est marqué actif ou inactif) et contradictoire avec la doctrine Lot 0 (la connaissance se lit à la maille segment, pas macro). Toute refonte de ce workflow doit le traiter — c'est un gain immédiat, sans nouvelle table.

### 2.6 🟠 Le générateur de référentiels produit des livrables tronqués

Vérification des deux référentiels existants :

| Référentiel | IDs `SRC-*` annoncés | Objets présents dans l'export JSON | Complétude |
|---|---|---|---|
| Électronique B2B | 15 | **7** | 47 % |
| Tourisme France | 13 | **5** | 38 % |

Le cahier ne signale que le premier. **Les deux sont cassés, et de la même manière** : la troncature tombe exactement à la frontière du `minimum_pack` (Électronique : les 7 objets présents = exactement les 7 IDs du `minimum_pack` ; les 8 manquants = exactement l'`extended_pack`). Ce n'est pas un accident, c'est un **mode de défaillance systématique du générateur**. Générer d'autres référentiels avant de le corriger reproduira le défaut.

S'y ajoute, non détecté :

- **Le JSON n'est pas parsable** : il est collé dans le markdown avec les underscores échappés (`utility\_score`, `origin\_chain`) et des `\[` `\]`. Aucun `json.loads` ne passe. La « validation contre le schéma » du Lot 0 est donc, en l'état, impossible à exécuter — ce que le cahier ne dit pas alors qu'il l'exige comme gate.
- **SRC-002 (Bpifrance) viole le schéma** : `automation_access = 15` pour un plafond de 10. Le total déclaré de 95 est donc gonflé de 5 points ; le maximum atteignable est 90. Le cahier parle d'« un score incohérent sur au moins une ligne » — c'est celle-là, et l'erreur est une violation de contrainte, pas une approximation.
- **SRC-005 est un blanchiment de tier, non détecté par personne.** Déclaré `publisher: "Commission Européenne"`, `tier: 1`, `primary_role: "proof"` — mais `url: https://www.europeaneconomics.com/...`, `domain: europeaneconomics.com`. C'est un cabinet privé, pas la Commission. La règle de dégradation du standard (§8.1 : *« une source secondaire qui cite une source primaire ne devient pas primaire »*) est violée frontalement, sur une source du **pack minimal**, dans un livrable déclaré `production_ready`.

**Ce que ça prouve :** le gate qualité `07_SCORECARD_VALIDATION.md` n'est pas exécuté. Le verdict `production_ready` est auto-attribué par le producteur — précisément ce que `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §10 interdit (*« Une étude ne peut pas se déclarer production_ready elle-même »*).

### 2.7 🟡 Conflit avec une décision d'architecture existante

`ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §9.3, en vigueur :

> Le standard v1.0 se porte dans `intelligence_sources.technical_metadata`, le lien vers le secteur via `intelligence_source_links`. **Pas de table dédiée.**

Et §9.4 prévoit un `result_type = 'sector_source_registry'` (S14).

Le cahier écarte cette décision en une phrase (*« Cette décision locale remplace donc […] l'ancienne hypothèse S14 »*). **Le fond lui donne raison** — §2.1 ci-dessus montre que `intelligence_sources` ne peut pas porter de la configuration — **mais la forme est inacceptable** : une décision d'architecture documentée ne se remplace pas par une note dans un cahier d'implémentation. Il faut une **ADR d'amendement** qui référence §9.3, explique ce qui a changé (l'UI d'édition devient un besoin réel, ce qui franchit le seuil posé par `08_MODE_EMPLOI_N8N`) et met à jour §9.3/§9.4.

### 2.8 🟡 L'audit du cahier porte sur un instantané périmé

Le cahier se réfère au commit `e01a641632779ce8aded66bd79bfad3eb54a4201`. C'est un **ancêtre** de `main`, en retard de **74 fichiers / 7 407 lignes supprimées** — il précède notamment les migrations `073_account_facts_identite_france`, `074_competitive_map_ingestion` et `075_competitive_map_profile_extension`.

Écarts chiffrés constatés :

| Constat du cahier | Réalité live (2026-08-13) | Écart |
|---|---|---|
| `intelligence_sources` : 167 lignes, dont 110 `news_media` | **441 lignes, dont 339 `news_media`** | ×2,6 |
| `account_watch_settings` : 12 lignes, 7 actives | 12 lignes, **7 actives** | ✅ |
| `companies` : 96 comptes | **109** | +13 |
| `sector_intelligence` : 53 fiches | 53 | ✅ |

Aucun constat quantitatif du cahier ne doit être repris sans re-vérification.

### 2.9 🟡 Dérive n8n : le collecteur emploi existe déjà

Le cahier insiste : *« Ne pas réintroduire emploi/social »*. Nuance nécessaire :

- `n8n/wokflows_patchs/intel-033-account-watch-refresh.json` contient bien `Collect: Job Board Signals` + `Shape+Accumulate: Job Board`.
- 27 lignes `intelligence_sources` portent `source_type = 'job_board'`, `source_key = 'account_watch:job_board:...'`, nom `"Google News (recrutement)"`. **Ce collecteur a tourné en production.**
- La version `n8n/workflows/` (42 nœuds) l'a supprimé et ajouté 7 nœuds de robustesse (`IF — Has Items to Qualify?`, `Finalize Run Summary`, `Skip Qualification`…) absents de la version `patchs/` (37 nœuds).

Donc : deux variantes divergentes en dépôt, et l'on ignore laquelle tourne sur le VPS. `npm run n8n:status` ne le dira pas (il compare des compteurs de nœuds ; ici 42 ≠ 37 le verrait, mais pas les modifications internes). **À trancher avant tout Lot n8n.** La consigne juste n'est pas « ne pas réintroduire l'emploi » mais « ne pas présenter comme connecté un collecteur dont on ne sait pas s'il tourne » — et `include_jobs = true` sur 12/12 lignes rend le mensonge actuellement visible dans l'UI.

### 2.10 🟢 Ce que le cahier a vu juste et qui est confirmé

- Icône `public/icons_set/source_parameters.png` présente (11 499 o).
- `MobilePageHeader` expose bien `actions?: React.ReactNode` — l'insertion mobile est triviale.
- `VeilleActualitesPage` ne monte qu'un seul sous-arbre (`device === "mobile"` → early return) : l'adaptive est propre, et la vue mobile **ne reçoit ni `globalWatchSettings` ni `globalWatchHealth`** — il faudra les câbler.
- `VeilleHeaderActions` : `Actualiser` + `Configurer la veille` + `WorkflowHealth`, insertion en dernier sans refonte.
- `companies.segment_id` et `sector_id` sont renseignés à **109/109** — la résolution segment → macro est possible sans nouvelle taxonomie.
- `ai_intelligence_results.company_id` est `NOT NULL` — le détournement pour un corpus sectoriel est effectivement impossible.

---

## 3. Critique de la solution proposée

### 3.1 Ce qu'il faut garder

| Élément | Jugement |
|---|---|
| **Séparation configuration / preuve** | ✅ Fondé. `intelligence_sources` reste en lecture seule. |
| **Standard 1.1** (`collection_url`, `collection_mode`, `kredo_category`, `usage_scopes`, `content_temporality`) | ✅ **La meilleure contribution du cahier.** Le standard 1.0 décrit la force probante et ignore complètement l'exploitabilité. |
| **Règle `static` ⇒ jamais de veille récurrente** | ✅ Déterministe, testable, gratuite. |
| **Filtre administratif avant le LLM** | ✅ Excellent. Rejeter « code NAF / siège social » sauf verbe d'événement (« transfert de siège », « fusion »…) est du signal/bruit à coût nul, appliqué avant la dépense LLM. |
| **Héritage segment → macro, un seul gagnant** | ✅ Conforme à la doctrine Lot 0. |
| **RLS `(select private.…())`** | ✅ Aligné sur la migration 059. |
| **Refus des collecteurs fantômes** | ✅ Principe juste (application à nuancer, §2.9). |

### 3.2 Défauts structurels

**a) `v_effective_watch_sources` ne peut pas être une vue.**

La branche `account_corpus` joint `account_watch_settings` × `companies` × `LATERAL` × items **pour tous les comptes**, à chaque lecture. n8n filtrera ensuite sur `company_id` en paramètre de requête PostgREST — mais le prédicat arrive **après** le `distinct on` global. À 109 comptes, chaque appel matérialise l'intégralité du plan avant d'en jeter 108/109.

De plus, `security_invoker = true` + appel n8n en `service_role` = **RLS contournée**. L'isolation workspace ne repose alors plus que sur le paramètre `?workspace_id=eq.…` de l'URL. C'est acceptable, mais c'est une garantie *applicative* présentée dans le cahier comme une garantie *base* (§3.5 : « La vue est security_invoker=true »). Il faut le dire.

→ **Fonction paramétrée `SECURITY INVOKER`**, pas vue.

**b) Le `distinct on` perd l'attribution de corpus.**

```sql
select distinct on (workspace_id, usage_scope, company_id, source_id) *
from candidates order by …, priority;
```

Une source présente à la fois dans le socle (`priority = 0`, `corpus_id = NULL`) et dans un corpus sectoriel (`priority = 2`, `corpus_id = <uuid>`) est réduite à la ligne socle. **Le `corpus_id` devient `NULL` silencieusement.** Or c'est exactement le cas nominal de la réutilisation (LeMagIT dans le socle *et* dans un corpus « Logiciels & SaaS »), et c'est la clé de traçabilité que le cahier veut propager jusqu'aux preuves (§5.2 : « Ajouter corpusId … aux technical_metadata »). La feature perd sa capacité à démontrer qu'un corpus a servi.

**c) `is_current` + index uniques partiels = risque de blocage à l'activation.**

```sql
create unique index source_corpora_current_sector_uniq
  on source_corpora(workspace_id, sector_id) where is_current and scope_kind='sector';
```

Activer la v2 d'un corpus impose de désactiver la v1 **d'abord**, dans la même transaction, dans le bon ordre. Un index unique partiel n'est pas `DEFERRABLE`. Toute Server Action naïve (`update … set is_current = true where id = $1`) échoue en `23505`. Le cahier n'en dit rien et ne le teste pas.

→ **Activation par fonction SQL atomique**, jamais par `UPDATE` direct depuis le client.

**d) `unique (workspace_id, canonical_url)` + CHECK `content_temporality`.**

- L'unicité sur l'URL empêche la même autorité de porter deux endpoints (§1.2).
- Le `CHECK (content_temporality <> 'static' or not (usage_scopes && array['news','account_watch']))` impose de muter deux colonnes en un seul `UPDATE` lors d'une reclassification. Cette règle appartient à la **résolution** (la fonction), pas à la ligne. La garder en CHECK rend l'import de référentiels cassants pour un bénéfice nul (la fonction filtre déjà).

**e) Le contrat de lecture n8n est incomplet.** Manquent `secteur_defaut` (§2.4), `confiance`, `search_domain`, et surtout **le quota par source** — sans lequel le §2.1 n'est pas réparé.

### 3.3 Défauts de méthode

| Problème | Conséquence |
|---|---|
| **Lot 2 (UI complète) avant Lot 3 (workflow)** | On construit un éditeur pour une table que rien ne consomme. Si le Lot 3 révèle que le contrat est faux — et il l'est, cf. §2.1 — l'UI est à refaire. **Inverser.** |
| **Lot 0 interdit la recherche web** pour réparer les référentiels | Les 8 objets manquants d'Électronique et les 8 de Tourisme sont partiellement transcriptibles depuis les tableaux markdown, mais `collection_url` (champ **obligatoire** en 1.1) ne l'est pas : aucun flux RSS n'est documenté. Le gate « valider contre le schéma 1.1 » devient **impassable par construction**. |
| **6 lots strictement séquentiels, 5 prompts, modèles imposés** | Le chemin critique réel est l'**import n8n manuel sur le VPS** — déjà en retard sur 12 workflows (dont `intel-010-refresh`, bloquant pour ADR-0019 Lot 4). Ajouter 2 workflows non réimportés aggrave la dette au lieu de la traiter. |
| **Aucune mention du budget d'appels Google News** | §2.2 : ×5 sur les appels sortants, sans backoff ni cache. |
| **Le nœud `Récupérer Secteurs Actifs` n'est jamais audité** | §2.5 : le gain le moins cher du chantier est ignoré. |

---

## 4. Architecture cible

### 4.1 Modèle de données — 3 tables, 1 fonction

Trois objets sont conservés : la demande (« créer et réutiliser des corpus prêts à l'emploi ») fait du **corpus une entité de premier rang**, versionnée et qualifiée. Le collapser en attribut de binding perdrait le produit.

```
watch_sources          — une AUTORITÉ collectable (LeMagIT, BOAMP, Pappers)
  └─ watch_corpus_items — sa QUALIFICATION dans un corpus donné (tier, rôle, score, pack)
       └─ watch_corpora — le CORPUS : version, verdict qualité, activation par usage
```

**Écarts assumés par rapport au cahier :**

| Cahier | Cible | Raison |
|---|---|---|
| `source_catalog.collection_url NOT NULL` | `collection_url` **nullable** + `search_domain text NOT NULL` | §1.2 — une autorité sans flux RSS reste utilisable en `site:domain` |
| `unique (workspace_id, canonical_url)` | `unique (workspace_id, source_key)` seul + index non-unique sur `search_domain` | §1.2 — n'interdit pas deux endpoints pour une autorité |
| CHECK `content_temporality` × `usage_scopes` | **supprimé de la table**, appliqué dans la fonction | §3.2d |
| `is_current` + 2 index uniques partiels | `retired_at timestamptz` + activation via `activate_watch_corpus()` | §3.2c |
| — (absent) | `sector_default text`, `confidence text` sur `watch_sources` | §2.4 — non-régression |
| `v_effective_watch_sources` (vue) | `get_effective_watch_sources(p_usage, p_company_id, p_budget)` (fonction STABLE, SECURITY INVOKER) | §3.2a — paramétrée, et **renvoie le quota** |
| `distinct on` par `source_id` | agrégation `corpus_ids uuid[]` | §3.2b — conserve toutes les attributions |
| — (absent) | `account_watch_settings.include_sector_corpus` | ✅ repris tel quel du cahier |

**Ce que la fonction renvoie en plus de la vue du cahier :** `per_source_quota int` — le nombre maximal d'items que cette source peut faire entrer dans le lot de candidats. C'est le contrat qui répare §2.1, et il est calculé en SQL, testable par assertion, pas dans un nœud Code non testé.

### 4.2 Le quota — cœur de la solution

```
budget          = global_watch_settings.maxArticles   (aujourd'hui décoratif → devient réel)
n_sources       = nombre de sources résolues pour l'usage
quota_de_base   = max(2, floor(budget / n_sources))
quota effectif  = quota_de_base pondéré par pack_role (minimum = ×2) et utility_score
```

Puis, côté n8n, la troncature devient un **entrelacement round-robin** :

```js
// remplace  filtered.slice(0, 40)
const bySource = new Map();
for (const a of filtered) {
  const k = a.sourceKey;
  if (!bySource.has(k)) bySource.set(k, []);
  const bucket = bySource.get(k);
  if (bucket.length < a.perSourceQuota) bucket.push(a);
}
const buckets = [...bySource.values()];
const capped = [];
for (let i = 0; capped.length < budget; i++) {
  let progressed = false;
  for (const b of buckets) {
    if (b[i]) { capped.push(b[i]); progressed = true; if (capped.length >= budget) break; }
  }
  if (!progressed) break;
}
```

**Propriétés :** aucune source ne peut être affamée ; ajouter un corpus augmente la diversité au lieu de la détruire ; `maxArticles` devient un vrai levier ; le comportement est déterministe et testable hors n8n.

### 4.3 Provenance — obligatoire, pas optionnel

Avant toute écriture dans `intelligence_sources`, résoudre l'éditeur réel :

1. Google News RSS expose l'éditeur dans `<source url="…">` de chaque item — l'utiliser en priorité.
2. À défaut, déballer le paramètre `url=` du lien de redirection.
3. Écrire dans `technical_metadata` : `publisher_domain`, `watch_source_id`, `corpus_ids`, `collected_via`, `matched_by` (`socle` | `corpus` | `fallback`).

Sans cette étape, tier et score restent invérifiables (§1.3) et la recette « le corpus a bien servi » est infalsifiable.

### 4.4 Sécurité

- RLS sur les 3 tables, motif standard `workspace_id = (select private.current_workspace_id())` en `SELECT` ; écritures `AND (select private.is_workspace_admin()) AND NOT is_locked`. ✅ conforme au cahier.
- Fonction en **`SECURITY INVOKER`** (pas `DEFINER`) : la RLS des tables de base s'applique. ✅ conforme au cahier.
- **À écrire noir sur blanc dans l'ADR :** en appel `service_role` depuis n8n, la RLS est contournée ; l'isolation repose sur le **paramètre `p_workspace_id`** passé par le workflow. Ce n'est pas une garantie base. Le workflow porte déjà l'id en dur (`98dcd39d-…`) — le formaliser plutôt que le subir.
- Validation d'URL côté Server Action : `https` obligatoire, rejet de `javascript:`, `data:`, `localhost`, IP privées, URLs à credentials. ✅ conforme au cahier, à conserver intégralement.
- Contenu externe = donnée non fiable : aucune instruction issue d'un flux n'est exécutée ni interprétée par les nœuds Code ou le LLM. ✅ conforme.

---

## 5. Roadmap

Principe directeur : **on branche avant de peindre.** Chaque lot doit être vérifiable seul, et le premier consommateur de la table doit être le workflow, pas l'UI.

### Lot 0' — Réparer ce qui empêche de commencer *(nouveau, absent du cahier)*

| Tâche | Gate |
|---|---|
| Corriger `slice(0,40)` → quota + round-robin, **à socle constant** | Digest produit avec ≥ 1 candidat issu de **chacune** des 14 sources ; `nb_candidats_evalues` reste ≤ `maxArticles` |
| Corriger `Récupérer Secteurs Actifs` : filtrer sur les segments réellement rattachés à ≥ 1 compte | Prompt système < 1 500 caractères ; liste sans doublon macro/segment |
| Trancher la dérive `workflows/` vs `wokflows_patchs/` pour INTEL-033 | Une seule version de référence en dépôt, alignée sur le VPS |
| Corriger le **générateur** de référentiels : sortie NDJSON (1 objet/ligne), gate `len(sources) == len(min ∪ ext)` | Le gate échoue sur les 2 référentiels actuels — c'est le résultat attendu |

**Pourquoi d'abord :** le premier point rend la suite visible ; sans lui, tout le reste est invérifiable. Ce lot ne touche ni la base ni l'UI.

### Lot 1 — Contrat Source Intelligence 1.1

Reprend le Lot 0 du cahier, **amendé** :

- Ajout des 5 champs 1.1 + `sector_default` + `confidence` (§2.4) + `search_domain` (§1.2).
- Règles déterministes : `static` ⇒ ni `news` ni `account_watch` ; `manual_only` jamais automatisé ; packs disjoints et couvrants.
- **Réparation des DEUX référentiels** (Électronique 7/15, Tourisme 5/13) — pas seulement le premier.
- Transcription des objets manquants depuis les tableaux markdown **sans invention** ; `collection_url` non documentée ⇒ `validation_status = 'pending'` et corpus en `usable_with_caveats`. **Le verdict `production_ready` est interdit tant qu'une URL reste non probée.**
- Corriger SRC-002 (`automation_access: 15 → 10`, score `95 → 90`) et **SRC-005** (`tier: 1 → 3`, `publisher: europeaneconomics.com`, sortir du pack minimal ou le remplacer par la source primaire `digital-strategy.ec.europa.eu`).
- Script de validation exécutable + tests. Le JSON doit être parsable — donc **sorti du markdown**, dans un `.json` versionné à côté.

**Gate :** `json.loads` passe sur les 2 référentiels ; schéma 1.1 validé ; sommes `utility_score_detail` exactes et sous plafond ; packs intègres ; verdict recalculé honnêtement (attendu : `usable_with_caveats`, pas `production_ready`).

### Lot 2 — ADR + fondation Supabase

- **ADR d'amendement** de `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` §9.3/§9.4 (§2.7). Sans elle, le chantier contredit une décision écrite.
- 3 tables + RLS + `account_watch_settings.include_sector_corpus`.
- `get_effective_watch_sources()` + `activate_watch_corpus()`.
- Seed idempotent des 14 sources **avec `sector_default` et `confidence`**, via `SELECT` sur `workspaces` (pas d'UUID en dur).
- `supabase/tests/<version>_watch_sources.assertions.sql`.

**Gate :** assertions vertes (14 sources ; verrouillage effectif ; corpus `draft` absent de la résolution ; source `static` absente ; héritage segment prioritaire sur macro ; **une source socle+corpus renvoie ses 2 `corpus_ids`** ; isolation workspace) · advisors sécurité + performance · `npm run db:types && npm run typecheck`.

### Lot 3 — La veille globale lit la base

Le workflow devient le **premier consommateur**. Aucune UI.

- `Config Sources KREDO` → appel RPC `get_effective_watch_sources('news', null, maxArticles)`.
- Propagation `source_id`, `source_key`, `origin`, `corpus_ids`, `family`, `kredo_category`, `secteur_defaut`, `per_source_quota`.
- Résolution de l'éditeur réel (§4.3).
- Échec explicite si 0 source.
- Test structurel : aucune des 14 URLs ne subsiste en dur dans le nœud de config.

**Gate de non-régression, le plus important du chantier :** *à corpus désactivé, le digest produit doit être équivalent à celui du Lot 0'* — mêmes 14 sources, même diversité. Puis, corpus activé : les items de corpus **apparaissent effectivement dans les candidats** (c'est la vérification que le cahier n'avait pas).

### Lot 4 — Interface Desktop et Mobile

Seulement maintenant. Le contrat est stabilisé par un consommateur réel.

- Launcher `source_parameters.png` en dernier à droite du header Desktop ; `IconButton` 44 px dans `MobilePageHeader.actions`.
- `AppDialog` large (onglets Actualités / Comptes) · `AppDrawer` bottom avec écrans internes. Un seul sous-arbre monté.
- Câbler `globalWatchSettings` / `globalWatchHealth` vers `VeilleActualitesMobile` (aujourd'hui non transmis, §2.10).
- **Nettoyage :** retirer `sourceFamilies` / `categories` ; **conserver et brancher `maxArticles`** comme budget de quota (§2.3).
- `include_jobs` / `include_social_manual` : badge « Non connecté », contrôle inactif, tant que §2.9 n'est pas tranché.

**Gate :** contrats/validateurs testés · état `locked` · corpus `draft` non activable · doublon d'URL refusé · `typecheck`/`lint`/`check:server-boundary`/`test`/`build` · QA visuelle Guillaume 1440×900 et 390×844.

### Lot 5 — Veille compte

- Héritage segment → macro, un seul corpus gagnant.
- **Budget d'appels explicite** : plafond de requêtes Google News par run et par compte, backoff, cache de résultats (§2.2). Non négociable.
- Filtre administratif déterministe avant le prompt de qualification, avec compteur `excluded_static_count`.
- Préserver toutes les branches de convergence existantes (`0 item`, `0 signal`, `0 lien`, failure callback) — c'est la partie fragile d'INTEL-033.

**Gate :** compte avec corpus segment · avec fallback macro · sans corpus · `includeSectorCorpus = false` · contenu NAF pur rejeté / transfert de siège conservé · 0 item ⇒ succès avec `signalsCreated = 0` · erreur sur une source ⇒ les autres passent.

### Lot 6 — Recette et publication

Suite complète, assertions SQL, advisors, tests structurels n8n, plan de rollback. Ordre d'application : migration → déploiement app → import/publication veille globale → publication INTEL-033 → smoke tests.

**Prérequis bloquant :** résorber la dette d'import n8n existante (12 workflows non réimportés depuis la Session 28, dont `intel-010-refresh`). Publier 2 workflows de plus par-dessus une file de 12 est le meilleur moyen de ne plus savoir ce qui tourne.

---

## 6. Ce que je recommande de ne pas faire

| Proposition | Verdict |
|---|---|
| Conserver le plafond de candidats tel quel | **Non.** §2.1 — rend la feature inopérante. |
| Créer `v_effective_watch_sources` comme vue | **Non.** §3.2a — fonction paramétrée. |
| Commencer par l'UI (Lot 2 du cahier) | **Non.** §3.3 — brancher avant de peindre. |
| Supprimer `maxArticles` de la modale | **Non.** Le brancher (§2.3) : la dette se rembourse en connectant. |
| Déclarer un référentiel `production_ready` sans URLs probées | **Non.** §2.6 — c'est ce qui a produit SRC-005. |
| Présenter « registres publics » / « marchés publics » comme des collecteurs de registre | **Non.** §2.2 — ce sont des recherches Google News. Renommer dans l'UI. |
| Écarter §9.3 par une note de cahier | **Non.** §2.7 — ADR d'amendement. |
| Générer de nouveaux référentiels sectoriels avant le Lot 0' | **Non.** §2.6 — le générateur tronque systématiquement. |

---

## 7. Ce que la feature vaut, une fois corrigée

Bien exécutée, elle apporte trois choses qui n'existent pas aujourd'hui :

1. **Une veille qui grandit.** Aujourd'hui, ajouter une source ne change rien (plafond saturé). Après le Lot 0', chaque source ajoutée élargit réellement la couverture.
2. **Un actif capitalisable.** Un corpus sectoriel qualifié est réutilisable par la veille globale, la veille compte, l'étude sectorielle et le futur Knowledge Hub — c'est le seul objet du chantier qui ait une valeur croissante dans le temps.
3. **Une preuve défendable.** Avec la résolution d'éditeur (§4.3), une affirmation en rendez-vous client devient traçable jusqu'à une source de tier connu. C'est l'objectif affiché du standard, jamais atteint jusqu'ici.

Le risque n'est pas technique. Il est de livrer les 3 tables et l'UI, et de constater que le digest hebdomadaire est identique — parce que `slice(0, 40)` n'aura pas bougé.
