# Phase 7.3B — Alignement du workspace Engagements (`/missions`)

> **Statut : ✅ IMPLEMENTED / PASS (2026-09-10)**
> **Nature : navigation + REUSE de modules existants + réconciliation Data. Aucune migration, aucun n8n, aucune refonte graphique.**
> **Branche : `main`. Baseline `a92a05b9` (`HEAD == origin/main` au cadrage — Lot 7.3A présent).**

Ce document clôt le sous-lot **7.3B** de `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` §6.
Il débloque **7.3C (Finance)**.

---

## 1. Baseline

| Élément | Valeur |
|---|---|
| `git rev-parse HEAD` (départ) | `a92a05b9daa9e371b77b780be2d76167d168ce4c` |
| `git rev-parse origin/main` (départ) | idem — working tree `clean` |
| Lot 7.3A | présent (`src/lib/finance/mission-profitability.ts`, doc `12-*`, ledger §48) |
| Travail parallèle | aucun |

---

## 2. CURRENT → TARGET

### Chapitres (`?vue=`, pathname `/missions` stable)

| CURRENT (clé · libellé) | TARGET | Traitement | Livré |
|---|---|---|---|
| `synthese` · « Synthèse » | Synthèse | KEEP | inchangé |
| `missions-at` · « Missions AT » | Missions AT | KEEP | inchangé |
| `projets` · « Projets » | Projets | KEEP | inchangé |
| `activite-conges` · « Activité & congés » | **Rentabilité des engagements** | TRANSFORM (label + recentrage) | clé `activite-conges` **conservée** ; libellé rail + header + `<h1>` + sous-titre ; contenu déjà centré rentabilité (voir §5) |
| `planning-at` · « Planning des engagements » | **Planning & Échéances** | RENAME | clé `planning-at` **conservée** ; libellé rail + header + `<h1>` |

### Modules contextuels (`?module=`, nouveaux — orthogonaux à `?vue=`)

