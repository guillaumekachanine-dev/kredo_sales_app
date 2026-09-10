# Phase 7.3A — Contrat Data canonique de rentabilité mission

> **Statut : ✅ IMPLEMENTED / PASS (2026-09-10)**
> **Nature : DATA / DOMAIN MODEL. Aucune refonte UI, aucune migration Supabase, aucun n8n.**
> **Branche : `main`. Baseline `4e573c1b` (`HEAD == origin/main` au cadrage).**
> **Décision d'architecture : BUILDER PUR PARTAGÉ (option B). Vue Supabase écartée — voir §7.**

Ce document clôt le sous-lot **7.3A** de `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` §6.3.
Il débloque **7.3B (Engagements)** puis **7.3C (Finance)**.

---

## 1. Baseline

| Élément | Valeur |
|---|---|
| `git rev-parse HEAD` (départ) | `4e573c1bf61f2bd3b00089f880d8db8352828cdb` |
| `git rev-parse origin/main` (départ) | idem — synchronisés, working tree `clean` |
| Aucun travail parallèle en cours | `git status --short` vide |
| Migrations Supabase | inchangé (dernière prod `20260820200002`) |

---

## 2. Périmètre

**Dans le périmètre**
- Contrat métier unique de rentabilité mission (marge théorique **et** marge réelle).
- Branchement des deux chaînes concurrentes nommées au cadrage :
  - Finance : `getFinanceDashboardData()` → `missionProfitability` → `MissionProfitabilityTable`.
  - Engagements : `getEngagementsActivityAnalytics()` → `buildEngagementsActivityAnalytics()` → `EngagementsActivityDesktop`.
- Consolidation des primitives `computeRealMarginPct` / `computeTheoreticalMarginPct` (mission-detail-utils) comme **façade** déléguant au contrat.
- Tests de contrat + test de non-divergence.

