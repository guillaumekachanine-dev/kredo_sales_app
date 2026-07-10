# ADR-0014 — Programme Intelligence Actions : Features Contextuelles + Diagnostic Macro IA

**Statut :** Proposé
**Date :** 2026-07-10
**Auteur :** Guillaume Kasanin / Claude Code
**Portée :** Panneau Intelligence (toutes pages), Cockpit, Workflows n8n, Supabase RPCs

---

## Table des matières

1. [Contexte et motivation](#1-contexte-et-motivation)
2. [Décisions architecturales](#2-decisions-architecturales)
3. [Inventaire des features](#3-inventaire-des-features)
4. [Couche macro : Diagnostic du Centre de Profit](#4-couche-macro--diagnostic-du-centre-de-profit)
5. [Architecture technique transversale](#5-architecture-technique-transversale)
6. [Contrats de données](#6-contrats-de-donnees)
7. [Roadmap de développement](#7-roadmap-de-developpement)
8. [Dépendances et prérequis](#8-dependances-et-prerequis)
9. [Points d'attention opérationnels](#9-points-dattention-operationnels)
10. [Glossaire](#10-glossaire)

---

## 1. Contexte et motivation

### 1.1. Situation actuelle

Le panneau latéral "Cockpit Intelligence" (Session 12, étendu Sessions 16-17) affiche des cartes d'actions contextuelles par page. Sur les 28 actions définies dans `intelligence-registry.ts`, **une seule est active** (`weekly_brief`). Les 27 autres affichent un badge "Bientôt" et un bouton désactivé.

Le panneau existe, la plomberie existe (résolution par route, résolution par entité, IntelligenceActionCard, IntelligenceFAB mobile), mais le panneau est **vide de substance** — c'est une coquille avec des promesses.

### 1.2. Ce que ce programme résout

Ce document cadre **deux couches complémentaires** :

1. **Couche 1 — Features contextuelles déterministes** : 12 actions calculées en temps réel, sans LLM, qui répondent chacune à une question métier précise ("quoi faire en premier ?", "quel risque sur mes missions ?", "combien je fais ce trimestre ?").

2. **Couche 2 — Diagnostic macro IA** : une analyse transversale unique, alimentée par un LLM, qui articule les signaux des 12 features en une lecture stratégique du centre de profit. Le LLM ne calcule rien — il lit des faits pré-calculés et les met en relation.

La couche 1 est le **socle factuel**. La couche 2 est la **couche de sens**.

### 1.3. Principes directeurs

- **Le LLM ne calcule jamais.** Tout chiffre affiché vient d'une requête Supabase ou d'une vue analytique. Le LLM lit, corrèle et narre — il ne fait pas de maths.
- **Déterminisme par défaut.** 11 des 12 features contextuelles sont 100% déterministes (0 token, 0 workflow n8n). Le LLM n'intervient que dans le Diagnostic macro.
- **Incrémentalité.** Chaque feature est autonome. Le Diagnostic macro fonctionne dès le premier jour avec les données existantes, et s'enrichit au fil des features livrées.
- **Pas de nouvelle table pour les features contextuelles.** Elles lisent les tables et vues existantes. Seul le Diagnostic macro produit un nouvel artefact persisté.

---

## 2. Décisions architecturales

### D-1. Pattern d'implémentation : Server Action + composant panneau

Chaque feature contextuelle est implémentée comme :
- **Une Server Action** (ou fonction serveur) qui retourne un objet typé `FeatureXResult`
- **Un composant React** monté dans le panneau Intelligence quand l'action est cliquée

Pas de workflow n8n, pas de run `ai_intelligence_runs`, pas de callback. L'action clic → résultat affiché est synchrone (< 2s).

**Justification :** Les données sont déjà en base, les vues analytiques pré-calculent les agrégats. Un aller-retour Supabase suffit. La machinerie n8n (HMAC, callback, Realtime) serait du sur-engineering pour des requêtes SQL.

**Exception :** Le Diagnostic macro (couche 2) utilise le pattern n8n existant (CORE-001/CORE-002) car il fait appel à un LLM.

### D-2. Placement UI : panneau inline, pas de drawer

Le résultat d'une action contextuelle s'affiche **dans le panneau Intelligence lui-même** (desktop) ou **dans le bottom drawer Intelligence** (mobile). Pas de nouveau drawer, pas de modale, pas de page dédiée.

Le panneau passe de l'état "liste d'actions" à l'état "résultat affiché" avec un bouton retour. Pattern identique à `PitchMailDrawerContent` dans le panneau (Session 16 Lot 3).

**Justification :** Le panneau est déjà le point d'entrée. Forcer l'utilisateur vers une autre surface (drawer, page) casserait le flux "je clique, je lis, je reviens".

### D-3. Source de données : vues analytiques existantes, pas de nouvelle vue

Les vues `v_collaborator_activity_summary`, `v_collaborator_ytd_activity`, `v_profitability_alerts` (migration 025) + `account_score_current` (ADR-0011) + `pnl_monthly` contiennent 80% des métriques nécessaires. Les features lisent ces vues directement.

Seule exception : le Diagnostic macro nécessite une **RPC d'agrégation** (`get_workspace_diagnostic_context`) qui consolide toutes les sources en un seul appel.

### D-4. Registre d'actions : activation progressive

`intelligence-registry.ts` passe de `status: "coming_soon"` à `status: "active"` feature par feature. Le composant `IntelligenceActionCard` gère déjà les deux états. Aucun changement structurel du registre.

### D-5. Identifiant de feature et nommage

Chaque feature a un identifiant stable dans le registre (`action_priorities`, `pipeline_insights`, etc.). Les fichiers suivent la convention :

```
src/lib/intelligence/actions/
  action-priorities.ts          ← Server Action + types
  pipeline-insights.ts
  prepare-day.ts
  ...
src/components/intelligence/action-results/
  ActionPrioritiesResult.tsx    ← Composant de rendu
  PipelineInsightsResult.tsx
  PrepareDayResult.tsx
  ...
```

---

## 3. Inventaire des features

### 3.1. Tableau récapitulatif

| ID | Label | Page(s) | LLM | Charge | Priorité | Lot |
|---|---|---|---|---|---|---|
| `action_priorities` | Priorités d'action | Cockpit | Non | 3-4 j | P0 | L1 |
| `prepare_day` | Préparer la journée | Agenda | Non | 2-3 j | P0 | L1 |
| `detect_risks` | Détection de risques | Engagements | Non | 2-3 j | P0 | L1 |
| `analyze_activity` | Analyse & recommandations | Équipe | Non | 2-3 j | P0 | L1 |
| `pipeline_insights` | Insights pipeline | Cockpit | Non | 2-3 j | P1 | L2 |
| `forecast_revenue` | Prévision de CA | Engagements | Non | 4-5 j | P1 | L2 |
| `prioritize_pipeline` | Prioriser le pipeline | Besoins & Staffing | Non | 3-4 j | P1 | L3 |
| `analyze_needs` | Analyser les besoins | Besoins & Staffing, Équipe | Non | 2-3 j | P1 | L3 |
| `scan_contacts` | Scanner les contacts | CRM | Non | 1-2 j | P2 | L3 |
| `analyze_funnel` | Analyser le funnel | Recrutement | Non | 2-3 j | P2 | L4 |
| `analyze_margins` | Analyse des marges | Engagements, Finance | Non | 1-2 j | P2 | L4 |
| `diagnostic_macro` | Diagnostic du Centre de Profit | Cockpit | **Oui** | 7-10 j | P0 | L5 |

**Note :** `analyze_skill_gaps` (Équipe) est fusionné avec `analyze_needs` — même implémentation, deux points d'entrée UI. `suggest_training` (Plan de formation) est rejeté en V1 (pas de catalogue de formations interne).

### 3.2. Fiches détaillées

---

#### F-01. `action_priorities` — Priorités d'action

**Pages :** `/cockpit`
**Question métier :** "Qu'est-ce que je dois faire en premier ce matin ?"

**Périmètre fonctionnel :**
Classement des 5-10 actions les plus impactantes, toutes entités confondues. Chaque action porte : l'entité concernée (compte, opp, mission, consultant), l'action recommandée, un score d'urgence × impact, un lien direct vers la fiche.

**Inputs (tables/vues) :**
- `opportunities` — opps ouvertes sans interaction récente (>15j), deadline dans 7j
- `missions` — fin imminente (< 30j) sans renouvellement identifié
- `v_profitability_alerts` — CRA non validés, marges basses, activité basse
- `interactions` — dernière date par company_id (inactivité > 30j sur clients actifs)
- `calendar_events` — events du jour/semaine sans tâche associée
- `account_score_current` — comptes bande A/B sans action récente (high-value neglected)

**Output :**
```typescript
type ActionPrioritiesResult = {
  generatedAt: string
  items: Array<{
    rank: number
    entityType: "opportunity" | "mission" | "company" | "collaborator"
    entityId: string
    entityLabel: string
    action: string           // "Relancer — dernier contact il y a 42 jours"
    urgency: "critical" | "high" | "moderate"
    impactReason: string     // "Compte bande A, pipe pondéré 85k€"
    link: string             // "/prospection/accounts/[id]"
  }>
  meta: {
    accountsWithoutRecentAction: number
    oppsStagnating: number
    missionsEndingSoon: number
    craNotValidated: number
  }
}
```

**Logique de scoring :**
Reprend le pattern `weekly-scoring-v1` (fichier `scoring.ts`) : `rank = urgency × 3 + impact × 2 + risk`. Les poids par domaine et par état temporel sont identiques. La différence vs le `weekly_brief` : ici c'est une vue **instantanée** (pas hebdomadaire), recalculée à chaque clic.

**Ce qui existe déjà :**
- `scoring.ts` — scoring complet avec urgence/impact/risque
- `computeWeeklyBrief()` — agrège AgendaSnapshot + BusinessFacts
- `get_weekly_business_facts` RPC — pipe ouvert, opps stagnantes, interactions récentes
- `v_profitability_alerts` — alertes activité/marge/CRA

**Ce qu'il faut créer :**
- `action-priorities.ts` — Server Action qui appelle les vues/tables (pas la RPC weekly, trop lourde pour du temps réel ; requêtes directes plus légères)
- `ActionPrioritiesResult.tsx` — liste ordonnée avec chips urgence + liens

**Points d'attention :**
- Ne pas dupliquer la logique du `weekly_brief`. Les pondérations de scoring (`URGENCY_BY_TEMPORAL_STATE`, `IMPACT_BY_DOMAIN`) doivent être importées depuis `scoring.ts`, pas recopiées.
- Le résultat n'est pas persisté. Pas de run, pas de document. C'est un calcul éphémère.
- Borner à 10 items max pour ne pas noyer l'utilisateur.

---

#### F-02. `prepare_day` — Préparer la journée

**Pages :** `/agenda`
**Question métier :** "Qu'est-ce qui m'attend aujourd'hui et suis-je prêt ?"

**Périmètre fonctionnel :**
Timeline du jour enrichie : événements avec contexte relationnel (nom du compte, contacts clés, dernière interaction, opp liée), tâches dues, alertes critiques (CRA en retard, deadline opp).

**Inputs :**
- `calendar_events` — filtré sur la date du jour (UTC+2 Paris), avec FK `company_id`, `candidate_id`, `contact_id`, `mission_id`
- `tasks` — `due_date <= today` et status != `done`
- `companies` — nom, lifecycle_status (pour contexte)
- `contacts` / `persons` — nom, relationship_role (pour les événements commerce)
- `candidates` — nom, current_step (pour les événements recrutement)
- `interactions` — dernière par company_id des events du jour (fraîcheur du contact)

**Output :**
```typescript
type PrepareDayResult = {
  date: string
  events: Array<{
    id: string
    title: string
    startsAt: string
    endsAt: string | null
    eventType: string
    context: {
      companyName?: string
      companyLifecycle?: string
      contactName?: string
      contactRole?: string
      candidateName?: string
      candidateStep?: string
      lastInteractionDaysAgo?: number
      linkedOpportunityTitle?: string
    }
    preparedness: "ready" | "needs_prep" | "no_context"
  }>
  tasksDue: Array<{
    id: string
    title: string
    priority: string
    isOverdue: boolean
    entityLabel?: string
  }>
  alerts: Array<{
    type: "cra_overdue" | "opp_deadline" | "mission_ending"
    message: string
    entityId: string
    link: string
  }>
}
```

**Logique de `preparedness` :**
- `ready` : event a un `company_id` + la dernière interaction < 7 jours
- `needs_prep` : event a un `company_id` mais dernière interaction > 7 jours ou absente
- `no_context` : event sans `company_id` ni `candidate_id` (événement interne générique)

**Ce qui existe déjà :**
- `aggregate-agenda-snapshot.ts` — agrège events + tasks + deadlines sur une plage
- `calendar_events` (16 types, 3 familles Commerce/Management/Recrutement)
- Le drawer agenda enrichit déjà les events avec company/contact

**Ce qu'il faut créer :**
- `prepare-day.ts` — Server Action, requête calendar_events du jour + enrichissement parallèle company/contact/candidate/interactions
- `PrepareDayResult.tsx` — timeline verticale, badges preparedness, bloc tâches

**Points d'attention :**
- Le fuseau horaire est `Europe/Paris` (constante `AGENDA_V1_TIMEZONE` dans `agenda-thresholds.ts`). Filtrer les events du jour en UTC+2, pas UTC.
- Ne pas réutiliser `AgendaSnapshot` tel quel — il est conçu pour une semaine entière avec scoring. Ici on veut un jour, enrichi avec du contexte relationnel que le snapshot ne porte pas.
- Mobile : la timeline doit rester lisible en largeur 375px. Pas de tableau — des cartes empilées.

---

#### F-03. `detect_risks` — Détection de risques

**Pages :** `/missions/actives`, `/missions/projets`, `/missions`
**Question métier :** "Est-ce que ça tourne ? Qu'est-ce qui va mal sans que je le sache ?"

**Périmètre fonctionnel :**
Liste de risques opérationnels scorés par sévérité, tous domaines confondus : marge négative, taux d'activité en chute, CRA non validés, mission finissant sans relève, concentration CA sur un client, consultant avec absences fréquentes.

**Inputs :**
- `v_profitability_alerts` — 5 flags booléens par collaborateur×mois (`alert_low_activity`, `alert_low_margin`, `alert_negative_margin`, `alert_high_sick_days`, `alert_cra_not_validated`)
- `missions` — `end_date` < J+60 avec `status = 'active'`
- `mission_activity_reports` — `activity_rate_percent`, `status` (draft = non soumis)
- `v_collaborator_ytd_activity` — `real_margin_pct`, `activity_rate_ytd`
- `pnl_monthly` — dernier mois, si `gross_margin_percent < 15`

**Output :**
```typescript
type DetectRisksResult = {
  generatedAt: string
  risks: Array<{
    id: string
    severity: "critical" | "warning" | "info"
    category: "margin" | "activity" | "staffing" | "billing" | "retention"
    title: string
    detail: string
    entityType: "mission" | "collaborator" | "company"
    entityId: string
    entityLabel: string
    suggestedAction: string
    link: string
  }>
  summary: {
    criticalCount: number
    warningCount: number
    healthyMissionsCount: number
    healthyMissionsPct: number
  }
}
```

**Règles de détection (moteur déterministe) :**

| Règle | Source | Sévérité |
|---|---|---|
| Marge négative | `v_profitability_alerts.alert_negative_margin` | critical |
| Marge < 15% | `v_profitability_alerts.alert_low_margin` | warning |
| Activité < 70% | `v_profitability_alerts.alert_low_activity` | warning |
| CRA non validé (mois en cours) | `mission_activity_reports.status = 'draft'` | warning |
| Mission finit < 30j | `missions.end_date < J+30` ET `status = 'active'` | critical |
| Mission finit < 60j | `missions.end_date < J+60` ET `status = 'active'` | info |
| Absences maladie >= 5j | `v_profitability_alerts.alert_high_sick_days` | warning |
| Concentration CA > 40% | top client CA / CA total (via `mission_activity_reports`) | warning |

**Ce qui existe déjà :**
- `v_profitability_alerts` — 5/8 règles couvertes
- `buildCraAlerts()` dans `mission-detail-utils.ts` — 5 règles CRA par mission
- `FinanceAlert` dans `finance-data.ts` — structure d'alerte financière

**Ce qu'il faut créer :**
- `detect-risks.ts` — Server Action, agrège `v_profitability_alerts` + missions ending + concentration CA
- `DetectRisksResult.tsx` — liste triée par sévérité, chips colorées, liens

**Points d'attention :**
- La règle "concentration CA" nécessite un calcul : `SUM(billable_days × tjm_snapshot)` par company_id depuis `mission_activity_reports` jointé à `missions.company_id`, sur les 6 derniers mois. Pas de vue existante pour ça — calcul dans la Server Action.
- `v_profitability_alerts` est une vue `SECURITY INVOKER` — elle respecte le RLS. Pas besoin de service_role.
- Ne pas confondre `mission_activity_reports.status` (draft/submitted/validated/rejected) avec `missions.status` (active/paused/ended/cancelled).

---

#### F-04. `analyze_activity` — Analyse & recommandations équipe

**Pages :** `/consultants`, `/consultants/activite-conges`
**Question métier :** "Qui va bien, qui va mal, et qu'est-ce que je fais pour chacun ?"

**Périmètre fonctionnel :**
Recommandations par collaborateur basées sur les indicateurs d'activité : taux d'occupation vs cible TACI, marge réelle vs théorique, tendance des absences, fin de mission imminente sans relève.

**Inputs :**
- `v_collaborator_ytd_activity` — `activity_rate_ytd`, `taci_target`, `real_margin_pct`, `ytd_revenue`, `ytd_employer_cost`
- `v_profitability_alerts` — 5 flags par collaborateur (mois en cours)
- `missions` — `end_date`, `status`, `collaborator_id`
- `collaborator_absences` — absences futures planifiées (type, durée)
- `collaborators` — `status`, `practice`, person.full_name

**Output :**
```typescript
type AnalyzeActivityResult = {
  generatedAt: string
  recommendations: Array<{
    collaboratorId: string
    collaboratorName: string
    practice: string | null
    status: "healthy" | "attention" | "action_needed"
    indicators: {
      activityRateYtd: number
      taciTarget: number
      gapVsTaci: number
      realMarginPct: number | null
      currentMissionEndDate: string | null
      plannedAbsenceDaysNext30: number
    }
    recommendations: string[]   // ["Entretien RH — taux d'activité 12% sous la cible TACI"]
    alertFlags: string[]        // Flags from v_profitability_alerts
  }>
  summary: {
    healthyCount: number
    attentionCount: number
    actionNeededCount: number
    avgActivityRate: number
    avgMarginPct: number
  }
}
```

**Moteur de règles :**

| Condition | Statut | Recommandation |
|---|---|---|
| `gap_vs_taci > 10%` | action_needed | "Entretien RH — taux d'activité significativement sous la cible" |
| `gap_vs_taci > 5%` | attention | "Monitorer — léger écart vs objectif TACI" |
| `mission.end_date < J+30` ET pas de next mission | action_needed | "Activer le staffing — fin de mission dans {N} jours" |
| `real_margin_pct < 15%` | attention | "Revoir le TJM ou le CJM — marge sous le seuil" |
| `real_margin_pct < 0` | action_needed | "Marge négative — action corrective immédiate" |
| `planned_absences > 5j dans 30 prochains jours` | attention | "Anticiper l'impact sur le taux d'activité" |
| `alert_high_sick_days = true` | attention | "Point RH — absences maladie fréquentes" |

**Ce qui existe déjà :**
- `v_collaborator_ytd_activity` — toutes les métriques YTD
- `v_profitability_alerts` — tous les flags
- La page `/consultants/activite-conges` consomme déjà ces 3 vues

**Ce qu'il faut créer :**
- `analyze-activity.ts` — Server Action, requêtes parallèles sur les 3 vues + missions + absences futures
- `AnalyzeActivityResult.tsx` — cards par collaborateur triées par statut (action_needed en haut)

**Points d'attention :**
- `collaborator_compensation` est RLS admin-only (`is_workspace_admin()`). Les métriques de marge dans `v_collaborator_ytd_activity` sont déjà calculées par la vue (qui lit la compensation en `SECURITY INVOKER`). L'action ne touche PAS directement `collaborator_compensation`.
- La recommandation "Activer le staffing" nécessite de vérifier qu'il n'y a pas d'opportunité `stage IN ('recherche_profil', 'cv_envoyes', 'entretien_client', 'negociation')` déjà liée au même consultant. Sinon c'est un faux positif.

---

#### F-05. `pipeline_insights` — Insights pipeline

**Pages :** `/cockpit`
**Question métier :** "Mon pipe est-il sain ou est-ce que je m'illusionne ?"

**Périmètre fonctionnel :**
3-5 insights textuels sur l'état du pipeline commercial : valeur pondérée + delta M/M, stagnation (opps au même stage > 30j), concentration (top 3 clients > 60% du pipe), taux de conversion entre étapes, gap dans le funnel.

**Inputs :**
- `opportunities` — `stage`, `created_at`, `updated_at`, `weighted_gain`, `conviction`, `company_id`, `estimated_gain`
- `interactions` — dernière `occurred_at` par `company_id` liée à une opp
- `pnl_monthly` — pour le delta CA M/M (contexte)

**Output :**
```typescript
type PipelineInsightsResult = {
  generatedAt: string
  weightedPipe: number
  weightedPipeDelta: number | null       // vs M-1 (null si pas assez d'historique)
  weightedPipeDeltaTone: "positive" | "negative" | "stable"
  stageDistribution: Array<{
    stage: string
    stageLabel: string
    count: number
    weightedTotal: number
  }>
  insights: Array<{
    type: "stagnation" | "concentration" | "funnel_gap" | "momentum" | "health"
    title: string
    detail: string
    severity: "positive" | "warning" | "info"
  }>
}
```

**Ce qui existe déjà :**
- `getFinanceDashboardData()` — `pipelineForecast`, `weightedPipe`
- `get_activity_commercial_facts` RPC — mouvements du pipe, opps créées/gagnées/perdues

**Ce qu'il faut créer :**
- `pipeline-insights.ts` — Server Action, calculs de stagnation (diff `updated_at` vs NOW) + concentration (top 3 company_id par weighted_gain) + funnel gap
- `PipelineInsightsResult.tsx` — KPI pondéré + liste d'insights avec chips

**Points d'attention :**
- Avec seulement 9 opportunités en base à ce jour, les insights seront limités. La feature devient vraiment utile à partir de 15-20 opps. Documenter ça dans l'UI : "Basé sur {N} opportunités ouvertes" + message si < 10.
- La stagnation se calcule sur `updated_at`, pas `created_at`. Si quelqu'un modifie un champ mineur (ex: description), ça remet le compteur à zéro — faux négatif acceptable en V1 (pas de table `opportunity_stage_history`, caveat déjà documenté Session 19).

---

#### F-06. `forecast_revenue` — Prévision de CA

**Pages :** `/missions/actives`, `/missions`, `/finance`
**Question métier :** "Combien je fais ce trimestre ? Et le suivant ?"

**Périmètre fonctionnel :**
Projection du CA sur M+1, M+2, M+3 avec 3 scénarios : pessimiste (missions actuelles seules), réaliste (missions + pipe pondéré), optimiste (missions + pipe full close). Prise en compte des fins de mission, absences planifiées, fermetures client.

**Inputs :**
- `missions` (status = 'active') — `tjm`, `start_date`, `end_date`, `collaborator_id`, `company_id`
- `opportunities` (stages ouvertes) — `weighted_gain`, `estimated_gain`, `conviction`, `duration_days`, `target_daily_rate`
- `collaborator_absences` — absences futures (impact jours facturables)
- `client_closures` — fermetures planifiées (impact jours facturables)
- `pnl_monthly` — historique CA pour tendance

**Output :**
```typescript
type ForecastRevenueResult = {
  generatedAt: string
  months: Array<{
    month: string                // "2026-08"
    label: string                // "Août 2026"
    pessimistic: number          // Missions actuelles seules
    realistic: number            // + pipe pondéré
    optimistic: number           // + pipe full close
    missionContribution: number  // CA garanti par missions actives
    pipeContribution: number     // CA pondéré du pipe
  }>
  summary: {
    q_current_realistic: number
    q_next_realistic: number
    missionsCoveringNextQuarter: number
    missionsEndingNextQuarter: number
    pipeWeightedTotal: number
    trend: "growing" | "stable" | "declining"
  }
}
```

**Modèle de calcul :**

Pour chaque mois projeté M :
1. **CA missions** = Σ pour chaque mission active ce mois-ci : `tjm × (jours_ouvrés_du_mois - absences_collaborateur - fermetures_client)`
2. **CA pipe pondéré** = Σ pour chaque opp avec closing attendu ≤ M : `weighted_gain / duration_days × jours_ouvrés_restants_M`
3. **CA pipe optimiste** = même calcul avec `estimated_gain` au lieu de `weighted_gain`
4. Les jours ouvrés par mois sont calculés (hors weekends + jours fériés français — utiliser une liste statique 2026-2027 ou le package `date-fns`).

**Ce qui existe déjà :**
- `pnl_monthly` (12 mois, colonnes GENERATED) — baseline historique
- `getFinanceDashboardData()` — `projectedLanding` (YTD uniquement, pas multi-mois)
- `collaborator_absences`, `client_closures` — déjà consommés par la page activité

**Ce qu'il faut créer :**
- `forecast-revenue.ts` — Server Action, modèle de projection multi-mois
- Fonction pure `computeMonthlyForecast()` — testable sans Supabase
- `ForecastRevenueResult.tsx` — graphique SVG 3 courbes + tableau résumé
- Fichier `french-business-days.ts` — jours ouvrés par mois (liste statique, pas de dépendance externe)

**Points d'attention :**
- **Les CJM sont confidentiels** (admin-only). La prévision de CA n'a PAS besoin du CJM — elle projette le chiffre d'affaires (TJM × jours), pas la marge. Ne pas requêter `collaborator_compensation`.
- Les opportunités n'ont pas de champ `expected_closing_date` explicite. Utiliser `next_action_date` comme proxy, ou à défaut `created_at + duration_days`.
- La qualité de la prévision dépend de la qualité des `conviction` saisies. Afficher un disclaimer si la moyenne des convictions est < 30% (données peu fiables).

---

#### F-07. `prioritize_pipeline` — Prioriser le pipeline

**Pages :** `/missions/opps`
**Question métier :** "Quelle opp je traite en premier ?"

**Périmètre fonctionnel :**
Classement des opportunités ouvertes par score de priorité composite : `f(conviction, acv, jours_avant_deadline, profil_disponible)`. Chaque opp affiche son score + la justification dominante.

**Inputs :**
- `opportunities` — ouvertes (stage not in gagne/perdu/abandonne)
- `opportunity_skills` — besoins compétences par opp
- `person_skills` + `collaborators` (status = 'active') — profils disponibles

**Output :**
```typescript
type PrioritizePipelineResult = {
  generatedAt: string
  rankedOpportunities: Array<{
    opportunityId: string
    title: string
    companyName: string
    stage: string
    priorityScore: number        // 0-100
    drivers: string[]            // ["Haute valeur (ACV 120k€)", "Profil Cloud dispo"]
    hasMatchingProfile: boolean
    daysToDeadline: number | null
    weightedGain: number
  }>
}
```

**Ce qui existe déjà :**
- `opportunity_skills` (20 lignes), `person_skills` (75 lignes)
- `buildPoolCompetencesDataset()` — agrégation compétences offre/demande
- `get_pitch_context` RPC — matching cross-sell par practice (heuristique)

**Ce qu'il faut créer :**
- `prioritize-pipeline.ts` — scoring composite + matching skills fin (pas juste par practice, mais par skill avec level)
- `PrioritizePipelineResult.tsx` — liste ordonnée avec score bars

---

#### F-08. `analyze_needs` — Analyser les besoins (+ `analyze_skill_gaps`)

**Pages :** `/missions/opps`, `/consultants/pool-competences`
**Question métier :** "Quels profils me manquent pour répondre à mon pipe ?"

**Périmètre fonctionnel :**
Matrice offre/demande par compétence : skills demandés par le pipe (pondérés par importance et nombre d'opps) vs skills disponibles en interne (pondérés par level et nombre de consultants). Gap analysis + recommandation (recruter / former / sous-traiter).

**Inputs :**
- `opportunity_skills` — demande pondérée (weight, importance, min_level)
- `person_skills` — offre interne (level, years, confidence)
- `collaborators` — status, practice
- `skills` — référentiel canonique (category)

**Output :**
```typescript
type AnalyzeNeedsResult = {
  generatedAt: string
  gaps: Array<{
    skillId: string
    skillName: string
    category: string
    demandScore: number          // nb_opps × avg_weight
    supplyScore: number          // nb_collabs × avg_level
    gapRatio: number             // demand / supply (> 1 = gap)
    recommendation: "recruit" | "train" | "subcontract" | "covered"
    detail: string
  }>
  summary: {
    criticalGaps: number         // gapRatio > 3
    moderateGaps: number         // gapRatio > 1.5
    coveredSkills: number
  }
}
```

**Ce qui existe déjà :**
- `buildPoolCompetencesDataset()` — agrégation complète
- Page `/consultants/pool-competences` — consomme déjà toutes les sources

**Ce qu'il faut créer :**
- `analyze-needs.ts` — calcul du gap ratio + recommandation par seuil
- `AnalyzeNeedsResult.tsx` — tableau triable par gap ratio

---

#### F-09. `scan_contacts` — Scanner les contacts (facette A uniquement)

**Pages :** `/prospection/accounts`, `/prospection/suivi`
**Question métier :** "Mon organigramme client est-il complet ?"

**Périmètre fonctionnel (V1 — facette A, gap analysis déterministe) :**
Pour chaque compte actif/prospect, vérifier si les rôles clés sont couverts dans `contacts` : décideur, prescripteur technique, acheteur. Lister les comptes avec organigramme incomplet.

**Inputs :**
- `contacts` — `company_id`, `relationship_role`
- `companies` — lifecycle_status (filtrer sur actif/prospect)

**Output :**
```typescript
type ScanContactsResult = {
  generatedAt: string
  accountCoverage: Array<{
    companyId: string
    companyName: string
    lifecycle: string
    presentRoles: string[]
    missingRoles: string[]
    coverageScore: number      // 0-100
  }>
  summary: {
    fullyMappedAccounts: number
    partialAccounts: number
    noContactAccounts: number
  }
}
```

**Points d'attention :**
- Les rôles attendus dépendent du `lifecycle_status` : un `client_actif` doit avoir au moins un `operationnel`, un `prospect` doit avoir au moins un `decideur` ou `prescripteur`. Paramétrer ça dans un objet de config, pas en dur.
- La facette B (enrichissement externe LinkedIn/Apollo) est **hors scope V1**. Ne pas créer de placeholder UI qui promet quelque chose qu'on ne livre pas.

---

#### F-10. `analyze_funnel` — Analyser le funnel recrutement

**Pages :** `/recruitment`
**Question métier :** "Où est-ce que ça bloque dans mon process de recrutement ?"

**Périmètre fonctionnel (V1 — snapshot statique) :**
Comptage des candidats par étape du funnel de recrutement (`HIRING_KANBAN_STAGES`). Pas de vrai taux de conversion (pas d'historique de transitions).

**Inputs :**
- `candidate_hiring_processes` — `current_step`, `created_at`
- `opportunity_candidates` — `status`, `created_at`
- `candidates` — `status`, source

**Output :**
```typescript
type AnalyzeFunnelResult = {
  generatedAt: string
  hiringFunnel: Array<{
    step: string
    stepLabel: string
    count: number
    pctOfTotal: number
  }>
  staffingFunnel: Array<{
    status: string
    statusLabel: string
    count: number
  }>
  caveat: string   // "Snapshot statique — le taux de conversion réel nécessite un historique des transitions (V2)."
}
```

**Ce qui existe déjà :**
- `get_activity_recruitment_facts` RPC — les 2 funnels distincts (hiring + staffing)
- `HIRING_KANBAN_STAGES` (6 étapes) — labels et configs

**Points d'attention :**
- **Caveat critique** documenté dans CLAUDE.md et dans la RPC : pas de table `candidate_step_history`. Le "funnel" est un snapshot de l'état actuel, pas un vrai entonnoir temporel. **Afficher ce caveat dans l'UI.** Ne pas laisser l'utilisateur croire que "10 en prequalification → 3 en test technique" signifie "taux de passage 30%" — ça signifie juste qu'il y a 10 et 3 maintenant.

---

#### F-11. `analyze_margins` — Analyse des marges

**Pages :** `/missions/actives`, `/finance`
**Question métier :** "Quelles missions sont rentables et lesquelles me coûtent de l'argent ?"

**Périmètre fonctionnel :**
Classement des missions actives par marge (meilleure → pire), avec alerte sur les marges < 15% et les marges négatives. Agrégation par practice et par client.

**Inputs :**
- `missions` (status = 'active') — `tjm`, `cjm`, `gross_margin_pct`, `company:companies(name)`, `collaborator:collaborators(person:persons(full_name))`
- `v_collaborator_activity_summary` — `real_margin_pct` par mois

**Output :** Classement avec KPIs et liens vers les fiches missions. Peut être un **lien contextuel vers `/finance`** plutôt qu'un composant complet — la page Finance affiche déjà tout ça.

**Ce qui existe déjà :**
- `getFinanceDashboardData()` → `missionProfitability` — classement complet
- `MissionProfitabilityTable` — composant desktop existant

**Verdict d'implémentation :** **Lien contextuel** (pas un nouveau composant). L'action ouvre `/finance` avec un filtre pré-appliqué, ou affiche un résumé de 3 lignes (top 3 pires marges) avec un lien "Voir le détail".

---

## 4. Couche macro : Diagnostic du Centre de Profit

### 4.1. Concept

Une analyse transversale unique, déclenchée manuellement ou en cron hebdomadaire, qui ingère un **snapshot complet du workspace** (toutes les métriques déterministes déjà calculées) et produit un **diagnostic articulé** en 5 sections avec corrélations croisées.

Le LLM ne remplace pas les 12 features — il les **surplombe**. Chaque feature déterministe reste la source de vérité pour ses chiffres. Le diagnostic IA est la couche de lecture qui dit "voici ce que ces chiffres signifient ensemble".

**Exemple de corrélation que le diagnostic produit :**

> "Ton CA Q3 est menacé : tes 3 missions Cloud (42% de ta marge brute) finissent en septembre, tu n'as aucune opportunité Cloud dans le pipe, et ton seul consultant Cloud senior est en formation tout août. En parallèle, tu recrutes 2 profils Data alors que ton pipe n'a aucun besoin Data. Tu investis dans une capacité que tu ne vends pas, et tu ne prépares pas le renouvellement de celle qui te fait vivre."

Aucune feature isolée ne produit cette lecture. C'est la corrélation entre commerce × delivery × RH × compétences qui crée la valeur.

### 4.2. Architecture 3 couches

```
┌──────────────────────────────────────────────────────────┐
│  COUCHE 3 — Diagnostic IA (LLM, Claude Sonnet)           │
│  "Lis tout, articule, priorise — ne calcule jamais"      │
│  → 1 workflow n8n intel-040-workspace-diagnostic          │
│  → ~1 appel/semaine ou à la demande                      │
├──────────────────────────────────────────────────────────┤
│  COUCHE 2 — Snapshot workspace (RPC déterministe)        │
│  get_workspace_diagnostic_context()                      │
│  → 1 seul appel service_role, agrège 5 axes              │
│  → Output ~3-5 Ko JSON (agrégats, pas lignes brutes)     │
├──────────────────────────────────────────────────────────┤
│  COUCHE 1 — Tables & vues existantes (déjà en base)      │
│  opportunities, missions, pnl_monthly, vues analytiques  │
│  account_score_current, person_skills, absences...        │
└──────────────────────────────────────────────────────────┘
```

### 4.3. RPC `get_workspace_diagnostic_context`

**Type :** `SECURITY DEFINER`, `GRANT EXECUTE TO service_role` (pas authenticated — le cron n8n et la route API l'appellent via service_role, après avoir vérifié l'authentification de l'utilisateur en amont).

**Paramètres :** `p_workspace_id uuid`, `p_as_of_date date DEFAULT CURRENT_DATE`

**Structure de sortie (JSON) :**

```sql
SELECT jsonb_build_object(
  'workspace', jsonb_build_object(...),
  'commerce',  jsonb_build_object(
    'pipeWeighted',         ...,
    'pipeWeightedPrevMonth', ...,
    'oppsByStage',          ...,    -- [{stage, count, weighted}]
    'stagnatingOpps',       ...,    -- opps avec updated_at > 30j, même stage
    'topClientConcentration', ...,  -- [{companyName, pctOfPipe}] top 3
    'oppsWithoutRecentAction', ..., -- opps sans interaction 15j
    'scoreBandDistribution', ...    -- {A: n, B: n, C: n, D: n, U: n}
  ),
  'delivery',  jsonb_build_object(
    'activeMissionsCount',    ...,
    'missionsEndingSoon',     ...,  -- [{title, client, endDate, marginPct}] < 60j
    'avgOccupancyRate',       ...,
    'marginAlerts',           ...,  -- [{collaborator, mission, marginPct}] < 15%
    'craNotValidatedCount',   ...,
    'negativeMarginCount',    ...
  ),
  'finance',   jsonb_build_object(
    'last6Months',            ...,  -- [{month, revenue, grossMargin, opProfit}]
    'ytdRevenue',             ...,
    'ytdGrossMarginPct',      ...,
    'trend',                  ...   -- calculé : hausse/stable/baisse sur 3 mois
  ),
  'team',      jsonb_build_object(
    'totalCollaborators',     ...,
    'avgActivityRateYtd',     ...,
    'collaboratorsBelow70',   ...,  -- [{name, rate, mission}]
    'intercontractRisk',      ...,  -- [{name, missionEndDate, plannedAbsenceDays}]
    'topSkillGaps',           ...,  -- [{skill, demandScore, supplyScore}] top 5
    'upcomingAbsences',       ...   -- total jours dans 30 prochains jours
  ),
  'recruitment', jsonb_build_object(
    'hiringFunnelSnapshot',   ...,  -- [{step, count}]
    'oppsWithoutCandidate',   ...,  -- opps en recherche_profil sans opportunity_candidates
    'openJobProfilesCount',   ...
  )
)
```

**Volume estimé :** ~3-5 Ko. Pas des centaines de lignes — des agrégats résumés. Compatible avec une fenêtre Sonnet sans gaspillage de tokens.

**Points d'attention :**
- La RPC ne renvoie JAMAIS de données confidentielles brutes (pas de salaires, pas de CJM individuels). Les marges sont en pourcentage, les coûts sont agrégés.
- Les métriques team sont issues de `v_collaborator_ytd_activity` (SECURITY INVOKER) — mais la RPC est SECURITY DEFINER appelée en service_role, donc elle passe. C'est le même pattern que `get_weekly_business_facts`.

### 4.4. Contrat de sortie : `WorkspaceDiagnostic`

```typescript
// src/lib/intelligence/diagnostic/workspace-diagnostic-types.ts

export interface WorkspaceDiagnostic {
  schema_version: 1
  generatedAt: string
  periodLabel: string            // "Semaine 28 — 7 au 11 juillet 2026"

  // 1. Lecture d'ensemble — 3-4 phrases max
  executiveSummary: string

  // 2. Corrélations — le cœur de la valeur ajoutée IA
  correlations: Array<{
    id: string
    title: string                // "Risque de décrochage Cloud Q3"
    narrative: string            // Le paragraphe articulé (5-8 phrases)
    axes: Array<"commerce" | "delivery" | "finance" | "team" | "recruitment">
    severity: "critical" | "warning" | "opportunity"
    evidenceRefs: Array<{
      metric: string             // "missions_ending_soon"
      value: string              // "3 missions Cloud, fin sept."
    }>
  }>

  // 3. Top 3 priorités (articulées, pas une checklist)
  priorities: Array<{
    rank: 1 | 2 | 3
    action: string
    rationale: string
    relatedCorrelationIds: string[]
  }>

  // 4. Signaux faibles — pas encore urgent mais à surveiller
  watchList: Array<{
    signal: string
    horizon: string              // "2-4 semaines"
    triggerCondition: string     // "Devient critique si..."
  }>

  // 5. Points positifs
  strengths: Array<{
    observation: string
    sustainAction?: string
  }>
}
```

### 4.5. Workflow n8n `intel-040-workspace-diagnostic`

**Squelette :** même architecture 15 nœuds que les workflows existants (Webhook → Verify HMAC → Validate → Update Run Status → Hydrate Context → Assemble Prompt → Call LLM → Parse & Validate → Quality Check → Prepare Callback / Prepare Failure Callback).

**Spécificités :**
- `entityType: "workspace"` (pas de company_id)
- `Hydrate Context` appelle `get_workspace_diagnostic_context` — **un seul appel** (pas 8 requêtes REST séparées)
- `result_type: "workspace_diagnostic"`
- `phase: 1` (pas de multi-phase, un seul appel LLM)

**Prompt système (~2000 mots) — contraintes clés :**
1. **Jamais de chiffre inventé.** Chaque métrique citée DOIT être traçable à un `evidenceRef` pointant vers une clé du contexte JSON.
2. **Corrélations uniquement si elles croisent ≥ 2 axes.** Un problème qui ne concerne qu'un seul axe est une alerte simple, pas une corrélation. Les alertes simples sont couvertes par les features déterministes.
3. **Maximum 4 corrélations, 3 priorités, 3 signaux faibles, 3 forces.** La contrainte force la hiérarchisation. Si tout est prioritaire, rien ne l'est.
4. **Recommandations concrètes, jamais vagues.** "Renégocier le TJM de la mission X de 650€ à 720€" — pas "améliorer la marge".
5. **Provenance honnête.** Si le contexte est trop pauvre sur un axe (ex: 0 opportunité, 0 candidat), le dire explicitement plutôt qu'inventer une corrélation.

**Quality Check (5 contrôles) :**
- `correlations_cross_axes` : chaque corrélation cite ≥ 2 axes distincts
- `evidence_refs_present` : chaque corrélation a ≥ 1 evidenceRef
- `no_invented_numbers` : aucun nombre dans le texte qui ne figure pas dans le contexte JSON
- `max_items_respected` : ≤ 4 corrélations, ≤ 3 priorités, ≤ 3 watchList, ≤ 3 strengths
- `priorities_linked` : chaque priorité référence au moins 1 correlationId existant

### 4.6. UI — Placement dans le cockpit

**Desktop :** Section dédiée en haut du cockpit, avant les KPI cards. `SurfaceCard` avec le `executiveSummary`. Corrélations en accordéons `<details>` (pattern `CommunicationBriefForm`). Priorités en callout coloré. watchList et strengths en rail latéral.

**Mobile :** `MobileHeroInsight` avec le summary. Corrélations en swipe horizontal (cartes). Priorités en liste.

**Bouton "Actualiser le diagnostic"** (même pattern Realtime que `SummaryDrawerContent` / `PitchMailDrawerContent`). Fraîcheur affichée ("Généré il y a 2 jours").

**Persistence :** Auto-sauvegardé en bibliothèque documentaire (`intelligence_documents`, `documentType: "workspace_diagnostic"` — **nouvelle valeur enum** à créer par migration). L'historique permet de comparer semaine après semaine.

### 4.7. Cron optionnel

Route API `api/reports/workspace-diagnostic/cron-trigger` (même pattern que `api/reports/weekly-manager/cron-trigger`). Exécution : lundi 7h00 Paris. Le diagnostic frais attend le manager à l'ouverture du cockpit.

---

## 5. Architecture technique transversale

### 5.1. Structure de fichiers

```
src/lib/intelligence/actions/
  action-priorities.ts            ← Server Actions (couche 1)
  prepare-day.ts
  detect-risks.ts
  analyze-activity.ts
  pipeline-insights.ts
  forecast-revenue.ts
  prioritize-pipeline.ts
  analyze-needs.ts
  scan-contacts.ts
  analyze-funnel.ts
  analyze-margins.ts
  __tests__/
    forecast-revenue.test.ts      ← Tests des fonctions pures
    detect-risks.test.ts
    ...

src/lib/intelligence/diagnostic/
  workspace-diagnostic-types.ts   ← Contrats couche 2+3
  collect-diagnostic-context.ts   ← Appel RPC (comme collect-account-score-input.ts)
  parse-diagnostic-content.ts     ← Parseur typé

src/components/intelligence/action-results/
  ActionPrioritiesResult.tsx      ← Composants de rendu panneau
  PrepareDayResult.tsx
  DetectRisksResult.tsx
  AnalyzeActivityResult.tsx
  PipelineInsightsResult.tsx
  ForecastRevenueResult.tsx
  PrioritizePipelineResult.tsx
  AnalyzeNeedsResult.tsx
  ScanContactsResult.tsx
  AnalyzeFunnelResult.tsx
  AnalyzeMarginsResult.tsx

src/components/intelligence/diagnostic/
  DiagnosticSection.tsx           ← Composant cockpit desktop
  DiagnosticMobileSection.tsx     ← Composant cockpit mobile
  DiagnosticCorrelationCard.tsx
  DiagnosticPriorityCallout.tsx

n8n/workflows/
  intel-040-workspace-diagnostic.json
  intel-040-workspace-diagnostic.SETUP.md

supabase/migrations/
  YYYYMMDDHHMMSS_054_workspace_diagnostic_rpc.sql
  YYYYMMDDHHMMSS_055_workspace_diagnostic_enum.sql
```

### 5.2. Pattern d'intégration dans le panneau

Le panneau Intelligence (`IntelligencePanel.tsx` / `IntelligenceFAB.tsx`) passe de "grille d'actions" à "résultat d'action" quand une action est cliquée. Le mécanisme existe déjà pour `PitchMailDrawerContent` (Session 16 Lot 3).

```typescript
// Ajout dans use-intelligence-context.ts (store Zustand existant)
type IntelligencePanelState = {
  // ... champs existants ...
  activeActionId: string | null
  activeActionResult: unknown | null
  setActiveAction: (id: string | null, result?: unknown) => void
}
```

Quand `activeActionId !== null`, le panneau affiche le composant de résultat correspondant au lieu de la grille d'actions. Bouton retour pour revenir à la grille.

### 5.3. Pattern des Server Actions pour les features

```typescript
// Pattern type — chaque Server Action suit cette structure
"use server"

import { createClient } from "@/lib/supabase/server"

export type ActionPrioritiesResult = { /* ... */ }

export async function computeActionPriorities(): Promise<ActionPrioritiesResult> {
  const supabase = await createClient()

  // Requêtes parallèles sur les vues/tables existantes
  const [opps, missions, alerts, interactions] = await Promise.all([
    supabase.from("opportunities").select("...").not("stage", "in", "(gagne,perdu,abandonne)"),
    supabase.from("missions").select("...").eq("status", "active"),
    supabase.from("v_profitability_alerts").select("..."),
    supabase.from("interactions").select("...").order("occurred_at", { ascending: false }),
  ])

  // Calcul déterministe pur
  return computePriorities(opps.data ?? [], missions.data ?? [], alerts.data ?? [], interactions.data ?? [])
}

// Fonction pure, testable sans Supabase
function computePriorities(/* ... */): ActionPrioritiesResult {
  // ...
}
```

---

## 6. Contrats de données

### 6.1. Tables et vues consommées par feature

| Feature | Tables / Vues | Droit requis |
|---|---|---|
| action_priorities | opportunities, missions, v_profitability_alerts, interactions, account_score_current, calendar_events | authenticated (RLS) |
| prepare_day | calendar_events, tasks, companies, contacts, persons, candidates, interactions | authenticated (RLS) |
| detect_risks | v_profitability_alerts, missions, mission_activity_reports, v_collaborator_ytd_activity | authenticated (RLS) |
| analyze_activity | v_collaborator_ytd_activity, v_profitability_alerts, missions, collaborator_absences, collaborators | authenticated (RLS) |
| pipeline_insights | opportunities, interactions, pnl_monthly | authenticated (RLS) |
| forecast_revenue | missions, opportunities, collaborator_absences, client_closures, pnl_monthly | authenticated (RLS) |
| prioritize_pipeline | opportunities, opportunity_skills, person_skills, collaborators | authenticated (RLS) |
| analyze_needs | opportunity_skills, person_skills, collaborators, skills | authenticated (RLS) |
| scan_contacts | contacts, companies | authenticated (RLS) |
| analyze_funnel | candidate_hiring_processes, opportunity_candidates, candidates | authenticated (RLS) |
| analyze_margins | missions, v_collaborator_activity_summary | authenticated (RLS) |
| **diagnostic_macro** | **Toutes les sources ci-dessus via RPC** | **service_role** |

### 6.2. Nouvelles valeurs d'enum requises

| Enum | Nouvelle valeur | Feature | Migration |
|---|---|---|---|
| `intelligence_document_type` | `workspace_diagnostic` | Diagnostic macro | 055 |

### 6.3. Nouvelles RPCs requises

| RPC | Feature | Grant | Migration |
|---|---|---|---|
| `get_workspace_diagnostic_context(p_workspace_id, p_as_of_date)` | Diagnostic macro | service_role | 054 |

### 6.4. Nouveau workflow n8n

| Workflow | Feature | Modèle LLM | Coût estimé/appel |
|---|---|---|---|
| `intel-040-workspace-diagnostic` | Diagnostic macro | Claude Sonnet | ~0.05-0.10 USD (3-5K tokens in, ~2K out) |

---

## 7. Roadmap de développement

### Vue d'ensemble

```
Semaine 1 ──── Lot 1 (P0 déterministe)     ─── 10-13 j-h
Semaine 2-3 ── Lot 2 (P1 cockpit/finance)   ─── 6-8 j-h
Semaine 3-4 ── Lot 3 (P1 staffing/compéts)  ─── 6-9 j-h
Semaine 4 ──── Lot 4 (P2 recrutement/marge) ─── 3-5 j-h
Semaine 5-6 ── Lot 5 (Diagnostic macro IA)  ─── 7-10 j-h
                                        Total : 32-45 j-h
```

### Lot 1 — Socle : les 4 features P0 (Semaine 1)

**Objectif :** Prouver la valeur du panneau en livrant 4 features immédiatement utiles. Le manager ouvre KREDO et le panneau sert à quelque chose pour la première fois.

**Contenu :**
1. `action_priorities` (3-4 j) — le panneau du cockpit n'est plus vide
2. `prepare_day` (2-3 j) — le panneau de l'agenda a du contenu
3. `detect_risks` (2-3 j) — les engagements ont un garde-fou
4. `analyze_activity` (2-3 j) — l'équipe a un diagnostic

**Prérequis :** Aucun. Toutes les données sont en base. Aucune migration. Aucun workflow n8n.

**Livrables :**
- 4 Server Actions dans `src/lib/intelligence/actions/`
- 4 composants de résultat dans `src/components/intelligence/action-results/`
- Tests unitaires pour les fonctions pures de calcul
- `intelligence-registry.ts` : 4 actions passent de `coming_soon` à `active`
- Mécanique de transition panneau (grille → résultat → retour) dans `use-intelligence-context.ts`

**Critères de validation :**
- `tsc --noEmit` → EXIT 0
- `npm run build` → EXIT 0
- Tests fonctions pures → PASS
- Cliquer sur une action dans le panneau affiche le résultat (vérification visuelle par Guillaume)

**Ce que chaque agent doit savoir :**
- Lire `scoring.ts` AVANT d'implémenter `action_priorities` — ne pas réinventer le scoring
- Lire `activite-conges/page.tsx` AVANT d'implémenter `analyze_activity` — la page consomme déjà les 3 vues analytiques, comprendre le format des données
- Le pattern de résultat dans le panneau est identique à `PitchMailDrawerContent` dans `IntelligencePanel.tsx` (Session 16 Lot 3) — lire ce code pour comprendre la mécanique retour/navigation
- Les composants de résultat doivent fonctionner en `data-theme="cockpit"` (fond navy/or) pour le desktop et en thème clair pour le mobile drawer

---

### Lot 2 — Cockpit & Finance (Semaine 2-3)

**Objectif :** Compléter le cockpit avec les insights pipeline et donner la prévision de CA.

**Contenu :**
1. `pipeline_insights` (2-3 j)
2. `forecast_revenue` (4-5 j) — le plus lourd du programme, modèle de projection multi-mois

**Prérequis :** Lot 1 (la mécanique du panneau est en place).

**Livrables :**
- 2 Server Actions + 2 composants de résultat
- `french-business-days.ts` — jours ouvrés par mois 2026-2027
- `computeMonthlyForecast()` — fonction pure testable
- Tests unitaires pour le modèle de projection (cas nominal, mission qui finit en milieu de mois, absences qui chevauchent, pipe vide)
- SVG chart 3 courbes pour `ForecastRevenueResult.tsx`

**Points d'attention techniques :**
- Le graphique de prévision est un SVG module-spécifique (pattern `PnlBarChart`, pas de librairie externe — INTERDICTION recharts/chart.js, cf. CLAUDE.md)
- Les jours fériés français sont une liste statique (1er janvier, lundi de Pâques, 1er mai, 8 mai, Ascension, lundi de Pentecôte, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre). Pâques varie — calculer pour 2026 et 2027.
- L'absence d'un champ `expected_closing_date` sur `opportunities` est un compromis documenté. Utiliser `next_action_date` + `duration_days` comme proxy.

---

### Lot 3 — Staffing & Compétences (Semaine 3-4)

**Objectif :** Équiper le staffing avec le priorisation pipeline et la gap analysis compétences.

**Contenu :**
1. `prioritize_pipeline` (3-4 j) — scoring composite des opportunités
2. `analyze_needs` (2-3 j) — matrice offre/demande + gap
3. `scan_contacts` (1-2 j) — facette A uniquement (gap organigramme)

**Prérequis :** Lot 1 (mécanique panneau).

**Livrables :**
- 3 Server Actions + 3 composants de résultat
- Matching skills fin (comparer `opportunity_skills` aux `person_skills` par skill, pas juste par practice) — fonction pure

**Points d'attention techniques :**
- Le matching compétences est le point le plus technique du lot. `opportunity_skills.weight` est 0-1 (flottant), `person_skills.level` est 1-5 (entier). La comparaison demand vs supply doit normaliser les deux sur une échelle commune.
- `scan_contacts` V1 est volontairement simple (gap analysis par rôle). Ne PAS créer d'infrastructure pour l'enrichissement externe (facette B hors scope).

---

### Lot 4 — Recrutement & Marge (Semaine 4)

**Objectif :** Compléter la couverture des pages restantes.

**Contenu :**
1. `analyze_funnel` (2-3 j)
2. `analyze_margins` (1-2 j) — lien contextuel, pas un nouveau composant complet

**Prérequis :** Lot 1.

**Livrables :**
- 2 Server Actions + 2 composants de résultat (dont un minimaliste pour marges = résumé + lien `/finance`)
- Affichage du caveat "snapshot statique" dans le funnel

---

### Lot 5 — Diagnostic macro IA (Semaine 5-6)

**Objectif :** Livrer la couche de sens — le LLM qui articule toutes les pièces.

**Contenu :**
1. Migration 054 : RPC `get_workspace_diagnostic_context` (2-3 j)
2. Migration 055 : enum `workspace_diagnostic` (trivial)
3. Contrat TS `WorkspaceDiagnostic` + parseur (0.5 j)
4. Workflow n8n `intel-040-workspace-diagnostic` (2-3 j)
5. UI cockpit desktop + mobile (2-3 j)
6. Cron optionnel lundi 7h (0.5 j)
7. Tests harnais Node du workflow (1 j)

**Prérequis :**
- Lots 1-4 livrés (les features déterministes alimentent le contexte du diagnostic)
- Accès VPS n8n pour import/activation du workflow
- Secret HMAC configuré (déjà en place si les workflows ADR-0012 sont activés)

**Livrables :**
- Migration SQL (RPC + enum)
- Workflow n8n JSON + SETUP.md
- Composants cockpit (DiagnosticSection desktop + mobile)
- Route cron
- Harnais de test Node + cross-check contrat TS

**Points d'attention critiques :**
- Le prompt système est le plus long du système (~2000 mots). Le rédiger en collaboration avec Guillaume — le contenu détermine la qualité du diagnostic.
- **Le diagnostic ne doit PAS se substituer aux features déterministes.** Si le LLM commence à citer des chiffres exacts (ex: "marge à 12.3%"), ces chiffres doivent être vérifiables dans le contexte JSON. Le QA check `no_invented_numbers` est le garde-fou.
- L'auto-sauvegarde en bibliothèque permet de comparer semaine après semaine. C'est un avantage stratégique par rapport à un diagnostic éphémère — le manager peut voir l'évolution des corrélations au fil du temps.

---

## 8. Dépendances et prérequis

### 8.1. Dépendances entre lots

```
Lot 1 (P0 déterministe) ←── aucune dépendance
  │
  ├── Lot 2 (Cockpit/Finance) ←── dépend de la mécanique panneau (Lot 1)
  ├── Lot 3 (Staffing/Compéts) ←── dépend de la mécanique panneau (Lot 1)
  ├── Lot 4 (Recrutement/Marge) ←── dépend de la mécanique panneau (Lot 1)
  │
  └── Lot 5 (Diagnostic IA) ←── idéalement après Lots 1-4 (contexte plus riche)
                                   mais fonctionne avec les données brutes existantes
```

Les Lots 2, 3 et 4 sont **parallélisables** (aucune dépendance entre eux). Ils peuvent être traités simultanément par des agents différents une fois le Lot 1 livré.

### 8.2. Dépendances externes

| Dépendance | Bloquant pour | État | Action requise |
|---|---|---|---|
| Accès VPS n8n | Lot 5 uniquement | Disponible | Import workflow + config HMAC |
| `SUPABASE_SERVICE_ROLE_KEY` en env Vercel | Lot 5 (cron) | Posé | Aucune |
| Workflows ADR-0012 activés sur VPS | Non bloquant | En attente import | Séparé de ce programme |
| `weekly_brief_dismissals` table | F-01 si on veut le signal dismiss | Existe | Aucune |

### 8.3. Prérequis codebase

| Prérequis | Vérifié | Chemin |
|---|---|---|
| `intelligence-registry.ts` avec toutes les action IDs | Oui | `src/lib/intelligence/intelligence-registry.ts` |
| `IntelligenceActionCard` avec gestion active/coming_soon | Oui | `src/components/intelligence/IntelligenceActionCard.tsx` |
| `IntelligencePanel` + `IntelligenceFAB` montés dans AppShell | Oui | `src/components/intelligence/` |
| `use-intelligence-context.ts` (store Zustand) | Oui | `src/lib/intelligence/use-intelligence-context.ts` |
| Pattern panneau → résultat (PitchMailDrawerContent) | Oui | `src/components/intelligence/IntelligencePanel.tsx` |
| Vues analytiques migration 025 | Oui | En base live |
| `account_score_current` (ADR-0011) | Oui | En base live |
| `pnl_monthly` (12 mois seedés) | Oui | En base live |
| `scoring.ts` (weekly-scoring-v1) | Oui | `src/lib/reports/weekly-manager/scoring.ts` |
| Pattern CORE-001/CORE-002 (trigger + callback n8n) | Oui | `src/app/api/n8n/trigger/route.ts` + `callback/route.ts` |

---

## 9. Points d'attention opérationnels

### 9.1. Règles pour les agents de développement

1. **Lire avant d'écrire.** Avant d'implémenter une feature, lire OBLIGATOIREMENT : `intelligence-registry.ts`, `IntelligencePanel.tsx`, `scoring.ts`, et la page qui consomme déjà les données (cf. tableau §6.1).

2. **Ne jamais recalculer ce qui est GENERATED.** `missions.gross_margin_pct`, `pnl_monthly.gross_margin_value`, `collaborator_compensation.cjm` sont des colonnes générées par Postgres. Les lire, jamais les recalculer.

3. **Ne jamais toucher collaborator_compensation directement.** C'est RLS admin-only. Les métriques de marge passent par les vues analytiques ou les snapshots CRA.

4. **Pas de nouvelle librairie graphique.** Les graphiques sont en SVG module-spécifique ou en HTML/Tailwind pur (jauges, barres). Pas de recharts, pas de chart.js, pas de d3.

5. **Thème cockpit.** Les résultats affichés dans le panneau desktop sont en `data-theme="cockpit"` (fond navy). Les résultats dans le bottom drawer mobile sont en thème clair. Utiliser les variables CSS, pas de hex hardcodé.

6. **Fuseau horaire.** Toute comparaison de date utilise `Europe/Paris` (constante `AGENDA_V1_TIMEZONE`). Les dates en base sont en `timestamptz` (UTC). Convertir explicitement.

7. **Tests.** Chaque feature a une fonction pure de calcul (séparée de la Server Action qui fait les requêtes). La fonction pure est testable avec Vitest sans Supabase. Minimum 5 tests par fonction de calcul.

8. **Volume de données réel.** Le workspace a : 96 comptes, 9 opportunités, 19 missions, 16 collaborateurs, 12 mois de P&L. Les features doivent rester pertinentes avec ces volumes ET scaler si le volume ×10.

### 9.2. Pièges connus

| Piège | Fichier/Table | Explication |
|---|---|---|
| `phase` pollué | `ai_intelligence_results` | `phase=1` contient des rapports (client_summary, etc.), pas seulement des analyses client. Toujours filtrer par `result_type`, jamais par `phase` seul. |
| `ai_score` renommé | `companies` | Colonne renommée `legacy_folio_score` (ADR-0011 Lot 0). L'ancien nom n'existe plus. |
| `private.current_workspace_id()` | Schéma `private` | Non exposé via PostgREST. Résoudre via `profiles.workspace_id` côté front. |
| `missions.practice` = texte libre | `missions` | Pas de FK vers `offer_practices`. Mapping heuristique nécessaire (CASE SQL ou map TS). |
| `opportunity_skills.weight` = 0-1 | `opportunity_skills` | Flottant, pas un entier 1-5. Normaliser avant comparaison avec `person_skills.level`. |
| BSD sed sans `\b` | macOS | `sed -E` sur macOS ne supporte pas `\b`. Utiliser des patterns sans ancre de mot boundary. |

### 9.3. Coordination multi-agents

Ce programme est conçu pour être exécuté par des agents hétérogènes (Claude Code, Codex, Gemini). Règles de coexistence :

1. **Un lot = un agent à la fois.** Pas deux agents sur le même lot en parallèle.
2. **Les Lots 2, 3, 4 sont parallélisables** entre agents différents (aucune dépendance croisée), à condition que le Lot 1 soit terminé et mergé.
3. **Le Lot 5 ne peut commencer qu'après merge des Lots 1-4** (le contexte du diagnostic dépend des Server Actions des features, pas directement mais pour la complétude des tests).
4. **Chaque agent doit vérifier `tsc --noEmit` ET `npm run build` après chaque feature.** Ne jamais committer sans ces deux checks verts.
5. **Chaque agent doit mettre à jour `intelligence-registry.ts`** (status `coming_soon` → `active`) pour chaque feature livrée.
6. **Ne pas modifier les fichiers hors périmètre du lot.** Si un agent découvre un bug dans un fichier qui n'est pas dans son lot, le documenter dans un commentaire de PR, ne pas le fixer (sauf si c'est un bloquant direct).

---

## 10. Glossaire

| Terme | Définition |
|---|---|
| **Feature contextuelle** | Action du panneau Intelligence qui retourne un résultat calculé en temps réel, sans LLM. |
| **Diagnostic macro** | Analyse transversale IA qui corrèle les signaux de toutes les features contextuelles. |
| **Panneau Intelligence** | Side panel desktop (`IntelligencePanel.tsx`) + bottom drawer mobile (`IntelligenceFAB.tsx`). |
| **Server Action** | Fonction `"use server"` Next.js qui exécute une requête Supabase côté serveur et retourne un résultat typé. |
| **RPC** | Remote Procedure Call Supabase (fonction PostgreSQL appelée via `supabase.rpc()`). |
| **Vue analytique** | Vue PostgreSQL `SECURITY INVOKER` pré-calculant des agrégats (migration 025). |
| **Pattern CORE-001/CORE-002** | Passerelle Next → n8n (trigger) et n8n → Next (callback) avec HMAC. |
| **TJM** | Taux Journalier Moyen — prix de vente au client. |
| **CJM** | Coût Journalier Moyen — coût interne chargé (confidentiel, admin-only). |
| **TACI** | Taux d'Activité Congés Inclus — ratio 0-1, PAS un coût. |
| **ACV** | Annual Contract Value — `duration_days × target_daily_rate`. Colonne GENERATED sur `opportunities`. |
| **Weighted gain** | `estimated_gain × conviction / 100`. Colonne GENERATED sur `opportunities`. |
| **Scoring v1** | `rank = urgency × 3 + impact × 2 + risk`. Défini dans `scoring.ts`. |

---

## Annexe A — Checklist de livraison par feature

Pour chaque feature, l'agent vérifie :

- [ ] Server Action créée dans `src/lib/intelligence/actions/`
- [ ] Types de résultat exportés depuis le fichier de la Server Action
- [ ] Composant de résultat créé dans `src/components/intelligence/action-results/`
- [ ] Composant fonctionne en thème cockpit (desktop) et thème clair (mobile)
- [ ] Tests unitaires des fonctions pures de calcul (≥ 5 tests)
- [ ] `intelligence-registry.ts` : status passé à `active`
- [ ] Intégration dans le panneau (clic → résultat → retour)
- [ ] `tsc --noEmit` → EXIT 0
- [ ] `npm run build` → EXIT 0
- [ ] `eslint` sur les fichiers créés/modifiés → 0 erreur
- [ ] Aucun hex hardcodé, aucune librairie graphique externe
- [ ] Mobile : composant lisible en largeur 375px

## Annexe B — Correspondance action IDs ↔ registre existant

| Action ID (registre) | Feature (ce doc) | Lot | Notes |
|---|---|---|---|
| `action_priorities` | F-01 | L1 | |
| `prepare_day` | F-02 | L1 | |
| `detect_risks` | F-03 | L1 | |
| `analyze_activity` | F-04 | L1 | |
| `pipeline_insights` | F-05 | L2 | |
| `forecast_revenue` | F-06 | L2 | |
| `prioritize_pipeline` | F-07 | L3 | |
| `analyze_needs` | F-08 | L3 | Absorbe aussi `analyze_skill_gaps` |
| `scan_contacts` | F-09 | L3 | Facette A uniquement |
| `analyze_funnel` | F-10 | L4 | |
| `analyze_margins` | F-11 | L4 | Lien contextuel, pas composant complet |
| `suggest_training` | — | — | **Rejeté V1** (pas de catalogue formations) |
| `deep_analysis` | — | — | **Déjà fait** (ADR-0012 Lot 2, intel-030) |
| `diagnostic_macro` | §4 | L5 | **Nouveau** — pas dans le registre actuel |

---

*Document de référence pour le programme Intelligence Actions. Toute divergence d'implémentation avec ce document doit être documentée et justifiée dans la PR correspondante.*
