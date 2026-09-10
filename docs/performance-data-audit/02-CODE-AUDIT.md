# 02 — Audit du code applicatif

> Chaque constat cite **fichier:ligne** et s'appuie sur une trace `[perf]` ou un compteur.
> Ce qui relève de l'hypothèse est explicitement marqué **HYPOTHÈSE**.

---

## A. Résolution d'identité — le préambule payant

### A-1. `getUser()` sur le chemin de rendu · **CONSTAT**

`auth.getUser()` interroge l'API Auth Supabase par le réseau à **chaque** appel : 96,7 · 160,1 ·
141,2 · 117,6 · 102,2 ms mesurés sur 5 passes du **même** client. `getClaims()` vérifie la
signature localement.

Inventaire à la source (classement par présence de `"use server"`) :

| Contexte | Fichiers | Appels |
|---|---:|---:|
| Server Actions (mutations — coût ponctuel, **choix délibéré, à conserver**) | 47 | 63 |
| Routes API (une par action utilisateur — hors chemin de rendu) | 9 | 9 |
| **Chemin de rendu** | **4** | **4** |

Les 4 sites du chemin de rendu :

| Fichier | Page servie |
|---|---|
| [`src/app/(app)/veille/page.tsx:43`](../../src/app/(app)/veille/page.tsx) | `/veille` |
| [`src/app/(app)/veille/_data/veille-data.ts:26`](../../src/app/(app)/veille/_data/veille-data.ts) | `/veille` |
| [`src/features/source-management/data/get-source-management-snapshot.ts:48`](../../src/features/source-management/data/get-source-management-snapshot.ts) | `/veille` |
| [`src/lib/staffing-matching/collect-matching-input.ts:16`](../../src/lib/staffing-matching/collect-matching-input.ts) | matching (hors rendu de page) |

**Trois des quatre sont sur `/veille`**, et la trace le confirme :

```
[perf] AUTH t0=    0ms dur=  194.8ms  /auth/v1/user
[perf] REST t0=  196ms dur=  102.4ms  profiles select=workspace_id
[perf] REST t0=  306ms …                ← première donnée métier
```

**306 ms de préambule strictement séquentiel** avant la première donnée. Sur une page mesurée à
890 ms, c'est **34 % du temps total**.

Le protocole d'audit de juillet 2026 (Lot 3) avait converti 4 fichiers au résolveur partagé ; le
reste du code, écrit depuis, a repris l'ancien motif. Ce n'est pas une régression du Lot 3, c'est
l'absence de garde-fou : rien n'empêche d'écrire `getUser()` sur un chemin de rendu.

**Recommandation** — remplacer par `getCurrentUserId()` / `resolveCurrentWorkspaceId()`
([`src/lib/supabase/workspace.ts`](../../src/lib/supabase/workspace.ts)) sur ces 3 fichiers.
Ne **pas** toucher aux 63 appels des Server Actions : contrôle plus strict, hors chemin critique,
décision déjà motivée dans le code.
**Gain attendu : ~250 ms sur `/veille`.** Effort : 3 fichiers. Risque : nul (même fenêtre de
révocation que la RLS, cf. commentaire de `workspace.ts`).

### A-2. Un client Supabase par module annule le bénéfice de `getClaims()` · **CONSTAT**

`createClient()` est appelé **282 fois** dans `src/`. Chaque appel construit un `SupabaseClient`
neuf — donc un `GoTrueClient` neuf, **avec son propre cache JWKS**.

| Appel | 5 passes (ms) |
|---|---|
| `getClaims()` — **client partagé** | 86,9 · **0,7 · 1,0 · 0,5 · 0,4** |
| `getClaims()` — **client neuf** | 97,0 · 94,6 · 77,7 · 184,2 · 105,4 |

Autrement dit : **la vérification « locale » du JWT coûte un aller-retour réseau complet dès que
le client n'est pas partagé.** `workspace.ts` a bien un `cache(createClient)` interne, mais il ne
sert qu'à ses deux résolveurs ; les 282 autres sites créent chacun le leur.

