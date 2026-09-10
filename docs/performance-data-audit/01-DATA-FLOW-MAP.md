# 01 — Cartographie des flux de données

> Une ligne par page significative. Les colonnes **requêtes**, **vagues**, **octets** et
> **HTML** sont **mesurées** (protocole en [00](00-BASELINE-AND-SCOPE.md) §5), pas déduites du code.
> Les pages qui n'expliquent rien de la performance globale ne sont pas documentées ici.
>
> *Vague* = palier d'un waterfall. `n` vagues ≈ `n` × latence d'aller-retour, incompressible.

---

## 1. Le préambule commun à toutes les pages

Avant qu'une seule donnée métier ne soit lue :

```
proxy.ts ──► auth.getClaims()          vérification JWT locale (ES256 confirmé)   ~0 ms réseau
(app)/layout.tsx ──► getDashboardDevice()   headers() mémoïsé par cache()          0 ms
   └─► AppShell : DesktopSidebar · IntelligencePanel · IntelligenceToggle
                  WorkflowExecutionIndicator (canal Realtime permanent)
   └─► AppOverlayHosts : 8 hôtes next/dynamic — RENDUS IMMÉDIATEMENT
```

`export const dynamic = "force-dynamic"` sur `(app)/layout.tsx` : correct et inévitable
(l'ADR-0006 impose la lecture de `headers()`), mais il ferme définitivement le prérendu partiel
pour toute l'application — décision déjà actée par l'[ADR-0017](../adr/ADR-0017-cache-components-ppr-refuse.md).

`src/app/(app)/loading.tsx` pose une frontière Suspense au-dessus de **toutes** les routes : le
TTFB est donc partout de 10–25 ms, et **ne mesure rien d'utile**. La grandeur qui compte est la
durée totale du flux.

---

## 2. Cartographie par page

### 2.1 `/prospection/accounts/[companyId]` — Account Intelligence · **le hotspot n°1**

| Élément | Contenu |
|---|---|
| **Finalité métier** | Hub d'intelligence compte en 5 étapes (Connaissance → Secteur → Enjeux → Stratégie → Roadmap) |
| **Sources** | 26 tables/vues : `companies` (×3), `contacts` (×2), `opportunities` (×2), `interactions` (×2), `ai_intelligence_results` (×2), `v_sector_knowledge_resolved` (**×2**), `v_sector_knowledge_items`, `account_signals`, `v_active_account_signals`, `account_issues`, `account_facts`, `account_watch_settings`, `missions`, `projects`, `calendar_events`, `intelligence_documents` (×2), `financial_models`, `v_ai_intelligence_summary`, `v_workflow_cost_stats`, `veille_articles`, `profiles`, Storage `sign` |
| **Data critique** | Identité du compte + l'étape affichée |
| **Data secondaire chargée quand même** | Les 4 autres étapes, les pairs sectoriels, les documents, la fiche de veille, le coût des workflows |
| **Appels mesurés** | **33 allers-retours en 5 vagues** |
| **Volume** | 220 Ko de HTML — mais **~450 Ko lus en base**, dont **378 Ko de `companies.metadata`** |
| **Transformations** | Serveur (TypeScript), massives : `intelligence-data.ts` = 1 584 lignes |
| **Cache** | Aucun |
| **Risques** | Cascade à 5 niveaux · double lecture de la même fiche compte · double lecture de `v_sector_knowledge_resolved` · blob TOAST inutile · appel Storage sur le chemin de rendu |
| **Impact** | **CRITIQUE — 1,14 s** |

Cascade mesurée :

```
vague 1  t0=0     8 req.   identité + contacts + runs + opportunités …   ~140 ms
vague 2  t0=116  13 req.   fiche complète + signaux + docs + secteur     ~165 ms
vague 3  t0=140   3 req.   v_sector_knowledge_resolved (2e fois) + sign  ~110 ms
vague 4  t0=374   3 req.   items sectoriels + PAIRS AVEC METADATA        ~642 ms  ← 378 Ko
vague 5  t0=1029  1 req.   companies.relation_type                       ~93 ms
```

### 2.2 `/veille` — **hotspot n°2**

| Élément | Contenu |
|---|---|
| **Finalité métier** | Digests de veille, analyses stratégiques, gestion des sources et corpus |
| **Sources** | 21 tables/vues, dont `veille_digests` (×5), `veille_articles` (×4), `profiles` (**×7**), `intelligence_documents` (×3), `source_corpora` (×2), `account_watch_settings` (×2), `v_effective_watch_sources` (×2), `sector_intelligence` (×2) |
| **Data critique** | Le digest sélectionné + ses articles |
| **Data secondaire chargée quand même** | Le catalogue de sources complet, les corpus complets, l'historique des analyses, les signaux de **tous** les comptes surveillés, tous les articles jamais publiés |
| **Appels mesurés** | **42 allers-retours en 7 vagues** |
| **Volume** | 595 Ko de HTML · `v_active_account_signals` **139 Ko** · `veille_articles select=*` **114 Ko** · `source_catalog select=*` **45 Ko** · `source_corpus_items select=*` **45 Ko** |
| **Transformations** | Serveur + filtrage JS du feed par `topic_key` après chargement des 30 digests |
| **Cache** | Aucun |
| **Risques** | **`getUser()` puis `profiles` en série avant toute donnée (306 ms mesurés)** · 8 `select("*")` · agrégation par onglet non différée |
| **Impact** | **CRITIQUE — 0,89 s** |

```
vague 0  t0=0     getUser()                    195 ms   ← réseau, bloquant
vague 0' t0=196   profiles.workspace_id        102 ms   ← réseau, bloquant
vague 1  t0=306   17 req. en parallèle         ~273 ms
vagues 2-6  t0=494 → 861   25 req. en 5 paliers  ~490 ms
```

### 2.3 `/prospection/accounts` — Répertoire comptes & contacts

| Élément | Contenu |
|---|---|
| **Finalité métier** | Liste des comptes, liste des contacts, taxonomie, cartographie concurrentielle |
| **Sources** | `v_crm_account_list`, `contacts` + embed `persons`, `tasks`, `sector_intelligence`, puis `competitive_map_entries`, `account_facts` |
| **Data critique** | La liste des 112 comptes |
| **Data secondaire chargée quand même** | **Les 642 contacts avec leur personne jointe (364 Ko)**, alors que la vue fournit déjà `nb_contacts`/`nb_with_email` ; les 2 000 tâches |
| **Appels** | 6 en 2 vagues — *le nombre d'appels est bon, c'est le volume qui ne l'est pas* |
| **Volume** | **1 148 Ko de HTML** — le plus lourd payload RSC de l'application |
| **Transformations** | Serveur : comptage contacts/tâches par entreprise en JS (`Map`), regroupement sectoriel |
| **Cache** | Aucun |
| **Risques** | **Absence totale de pagination** · l'onglet Contacts est chargé même quand l'onglet Comptes est affiché · `AccountsContactsViews.tsx` = **2 726 lignes de composant client** hydratées avec l'intégralité du jeu |
| **Impact** | **FORT** — 0,35 s serveur, mais 1,1 Mo à parser et hydrater côté navigateur |

### 2.4 `/cockpit` — page d'accueil

| Élément | Contenu |
|---|---|
| **Finalité métier** | Synthèse décisionnelle : priorités, échéances, alertes, trajectoire |
| **Sources** | 10 tables **sans aucun filtre ni limite** + `getTrajectory2026()` |
| **Data critique** | Les 4 à 8 lignes réellement affichées par bloc |
| **Appels** | 14 en 2 vagues (bonne parallélisation) |
| **Volume lu** | **~480 Ko** dont `account_signals` **295 Ko (843 lignes)** et `calendar_events` **109 Ko (548 lignes)** — pour **111 Ko** de HTML final |
| **Transformations** | **100 % applicatives** : `cockpit-desktop-view-model.ts` filtre, trie et tronque à `.slice(0,4)`, `.slice(0,5)`, `.slice(0,8)`, `.slice(0,3)` |
| **Cache** | Aucun |
| **Risques** | Le lot le plus pur d'« agrégation applicative qui devrait être en SQL » : 843 signaux transférés pour en afficher au plus 4 |
| **Impact** | **FORT** (croît linéairement avec les signaux — 745 → 843 en un mois) |

### 2.5 `/missions/opps` — Opportunités

| Élément | Contenu |
|---|---|
| **Sources** | `opportunities` (×2), `opportunity_candidates` (**×2, en série**), `opportunity_skills`, `person_skills`, `calendar_events`, `candidates`, `profiles` |
| **Appels** | 9 en **4 vagues** |
| **Risques** | Cascade `profiles → opportunities → opportunity_candidates → {4 requêtes filtrées par `in(ids)`}` — motif **N+1 aplati** : correct fonctionnellement, mais chaque palier coûte un aller-retour complet |
| **Impact** | **MOYEN — 0,41 s**, dont ~75 % de latence de cascade |

### 2.6 `/reports`

| Élément | Contenu |
|---|---|
| **Sources** | `intelligence_documents` (**5 requêtes**, dont 4 comptages `head:true` renvoyant 0 octet), `companies`, `intelligence_document_versions` |
| **Risques** | **4 allers-retours pour 4 compteurs** qu'un seul `GROUP BY status` produirait · `intelligence_document_versions` renvoie **144 Ko de `brief_json`** pour une liste de 24 documents |
| **Impact** | **MOYEN — 0,41–0,48 s** |

### 2.7 `/agenda` — le seul défaut gratuit

`/agenda` **redirige** vers `/agenda?view=week&date=<aujourd'hui>` — mais la redirection est émise
**depuis l'intérieur d'une frontière Suspense**, donc *après* le début du streaming. Mesuré :

```
GET /agenda                    → 200, 61 510 octets de squelette, puis NEXT_REDIRECT 307
GET /agenda?view=week&date=…   → 200, 200 107 octets, 8 requêtes en 3 vagues, 350 ms
```

Le navigateur télécharge 61 Ko de HTML **et amorce le téléchargement des 26 chunks JS** pour un
contenu qui sera jeté. Coût : un aller-retour serveur complet, systématiquement, à chaque clic sur
« Agenda » dans la navigation.

### 2.8 Pages saines — à ne pas toucher

| Route | total | Pourquoi elle va bien |
|---|---:|---|
| `/finance` | 0,13 s | 6 requêtes, colonnes explicites, agrégats `GENERATED` lus en base |
| `/missions` | 0,17 s | **Chaque vue `?vue=` ne charge que ses propres données** — le modèle à généraliser |
| `/consultants` | 0,20 s | Idem : distribution serveur par `?section=`/`?module=`, modules lazy |
| `/intelligence` | 0,28 s | 8 requêtes en 2 vagues, `Suspense` interne correct |

`/missions` et `/consultants` sont **la référence architecturale de KREDO en matière de chargement
contextuel**. Toute correction proposée dans cet audit consiste à étendre leur motif, pas à en
inventer un nouveau.

---

## 3. Les données les plus sollicitées

| Table / vue | Sites d'appel dans le code | Charge réelle constatée |
|---|---:|---|
| `companies` | 60 | Blob `metadata` (14 Ko/ligne) encore tiré par 14 requêtes |
| `opportunities` | 54 | Sain |
| `profiles` | **47** | **La résolution du workspace est réimplémentée 24 fois sur le chemin de rendu** |
| `intelligence_documents` | 44 | `current_content_json` / `brief_json` tirés dans des listes |
| `account_signals` | 18 | 295 Ko sur `/cockpit`, 139 Ko sur `/veille` |
| `calendar_events` | 35 | 109 Ko non filtrés sur `/cockpit` |

---

## 4. Points de congestion, classés

1. **Le nombre d'allers-retours** — 33 et 42 sur les deux pages les plus lentes, en 5 et 7 vagues.
2. **Le blob `companies.metadata`** — 378 Ko par ouverture de fiche compte pour **0 octet** d'information effectivement lue (démonstration en [03](03-DATABASE-AUDIT.md) §3).
3. **Les jeux de données complets sérialisés vers le client** — 1,15 Mo sur `/prospection/accounts`, 595 Ko sur `/veille`.
4. **Le socle JS de 1,42 Mo** identique sur chaque page, dont 237 Ko de `@supabase/supabase-js` et 132 Ko d'hôtes de tiroirs rendus systématiquement.
5. **La résolution d'identité** — `getUser()` réseau et `createClient()` par module, qui annule le bénéfice de `getClaims()`.