**Hors périmètre (volontairement non mutualisé — §10)**
- `getFinanceDashboardData()` : P&L (`pnl_monthly`), pipe pondéré, funnel CRM, contribution practice, alertes Finance.
- `finance-mobile-model.ts` : projection P&L / forecast / objectifs — **ne calcule aucune marge par mission** (revenue-only `billable_days × tjm_snapshot`). Rien à mutualiser ici.
- `getEngagementsActivityAnalytics()` : productivité CRA, fermetures clients (`client_closures`), impact absences non prévues (`sick_days`).
- `engagements-portfolio-utils.ts` (**Atlas du portefeuille**, synthèse Engagements) : recalcule inline une marge réelle par engagement mais dans un read-model distinct (missions AT **+** projets forfait, fenêtre d'éligibilité propre `periodEnd <= today`). Dette identifiée §11 — à traiter en **7.3B** quand « Atlas du portefeuille » devient le module partagé (`11-*` §13).
- Toute refonte de libellé / chapitre / module (7.3B / 7.3C).

---

## 3. Audit Finance — CURRENT (`src/lib/finance/finance-data.ts`, avant 7.3A)

`missionProfitability` calculé inline dans `missions.map(...)` :

```
année de référence     = max(années de pnl_monthly)          ← PAS now.getFullYear()
CRA retenus            = period_start.getFullYear() === année de référence
billableDays           = Σ billable_days
revenue (si billable>0)= Σ billable_days × (tjm_snapshot ?? missions.tjm)   ← fallback contractuel
cost    (si billable>0)= Σ billable_days × (cjm_snapshot ?? missions.cjm)   ← fallback contractuel
marginValue            = revenue − cost
marginPct              = revenue > 0 ? (marginValue/revenue)×100 : (missions.gross_margin_pct ?? 0)
```

- **Toutes** les missions sont émises (quel que soit le statut).
- `marginPct` est **hybride** : marge réelle si CA, marge théorique sinon — exposé comme **une seule valeur** (`% MCO`).
- Consommé par `MissionProfitabilityTable`, `practiceContribution` (via `marginValue`/`revenue`), les alertes Finance (`m.marginPct < 25`), et `cockpit-data.ts` (via `lateBillings`).

## 4. Audit Engagements — CURRENT (`engagements-activity-utils.ts`, avant 7.3A)

`marginReality` via `buildEngagementsActivityAnalytics()` :

```
année de référence     = now.getFullYear()
missions retenues      = status = 'active' (filtre loader) ET ≥ 1 CRA de l'année
realPct                = computeRealMarginPct(CRA)          ← snapshots SEULS, pas de fallback
theoPct                = theoreticalMarginPct(mission)       ← ré-implémentation LOCALE de computeTheoreticalMarginPct
item émis si           = realPct ≠ null ET theoPct ≠ null ET billableDays > 0
theoreticalAvg/realAvg/gapAvg = moyenne NAÏVE des % par mission (non pondérée)
```

- `computeRealMarginPct` (mission-detail-utils) **déjà réutilisé** — la bonne primitive.
- `theoreticalMarginPct` **dupliqué** localement (formule identique).
- Marge théorique et marge réelle **correctement séparées** dans `MarginRealityItem`.
- Agrégats portefeuille = **moyenne naïve** des pourcentages (≠ pondération valeur de `practiceContribution` côté Finance).

---

## 5. Sources Supabase (lecture seule, vérifiées live le 2026-09-10)

| Table / colonne | Type | Remarque |
|---|---|---|
| `missions.tjm` / `missions.cjm` | `numeric` **NOT NULL** | jamais nul en base |
| `missions.gross_margin_pct` | `numeric` **GENERATED** | `round((tjm - cjm) / NULLIF(tjm,0) * 100, 2)` — null seulement si `tjm = 0` (0 ligne concernée) |
| `mission_activity_reports.billable_days` | `numeric` NOT NULL | |
| `mission_activity_reports.tjm_snapshot` / `cjm_snapshot` | `numeric` **NOT NULL** | 0 ligne à 0 → **le fallback `?? missions.tjm/cjm` de Finance était du code mort** |
| `mission_activity_reports.activity_rate_percent` | `numeric` GENERATED | `round(billable_days / NULLIF(business_days,0) * 100, 1)` |
| `pnl_monthly` | mensuel consolidé | **aucune granularité mission** — reste une projection Finance |

État data : 33 missions (26 actives), **toutes** portent des CRA ; CRA de `2026-01` à `2026-11` ; `pnl_monthly` de `2025-06` à `2026-08`.
→ `max(pnl year)` = `now.getFullYear()` = **2026 aujourd'hui** : les deux chaînes coïncident *actuellement*, la divergence de période est **latente** (elle s'ouvre dès que `pnl_monthly` prend un exercice de retard).

---

## 6. Matrice des vérités métier