**Recommandation** — exporter le client mémoïsé par requête depuis `src/lib/supabase/server.ts` :

```ts
export const getRequestClient = cache(createClient)   // cache() de React, portée = un rendu
```

et faire converger les loaders de rendu dessus. **Ne pas** l'imposer aux Server Actions et routes
API (`cache()` y est inerte — le commentaire de `workspace.ts` le dit déjà).
**Gain attendu : 80–180 ms sur chaque page qui résout une identité.** Effort : moyen (conversion
progressive, aucun changement de signature). Risque : faible, mais **à faire loader par loader**,
jamais par `sed` global — le partage de client change la portée des cookies écrits.

### A-3. La lecture de `profiles.workspace_id` est réimplémentée 24 fois · **CONSTAT**

`from("profiles")` apparaît dans **34 fichiers / 46 appels**, dont **24 fichiers sur le chemin de
rendu**. Sur `/veille`, la trace montre **7 lectures de `profiles` pour un seul rendu**.

Elles ne sont pas catastrophiques parce que **Next 16 mémoïse les `fetch` GET identiques dans un
même rendu** : les 6 doublons coûtent 2,2–2,5 ms au lieu de ~100 ms. Preuve directe dans la trace
de `/automations` : `account_watch_settings select=cadence [is_enabled=eq.true]` apparaît deux
fois, la seconde à **`dur=0.2ms`**.

Mais cette protection est fragile : elle ne joue que si l'URL est **strictement** identique. Deux
loaders qui demandent `workspace_id` et `workspace_id,role` — cas réel sur `/veille` — paient
deux fois le plein tarif.

**Recommandation** — passage au résolveur partagé, même geste que A-2. Gain propre modeste,
mais c'est la condition pour que A-2 produise son effet.

---

## B. Sur-récupération — le poste le plus lourd

### B-1. `companies.metadata` sur la fiche compte : 378 Ko pour 0 octet utile · **CONSTAT MESURÉ**

[`src/lib/intelligence/sector-snapshot-data.ts:146-163`](../../src/lib/intelligence/sector-snapshot-data.ts)
charge, à chaque ouverture de fiche compte, **tous les comptes du segment** puis **tous les comptes
du macro-secteur**, avec la colonne `metadata` :

```ts
supabase.from("companies").select("id,name,legal_name,segment,metadata").eq("segment_id", segmentId)
supabase.from("companies").select("id,name,legal_name,segment,metadata").eq("sector_id", resolved.macro_id)
```

Trace mesurée sur `/prospection/accounts/d977c578-…` :

```
companies … [segment_id=eq.…]  dur=568.8ms  bytes= 68 791
companies … [sector_id=eq.…]   dur=641.7ms  bytes=309 427
```

Ce que ces 378 Ko servent à produire : `metadataAliases()`
([`client-intelligence-sector.ts:420-430`](../../src/lib/intelligence/client-intelligence-sector.ts)),
qui n'en extrait que `aliases`, `legal_name`, `company_name`, `identite.raison_sociale`,
`identite.nom` — des chaînes courtes servant à rapprocher un compte KREDO d'un acteur cartographié.

Vérification en base sur ce compte précis :

| Grandeur | Valeur |
|---|---:|
| Comptes du macro-secteur | 10 |
| `metadata` transféré (JSON brut) | **309 Ko** |
| Colonnes réellement utiles (`name`+`legal_name`+`segment`) | **526 octets** |
| **Alias effectivement lus dans `metadata`** | **0 octet** |

Aucun de ces 10 comptes ne porte `aliases`, `legal_name` ni `company_name` dans son blob. La
requête transfère **309 Ko pour produire zéro information**.

C'est exactement le motif corrigé par la migration `060_company_metadata_projection` (audit
2026-08) sur les vues — non appliqué ici parce que ce chemin n'était pas dans le périmètre du
Lot 5.

