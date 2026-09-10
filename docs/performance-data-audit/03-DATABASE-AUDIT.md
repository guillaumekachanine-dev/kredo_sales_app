# 03 — Audit base de données et couche PostgREST

> **Conclusion à mettre en tête, parce qu'elle oriente tout le reste :**
> **aucune requête SQL de KREDO n'est lente.** La base tient en 124 Mo, la plus grosse table
> métier fait 843 lignes, les 258 policies RLS sont correctement wrappées, et l'ensemble des
> requêtes applicatives consomme **moins de 3 %** du CPU de l'instance.
> **Le coût est dans la couche PostgREST et dans le nombre d'appels, pas dans PostgreSQL.**

---

## 1. La mesure qui décide de tout : le coût d'un appel PostgREST

Source : `edge_logs` Supabase, champ `response.origin_time` — le **temps de traitement côté
Supabase**, hors réseau client. Fenêtre : 24 h de trafic réel (7 900 requêtes).

| Percentile (statut 200, n = 7 527) | Valeur |
|---|---:|
| p50 | **116 ms** |
| moyenne | 205 ms |
| p95 | **602 ms** |
| max | 3 802 ms |
| 504 Gateway Timeout | **2** (5 017 ms) |

Par table, sur les chemins les plus appelés :

| Chemin | appels/24 h | p50 | p95 | max |
|---|---:|---:|---:|---:|
| `/rest/v1/opportunities` | 824 | 118 ms | 555 ms | 2 042 ms |
| `/rest/v1/companies` | 616 | 102 ms | 519 ms | 1 324 ms |
| `/rest/v1/missions` | 530 | 105 ms | 625 ms | 1 790 ms |
| **`/auth/v1/.well-known/jwks.json`** | **427** | 89 ms | 331 ms | 661 ms |
| **`/rest/v1/profiles`** | **419** | 127 ms | 621 ms | 3 062 ms |
| `/rest/v1/calendar_events` | 322 | **221 ms** | 798 ms | 1 754 ms |
| **`/rest/v1/account_signals`** | 124 | **307 ms** | **1 037 ms** | 3 742 ms |
| `/rest/v1/tasks` | 184 | 134 ms | 782 ms | 3 802 ms |
| **`/auth/v1/user`** | **146** | 176 ms | 490 ms | 1 551 ms |

**Le temps SQL correspondant est de 1 à 5 ms** (`pg_stat_statements`). Les 110 à 600 ms restants
sont du traitement PostgREST et de l'attente de connexion.

> **Corollaire opérationnel :** une page qui fait 33 allers-retours en 5 vagues paie au minimum
> 5 × 116 ms, et à p95 5 × 602 ms = 3 s. **Réduire le nombre de vagues et le nombre d'appels est
> la seule optimisation base qui compte pour KREDO.** Ajouter des index n'apporterait rien : les
> plans sont déjà optimaux sur des tables de quelques centaines de lignes.

### 1.1 Pourquoi les requêtes parallèles ne sont pas gratuites — **CAUSE RACINE IDENTIFIÉE**

Journal PostgREST, 24 h :

```
"Connection Pool initialized with a maximum size of 10 connections"   × 43
```

**Le pool PostgREST fait 10 connexions.** `/cockpit` émet **14 requêtes simultanées**, `/veille`
en émet **17 dans sa première vague**. Au-delà de 10, les requêtes attendent une connexion libre.

C'est la mesure qui l'a montré : les mêmes requêtes prises isolément coûtent ~80 ms, et 80–200 ms
quand 13 partent ensemble. **La parallélisation au-delà de 10 requêtes ne réduit plus la latence,
elle la déplace dans la file du pool.**

Conséquence sur les recommandations : *paralléliser davantage n'est pas un levier ici.* Le levier
est de **supprimer des appels**.

### 1.2 PostgREST redémarre 43 fois par jour — **CONSTAT, cause non déterminée**

```
"Successfully connected to PostgreSQL 17.6 …"                          × 43
"Schema cache loaded 100 Relations, 104 Relationships, 42 Functions,
 0 Domain Representations, 4 Media Type Handlers, 1196 Timezones"      × 43
"Received a schema cache reload message on the pgrst channel"          × 101
"Config reloaded"                                                      × 45
"Warp server error: Thread killed by timeout manager"                  × 356
```

Soit **un redémarrage toutes les ~33 minutes**. Chacun recharge le cache de schéma, ce qui explique
exactement les 41 exécutions de `SELECT name FROM pg_timezone_names` à **891 ms de moyenne
(2 171 ms max)** relevées dans `pg_stat_statements` — 5,7 % du CPU de la base pour 41 appels.

Pendant un rechargement, PostgREST met les requêtes en file : **une navigation qui tombe dedans
paie 1 à 2 secondes sans aucune cause applicative.** Les 356 « Thread killed by timeout manager »
et les 2 × 504 à 5 017 ms sont cohérents avec ce phénomène.

