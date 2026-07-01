# INTEL-020 — intel-020-communication : import & configuration VPS

## 1. Import
1. n8n → **Workflows → Import from File** → sélectionner `intel-020-communication.json`.
2. Ne pas activer tout de suite (`active: false` par défaut) — configurer d'abord les points ci-dessous.

## 2. Variables d'environnement n8n (sur le VPS, pas dans le workflow)

| Variable | Valeur | Doit être identique à |
|---|---|---|
| `SUPABASE_URL` | `https://jvzgmhvwirsbdkjpmvla.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` (Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role du projet | `SUPABASE_SERVICE_ROLE_KEY` (Vercel) |
| `N8N_WEBHOOK_SECRET` | secret partagé HMAC | `N8N_WEBHOOK_SECRET` (Vercel) — **doit être exactement la même valeur des deux côtés**, sinon le nœud "Validate & Extract Brief" rejette tout (signature invalide) et le callback final échoue aussi |
| `ANTHROPIC_API_KEY` | clé API Anthropic | — |

Ces variables se déclarent dans le fichier `.env` du conteneur n8n (ou les variables d'environnement du service selon l'hébergement), **pas** dans l'UI "Credentials". Le workflow y accède via `$env.NOM_VARIABLE` dans les nœuds Code et dans les expressions des nœuds HTTP Request.

⚠️ **Point d'attention critique** : par défaut, n8n **bloque** l'accès de `$env` et de `require()` aux modules Node natifs (`crypto`) depuis les nœuds Code, pour des raisons de sécurité. Sur le conteneur n8n, il faut positionner :
```
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
NODE_FUNCTION_ALLOW_BUILTIN=crypto
```
Sans ça, les nœuds "Validate & Extract Brief", "Hydrate Context", "Prepare Callback" et "Prepare Failure Callback" échoueront immédiatement (`$env is not defined` ou `crypto is not defined`).

## 3. Pourquoi pas de Credentials Supabase/Anthropic natives ?

Le contrat INTEL-020 (§7.3) proposait initialement le nœud Supabase natif pour "Update Run Status" et "Resolve Sender Identity". Ce workflow utilise **HTTP Request partout** (au lieu de mixer nœud natif + Code) pour deux raisons :
- Un seul pattern d'accès Supabase = plus prévisible à déboguer.
- Le nœud Supabase natif de n8n a un schéma de paramètres qui varie selon la version installée — HTTP Request direct contre `/rest/v1/...` avec la clé `service_role` est stable dans le temps.

## 4. Le "signal épinglé" (`brief.context.signalRef`) n'est pas branché en V1

Le document d'origine suppose une table de signaux adressable par UUID que l'utilisateur peut épingler depuis l'UI. Dans le code actuel, les signaux affichés dans le Cockpit (`ClientIntelligenceData.signals`) sont de simples chaînes de texte extraites d'un JSON d'analyse (`ai_intelligence_results.content_json`), pas des lignes de table avec un id. Le nœud "Hydrate Context" ne cherche donc **pas** `signalRef` — à la place, il va chercher automatiquement les 3 actualités les plus récentes de `sector_news` pour le secteur du compte (`companies.sector_id`). Le champ `signalRef` reste dans le type TypeScript `CommunicationBrief` pour compatibilité V1.5 (quand un vrai sélecteur de signal existera), mais il est ignoré par ce workflow.

## 5. Gestion des erreurs — écart volontaire avec le document

Le document (§7.3, nœud 11) proposait un "Error Trigger" séparé configuré via *Workflow Settings → Error Workflow*. En pratique, un Error Trigger démarre une **exécution neuve et isolée** : il ne reçoit que `{ execution, workflow }`, pas les données de l'exécution qui a échoué — donc pas moyen de récupérer `runId`/`callbackUrl` pour notifier Next.js de l'échec.

Ce workflow utilise à la place la sortie d'erreur native des nœuds (`onError: continueErrorOutput`) sur "Hydrate Context", "Call LLM" et "Parse & Validate Output" : en cas d'échec, ces nœuds routent vers "Prepare Failure Callback" **avec le contexte de l'exécution encore disponible** (`runId`, `callbackUrl`), qui notifie proprement `/api/n8n/callback` avec `status: "failed"`.

## 6. Test avant activation

1. Dans n8n, ouvrir le nœud "Webhook — Communication" → copier l'URL de test.
2. Depuis Kredo (dev), déclencher une génération depuis le drawer Rédaction assistée sur un compte réel — ça passe par `/api/n8n/trigger` qui signe et poste vers `{N8N_WEBHOOK_BASE_URL}/webhook/intel-020-communication`.
3. Vérifier dans n8n → **Executions** que les 8 nœuds du chemin nominal s'exécutent sans erreur.
4. Vérifier dans Supabase que `ai_intelligence_runs.status` passe à `succeeded` et qu'une ligne apparaît dans `ai_intelligence_results` avec `phase = 5`, `result_type = 'communication'`.
5. Vérifier que le drawer reçoit le résultat via Realtime (pas de refresh manuel nécessaire).
6. Tester un échec volontaire (couper `ANTHROPIC_API_KEY` temporairement) pour vérifier que le run passe à `failed` proprement au lieu de rester bloqué en `running`.

## 7. Activation

Une fois le test §6 validé de bout en bout : activer le workflow (toggle en haut à droite de l'écran n8n).