**Recommandation** — colonne générée `meta_aliases jsonb` (opérateurs `->`/`->>` uniquement, tous
`IMMUTABLE` ; `jsonb_build_object` est `STABLE` et donc interdit — piège déjà documenté), puis
lecture de `id,name,legal_name,segment,meta_aliases`.
**Gain attendu : −378 Ko réseau et ~−600 ms sur la vague 4 de la fiche compte.**
Effort : 1 migration + 1 fichier. Risque : faible (colonne additive, aucun consommateur cassé).

### B-2. `/cockpit` : 480 Ko lus pour afficher 4 lignes par bloc · **CONSTAT**

[`src/lib/cockpit/cockpit-desktop-data.ts:32-74`](../../src/lib/cockpit/cockpit-desktop-data.ts)
lance 10 requêtes **sans un seul filtre, sans une seule limite** :

```ts
supabase.from("account_signals").select("id,company_id,title,recommended_action,status,expires_at,urgency_score,detected_at")
supabase.from("calendar_events").select("id,title,starts_at,company_id,opportunity_id")
supabase.from("interactions").select("company_id,occurred_at")
…
```

Mesuré : `account_signals` **294 626 octets (843 lignes)**, `calendar_events` **109 186 octets
(548 lignes)**, pour **111 Ko** de HTML final.

Le tri et la troncature ont lieu en JavaScript, dans
[`cockpit-desktop-view-model.ts`](../../src/lib/cockpit/cockpit-desktop-view-model.ts) :
`.slice(0, 4)` (l.181), `.slice(0, 5)` (l.230), `.slice(0, 8)` (l.253), `.slice(0, 3)` (l.300),
et `INACTIVE_SIGNAL_STATUSES` (l.14) exclut `dismissed`/`archived`/`expired` **après** transfert.

Aggravant : la base fournit déjà `v_active_account_signals` — une **vue défensive** qui applique
exactement ce filtre plus une fenêtre de 2 mois (migration `account_signal_lifecycle_actions`).
Le cockpit ne l'utilise pas ; `/veille` et la fiche compte, si.

