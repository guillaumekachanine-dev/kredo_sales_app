# ADR-0010 Lot 2 — report-manager-summary : import & configuration VPS

## 1. Différence structurelle avec les autres rapports REPORT-001 (à lire avant d'importer)

`report-activity-commercial`/`report-activity-recruitment`/`report-account-summary` ont chacun un nœud
**"Hydrate Facts"** qui appelle une RPC Supabase (`get_activity_commercial_facts`, etc.) directement
depuis n8n. **`report-manager-summary` n'a pas ce nœud.**

Le compte-rendu manager a besoin de `loadAgendaSnapshot()` — l'agrégateur agenda de Kredo
(`src/lib/agenda/aggregate-agenda-snapshot.ts`), qui est du TypeScript applicatif (7 résolveurs,
timeouts, dédoublonnage, alertes dérivées), pas une RPC SQL. n8n ne peut pas l'appeler. Plutôt que de
dupliquer cette logique dans un nœud Code n8n (ce que l'ADR-0010 interdit explicitement — "zéro
duplication avec AgendaSnapshot"), **Next.js calcule la totalité des faits AVANT d'appeler ce webhook** :

```
src/app/api/reports/weekly-manager/trigger/route.ts
  → loadAgendaSnapshot()               (source unique "quoi cette semaine")
  → get_weekly_business_facts (RPC)    (faits que l'agenda ne peut pas produire)
  → computeWeeklyBrief()               (assemble + scoring déterministe weekly-scoring-v1)
  → POST /webhook/report-manager-summary avec input.facts déjà complet
```

Ce workflow reçoit donc `input.facts` déjà entièrement calculé. Son seul travail : rédiger la
narrative (executiveSummary/weeklyFocus/topPriorities/risks/suggestedTasks), la valider (QA), et
callback. **14 nœuds** au lieu des 15 des rapports d'activité (pas de "Hydrate Facts").

## 2. Import

1. n8n → **Workflows → Import from File** → sélectionner `report-manager-summary.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).

## 3. Configuration requise

### 3.1 Secret HMAC (2 nœuds Crypto)

Les nœuds **"Verify Signature"** et **"Sign Callback"**/**"Sign Failure Callback"** contiennent le
placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`. Remplacer par la même valeur que la variable
d'environnement `N8N_WEBHOOK_SECRET` côté Vercel (déjà configurée depuis les workflows
`report-account-summary`/`report-activity-commercial`/`report-activity-recruitment` — copier le même
secret, pas besoin d'en générer un nouveau).

### 3.2 Credentials

Ce workflow utilise le même motif que `report-activity-commercial.json`/`report-activity-recruitment.json` :
`predefinedCredentialType` natif (pas `$env` + HTTP Request brut comme `intel-020-communication.json`).

| Credential n8n | Type | Utilisé par |
|---|---|---|
| Supabase (service_role) | `supabaseApi` | "Update Run Status" |
| Anthropic | `anthropicApi` | "Call LLM" |

Si ces credentials existent déjà (configurées pour les 3 workflows REPORT-001 précédents), rien à
refaire — les sélectionner simplement sur les nœuds "Update Run Status" et "Call LLM" de ce nouveau
workflow après import (n8n ne reporte pas automatiquement les credentials sur un workflow importé).

## 4. Contrat d'entrée — ne pas confondre avec les autres rapports

`input` (dans le payload webhook) doit contenir :
```ts
{
  reportType: "manager_summary",
  period: { startDate, endDate, asOfDate, weekIso },  // ex. weekIso = "2026-W28"
  scope: { ownerId: string | null, isWorkspaceWide: boolean },
  facts: WeeklyManagerFacts,  // OBLIGATOIRE — déjà calculé, voir §1
  additionalInstructions?: string,
}
```
Le nœud "Validate Brief" rejette explicitement toute requête où `input.facts` est absent — c'est le
garde-fou qui empêche ce workflow d'être appelé comme les autres rapports (avec juste une période, sans
faits pré-calculés).

## 5. Traçabilité des priorités (garde-fou anti-invention spécifique à ce workflow)

Le nœud "Quality Check" ajoute un contrôle absent des autres rapports : `top_priorities_traceability` —
chaque `topPriorities[].title` renvoyé par le LLM doit correspondre EXACTEMENT à un `title` déjà présent
dans `facts.priorities` (la liste triée par le scoring déterministe `weekly-scoring-v1`). Si le LLM
invente une priorité absente de `facts.priorities`, le flag QA passe à `false` avec le détail des titres
non reconnus — visible dans `ai_intelligence_results.qa_flags` sans bloquer la sauvegarde (comme les
autres contrôles QA de ce projet, c'est un signal affiché, pas un blocage dur).

## 6. Test avant activation

1. Dans n8n, ouvrir "Webhook — Weekly Manager" → copier l'URL de test.
2. Depuis Kredo (dev), appeler `POST /api/reports/weekly-manager/trigger` (body vide = semaine ISO en
   cours, périmètre personnel par défaut) — la route calcule les faits et signe l'appel vers
   `{N8N_WEBHOOK_BASE_URL}/webhook/report-manager-summary`.
3. Vérifier dans n8n → **Executions** que les 12 nœuds du chemin nominal s'exécutent sans erreur
   (Webhook → Verify Signature → Validate Brief → Update Run Status → Assemble Prompt → Call LLM →
   Parse & Validate Output → Quality Check → Prepare Callback → Sign Callback → Callback).
4. Vérifier dans Supabase que `ai_intelligence_runs.status` passe à `succeeded` et qu'une ligne apparaît
   dans `ai_intelligence_results` avec `phase = 1`, `result_type = 'manager_summary'`.
5. Vérifier `qa_flags` : `top_priorities_traceability` et `no_unauthorized_numbers` doivent être `true`
   sur un test propre — sinon relire le prompt système, pas les corriger côté callback.
6. Tester un échec volontaire (couper `ANTHROPIC_API_KEY` temporairement) pour vérifier que le run passe
   à `failed` proprement.

## 7. Activation

Une fois le test §6 validé de bout en bout : activer le workflow (toggle en haut à droite de l'écran n8n).

## 8. Non fait dans cette session (Lot 2)

- UI de déclenchement (bouton "Compte-rendu Manager" dans l'agenda/cockpit intelligence) — Lot 3.
- Actions 1-clic post-génération (ajouter à l'agenda, créer tâche, générer communication, dismiss) — Lot 3.
- Cron auto lundi 07:00 — Lot 4, workflow séparé `report-manager-summary-cron`.