| Métrique | Source relationnelle | Champ | Période | Finance CURRENT | Engagements CURRENT | Écart | Contrat canonique 7.3A |
|---|---|---|---|---|---|---|---|
| TJM contractuel | `missions` | `tjm` | n/a | `m.tjm` | `m.tjm` | — | `MissionProfitabilityMissionInput.tjm` (inchangé, affichage) |
| CJM contractuel | `missions` | `cjm` | n/a | `m.cjm` | `m.cjm` | — | `…Input.cjm` (inchangé, affichage) |
| TJM snapshot CRA | `mission_activity_reports` | `tjm_snapshot` | CRA | utilisé (fallback `m.tjm`) | utilisé (sans fallback) | fallback mort | `…ReportInput.tjmSnapshot`, **sans fallback** |
| CJM snapshot CRA | `mission_activity_reports` | `cjm_snapshot` | CRA | utilisé (fallback `m.cjm`) | utilisé (sans fallback) | fallback mort | `…ReportInput.cjmSnapshot`, **sans fallback** |
| Jours facturables | `mission_activity_reports` | `billable_days` | année civile | Σ (année max pnl) | Σ (année civile) | **période** | `real.billableDays`, période `civil-year` + `referenceYear` explicites |
| CA réel | dérivé | `Σ billable_days × tjm_snapshot` | année civile | idem (fallback) | `computeTotalRevenue` | fallback | `realRevenue()` — formule unique |
| Coût réel | dérivé | `Σ billable_days × cjm_snapshot` | année civile | inline (fallback) | inline dans `computeRealMarginPct` | fallback / lieu | `realCost()` — formule unique |
| Marge réelle € | dérivé | `CA réel − coût réel` | année civile | `revenue − cost` | via `computeRealMarginPct` | — | `real.marginValue` |
| Marge réelle % | dérivé | `marge/CA × 100` (2 déc.) | année civile | `(marginValue/revenue)×100`, **non arrondi**, sinon repli théo | `computeRealMarginPct` (2 déc.), `null` si pas de CA | **arrondi + repli** | `real.marginPct` (2 déc., `null` si CA ≤ 0) — **jamais** de repli implicite |
| Marge théorique % | `missions` | `gross_margin_pct` sinon `(tjm−cjm)/tjm` | n/a | `m.gross_margin_pct ?? 0` (pas de fallback `tjm/cjm`) | ré-implémentation locale | **duplication** | `theoreticalMarginPct()` — formule unique, `source` tracé |
| Écart réel / théo | dérivé | `réel − théo` | année civile | absent (valeur hybride) | `realPct − theoPct` par mission | — | `real.marginPct − theoretical.marginPct` (item) ; `weightedGapPoints` (portefeuille) |
| Marge « affichable » | dérivé | `réel ?? théo` | année civile | implicite dans `marginPct` | non exposée | sémantique | `effectiveMarginPct` — **le seul endroit** où ce repli est défini |
| Agrégat portefeuille | dérivé | pondération | année civile | `practiceContribution` : **pondéré valeur** | `marginReality` : **moyenne naïve** | **méthode** | `summarizeMissionProfitability()` — **pondéré valeur** partout |
| Productivité / jours ouvrés / congés / maladie / non-fac. | `mission_activity_reports` | `business_days` / `pto_days` / `sick_days` / `non_billable_days` | année civile | — | Engagements seul | — | **hors contrat** (propre à Engagements) |
| P&L mensuel | `pnl_monthly` | colonnes générées | mois / YTD | Finance seul | — | — | **hors contrat** (projection Finance, pas mission-level) |

---

## 7. Décision d'architecture : builder pur partagé (option B)

L'audit `11-*` §6.3 laissait le choix entre **A. vue Supabase `v_mission_profitability`** et
**B. builder pur partagé**. Le biais du cadrage (`PREFER SHARED PURE BUILDER`) est **confirmé** :

| Critère justifiant une vue (§8 du cadrage) | Verdict |
|---|---|
| Cohérence transactionnelle impossible autrement | ❌ agrégation en lecture seule |
| Calcul SQL réellement plus fiable | ❌ sommes + une division ; les primitives TS existent **et sont déjà testées** (`mission-detail-utils.test.ts`) |
| Volume Data significatif | ❌ 33 missions, ~152 CRA |
| Forte réduction des transferts | ❌ les deux loaders lisent déjà `missions` + `mission_activity_reports` pour d'autres besoins |
| Plusieurs consommateurs serveur exigeant la même agrégation DB | ❌ 2 consommateurs, avec des **projections différentes** autour d'un noyau commun |
| Contrat impossible à tenir dans un builder | ❌ ~1 formule |

**Conclusion : DATA SCHEMA = 0, RLS = 0, migration = 0.** Impact Data réel = **DATA-1**
(nouveau module de logique métier partagé, aucun nouveau contrat DB) — l'audit prévoyait
DATA-2 « au pire », c'est un DATA-1.

---

## 8. Contrat canonique

**`src/lib/finance/mission-profitability.ts`** — pur, sans React, sans Supabase, sans `server-only`.

