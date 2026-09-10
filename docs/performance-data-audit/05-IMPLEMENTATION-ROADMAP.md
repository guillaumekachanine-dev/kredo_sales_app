# 05 — Roadmap d'implémentation

> **Règle de conduite du chantier, non négociable.**
> Trois des cinq lots de l'audit de juillet 2026 ont vu leur prémisse invalidée par la mesure.
> Ici, **chaque lot commence et finit par une mesure**, avec le protocole de
> [00-BASELINE-AND-SCOPE](00-BASELINE-AND-SCOPE.md) §5. Un lot dont le gain mesuré est nul est
> **fermé sans action et consigné comme tel** dans [06-AUDIT-LEDGER](06-AUDIT-LEDGER.md) —
> c'est un résultat, pas un échec.

**Barrière de qualité imposée à chaque lot**, dans cet ordre :
`npm run typecheck` → `npm test` → `npm run check:server-boundary` → `npm run lint` (fichiers
touchés) → `npm run build`. `npm run test:n8n` en plus si un fichier de `n8n/workflows/` est touché.

---

## Lot 0 — Instrumentation · ✅ **LIVRÉ** (2026-09-10)

| | |
|---|---|
| **Livré** | [`src/lib/supabase/perf-trace.ts`](../../src/lib/supabase/perf-trace.ts) + branchement dans [`src/lib/supabase/server.ts`](../../src/lib/supabase/server.ts) |
| **Portée** | Trace chaque aller-retour PostgREST : table/vue, offset d'émission (`t0`), durée, octets |
| **Coût en production** | **Nul** — `createTracingFetch()` renvoie `undefined` hors `KREDO_PERF_TRACE=1`, donc `@supabase/ssr` garde son `fetch` par défaut |
| **Validation** | `typecheck` EXIT 0 · `vitest` **294 fichiers / 3 017 tests** verts (3 exécutions consécutives) · `check:server-boundary` EXIT 0 · `eslint` 0 erreur · `next build` EXIT 0 |

Sources de mesure complémentaires, **déjà disponibles, à utiliser plutôt qu'à outiller** :
- `edge_logs` Supabase, champ `response.origin_time` → latence réelle côté origine, par chemin
- `postgrest_logs` → taille du pool, redémarrages, timeouts
- `pg_stat_statements` → temps SQL (fenêtre ouverte le 2026-09-09 02:24 UTC)
- `@vercel/speed-insights`, déjà actif en production → Core Web Vitals terrain

**Rien d'autre à instrumenter.** Aucune stack d'observabilité supplémentaire n'est justifiée.

---

## Lot 1 — Vérifications sans code · **à faire en premier, en parallèle du reste**

| Action | Réf. | Effort | Sortie attendue |
|---|---|---|---|
| Lire la région d'exécution des fonctions Vercel ; basculer sur `dub1` si elle n'est pas `eu-*` | **F-0** | 2 min | Région consignée au ledger, **même si elle était déjà correcte** |
| Ouvrir un ticket Supabase : pool à 10, 43 redémarrages/jour, 356 « thread killed », 2× 504 | **F-10** | 15 min | Réponse du support consignée |

**Critère de sortie :** les deux réponses sont écrites au ledger. Aucune ligne de code.

> Ce lot peut, à lui seul, rendre une partie des lots suivants sans objet — d'où sa place.

---

## Lot 2 — Quick wins · **4 gestes, effort S, risque faible**

| # | Action | Fichier | Gain attendu |
|---|---|---|---|
| 2.1 | `getUser()` → `getCurrentUserId()`/`resolveCurrentWorkspaceId()` | `veille/page.tsx:43`, `veille/_data/veille-data.ts:26`, `source-management/data/get-source-management-snapshot.ts:48` | **−250 ms** sur `/veille` |
| 2.2 | Redirection `/agenda` remontée au-dessus du `Suspense` (ou lien de navigation canonique) | `AgendaDesktopPage.tsx:22` / `AgendaSection.tsx` | −1 navigation complète |
| 2.3 | `getKpis()` : 4 comptages → 1 requête | `reports/_data/get-reports-list.ts:446-481` | −3 appels, **−150 ms** |
| 2.4 | `brief_json` → projection `brief_json->what->>scenario` | `reports/_data/get-reports-list.ts:541-544` + `extractScenarioLabel` l.396 | **−140 Ko** |

**Mesure de sortie :** `/veille`, `/agenda`, `/reports` — nombre de requêtes, nombre de vagues,
`total`, octets. Comparaison chiffrée au tableau de [00](00-BASELINE-AND-SCOPE.md) §4.

**Points de vigilance :**
- 2.1 — **ne pas** toucher aux 63 `getUser()` des Server Actions : contrôle strict voulu, hors chemin de rendu.
- 2.2 — vérifier que les deep-links externes `/agenda` restent redirigés.
- 2.4 — couvrir les **trois** formes acceptées par `extractScenarioLabel` (`what.scenario`, `preset.scenario`, `scenario`).

