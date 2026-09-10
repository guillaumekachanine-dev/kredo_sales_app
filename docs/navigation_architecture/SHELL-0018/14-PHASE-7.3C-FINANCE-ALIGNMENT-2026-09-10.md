# Phase 7.3C — Alignement final du workspace Finance (`/finance`)

> **Statut : ✅ IMPLEMENTED / PASS (2026-09-10)**
> **Nature : navigation + REUSE module Simulation financière + recentrage P&L + levée dette rentabilité mission. Aucune migration, aucun n8n, aucune régression Mobile.**
> **Branche : `main`. Baseline `5a6d5ce0` (`HEAD == origin/main` au cadrage — Lots 7.3A et 7.3B présents).**

Ce document clôt le sous-lot **7.3C** de `11-PHASE-7-ENTRY-AUDIT-WORKSPACES-2026-09-09.md` §6 et clôt la **Phase 7.3 coordonnée Engagements + Finance**.

---

## 1. Baseline

| Élément | Valeur |
|---|---|
| `git rev-parse HEAD` (départ) | `5a6d5ce0793af64026576f3d3e6e2adf6f6d1488` |
| `git rev-parse origin/main` (départ) | idem — working tree `clean` |
| Lots 7.3A & 7.3B | présents (`mission-profitability.ts`, docs `12-*`, `13-*`, ledger §48/§49) |
| Travail parallèle | aucun |

---

## 2. CURRENT → TARGET

### Chapitres (`?tab=`, pathname `/finance` stable)

| CURRENT (clé · libellé) | TARGET | Traitement | Livré |
|---|---|---|---|
| `synthesis` · « Synthèse » | **Synthèse** | KEEP | inchangé |
| `profitability` · « Rentabilité missions » | **Rentabilité P&L** | TRANSFORM + RENAME | clé `profitability` **conservée** ; libellé rail + header ; recentrage P&L consolidé (KPIs, Waterfall, Practice contribution) + table de rentabilité avec distinction explicite réel/théorique + lien de pilotage opérationnel vers Engagements |
| `forecast` · « Prévision & simulation » | **Forecast** | RENAME | clé `forecast` **conservée** ; libellé rail + header |
| *(absent)* | Business Review | NEW/FUTURE | **DEFERRED PRODUCT** — non créé, aucun placeholder, aucun bouton mort |

### Modules contextuels (`?module=`, nouveaux — orthogonaux à `?tab=`)

| TARGET | Traitement | Verdict 7.3C |
|---|---|---|
| **Simulation financière** | REUSE | ✅ **monté** — `FinancialModelingDesktopDialog` (`@/features/financial-modeling`). `?module=simulation` |
| **Atlas du portefeuille** | NEW/FUTURE | ⛔ **non monté** — module propre au pilotage des engagements (`/missions`), pas de besoin Finance branchable |
| **Mission : analyse des marges** | NEW/FUTURE | ⛔ **non monté** — action Cockpit `analyze_margins` non branchée en module |

---

## 3. Routing

| Aspect | Contrat |
|---|---|
| Pathname | `/finance` — inchangé |
| Chapitres | `?tab=synthesis\|profitability\|forecast` — **clés inchangées** |
| Racine | `/finance` → `synthesis` (sans paramètre requis) |
| Module | `?module=simulation` — orthogonal à `?tab=` (ex: `/finance?tab=forecast&module=simulation`) |
| Fermeture | supprime `?module=` et préserve `?tab=` exactement (`buildFinanceModuleHref`) |
| Classe | **URL-1** (ajout `?module=`, pathname stable, 0 redirect nouveau) |

`src/components/finance/FinanceLocalNavigation.tsx` enrichi :
- `FINANCE_DESKTOP_CHAPTERS` (`synthesis`, `profitability`, `forecast`)
- `FINANCE_CONTEXTUAL_MODULES` (`simulation`)
- `parseFinanceTab`, `parseFinanceModule`, `buildFinanceHref`, `buildFinanceModuleHref`

---

## 4. Levée de dette & sémantique rentabilité (`MissionProfitabilityTable`)

Le lot 7.3A avait conservé une valeur hybride `marginPct = real ?? theoretical`.
Le lot 7.3C lève définitivement cette dette :

1. `MissionProfitabilityRow` enrichi avec :
   - `realMarginPct: number | null` (marge réelle constatée sur CRA validés)
   - `theoreticalMarginPct: number | null` (marge théorique contractuelle)
   - `marginGapPoints: number | null` (écart en points `réel − théo`)
2. `MissionProfitabilityTable` sépare explicitement :
   - Colonne **Marge théo** (contractuelle)
   - Colonne **Marge réelle** (€) + **% Réel** (CRA) : affiche `Sans CRA` si aucun CRA validé
   - Colonne **Écart** (pts)
3. **Aucune confusion possible** entre marge contractuelle et marge constatée.

---

## 5. Recentrage « Rentabilité P&L »

Le chapitre Finance « Rentabilité P&L » répond à la question :
*« Quelle est la rentabilité consolidée de mon centre de profit ? »*
(vs Engagements qui répond à *« Quels engagements performent et lesquels dérivent ? »*).

Contenu de `?tab=profitability` :
1. **Consolidation P&L (YTD)** : CA, Marge brute (valeur + %), Résultat opérationnel
2. **Cascade de rentabilité P&L** : `FinanceWaterfallChart` (salaires, sous-traitance, structure)
3. **Contribution par Practice** : `PracticeContributionGrid` (CA, marge brute par practice)
4. **Détail analytique par mission (YTD)** : `MissionProfitabilityTable` comme lecture analytique secondaire, avec affordance explicite vers `/missions?vue=activite-conges` pour le pilotage opérationnel des engagements.

---

## 6. Desktop / Mobile

- Desktop : `FinanceDesktopDashboard` consomme `FinanceLocalNavigation` (chapitres + module simulation)
- Mobile : **NO IMPACT** (`FinanceMobileDashboard` autonome, propre modèle `finance-mobile-model.ts`, aucune régression).

---

## 7. Supabase & n8n

- **Supabase** : 0 migration, 0 vue, 0 RPC, 0 schéma, 0 RLS.
- **n8n** : 0 workflow, 0 webhook, 0 LLM.

---

## 8. Tests & Quality Gates

### Tests unitaires & sémantiques
- `FinanceLocalNavigation.test.ts` (14 tests) :
  - Chapitres cibles (`Synthèse`, `Rentabilité P&L`, `Forecast`)
  - Module `Simulation financière` exposé seul
  - `parseFinanceTab`, `parseFinanceModule`, `buildFinanceHref`, `buildFinanceModuleHref`
  - Orthogonalité `?tab=` et `?module=`, fermeture sans perte de tab
  - Test sémantique `MissionProfitabilityTable` : mission sans CRA affiche `Sans CRA` et ne confond pas théorique et réel.

### Quality Gates
- `npm run typecheck` → **PASS**
- `npm run check:server-boundary` → **PASS**
- `npm test` → **PASS** (296 fichiers / 3090 tests)
- `npm run build` → **PASS** (42/42 pages statiques/dynamiques)
- `git diff --check` → **PASS**

---

## 9. Statut Phase 7.3

```
SHELL-0018 Lot 7.3A (Contrat Data canonique)    → ✅ CLOSED (a92a05b9)
SHELL-0018 Lot 7.3B (Workspace Engagements)      → ✅ CLOSED (5a6d5ce0)
SHELL-0018 Lot 7.3C (Workspace Finance)          → ✅ CLOSED
SHELL-0018 Phase 7.3 (Engagements + Finance)     → ✅ CLOSED
```