**Ce n'est pas un défaut du code de KREDO.** C'est un comportement de la plateforme, à instruire
auprès du support Supabase avec ces trois éléments : fréquence des redémarrages, taille du pool,
et le fait que l'instance est dimensionnée `shared_buffers = 224 Mo` / `max_connections = 60`.

**Recommandation** — ouvrir un ticket Supabase. **Ne rien changer côté code sur cette base.**
Si la fréquence est liée au dimensionnement de l'instance, un passage au palier supérieur
supprimerait à la fois les redémarrages et l'étroitesse du pool à 10 — c'est potentiellement le
gain le plus large de tout l'audit, pour zéro ligne de code, mais **il ne doit pas être décidé sur
une supposition**.

---

## 2. Volumétrie et santé du schéma

| Mesure | Valeur | Verdict |
|---|---|---|
| Taille base | 124 Mo | Sain |
| Index | 484 / 12 Mo | Sain en volume |
| Policies RLS | 258, **0 non wrappée** | ✅ acquis du Lot 1 (2026-07) |
| `last_analyze` | 71/71 tables | ✅ acquis du Lot 5, seuils autoanalyze abaissés (migration 061) |
| Advisor `duplicate_index` | 1 : `companies_siren_unique_idx` ≡ `companies_workspace_siren_uniq` | À corriger, gain marginal |
| Advisor `unindexed_foreign_keys` | 1 : `source_collection_metrics_source_catalog_id_fkey` (130 lignes) | Négligeable |
| Advisor `unused_index` | 272 | **Ininterprétable** : compteurs récemment remis à zéro. **Ne rien supprimer.** |

### 2.1 Aucun index n'est recommandé par cet audit — et c'est un résultat

Méthode appliquée : `EXPLAIN (ANALYZE, BUFFERS)` sur les requêtes les plus lourdes du trafic réel.
Exemple, la pire (`account_signals`, p50 307 ms côté edge) :

```
Seq Scan on account_signals  (cost=0.00..126.43 rows=843 width=200)
                             (actual time=1.159..81.540 rows=843 loops=1)
  Buffers: shared hit=118
Planning: Buffers: shared hit=246
Planning Time: 3.812 ms   ·   Execution Time: 81.701 ms
```

Tout est en cache (`shared hit`), aucun `Rows Removed by Filter`, aucune jointure. **Un index ne
peut rien y faire : la requête demande la table entière.** Le correctif est applicatif — demander
moins de lignes (cf. [02](02-CODE-AUDIT.md) §B-2).

Détail à noter pour l'avenir : le **planning consomme plus de buffers que l'exécution** (246 contre
118). C'est la signature d'une table minuscule portant beaucoup d'index. Sans conséquence
aujourd'hui, mais c'est l'argument pour **ne pas ajouter d'index « au cas où »** sur cette base.

---

## 3. `companies.metadata` — la démonstration chiffrée

Sur le compte servant de témoin (`d977c578-…`), pour la requête « pairs du macro-secteur » émise
par [`sector-snapshot-data.ts:159`](../../src/lib/intelligence/sector-snapshot-data.ts) :

| Grandeur | Valeur |
|---|---:|
| Lignes | 10 |
| `metadata` — stocké compressé (TOAST) | 152 Ko |
| `metadata` — **transféré en JSON** | **309 Ko** |
| Colonnes réellement utiles (`name` + `legal_name` + `segment`) | **526 octets** |
| Alias effectivement extraits du blob | **0 octet** |

**309 Ko décompressés et transférés pour produire zéro information.** La migration
`060_company_metadata_projection` a résolu ce motif pour les vues de liste (39,4 ms → 3,47 ms) ;
ce chemin-ci lui a échappé.

**Migration recommandée** — colonnes générées `STORED`, construites uniquement d'opérateurs
`IMMUTABLE` (`->`, `->>`) :

```sql
alter table public.companies
  add column meta_aliases    jsonb generated always as (metadata -> 'aliases') stored,
  add column meta_legal_name text  generated always as (metadata ->> 'legal_name') stored,
  add column meta_company_name text generated always as (metadata ->> 'company_name') stored;
```

> ⚠️ **Deux pièges déjà payés une fois sur ce projet, à ne pas reproduire :**
> `jsonb_build_object()` est `STABLE` → interdit dans une colonne générée (`42P17`). Et le champ
> `identite.raison_sociale`/`identite.nom` lu par `metadataAliases()` demande un déréférencement à
> deux niveaux : `metadata -> 'identite' ->> 'raison_sociale'`, également `IMMUTABLE`.

**Gain : −378 Ko réseau et ~−600 ms** sur chaque ouverture de fiche compte.