**Recommandation, par ordre de coût croissant :**
1. `account_signals` → `v_active_account_signals` + `.order("urgency_score", …).limit(50)`.
2. `calendar_events` : borner `starts_at` à la fenêtre réellement affichée (aujourd'hui + 30 j).
3. `interactions` : n'est utilisé que pour une date de dernier contact par compte → remplaçable par un agrégat SQL.

**Gain attendu : −380 Ko réseau, et surtout un coût qui cesse de croître avec le volume de
signaux** (745 → 843 lignes en un mois). Effort : faible. Risque : faible, mais **vérifier
l'équivalence** de la vue avec le filtre JS avant de retirer ce dernier.

### B-3. `/prospection/accounts` : 642 contacts sérialisés pour afficher une liste de comptes · **CONSTAT**

[`accounts-contacts-data.ts:339-360`](../../src/lib/accounts-contacts/accounts-contacts-data.ts) —
`getAccountsContactsData()` charge en parallèle :

| Requête | Octets mesurés |
|---|---:|
| `v_crm_account_list` (35 colonnes, `limit 1000`) | 200 180 |
| **`contacts` + embed `persons` (`limit 1000`)** | **364 044** |
| `tasks` (`limit 2000`) | 4 320 |
| `sector_intelligence` | 10 119 |

Résultat : **1 148 Ko de flux RSC**, tout entier passé en props à
[`AccountsContactsViews.tsx`](../../src/components/accounts-contacts/AccountsContactsViews.tsx) —
**2 726 lignes de composant client**, donc 1,15 Mo à désérialiser et hydrater dans le navigateur.

Les 642 contacts servent à deux choses seulement :
- un `Map` de comptage par entreprise (l.371-377) — **alors que la vue expose déjà `nb_contacts`
  et `nb_with_email`**, et que `buildAccount()` (l.264) fait déjà `Math.max(contactCount, importedContacts)` ;
- l'onglet « Contacts », qui n'est pas forcément affiché.

**Recommandation :**
1. Supprimer le comptage JS et s'appuyer sur `nb_contacts`/`nb_with_email` de la vue — **après
   avoir prouvé l'équivalence en SQL** (`EXCEPT ALL` dans les deux sens), comme au Lot 5.
2. Charger les contacts **à l'ouverture de l'onglet Contacts**, sur le modèle de `?section=` de
   `/consultants`.
3. Paginer la liste des contacts (642 lignes aujourd'hui, sans pagination).

**Gain attendu : −364 Ko réseau et −~500 Ko de flux RSC**, soit environ **la moitié du payload**
de la page la plus lourde de l'application. Effort : moyen (touche la navigation par onglets).
Risque : moyen — `AccountsContactsViews` est un composant de 2 726 lignes ; **la conversion doit
être faite onglet par onglet, pas d'un bloc.**

### B-4. `/reports` : 144 Ko de `brief_json` pour extraire une chaîne · **CONSTAT**

[`get-reports-list.ts:541-544`](../../src/app/(app)/reports/_data/get-reports-list.ts) charge
`document_id, version_number, qa_flags, brief_json` pour **toutes les versions** des 24 documents
listés — mesuré à **144 509 octets**.

Usage réel : `extractScenarioLabel()` (l.396-405) en tire `brief.what.scenario`, **une chaîne**.

**Recommandation** — `select("document_id, version_number, qa_flags, brief_json->what->>scenario")`
(PostgREST accepte la projection JSON dans `select`), ou une colonne générée si l'expression se
révèle non `IMMUTABLE`. **Gain : −140 Ko.** Effort : 1 ligne + adaptation de `extractScenarioLabel`.
Risque : faible (couvrir les 3 formes acceptées : `what.scenario`, `preset.scenario`, `scenario`).

### B-5. Huit `select("*")` sur `/veille` · **CONSTAT**

`veille-data.ts` lignes 205, 223, 235, 255, 268, 286, 297 et `veille/page.tsx:95` — dont
`veille_articles select=*` (**113 836 octets**), `source_catalog select=*` (44 589),
`source_corpus_items select=*` (44 595), `v_source_effectiveness_30d select=*` (8 548).

**Recommandation** — colonnes explicites. Gain estimé **HYPOTHÈSE : −40 à −60 %** sur ces quatre
requêtes ; à mesurer avant/après plutôt qu'à annoncer.

---

## C. Cascades et allers-retours

### C-1. `/prospection/accounts/[companyId]` : 33 requêtes en 5 vagues · **CONSTAT**

Deux défauts distincts dans cette cascade :

**Doublons stricts.** Deux lectures de la fiche du même compte, à la même vague, avec des listes
de colonnes différentes (donc **non dédupliquées** par Next) :
`companies select=id,name,sector,sector_id,segment_id,segment,priority,lifecycle_status,website,metadata`
(34 329 o) et `companies select=id,name,legal_name,sector,sector_id,…` (35 474 o).
Idem `v_sector_knowledge_resolved`, appelée deux fois (t0=1545 puis t0=1689) avec des projections
différentes. Et une 33ᵉ requête isolée en vague 5 pour la seule colonne `companies.relation_type`.

**Un appel Storage sur le chemin de rendu** : signature d'URL
`ai_intelligence_process_diagnostics/…` (102,6 ms) émise pendant le rendu du serveur.

**Recommandation :**
1. Fusionner les deux lectures `companies` en une seule projection (union des colonnes) et faire
   remonter `relation_type` dedans → **−2 allers-retours**.
2. Fusionner les deux `v_sector_knowledge_resolved` → **−1 aller-retour**.
3. Ne charger que **l'étape affichée** du hub : les 5 étapes sont chargées systématiquement alors
   que l'écran en montre une. C'est le motif déjà appliqué par `/consultants` (`?section=`) et
   `/missions` (`?vue=`). **C'est le seul changement structurel recommandé par cet audit.**

**Gain attendu : 1,14 s → ~0,4 s**, soit la plus grosse amélioration unitaire du chantier.
Effort : élevé pour le point 3, faible pour 1 et 2. Risque : moyen — le hub partage un modèle de
données entre étapes ; **livrer 1 et 2 d'abord, mesurer, puis décider de 3.**

### C-2. `/missions/opps` : cascade à 4 paliers · **CONSTAT**

`profiles` → `opportunities` → `opportunity_candidates` → `{opportunity_candidates,
opportunity_skills, person_skills, calendar_events}` filtrées par `in(ids)`.

Le motif est un **N+1 déjà aplati** (une requête par niveau, pas une par ligne) : c'est la bonne
forme. Le coût restant est la **profondeur** — 4 allers-retours en série, ~400 ms.

`opportunity_candidates` est interrogée **deux fois**, avec deux listes d'ids différentes
(t0=4593 et t0=4751) : les deux paliers pourraient être fusionnés.

**Recommandation** — fusionner les deux lectures de `opportunity_candidates` (−1 vague, ~−100 ms).
Ne **pas** convertir en RPC : le gain (~200 ms) ne justifie pas de déplacer de la logique métier
en SQL, contre la doctrine du projet.

### C-3. `/reports` : 4 allers-retours pour 4 compteurs · **CONSTAT**

[`get-reports-list.ts:446-481`](../../src/app/(app)/reports/_data/get-reports-list.ts) —
`getKpis()` émet 4 requêtes `count: "exact", head: true` (total, drafts, ready, used-this-month),
mesurées à 93,9 / 100,9 / 148,0 / 168,0 ms, **toutes renvoyant 0 octet de corps**.

**Recommandation** — une seule requête `select("status, last_used_at")` sur le même filtre, comptée
en JS (les volumes sont de l'ordre de la centaine de lignes), ou une vue d'agrégat si le volume
croît. **Gain : −3 allers-retours, ~−150 ms.** Effort : trivial. Risque : nul.

### C-4. `/agenda` : une navigation complète jetée · **CONSTAT**

[`AgendaDesktopPage.tsx:22`](../../src/components/agenda/AgendaDesktopPage.tsx) appelle
`redirect()` **à l'intérieur** de la frontière `Suspense` posée par `AgendaSection`. Conséquence
mesurée : la requête `/agenda` renvoie **200 OK avec 61 510 octets de squelette**, puis un
`NEXT_REDIRECT 307` en fin de flux.

Le navigateur a donc téléchargé 61 Ko de HTML et **amorcé le chargement des 26 chunks JS** pour un
document jeté — à chaque clic sur « Agenda » dans la navigation.

**Recommandation, par ordre de préférence :**
1. Faire pointer le lien de navigation directement sur la route canonique (le plus simple).
2. À défaut, remonter la normalisation **au-dessus** du `Suspense`, dans `page.tsx`, pour que le
   307 parte avant tout streaming.

**Gain : un aller-retour complet supprimé sur chaque ouverture d'Agenda.** Effort : faible.
Risque : faible — vérifier que les deep-links externes `/agenda` restent redirigés.

---

## D. Frontière serveur/client et bundle

### D-1. Les 8 hôtes de tiroirs sont chargés sur toutes les pages · **CONSTAT**

[`AppOverlayHosts.tsx`](../../src/components/layout/AppOverlayHosts.tsx) déclare 8 composants en
`next/dynamic({ ssr: false })` — puis **les rend tous les huit, inconditionnellement**.

`ssr: false` diffère le **rendu serveur**, pas le **chargement du chunk** : un composant rendu est
un composant dont le chunk est téléchargé. Vérification par recherche de symboles dans les chunks
du socle commun :

| Composant | Présent dans le socle chargé partout |
|---|---|
| `CommunicationComposerHost` | ✅ |
| `AssistanceCaseDrawer` | ✅ |
| `CrmIdentityDrawerHost` | ✅ |
| `ReportGenerationHost` | ✅ |
| `WatchAnalysisComposerHost` | ✅ |
| `CrmAccountLauncherHost` | ✅ |
| `LegacyNavigationDrawer` | ✅ |
| `EventDrawer` | ✅ |

Le chunk qui les agrège pèse **132 Ko** ; `CommunicationComposerHost` seul fait 1 096 lignes.

**Recommandation** — ne monter chaque hôte que lorsque son store zustand signale une ouverture :

```tsx
const { isOpen } = useCommunicationComposer()
return isOpen ? <CommunicationComposerHost device={device} /> : null
```

Le `next/dynamic` déjà en place fait alors réellement son travail.
**Gain attendu : −100 à −130 Ko bruts sur le premier chargement de chaque page.**
Effort : faible (8 gardes conditionnelles). Risque : **moyen** — vérifier que l'ouverture depuis
un lien profond fonctionne toujours ; certains hôtes s'abonnent peut-être à des événements au
montage. À valider hôte par hôte.

### D-2. `@supabase/supabase-js` complet dans le bundle navigateur — 237 Ko · **CONSTAT**

Le chunk `11b8--b8bsw1h.js` (237 Ko bruts) contient le SDK entier. 23 modules client l'importent,
mais l'usage **temps réel** se limite à **3 canaux** :

| Canal | Fichier | Portée |
|---|---|---|
| `automations-runs-journal` | `use-run-journal-realtime.ts:93` | page `/automations` |
| `kredo-workflow-indicator-${userId}` | `use-current-workflow-execution.ts:114` | **`AppShell` — toutes les pages** |
| `run-tracker-${runId}` | `use-run-tracker.ts:262` | pendant un run |

**HYPOTHÈSE, à instrumenter avant d'agir** : la majorité des 20 autres modules ne fait que des
`select` ponctuels, remplaçables par des Server Actions — ce qui sortirait le SDK du bundle des
pages qui n'ont pas de canal. Le chiffrage exact du gain demande un passage
`ANALYZE=true npm run build` (déjà outillé dans `next.config.ts`), non effectué dans cet audit.
**Ne pas engager ce chantier sans cette mesure.**

### D-3. 67 % de composants client · **CONSTAT, sans recommandation**

604 fichiers `"use client"` sur 902 `.tsx`. Le ratio est élevé, mais il n'est pas actionnable en
tant que tel : l'ADR-0006 et le design system imposent beaucoup d'interactivité. Le chiffre est
consigné comme **repère de dérive**, pas comme cible.

---

## E. Ce qui va bien — et qu'il ne faut pas « optimiser »

| Constat | Preuve |
|---|---|
| Les RLS sont correctes et sans surcoût | 258 policies, **0** non wrappée `(SELECT …)` |
| Les frontières Suspense de premier niveau sont en place | TTFB 10–25 ms sur **toutes** les routes |
| La distribution Desktop/Mobile ne charge pas la vue non rendue | `/missions`, `/consultants` : branches `?vue=`/`?section=` mesurées |
| Les colonnes générées (`gross_margin_pct`, `cjm`, `meta_*`) sont lues, pas recalculées | inspection des loaders finance |
| La pagination existe là où elle a été pensée | `/reports` (`pageSize` + `range`) |
| La déduplication `fetch` de Next amortit les lectures redondantes | `dur=0.2ms` sur le doublon `/automations` |

> ⚠️ **Piège à ne pas reproduire.** Trois des cinq lots de l'audit de juillet 2026 ont vu leur
> prémisse invalidée par la mesure (RLS, Realtime, `cacheComponents`). Le présent audit s'interdit
> donc toute recommandation non appuyée sur une trace — et signale ses deux seules hypothèses
> (B-5 et D-2) comme telles.