| TARGET | Traitement | Verdict 7.3B |
|---|---|---|
| **Production & Congés** | REUSE | ✅ **monté** — `ProductionLeaveDesktop` + `getProductionLeave()` (`src/features/consultants/modules/production-leave/`), à l'identique. `?module=production-conges` |
| **Atlas du portefeuille** | REUSE (Cas A) | ✅ **monté** — `PortfolioAtlasDialog` + `getEngagementsOverview()`. `?module=atlas-portefeuille`. Réconcilié sur le contrat 7.3A (§4) |
| **Mission : analyse des marges** | NEW/FUTURE | ⛔ **non monté** — aucune capacité module réellement branchable (seule existe l'action Cockpit `analyze_margins`, `kind: "launcher"`, jamais montée comme module de workspace). Monter un launcher serait artificiel (cadrage §10). **Aucun bouton mort.** |

---

## 3. Routing

| Aspect | Contrat |
|---|---|
| Pathname | `/missions` — inchangé |
| Chapitres | `?vue=synthese\|missions-at\|projets\|activite-conges\|planning-at` — **clés inchangées** |
| Compat historique | `?vue=planning-engagements` → `planning-at` (préservée : `parseEngagementsView`) ; `/missions/actives`, `/missions/projets` `permanentRedirect` inchangés |
| Modules | `?module=production-conges\|atlas-portefeuille` — orthogonal à `?vue=` ; href de fermeture = `/missions?vue=<vue>` |
| Classe | **URL-1** (ajout `?module=`, pathname stable, aucun `permanentRedirect` nouveau) |
| État | entièrement reconstructible depuis l'URL (résolution serveur pure `parseEngagementsView` / `parseEngagementsModule`) |

`src/components/missions/engagements/engagements-navigation.ts` (nouveau) porte le contrat :
`ENGAGEMENTS_VIEWS`, `ENGAGEMENTS_VIEW_LABELS`, `parseEngagementsView`, `buildEngagementsViewHref`,
`ENGAGEMENTS_CONTEXTUAL_MODULES`, `ENGAGEMENTS_MODULE_LABELS`, `parseEngagementsModule`,
`buildEngagementsModuleHref`.

---

## 4. Réutilisation du contrat 7.3A + réconciliation Atlas

**Interdits respectés** (aucun recalcul de marge, aucune formule `(TJM−CJM)/TJM` locale, aucun `average(marginPct)`, aucun fallback métier parallèle) :

| Site | Avant | Après |
|---|---|---|
| `engagements-activity-utils.ts` (chapitre Rentabilité) | déjà sur le contrat 7.3A (Lot 7.3A) | inchangé + expose `marginReality.observedRevenue` (= `portfolio.totalRealRevenue` du contrat) |
| `engagements-portfolio-utils.ts` → `buildPortfolioPoints` (branche mission) | `Σ billableDays × tjmSnapshot`, `Σ × cjmSnapshot`, `roundOne((rev−cost)/rev×100)` inline | `realRevenue(rows)` / `realMarginPct(rows)` du contrat |
| `engagements-portfolio-utils.ts` → `buildMarginBridge` | `Σ billableDays × tjmSnapshot` / `× cjmSnapshot` inline | `realRevenue(reports)` / `realCost(reports)` |
| `engagements-portfolio-utils.ts` → `productionFacts` | `report.billableDays × report.tjmSnapshot` (CA d'un CRA) | `realRevenue([report])` |

**Restent PROPRES à l'Atlas** (projection, pas calcul de marge indépendant) :
- fenêtre d'éligibilité `eligibleValidatedReports` : `status='validated'` **ET** `periodEnd <= today` **ET** exercice courant (l'Atlas = « réalisé uniquement » ; le contrat 7.3A filtre lui sur `period_start` d'année civile sans clause `validated`/`today`) ;
- mélange missions AT + projets forfait (marge projet = `projects.actual_margin_pct`, colonne générée — autre source) ;
- rollups d'exposition client (`buildClientExposure`) et pont de marge — agrégations de valeurs déjà canoniques.

Architecture obtenue :
```
src/lib/finance/mission-profitability.ts  (realRevenue / realCost / realMarginPct)
        ↓                                   ↓
engagements-activity-utils.ts        engagements-portfolio-utils.ts
   (Rentabilité des engagements)        (Atlas du portefeuille)
```

Test de non-régression : `engagements-portfolio-utils.test.ts` prouve que `buildPortfolioPoints` /
`buildMarginBridge` = primitives canoniques sur les mêmes entrées, **et** que le module source
n'a plus aucune multiplication `billableDays × (tjm|cjm)Snapshot` en dur (assertion `not.toMatch`).

---

## 5. Chapitre « Rentabilité des engagements » — contenu

Le contenu était **déjà** une vue rentabilité (`EngagementsActivityDesktop`, 4 blocs) — 7.3B ne fait pas de refonte graphique :

| Bloc | Contenu | Aligné cible |
|---|---|---|
| 1 · CRA | Productivité globale (taux d'activité, jours facturables / congés / maladie / non-fac. par mois) | jours produits / facturables ✅ |
| 2 · Sites | Fermetures de sites clients (`client_closures`) | contexte production ✅ |
| 3 · Finance | Marge théorique vs réelle par mission + écart (dumbbell), moyennes **pondérées valeur** (contrat 7.3A) + **CA observé** (nouveau, du contrat) | rentabilité réelle / théorique / écart / CA observé ✅ |
| 4 · Absences | Impact CA & marge des absences non prévues (`sick_days` × snapshots) | impact des absences ✅ |

Seuls changements 7.3B sur ce composant : `<h1>` « Activité & congés » → « Rentabilité des engagements »,
sous-titre reformulé, ajout d'une `StatCell` « CA observé » (source : `portfolio.totalRealRevenue`).

---

## 6. Production & Congés (module REUSE)

- Composant : `ProductionLeaveDesktop` (`src/features/consultants/modules/production-leave/desktop/`) — monté **à l'identique** (`vm` + `closeHref`), overlay `IntelligenceSplitModalShell`.
- Loader : `getProductionLeave()` — **autoportant**, workspace-scoped, non modifié. Lu uniquement si `?module=production-conges` (ADR-0006).
- Confidentialité : `collaborator_compensation` reste RLS owner/admin — un non-habilité voit des coûts `null` avec note (comportement du module inchangé).
- **0 duplication de composant, 0 copie de logique, 0 nouveau loader.**

## 7. Atlas du portefeuille (module REUSE — Cas A)

- Composant : `PortfolioAtlasDialog` (`src/components/missions/dashboard/`) — `AppDialog` à 4 vues (Exposition / Production / Projets / Marge), déjà utilisé par `PortfolioAtlasLauncher` (Synthèse) et le Cockpit mobile (`PortfolioAtlasModule`).
- Loader : `getEngagementsOverview()` → `EngagementsPortfolioViewModel` — déjà consommé par la page pour la Synthèse. Lu uniquement si `?module=atlas-portefeuille`.
- Fermeture : `onOpenChange(false)` → `router.push(closeHref)` (état URL).
- Le bouton `PortfolioAtlasLauncher` de la Synthèse est **conservé** (§12 du cadrage : ne pas toucher Synthèse). Double affordance vers le même dialog — acceptable, comme `pool-competences` (Consultants). Dette cosmétique éventuelle en 7.10.

## 8. Mission : analyse des marges → NEW/FUTURE

Audit : `src/lib/intelligence/actions/analyze-margins.ts` + `AnalyzeMarginsResult.tsx` = **action Cockpit** (`analyze_margins`, `actionIds`, `kind: "launcher"`), rendue via `IntelligenceActionResultContent`. Le slug `rentabilite-portefeuille` existe dans `MISSION_CATALOG` mais n'est branché comme module d'aucun workspace. **Aucun module ouvrable, stable et existant** → NEW/FUTURE, non exposé au rail. Aucun workflow n8n / contrat LLM / launcher créé.

---

## 9. Desktop / Mobile

| | |
|---|---|
| Desktop | `EngagementsDesktopView` (client) : `SectionRail` avec `chapters` + `contextualModules`, overlays `?module=` montés en sibling |
| Mobile | **NO IMPACT** — la branche `device === "mobile"` de `missions/page.tsx` ne rend que `synthese`/`missions-at`/`projets` ; ni « Rentabilité des engagements » ni « Planning & Échéances » ni les modules ne sont exposés sur Mobile. Aucun libellé Desktop renommé n'est rendu par le Mobile (`EngagementsMobileShell` a ses propres libellés). `parseEngagementsView` conserve la compat `planning-engagements`. |
| Adaptive Design | respecté — aucun composant Desktop chargé pour être masqué ; données modules lues uniquement si demandées |

---

## 10. Impacts

| Domaine | Impact |
|---|---|
| **Supabase — schéma / RLS / migration** | **0** |
| **n8n / webhook / LLM** | **0** |
| **Data (nouveau contrat DB)** | **0** — consomme le contrat 7.3A + loaders existants (`getProductionLeave`, `getEngagementsOverview`) |
| **Routing** | URL-1 (ajout `?module=`, pathname stable, 0 redirect nouveau) |
| **Mobile** | NO IMPACT |
| **UI produit** | 2 renames de chapitre (label uniquement) + `<h1>`/sous-titre du chapitre Rentabilité + 1 `StatCell` « CA observé » + 2 entrées « Modules » dans le rail. Aucune refonte de composant. Le changement de moyennes naïve → pondérée du bloc 3 avait déjà été livré en 7.3A. |

---

## 11. Tests

| Fichier | Ajout / modification |
|---|---|
| `engagements-navigation.test.ts` | **créé** (7 tests) — 5 chapitres + libellés cibles, `parseEngagementsView` (fallback + compat `planning-engagements`), `buildEngagementsViewHref` (`?vue=` préservé), 2 modules REUSE exacts (pas de bouton mort), `parseEngagementsModule` (clés connues seules), `buildEngagementsModuleHref` (superposition + fermeture) |
| `engagements-desktop-ui.test.ts` | libellés `HEADER_TITLE_BY_VIEW` / `NAV_ENTRIES` alignés cible |
| `engagements-activity-utils.test.ts` | +1 test `marginReality.observedRevenue` (CA réel du contrat) |
| `engagements-portfolio-utils.test.ts` | +3 tests — `buildPortfolioPoints` / `buildMarginBridge` = primitives canoniques ; assertion source « plus aucune multiplication `billableDays × snapshot` en dur » |

---

## 12. Quality gates

| Gate | Résultat |
|---|---|
| `rm -rf .next && npm run typecheck` | ✅ PASS |
| `npm test` | ✅ PASS — **296 fichiers / 3086 tests** |
| `npm run check:server-boundary` | ✅ PASS |
| `npx eslint` (fichiers touchés) | ✅ PASS |
| `npm run build` | ✅ PASS — `Compiled successfully`, 42/42 pages |
| `git diff --check` | ✅ PASS |

Smoke (raisonnement, pas de navigateur) : `parseEngagementsView`/`parseEngagementsModule` purs et testés ; overlays montés uniquement quand VM chargée (échec loader ⇒ no-op silencieux, comme Consultants) ; overlays = primitives natives (`AppDialog` / `IntelligenceSplitModalShell`) déjà éprouvées ; rail conforme `SectionRail` (11.5rem, chapeau, Chapitres, Modules).

---

## 13. Dettes restantes

1. **Double affordance Atlas** : bouton `PortfolioAtlasLauncher` sur la Synthèse **et** module de rail — cosmétique, à trancher en 7.10.
2. **`buildClientExposure`** (Atlas) reconstitue une marge client pondérée depuis `Σ(pct×CA)/ΣCA` plutôt que `Σmarge€/ΣCA` — rollup Atlas, valeurs sources déjà canoniques, écart négligeable ; non critique.
3. **« Mission : analyse des marges »** = NEW/FUTURE — à instruire produit (framework `MissionComposerDesktop` + slug `rentabilite-portefeuille` disponibles, wiring ≈ quelques lignes) hors 7.3B.
4. **`account_portfolio`** (type de document intelligence « Revue de portefeuille comptes ») reste distinct de l'Atlas Engagements — non fusionné, périmètres différents.
5. Commentaires code résiduels « Activité & congés » dans `engagements-activity-types.ts` / `get-engagements-activity-analytics.ts` / `engagement-icons.tsx` — documentaires, non bloquants.

---

## 14. Préconditions 7.3C (Finance)

- ✅ Contrat 7.3A consommé par Finance (`finance-data.ts`) **et** Engagements (chapitre Rentabilité + Atlas).
- ✅ Le chapitre Engagements « Rentabilité des engagements » existe et lit le contrat — le « détail mission » de Finance peut y être renvoyé sans recalcul.
- ▶️ 7.3C : `profitability` → « Rentabilité P&L » (recentrage `pnl_monthly`, retrait du détail mission), `forecast` → « Forecast », module **Simulation financière** (`REUSE` `@/features/financial-modeling`).
- ▶️ 7.3C : trancher l'affichage `MissionProfitabilityTable` — colonnes marge réelle / marge théorique distinctes (dette 7.3A §17.3).
- `Business Review` (Finance) = `NEW/FUTURE`.

---

## 15. Verdict

```
SHELL-0018 Lot 7.3B            → ✅ CLOSED
Engagements workspace          → 5 chapitres cibles + 2 modules REUSE + 1 NEW/FUTURE (sans bouton mort)
Contrat de rentabilité         → consommé exclusivement (Rentabilité + Atlas), 0 formule concurrente
Supabase / RLS / migration     → 0
n8n                            → 0
Mobile                         → NO IMPACT
7.3C Finance                   → UNBLOCKED
```