---

## 4. `audit_log` : 57 % de la base pour une table que personne ne lit

| Mesure | Valeur |
|---|---:|
| Taille | **71 Mo** (sur 124 Mo de base) |
| Lignes | 14 142 |
| Plus ancienne | 2026-06-09 (3 mois) |
| Lectures applicatives sur la fenêtre | `seq_scan = 0`, `idx_scan = 0` |

Répartition du poids de la colonne `diff` :

| `entity_type` | lignes | poids `diff` | moyenne |
|---|---:|---:|---:|
| **`companies`** | 2 015 | **50 Mo** | **25 Ko/ligne** |
| `enrichment_proposals` | 2 688 | 2,9 Mo | 1,1 Ko |
| `intelligence_documents` | 323 | 2,3 Mo | 7,1 Ko |
| `account_signals` | 1 594 | 2,0 Mo | 1,3 Ko |

**Cause racine :** le trigger `private.log_audit()` sur `companies` écrit l'avant **et** l'après de
la ligne — donc **deux fois le blob `metadata` de 14 Ko** — à chaque mutation. 2 015 mutations ont
produit 50 Mo.

Trois conséquences, dans l'ordre d'importance :
1. **Volume WAL.** Chaque écriture sur `companies` génère ~25 Ko de WAL que le décodage logique
   Realtime doit parcourir — ce décodage est déjà **84,5 % du CPU de la base** (100 269 appels,
   544 s sur 21 h 32).
2. **Sauvegardes et restaurations** proportionnellement plus longues.
3. **Croissance non bornée** : aucune politique de rétention.

**Recommandations, par ordre de rentabilité :**
1. **Exclure `metadata` du `diff`** pour `companies` (`diff = to_jsonb(NEW) - 'metadata'`).
   Effort : une migration sur `private.log_audit()`. Gain : ~50 Mo, et autant de WAL en moins.
   Risque : faible — vérifier qu'aucune procédure d'audit métier ne relit ce champ.
2. **Rétention** : purge au-delà de 12 mois, via le job `pg_cron` existant.
3. **Ne pas** toucher au dispositif Realtime : l'[ADR-0016](../adr/ADR-0016-realtime-notifications-cout-mesure.md)
   l'a tranché sur mesure (0,83 % d'un cœur en absolu). Réduire le WAL en amont est la bonne
   manière d'en baisser le coût sans rouvrir la décision.

---

## 5. Ce que la base fait déjà bien — et qu'il faut utiliser

| Actif disponible | Utilisé par | Ignoré par |
|---|---|---|
| `v_active_account_signals` (exclut `dismissed`/`archived` + fenêtre 2 mois) → **98 lignes** au lieu de 843 | `/veille`, fiche compte | **`/cockpit`**, qui refait le filtre en JS sur 843 lignes |
| `companies.meta_*` (colonnes générées, migration 060) | `v_crm_account_list`, `resolveCompanyEmbed` | **`sector-snapshot-data.ts`**, `mobile-account-lookup.ts` |
| `missions.gross_margin_pct`, `collaborator_compensation.cjm`, agrégats `pnl_monthly` — colonnes `GENERATED` | `/finance`, `/missions` | — |
| `v_sector_knowledge_resolved` / `_items` (résolution segment→macro en SQL) | fiche compte, `/intelligence` | — |

**Le levier le plus rentable côté base n'est pas d'écrire du SQL neuf : c'est de brancher le code
sur ce qui existe déjà.**

Ordres de grandeur mesurés pour les deux substitutions les plus évidentes :

| Substitution | Lignes avant | Lignes après | Réduction |
|---|---:|---:|---:|
| `account_signals` → `v_active_account_signals` (`/cockpit`) | 843 (295 Ko) | **98** | **−88 %** |
| `calendar_events` sans filtre → fenêtre −7 j / +30 j (`/cockpit`) | 548 (109 Ko) | **35** | **−94 %** |

---

## 6. Ce qu'il ne faut PAS faire

| Tentation | Pourquoi non |
|---|---|
| Ajouter des index | Aucun plan ne les réclame ; le planning consomme déjà plus de buffers que l'exécution |
| Supprimer les 272 index « inutilisés » | Compteurs remis à zéro récemment — la donnée est ininterprétable |
| Créer des vues matérialisées | Les tables font 100 à 850 lignes ; le rafraîchissement coûterait plus que la lecture |
| Déplacer la logique métier en RPC pour économiser des allers-retours | Contraire à la doctrine du projet ; et le gain se capture en fusionnant des requêtes, sans SQL neuf |
| Rouvrir le dossier Realtime | Tranché par l'ADR-0016 sur mesure ; agir sur le WAL en amont (§4) est la voie |
| Paralléliser davantage | Le pool PostgREST fait **10** connexions (§1.1) |