---

## Lot 3 — Sur-récupération · **le meilleur rapport gain/risque du chantier**

### 3.1 Migration `meta_aliases` sur `companies` — **F-2**

```sql
alter table public.companies
  add column meta_aliases      jsonb generated always as (metadata -> 'aliases') stored,
  add column meta_legal_name   text  generated always as (metadata ->> 'legal_name') stored,
  add column meta_company_name text  generated always as (metadata ->> 'company_name') stored,
  add column meta_raison_sociale text generated always as (metadata -> 'identite' ->> 'raison_sociale') stored,
  add column meta_identite_nom text generated always as (metadata -> 'identite' ->> 'nom') stored;
```

Puis `sector-snapshot-data.ts:153,159` lit ces colonnes au lieu de `metadata`, et
`metadataAliases()` est adapté.

> ⚠️ `jsonb_build_object()` est `STABLE` → **interdit** dans une colonne générée (`42P17`).
> N'utiliser que `->` et `->>`, vérifiés `IMMUTABLE` au catalogue.
> Dry-run en transaction `ROLLBACK` avant application. Aligner le nom du fichier de migration sur
> le timestamp réellement enregistré dans `schema_migrations` (piège rencontré 3 fois sur ce projet).
> `npm run db:types` ensuite, et mise à jour de la section « Supabase — état de la base » du `CLAUDE.md`.

**Gain attendu : −378 Ko et ~−600 ms** sur `/prospection/accounts/[companyId]`.

### 3.2 `/cockpit` : brancher sur ce que la base fournit déjà — **F-5**

| Requête | Avant | Après |
|---|---|---|
| `account_signals` | 843 lignes / 295 Ko | `v_active_account_signals` + `.order("urgency_score").limit(50)` → **98 lignes max** |
| `calendar_events` | 548 lignes / 109 Ko | fenêtre `starts_at` −7 j / +30 j → **35 lignes** |
| `interactions` | table entière | agrégat SQL « dernier contact par compte » |

**Préalable non négociable** — prouver en SQL l'équivalence entre `v_active_account_signals` et le
filtre JS `INACTIVE_SIGNAL_STATUSES` (`cockpit-desktop-view-model.ts:14`), par `EXCEPT ALL` dans
les deux sens, **avant** de retirer le filtre applicatif. Méthode éprouvée au Lot 5 de l'audit
précédent.

### 3.3 Fiche compte : supprimer les doublons — **F-1a, F-1b**

- Fusionner les deux lectures `companies` (union des colonnes) et y intégrer `relation_type`, aujourd'hui lu par une 33ᵉ requête isolée en vague 5.
- Fusionner les deux lectures de `v_sector_knowledge_resolved`.

### 3.4 `/prospection/accounts` : comptage depuis la vue — **F-6a**

Supprimer le `Map` de comptage JS (`accounts-contacts-data.ts:371-377`) au profit de
`nb_contacts`/`nb_with_email`, **après preuve d'équivalence SQL**. Note : `buildAccount()` l.264
fait déjà `Math.max(contactCount, importedContacts)` — la substitution doit conserver ce
comportement ou documenter pourquoi elle l'abandonne.

### 3.5 `/missions/opps` : fusionner les deux lectures `opportunity_candidates` — **F-12**

**Mesure de sortie du Lot 3 :** `/prospection/accounts/[companyId]`, `/cockpit`,
`/prospection/accounts`, `/missions/opps`. Cible : fiche compte **1,14 s → ≤ 0,85 s**, cockpit
**−350 Ko de trafic**.

---

## Lot 4 — Bundle client · **le chantier jamais fait**

Le Lot 4 de l'audit de juillet 2026 n'a jamais été exécuté ; le socle JS est passé de 4,8 Mo à
**7,27 Mo** depuis. C'est le seul poste de l'audit précédent dont l'ordre de grandeur n'a jamais
été contredit — et il s'est aggravé.

| # | Action | Réf. | Gain |
|---|---|---|---|
| 4.1 | Rendre les 8 hôtes de `AppOverlayHosts` conditionnels à l'ouverture de leur store | **F-7** | −100 à −130 Ko bruts / page |
| 4.2 | `ANALYZE=true npm run build` et **publier le résultat au ledger** | **F-13** | mesure, pas de gain |
| 4.3 | Décider de la suite sur `@supabase/supabase-js` **à partir de 4.2 uniquement** | **F-13** | à chiffrer |