### Entrées neutres
```ts
MissionProfitabilityMissionInput  = { id, tjm, cjm, grossMarginPct: number | null }
MissionProfitabilityReportInput   = { missionId, periodStart: "YYYY-MM-DD",
                                      billableDays, tjmSnapshot, cjmSnapshot }
MissionProfitabilityOptions       = { period?: "civil-year" | "lifetime",   // défaut "civil-year"
                                      referenceYear?: number }              // défaut now.getFullYear()
```
Chaque loader mappe ses lignes Supabase vers ces formes — les projections annexes restent propres à chaque loader.

### Primitives (formule unique, ré-exportées par `mission-detail-utils`)
```ts
round2(n)                       → arrondi 2 décimales, sans arrondi intermédiaire
theoreticalMarginPct(mission)   → { marginPct: number | null,
                                    source: "gross_margin_pct" | "tjm_cjm" | "unavailable" }
realRevenue(reports)            → Σ billableDays × tjmSnapshot
realCost(reports)               → Σ billableDays × cjmSnapshot
realMarginPct(reports)          → round2((rev − cost)/rev × 100)  |  null si rev ≤ 0
```

### Builder + agrégat
```ts
buildMissionProfitability(missions, reports, options) → MissionProfitabilityResult[]
  MissionProfitabilityResult = {
    missionId, period, referenceYear,
    real:        { available, billableDays, revenue, cost, marginValue, marginPct: number | null },
    theoretical: { marginPct: number | null, source },
    effectiveMarginPct: number | null,   // real.marginPct ?? theoretical.marginPct
  }

summarizeMissionProfitability(results) → MissionProfitabilityPortfolio {
  missionCount, missionsWithRealMargin,
  totalRealRevenue, totalRealCost, totalRealMarginValue,
  weightedRealMarginPct,          // ΣmargeValeur / ΣCA   (pondéré valeur, jamais moyenne des %)
  weightedTheoreticalMarginPct,   // Σ(théo × CA réel) / Σ CA réel
  weightedGapPoints,
}
```

### Règles invariantes
1. **Marge théorique ≠ marge réelle** — jamais fusionnées ; `effectiveMarginPct` est le seul repli, explicite.
2. **Marge réelle = snapshots CRA uniquement** — pas de fallback vers `missions.tjm/cjm`. Pas de CRA facturable ⇒ `real.available = false`, `real.marginPct = null`. On n'invente pas de marge réelle.
3. **Risque TACI** (`financial-modeling-contract.md`) — le contrat **ne réapplique jamais** un taux d'activité. `cjm_snapshot` est un coût journalier déjà déterminé ; il est multiplié par des jours facturables observés, sans seconde pondération.
4. **Période explicite** — `period` + `referenceYear` toujours portés par le résultat ; aucune divergence de période cachée derrière un `marginPct` nu.
5. **Agrégat = pondéré valeur** — `summarizeMissionProfitability` ne fait jamais `average(marginPct)`.

---

## 9. Période canonique

| Aspect | Contrat |
|---|---|
| Défaut | `period: "civil-year"`, `referenceYear: now.getFullYear()` |
| Sémantique | CRA dont `period_start` tombe dans `referenceYear` (colonnes « CA YTD » / « MCO YTD ») |
| Alternative | `period: "lifetime"` — tous les CRA fournis, sans filtre d'exercice |
| Finance | passe `referenceYear: new Date().getFullYear()` — **corrige** la dérive `max(pnl_monthly year)` (les blocs P&L de Finance restent, eux, pilotés par `pnl_monthly`) |
| Engagements | passe `referenceYear: year` (= `now.getFullYear()`) — inchangé |

---

## 10. Formules canoniques (référence rapide)

```
marge théorique %  = gross_margin_pct                    si renseigné (source "gross_margin_pct")
                   = round2((TJM − CJM) / TJM × 100)      sinon, si TJM > 0 (source "tjm_cjm")
                   = null                                 si TJM = 0 (source "unavailable")

CA réel            = Σ (billable_days × tjm_snapshot)     sur les CRA de la période
coût réel          = Σ (billable_days × cjm_snapshot)     sur les CRA de la période
marge réelle €     = CA réel − coût réel
marge réelle %     = round2(marge réelle € / CA réel × 100)   si CA réel > 0, sinon null

marge affichable % = marge réelle % ?? marge théorique %

portefeuille :
  weightedRealMarginPct        = round2(Σ marge réelle € / Σ CA réel × 100)
  weightedTheoreticalMarginPct = round2(Σ (marge théo % × CA réel) / Σ CA réel)
  weightedGapPoints            = weightedRealMarginPct − weightedTheoreticalMarginPct
```

