# ADR-0014 Lot 5 — Installation de `intel-040-workspace-diagnostic`

## 1. Pré-requis

Appliquer d'abord les migrations, dans cet ordre :

1. `20260713194737_054_workspace_diagnostic_rpc.sql`
2. `20260713194738_055_workspace_diagnostic_enum.sql`

La RPC `get_workspace_diagnostic_context` doit être visible dans PostgREST et son exécution doit être accordée uniquement à `service_role`. La valeur `workspace_diagnostic` doit ensuite apparaître dans `intelligence_document_type`.

Variables Vercel déjà utilisées par les workflows existants :

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_WEBHOOK_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` ou l'URL de production Vercel

## 2. Import du workflow principal

Dans n8n : **Workflows → Import from File**, puis sélectionner `intel-040-workspace-diagnostic.json`.

Le workflow doit rester désactivé pendant la configuration. Il contient quinze nœuds et un seul appel de données : `Hydrate Context` appelle `get_workspace_diagnostic_context`. Ne pas remplacer ce nœud par plusieurs requêtes REST.

Configurer les credentials suivants :

| Nœud | Credential |
|---|---|
| Update Run Status | Supabase `service_role` (`supabaseApi`) |
| Hydrate Context | Supabase `service_role` (`supabaseApi`) |
| Call LLM | Anthropic (`anthropicApi`) |

Remplacer `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` dans `Verify Signature`, `Sign Callback` et `Sign Failure Callback` par la même valeur que `N8N_WEBHOOK_SECRET` côté Vercel.

## 3. Relecture du prompt avec Guillaume

Le prompt système est embarqué dans le nœud `Assemble Prompt`. Avant activation, relire ensemble au minimum :

- le niveau de franchise attendu dans la synthèse exécutive ;
- les critères de sévérité `critical`, `warning` et `opportunity` ;
- la définition métier d'une vraie corrélation multi-axe ;
- le niveau de prescription autorisé dans les priorités ;
- les formulations à éviter pour les données pauvres ou absentes.

Ne pas assouplir les règles de provenance : aucun calcul LLM, aucun nombre absent du contexte, et chaque `evidenceRefs[].metric` doit être un chemin réel du JSON de la RPC.

## 4. Contrat d'entrée

Le webhook `/webhook/intel-040-workspace-diagnostic` reçoit le payload CORE-001 habituel avec :

```json
{
  "workflowId": "intel-040-workspace-diagnostic",
  "entityType": "workspace",
  "entityId": "<workspace uuid>",
  "workspaceId": "<workspace uuid>",
  "input": {
    "diagnosticType": "workspace_diagnostic",
    "asOfDate": "2026-07-13"
  }
}
```

La route UI est `POST /api/reports/workspace-diagnostic/trigger`. Elle authentifie l'utilisateur, résout son workspace, crée le run puis signe l'appel n8n.

## 5. Quality Check

Le nœud `Quality Check` persiste exactement cinq flags dans `ai_intelligence_results.qa_flags` :

1. `correlations_cross_axes`
2. `evidence_refs_present`
3. `no_invented_numbers`
4. `max_items_respected`
5. `priorities_linked`

Un flag en échec n'est pas masqué. Le résultat reste sauvegardé pour audit, mais le prompt doit être corrigé avant généralisation si `no_invented_numbers` ou `evidence_refs_present` échoue.

## 6. Test avant activation

Exécuter d'abord le harnais local :

```bash
node n8n/workflows/__tests__/intel-040-workspace-diagnostic.test.js
```

Puis lancer un diagnostic depuis le cockpit et vérifier :

1. le run passe `queued → running → succeeded` ;
2. `Hydrate Context` ne fait qu'un appel RPC ;
3. un résultat `workspace_diagnostic`, phase `1`, est créé ;
4. les cinq flags QA sont présents ;
5. le callback crée automatiquement un document `workspace_diagnostic` ;
6. le cockpit reçoit l'événement Realtime et affiche le document frais ;
7. un second diagnostic crée un nouveau document, afin de préserver l'historique hebdomadaire.

Tester également le chemin d'échec en retirant temporairement le credential Anthropic sur une copie non active : le run doit finir en `failed` via le callback d'échec.

## 7. Cron du lundi à 07:00

Importer `intel-040-workspace-diagnostic-cron.json`, remplacer son secret HMAC et vérifier l'URL de production dans `Call Cron Trigger`.

Le workflow est configuré avec le timezone `Europe/Paris` et l'expression `0 7 * * 1`. La route appelée est `POST /api/reports/workspace-diagnostic/cron-trigger`. Elle sélectionne une fois chaque workspace, préfère son owner/admin comme propriétaire du document et ignore un run cron déjà présent le même jour.

Activer le cron seulement après un passage manuel complet. Le workflow principal et le workflow cron doivent tous deux être actifs pour que la génération hebdomadaire aboutisse.
