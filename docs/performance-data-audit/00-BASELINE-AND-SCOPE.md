# 00 — Baseline et périmètre

> **Relevé le 2026-09-10.** Toutes les valeurs de ce fichier sont des **mesures**, pas des
> estimations. Le protocole de reproduction est en §5 : il doit être rejoué à l'identique
> avant/après chaque lot, sinon les comparaisons n'ont aucune valeur.

---

## 1. Ce que cet audit mesure — et ce qu'il ne mesure pas

L'objet est le **temps d'ouverture d'une page** et la **fluidité de navigation**, décomposés en :

| Étage | Grandeur mesurée | Outil |
|---|---|---|
| Base | temps SQL, plans, index, RLS | `pg_stat_statements`, `EXPLAIN`, advisors Supabase |
| Réseau app→base | nombre d'allers-retours PostgREST, latence unitaire, octets transférés | instrumentation `KREDO_PERF_TRACE` (Lot 0) |
| Serveur | TTFB, durée totale de la réponse streamée, taille du flux RSC | `curl -w` sur build de production |
| Client | poids JS par route, socle commun, nombre de chunks | analyse de `.next/static` |

**Hors périmètre mesuré** : Core Web Vitals terrain (LCP/INP réels sur appareils utilisateurs).
`@vercel/speed-insights` est installé et actif en production — les données existent côté Vercel
mais ne sont pas accessibles depuis cette session. C'est la seule zone d'ombre de l'audit.

---

## 2. Topologie — le fait structurant

| Élément | Valeur | Source |
|---|---|---|
| Base Supabase | projet `jvzgmhvwirsbdkjpmvla`, **région `eu-west-1`** (Irlande) | API Management Supabase |
| PostgreSQL | 17.6, `shared_buffers` = **224 Mo**, `max_connections` = **60** | `pg_settings` |
| Connexions PostgREST (`authenticator`) | **11** | `pg_stat_activity` |
| Hébergement front | Vercel, plan **hobby** (mono-région) | API Vercel |
| Région d'exécution Vercel | **non déterminée** — aucun `vercel.json`, aucun `.vercel/project.json` dans le repo | inspection |

> 🔴 **Point à trancher avant tout autre travail (coût : 2 minutes).**
> Le défaut Vercel est `iad1` (Washington DC). Si les fonctions tournent en `iad1` et la base en
> `eu-west-1`, **chaque aller-retour PostgREST traverse l'Atlantique** (~80–90 ms incompressibles),
> et les pages les plus bavardes de KREDO en font 33 à 42. Vérifier dans les *Project Settings →
> Functions → Region* de Vercel ; si ce n'est pas une région `eu-*`, la basculer sur `dub1`
> (Dublin) est le geste au meilleur rapport gain/effort de tout cet audit, avant toute
> modification de code.
> Cet audit ne peut pas conclure à sa place : il ne dispose pas de la configuration déployée.

---

## 3. Baseline base de données

Fenêtre `pg_stat_statements` : réinitialisée le **2026-09-09 02:24 UTC**, âge au relevé **21 h 32**.

### 3.1 Volumétrie — la base est petite, et ce n'est pas une opinion