---

## 11. Code partagé & consommateurs

| Fichier | Rôle | Changement 7.3A |
|---|---|---|
| `src/lib/finance/mission-profitability.ts` | **contrat canonique** | **créé** |
| `src/lib/finance/__tests__/mission-profitability.test.ts` | tests de contrat + non-divergence | **créé** (19 tests) |
| `src/components/missions/mission-detail/mission-detail-utils.ts` | façade domaine `mission-detail` | `computeTotalRevenue` / `computeRealMarginPct` / `computeTheoreticalMarginPct` **délèguent** au contrat (API publique inchangée — 6 consommateurs `MissionFinancialTab`, `MissionSynthesisTab`, `MissionOverviewDesktop`, `MissionActivityTab`, `MissionDetailsRail`, tests : **0 modification**) |
| `src/lib/finance/finance-data.ts` | loader Finance Desktop | `missionProfitability` construit via `buildMissionProfitability(...)`. Formule inline + fallback mort **supprimés**. `MissionProfitabilityRow` **inchangé** (shape). Sémantique de `marginPct` préservée (`effectiveMarginPct ?? 0`). |
| `src/components/missions/engagements/engagements-activity-utils.ts` | builder pur Engagements | `theoreticalMarginPct` local + `toActivityReport` + `reportsByMission` **supprimés** ; `marginReality.items` via le contrat ; `marginReality.{theoretical,real,gap}Avg` via `summarizeMissionProfitability` (**pondéré valeur**). `EngagementsActivityAnalytics` (shape) **inchangé**. |

**Direction des imports** : `components → lib` (correct). `mission-profitability.ts` n'importe rien (module feuille).