**Point de vigilance sur 4.1 :** valider **hôte par hôte** que rien ne dépend d'un montage
inconditionnel (abonnement à un événement, écoute d'un deep-link). C'est le lot le plus exposé au
risque de régression fonctionnelle silencieuse de tout le chantier.

**Mesure de sortie :** socle commun (brut + gzip) sur `/cockpit`, `/finance`, `/veille`, avec la
méthode de [00](00-BASELINE-AND-SCOPE.md) §4.3.

---

## Lot 5 — Chargement contextuel · **structurant, à n'engager qu'après mesure des Lots 2-4**

Le motif cible existe déjà en production dans KREDO : `/missions` (`?vue=`) et `/consultants`
(`?section=` / `?module=`), qui ne chargent que les données de la vue rendue et mesurent
respectivement **0,17 s** et **0,20 s**. **Il ne s'agit pas d'inventer une architecture, mais
d'étendre celle qui marche déjà.**

| # | Action | Réf. | Effort | Gain |
|---|---|---|---|---|
| 5.1 | `/prospection/accounts` : contacts chargés à l'ouverture de l'onglet + pagination | **F-6bc** | L | −500 Ko RSC |
| 5.2 | Fiche compte : ne charger que l'étape affichée | **F-1c** | L/XL | −700 ms |
| 5.3 | `/veille` : catalogue de sources et corpus à l'ouverture de leur onglet | **F-3c** | L | −5 à −8 appels |

**Condition d'entrée :** les Lots 2 et 3 sont mesurés et livrés. Si la fiche compte est déjà
descendue sous 0,5 s après le Lot 3, **5.2 devient discutable** — la décision se prend sur la
mesure, pas sur le plan.

**Point de vigilance :** `AccountsContactsViews.tsx` fait 2 726 lignes. La conversion se fait
**onglet par onglet**, chacun mesuré et livré séparément. Jamais d'un bloc.

---

## Lot 6 — Client Supabase partagé par requête · **structurant, transverse**

`export const getRequestClient = cache(createClient)` dans `src/lib/supabase/server.ts`, puis
convergence **progressive** des loaders de rendu (282 sites de `createClient()` aujourd'hui).

**Gain : 80–180 ms par page** résolvant une identité — c'est ce qui rend `getClaims()` réellement
local (0,4–1,0 ms au lieu de 77–184 ms).

**Périmètre exclu, délibérément :** Server Actions et routes API. `cache()` y est inerte (React
alloue un cache jetable hors rendu RSC) et le contrôle strict par `getUser()` y est voulu.
Le commentaire de [`workspace.ts`](../../src/lib/supabase/workspace.ts) le documente déjà.

**Point de vigilance :** partager un client change la portée des cookies écrits par `setAll`.
Conversion **loader par loader**, jamais par substitution globale.

---

## Lot 7 — Hygiène base · **aucun effet sur la latence perçue, à faire quand même**

| # | Action | Réf. |
|---|---|---|
| 7.1 | `private.log_audit()` : exclure `metadata` du `diff` sur `companies` | **F-11** |
| 7.2 | Rétention 12 mois sur `audit_log`, via le `pg_cron` existant | **F-11** |
| 7.3 | Supprimer l'index dupliqué `companies_siren_unique_idx` ≡ `companies_workspace_siren_uniq` | advisor |

**Ne pas** supprimer les 272 index signalés « inutilisés » : les compteurs ont été remis à zéro
récemment, la donnée est ininterprétable.

---

## Lot 8 — Validation globale

1. Rejouer le tableau complet de [00](00-BASELINE-AND-SCOPE.md) §4 (13 routes × 3 passes).
2. Relever `edge_logs` sur 24 h : p50/p95 d'`origin_time`, nombre d'appels, part de l'identité
   (aujourd'hui **992 appels / 182 s sur 7 900 / 1 597 s**).
3. Vérifier `@vercel/speed-insights` en production (LCP/INP) — seule mesure terrain disponible.
4. Chercher les régressions : nombre de routes du build inchangé, `vitest` vert, isolation RLS
   revérifiée si une migration a touché une vue (`security_invoker = true` reconduit explicitement).

**Cibles chiffrées du chantier complet :**

| Route | Aujourd'hui | Cible |
|---|---:|---:|
| `/prospection/accounts/[companyId]` | 1,14 s · 33 req. | **≤ 0,45 s · ≤ 15 req.** |
| `/veille` | 0,89 s · 42 req. | **≤ 0,45 s · ≤ 25 req.** |
| `/prospection/accounts` | 1 148 Ko HTML | **≤ 600 Ko** |
| `/cockpit` | ~480 Ko lus | **≤ 120 Ko** |
| Socle JS commun | 1,42 Mo brut | **≤ 1,25 Mo** |
| Part identité du trafic Supabase | 11,4 % | **≤ 4 %** |

---

## Séquence recommandée, en une ligne

> **Lot 1** (2 vérifications sans code, en parallèle de tout) → **Lot 2** (4 quick wins) →
> **mesurer** → **Lot 3** (sur-récupération) → **mesurer** → **Lot 4** (bundle) → **mesurer** →
> décider si les Lots 5 et 6 restent justifiés → **Lot 7** (hygiène) → **Lot 8** (validation).