| Mesure | Valeur |
|---|---|
| Taille totale | **124 Mo** |
| Plus grosse table | `audit_log` — **71 Mo pour 14 142 lignes** (57 % de la base) |
| Plus grosse table métier | `account_signals` — 843 lignes / 1,6 Mo |
| `companies` / `persons` / `contacts` | 112 / 706 / 642 lignes |
| Index | **484**, 12 Mo cumulés |
| Policies RLS | **258**, dont **0** non wrappées `(SELECT …)` (acquis du Lot 1 de l'audit 2026-07) |

### 3.2 Répartition du temps CPU base sur 21 h 32

| Requête | Part | Appels | Moyenne | Max |
|---|---:|---:|---:|---:|
| Décodage WAL Realtime (`wal->>…`) | **84,49 %** | 100 269 | 5,43 ms | 392 ms |
| `SELECT name FROM pg_timezone_names` | **5,68 %** | **41** | **891 ms** | **2 171 ms** |
| Introspection de schéma PostgREST (4 requêtes) | ~2,6 % | 41–67 | 41–207 ms | 547 ms |
| **Toutes les requêtes applicatives réunies** | **< 3 %** | — | 1–80 ms | — |

Deux lectures, toutes deux nécessaires :

1. **En valeur absolue, la base est au repos.** 644 s de CPU cumulé sur une fenêtre de 77 538 s,
   soit **0,83 % d'un cœur**. Conclusion identique à celle de l'ADR-0016 : *aucune requête
   applicative ne justifie une optimisation SQL pour elle-même.*
2. **Les 41 rechargements du cache de schéma PostgREST sont un vrai risque de latence.**
   Chacun coûte ~1,25 s de travail base (`pg_timezone_names` + introspection). Pendant un
   rechargement, PostgREST met les requêtes en file. À raison d'un toutes les ~30 minutes, une
   navigation utilisateur tombe dedans régulièrement et paie **+1 à +2 s** sans aucune cause
   applicative. Cause à instruire (§ [03-DATABASE-AUDIT](03-DATABASE-AUDIT.md) §4).

### 3.3 Advisors Supabase (performance)

| Avertissement | Nombre | Gravité réelle |
|---|---:|---|
| `unused_index` | 272 | **Ininterprétable** — les compteurs `pg_stat_user_indexes` ont été remis à zéro récemment. Ne rien supprimer sur cette base. |
| `unindexed_foreign_keys` | 1 (`source_collection_metrics_source_catalog_id_fkey`) | Négligeable (130 lignes) |
| `duplicate_index` | 1 — `companies_siren_unique_idx` ≡ `companies_workspace_siren_uniq` | Réel mais marginal (112 lignes) |

**Aucun index manquant n'a été démontré par cet audit.** Voir §5 du document 03 pour la méthode.

---

## 4. Baseline application — mesures par route

Build de production (`next build` + `next start`), session authentifiée réelle, **3 passes par
route, valeur retenue = passe à chaud**. `total` = durée jusqu'à la fin du flux HTML streamé,
c'est-à-dire **le temps avant contenu utile** ; `TTFB` est partout à 10–25 ms grâce à
`src/app/(app)/loading.tsx` et ne discrimine rien.

| Route | total (chaud) | requêtes | vagues | HTML streamé | JS chargé (brut / gzip) |
|---|---:|---:|---:|---:|---:|
| `/prospection/accounts/[companyId]` | **1,14 s** | **33** | **5** | 220 Ko | ~1,6 Mo / ~425 Ko |
| `/veille` | **0,89 s** | **42** | **7** | 595 Ko | 1,81 Mo / 469 Ko |
| `/reports` | 0,41–0,48 s | 7 | 2 | 108 Ko | — |
| `/missions/opps` | 0,41–0,47 s | 9 | **4** | 125 Ko | 1,76 Mo / 465 Ko |
| `/automations` | 0,36 s | 11 | 3 | 145 Ko | — |
| `/prospection/accounts` | 0,35 s | 6 | 2 | **1 148 Ko** | 1,60 Mo / 423 Ko |
| `/agenda` | 0,01 s **puis** 0,35 s | 0 puis 8 | 3 | **61 Ko jetés** + 200 Ko | — |
| `/knowledge` | 0,24–0,39 s | 6 | 2 | 365 Ko | 1,55 Mo / 413 Ko |
| `/intelligence` | 0,28–0,32 s | 8 | 2 | 170 Ko | 1,66 Mo / 429 Ko |
| `/cockpit` | 0,22–0,25 s | 14 | 2 | 111 Ko | 1,55 Mo / 415 Ko |
| `/consultants` | 0,20 s | 8 | 2 | 87 Ko | — |
| `/missions` (synthèse) | 0,17 s | 11 | — | 204 Ko | — |
| `/finance` | 0,13 s | 6 | — | 137 Ko | — |

### 4.1 Coût unitaire d'un aller-retour PostgREST

Requête triviale (`profiles?select=workspace_id&limit=1`), 10 passes **sur une connexion
réutilisée**, depuis le poste de développement :

```
59 · 68 · 73 · 75 · 81 · 84 · 91 · 94 · 104 · 164   → médiane ≈ 82 ms
```

Le temps SQL correspondant est **< 1 ms**. La latence est donc quasi intégralement du transport
et du traitement PostgREST/Cloudflare. **C'est le nombre d'allers-retours, pas leur contenu, qui
fait la latence d'une page KREDO.**

⚠️ Cette valeur est mesurée depuis un poste, pas depuis Vercel. Elle sera plus faible en
production **si et seulement si** les fonctions tournent en `eu-*` (cf. §2). Le **nombre**
d'allers-retours, lui, est identique partout — c'est la grandeur sur laquelle l'audit s'appuie.

### 4.2 Coût de la résolution d'identité

| Appel | 5 passes (ms) |
|---|---|
| `auth.getUser()` — même client | 96,7 · 160,1 · 141,2 · 117,6 · 102,2 |
| `auth.getClaims()` — **même client** | 86,9 · **0,7 · 1,0 · 0,5 · 0,4** |
| `auth.getClaims()` — **client neuf à chaque fois** | 97,0 · 94,6 · 77,7 · 184,2 · 105,4 |
| `createClient()` seul (aucun réseau) | 0,2–0,4 |

Deux enseignements, tous deux exploités au § [02-CODE-AUDIT](02-CODE-AUDIT.md) :
- `getUser()` **interroge toujours le réseau** (~100–160 ms), quel que soit le client.
- `getClaims()` n'est local **que si le client Supabase est partagé** : le premier appel télécharge
  le JWKS (~87 ms) et le met en cache **dans l'instance de client**. Avec un `createClient()` par
  module — le motif actuel, **282 sites d'appel** — le gain de `getClaims()` disparaît entièrement.

### 4.3 Poids JS client

| Mesure | Valeur |
|---|---|
| Total `.next/static` (non compressé) | **7,27 Mo** en 181 chunks |
| **Socle commun chargé sur *toutes* les pages `(app)`** | **1,42 Mo brut / 382 Ko gzip, 21 chunks** |
| Part spécifique à une route | 130–380 Ko brut |
| Composants `"use client"` | **604 / 902 `.tsx` (67 %)** |

Contenu identifié des 3 plus gros chunks du socle :

| Chunk | Taille | Contenu identifié |
|---|---:|---|
| `11b8--b8bsw1h.js` | 237 Ko | **`@supabase/supabase-js` complet** (GoTrue + Realtime + PostgREST + Storage) |
| `0jalrk9v5qf7s.js` | 227 Ko | `react-dom` |
| `0hu9chn5mt2v-.js` | 132 Ko | `AppOverlayHosts` + `IntelligencePanel` + `DesktopSidebar` + `AgendaEventDrawer` |

---

## 5. Protocole de reproduction

L'instrumentation est livrée dans le repo et **inerte hors variable d'environnement** :
`src/lib/supabase/perf-trace.ts`, branchée dans `src/lib/supabase/server.ts`.

```bash
# 1. Build de production isolé (ne pas écraser le .next d'un serveur de dev en cours)
git worktree add --detach /tmp/perfwt HEAD && cp -Rc node_modules /tmp/perfwt/ && cp .env.local /tmp/perfwt/
cd /tmp/perfwt && npm run build
```

```bash
# 2. Serveur instrumenté
KREDO_PERF_TRACE=1 npx next start --port 3100
```

```bash
# 3. Mesure d'une route (3 passes, la 3e fait foi)
curl -s -o /dev/null -H "Cookie: $KREDO_SESSION_COOKIE" -w "%{time_starttransfer} %{time_total} %{size_download}\n" http://localhost:3100/cockpit
```

Chaque ligne `[perf]` du journal serveur est **un aller-retour réseau**. Le champ `t0` est
l'offset d'émission : des `t0` identiques = requêtes parallèles, des `t0` par paliers croissants
= cascade (*waterfall*). `dur` inclut la lecture du corps, `bytes` est la taille de la réponse.

Le cookie de session se fabrique avec la clé service-role (`admin/generate_link` →
`auth/v1/verify` → encodage `sb-<ref>-auth-token` = `base64-` + base64(JSON de session)).

> ⚠️ **`dur` proche de 0,2 ms = requête dédupliquée par React**, pas requête rapide. Next 16
> mémoïse les `fetch` GET identiques au sein d'un même rendu. C'est ce qui rend les 6 lectures
> redondantes de `profiles` sur `/veille` quasi gratuites — mais uniquement quand l'URL est
> strictement identique.

---

## 6. Ce que la baseline établit, en une phrase

> La base de données de KREDO n'est pas lente ; l'application lui parle **trop de fois**, lui
> demande **des colonnes qu'elle ne lit pas**, et sérialise vers le navigateur **des jeux de
> données dont il n'affiche qu'une fraction** — le tout par-dessus un socle JS de 1,42 Mo
> identique sur chaque page.