### Dette résiduelle — `engagements-portfolio-utils.ts` (Atlas du portefeuille)
`buildPortfolioPoints` (branche mission) et `buildMarginBridge` recalculent inline
`Σ billable_days × tjm_snapshot` / `× cjm_snapshot` et la marge réelle. **Non repris en 7.3A** :
read-model distinct (missions AT **+** projets forfait dont la marge vient de `projects.actual_margin_pct`,
colonne générée d'une autre source), fenêtre d'éligibilité propre (`status='validated'` **et**
`periodEnd <= today`), arrondi 1 décimale. À réconcilier en **7.3B**, quand « Atlas du portefeuille »
devient le module partagé (`11-*` §13) — le contrat expose déjà tout le nécessaire
(`realRevenue`/`realCost`/`realMarginPct` + `summarize`).

---

## 12. Éléments volontairement non mutualisés

| Élément | Raison |
|---|---|
| `pnl_monthly` (Finance) | consolidé mensuel, **aucune granularité mission** ; reste la projection P&L de Finance |
| `finance-mobile-model.ts` | ne calcule **aucune** marge par mission (revenue-only) ; concerne « Rentabilité P&L » / Forecast (7.3C) |
| Pipe pondéré / funnel CRM / alertes Finance | propres à Finance |
| `client_closures` / productivité / `sick_days` / absences non prévues | propres à Engagements (« Activité & congés ») |
| Moteur `financial-model-v1` (`@/features/financial-modeling`) | moteur de **modélisation / projection**, pas de la donnée réelle constatée — non touché |
| `engagements-portfolio-utils.ts` | Atlas du portefeuille — read-model distinct, réconciliation → 7.3B (§11) |

---

## 13. Impacts

| Domaine | Impact |
|---|---|
| **Supabase — schéma** | **0** — aucune table, vue, colonne, fonction, RPC, RLS |
| **Supabase — RLS** | **0** — lecture via les loaders `server-only` existants, RLS workspace inchangée |
| **Migration** | **0** |
| **n8n** | **0** — aucun workflow, webhook, LLM ; aucun calcul de rentabilité externalisé |
| **Routing** | **0** — `URL-0` |
| **Mobile** | **0** — `finance-mobile-*` et `EngagementsMobileShell` non touchés ; `EngagementsActivityDesktop` / `MissionProfitabilityTable` sont Desktop-only ; aucun helper partagé importé par une branche Mobile n'est modifié dans sa signature (`computeRealMarginPct` etc. inchangés en surface) |
| **UI produit** | **0 changement structurel** (aucun rename de chapitre/module, aucun nouveau chapitre). **1 changement numérique assumé** : les 3 moyennes du bloc « Rentabilité théorique vs réelle » d'Engagements passent de *moyenne naïve* à *pondérée valeur* (correction de divergence exigée par le cadrage §17/§18 — cf. §14). Aucun impact tant que les missions ont des CA proches ; l'écart n'apparaît que sur un portefeuille à volumes hétérogènes. |

---

## 14. Divergences constatées → traitement

| # | Divergence CURRENT | Traitement 7.3A |
|---|---|---|
| D1 | Année de référence : `max(pnl_monthly)` (Finance) vs `now` (Engagements) | **Résolu** — `referenceYear` explicite, défaut `now.getFullYear()` des deux côtés |
| D2 | Fallback `tjm_snapshot ?? missions.tjm` / `cjm_snapshot ?? missions.cjm` (Finance) | **Supprimé** — code mort (snapshots NOT NULL) ; le réel = snapshots seuls |
| D3 | `computeTheoreticalMarginPct` ré-implémenté localement dans Engagements | **Résolu** — `theoreticalMarginPct()` canonique, `source` tracé |
| D4 | `marginPct` hybride (réel/théo) exposé comme une valeur unique (Finance) | **Explicité** — `real` / `theoretical` séparés ; `effectiveMarginPct` = seul repli documenté ; `MissionProfitabilityRow.marginPct` conserve exactement l'ancienne sémantique |
| D5 | Agrégat portefeuille : pondéré valeur (Finance `practiceContribution`) vs moyenne naïve (Engagements `marginReality`) | **Résolu** — `summarizeMissionProfitability` pondéré valeur, adopté par Engagements |
| D6 | Périmètre missions : toutes (Finance) vs actives + avec CRA (Engagements) | **Conservé et documenté** — c'est une différence de **projection** légitime (Finance liste tout le portefeuille ; Engagements ne compare que ce qui a des CRA). Le contrat émet une ligne par mission fournie ; chaque loader filtre selon son besoin. |
| D7 | Arrondi : Finance non arrondi, Engagements 1 déc., primitive 2 déc. | **Résolu** — contrat en 2 décimales (`round2`), sans arrondi intermédiaire ; Engagements ré-arrondit à 1 déc. à l'affichage comme avant |

---

## 15. Tests

**`src/lib/finance/__tests__/mission-profitability.test.ts`** (19 tests) :
- `theoreticalMarginPct` : priorité `gross_margin_pct`, fallback `tjm/cjm`, `unavailable`.
- **Cas 1** — mission sans CRA : marge théorique disponible, **marge réelle indisponible** (`real.available = false`, `marginPct = null`), `effectiveMarginPct` retombe sur le théorique.
- **Cas 2** — 10 j / snap 800 / 500 → CA 8 000, coût 5 000, marge 3 000, **37,5 %**.
- **Cas 3** — plusieurs CRA : agrégation pondérée valeur au niveau mission **et** portefeuille ; la moyenne naïve est explicitement rejetée.
- **Cas 4** — TJM/CJM renégociés : le réel suit les **snapshots historiques**, pas les valeurs courantes.
- **Cas 5** — marge théorique : `gross_margin_pct` puis fallback `(TJM−CJM)/TJM`.
- **Cas 6** — zéro CA : `null`, aucune division par zéro, aucun `NaN`/`Infinity` ; coût nul → 100 %.
- **Cas 7** — période : `civil-year` filtre sur `referenceYear`, `lifetime` agrège tout, résultat porte `period` + `referenceYear`.
- **§18 — non-divergence** : un même jeu de missions + CRA mappé selon la projection *Finance* (rows bruts) **et** *Engagements* (sources camelCase) → `real`, `theoretical`, `effectiveMarginPct` **identiques** mission par mission ; `summarizeMissionProfitability` identique.

**Tests existants** : `mission-detail-utils.test.ts` (inchangé, **PASS** via délégation), `engagements-activity-utils.test.ts` (inchangé, **PASS** — les fixtures à CA égal donnent moyenne naïve = pondérée).

---

## 16. Quality gates

| Gate | Résultat |
|---|---|
| `rm -rf .next && npm run typecheck` | ✅ PASS |
| `npm test` | ✅ PASS — **295 fichiers / 3075 tests** |
| `npm run check:server-boundary` | ✅ PASS |
| `npx eslint` (fichiers touchés) | ✅ PASS (les 5 erreurs `no-explicit-any` de `finance-data.ts:166-170` **préexistent** sur `origin/main` — hors périmètre, non aggravées) |
| `npm run build` | ✅ PASS — `Compiled successfully`, 42/42 pages |
| `git diff --check` | ✅ PASS |

---

## 17. Dettes restantes

1. **`engagements-portfolio-utils.ts`** recalcule la marge réelle inline (Atlas du portefeuille) — réconciliation → **7.3B** (§11).
2. **`finance-data.ts:166-170`** : 5 `let … : any[]` (`no-explicit-any`) préexistants — typage à faire dans un lot dédié, hors 7.3A.
3. **`MissionProfitabilityRow.marginPct`** reste une valeur hybride (réel sinon théo) pour ne pas toucher `MissionProfitabilityTable` en 7.3A — 7.3C tranchera l'affichage (colonnes réel / théo distinctes).
4. **CLAUDE.md** : `missions` = 33 lignes (le doc dit 23) — instantané périmé, à corriger hors SHELL-0018.

---

## 18. Préconditions 7.3B (Engagements)

- ✅ Contrat canonique disponible (`buildMissionProfitability` / `summarizeMissionProfitability`).
- ✅ `getEngagementsActivityAnalytics` consomme déjà le contrat.
- ▶️ 7.3B : renommer `activite-conges` → « Rentabilité des engagements », monter `contextualModules`
  (Production & Congés `REUSE`), renommer `planning-at` → « Planning & Échéances ».
- ▶️ 7.3B : réconcilier `engagements-portfolio-utils.ts` sur le contrat lors du montage de « Atlas du portefeuille ».
- ▶️ 7.3B : le contenu « détail mission » de Finance migre ici — il lit `MissionProfitabilityResult`, **zéro recalcul**.

## 19. Préconditions 7.3C (Finance)

- ✅ `getFinanceDashboardData` consomme le contrat.
- ▶️ 7.3C : `profitability` → « Rentabilité P&L » (recentrage `pnl_monthly` ; le détail mission part côté Engagements).
- ▶️ 7.3C : `forecast` → « Forecast » ; module Simulation financière (`REUSE` `@/features/financial-modeling`).
- ▶️ 7.3C : trancher l'affichage `MissionProfitabilityTable` (colonnes marge réelle / marge théorique séparées, cf. dette §17.3).
- `Business Review` = `NEW/FUTURE`.

---

## 20. Verdict

```
SHELL-0018 Lot 7.3A            → ✅ CLOSED
Profitability Data Contract    → CANONICAL
Architecture                   → BUILDER PUR PARTAGÉ (src/lib/finance/mission-profitability.ts)
Supabase / RLS / migration     → 0
n8n                            → 0
7.3B Engagements               → UNBLOCKED
7.3C Finance                   → UNBLOCKED (après 7.3B, séquence 11-* §18)
```
