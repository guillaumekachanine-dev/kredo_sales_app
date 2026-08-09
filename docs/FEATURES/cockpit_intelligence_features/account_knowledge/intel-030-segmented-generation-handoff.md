# Handoff : Génération Segmentée AccountKnowledge V3 (Workflow n8n INTEL-030)

## Context & Problem
Le premier run réel d'analyse d'entreprise sur la version V3 (Arkopharma) a échoué car le modèle `claude-sonnet-5` (Claude 3.7 Sonnet) a atteint sa limite de tokens de sortie (`stop_reason = max_tokens`). La génération de la totalité du rapport V3 en une seule invocation consommait la quasi-totalité du budget de sortie (16 000 tokens) sous forme de tokens de réflexion (*thinking tokens*), laissant moins de 2 000 tokens pour le texte du JSON final.

## Solution : Génération Segmentée (A, B, C)
Pour contourner la limite de tokens de sortie tout en profitant des capacités de raisonnement du modèle, la génération du brouillon V3 a été divisée en trois segments séquentiels :

1. **Segment A (Nœud `V3 Call LLM (Draft)`)** :
   - Sections : `account_summary`, `identity`, `market_positioning`
   - Prompt : `draftSystemPromptA`
   - Budget : `max_tokens: 8000`

2. **Segment B (Nœud `V3 Call LLM (Draft B)`)** :
   - Sections : `offers_and_customers`, `value_chain`
   - Prompt : `draftSystemPromptB`
   - Budget : `max_tokens: 8000`

3. **Segment C (Nœud `V3 Call LLM (Draft C)`)** :
   - Sections : `regulatory_environment`, `trends_and_news`
   - Prompt : `draftSystemPromptC`
   - Budget : `max_tokens: 8000`

### Gestion des Troncatures
Chaque appel LLM est immédiatement suivi d'un contrôle de troncature (`V3 A Truncated?`, `V3 B Truncated?`, `V3 C Truncated?`). Si un seul des segments renvoie `stop_reason === "max_tokens"`, le flux s'interrompt et déroute immédiatement vers `Prepare Truncated Error` -> `Prepare Failure Callback`, envoyant le code d'erreur `V3_DRAFT_TRUNCATED` avec un statut `failed` à Kredo.

### Fusion Déterministe (`V3 Merge Segments`)
Une fois les trois segments générés avec succès, le nœud Code `V3 Merge Segments` effectue les opérations suivantes :
- Analyse et nettoie le JSON de chaque segment.
- Valide la présence des 3 fragments.
- Collecte récursivement tous les claims et lève une erreur si des doublons de `claim_path` sont détectés.
- Reconstitue le JSON final en respectant l'ordre canonique strict des 7 sections V3.
- Cumule l'usage des tokens de saisie et de sortie des 3 appels LLM.
- Formate la sortie dans un conteneur `{ content: [{ text: ... }], usage, model }` identique à une réponse LLM classique pour alimenter de manière transparente le parser `V3 Parse Draft` existant.

## Validation et Tests
La solution est validée par 3 suites de tests passant à 100% :
1. **Tests unitaires V3** (`node n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js`) : `58/58` tests passés.
2. **Tests unitaires V2** (`node n8n/workflows/__tests__/intel-030-account-knowledge.test.js`) : `76/76` tests passés.
3. **Tests de structure Vitest** (`npx vitest run src/lib/intelligence/account-knowledge-v3-workflow.test.ts`) : `15/15` tests passés.

## Déploiement
Le workflow a été publié sur le VPS n8n de production :
- **ID du workflow** : `Pw0JFl8KtrZgHhhJ`
- **Statut** : `Actif` (Live)
- **Modèle réel utilisé** : `claude-sonnet-5` (Claude 3.7 Sonnet) sur les trois segments.
