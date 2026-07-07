# ADR-0012 Lot 2 — intel-030-account-knowledge : import & configuration VPS

## 1. Rôle dans la chaîne de décision

Étape 1 (« Connaissance compte ») de la chaîne de décision ADR-0012. Génère l'artefact
`account_knowledge` (`content_json` conforme au contrat `AccountKnowledgeContent`,
`src/lib/intelligence/account-intelligence-contracts.ts`) à partir du relationnel KREDO
(contacts/opportunités/missions/interactions/signaux — haute confiance) + FOLIO en passthrough
brut (basse confiance) + diagnostic process en enrichissement optionnel (D-2). **15 nœuds**,
squelette identique à `report-account-summary.json`.

Déclenché par le bouton « Lancer/actualiser la connaissance compte » de l'onglet Connaissance
compte (`ClientIntelligenceDesktopView.tsx`/`ClientIntelligenceMobileView.tsx`) via
`POST /api/n8n/trigger` (`workflowId: "intel-030-account-knowledge"`, `entityType: "company"`).

## 2. Import

1. n8n → **Workflows → Import from File** → sélectionner `intel-030-account-knowledge.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).

## 3. Configuration requise

### 3.1 Secret HMAC (nœuds Crypto)

**"Verify Signature"**, **"Sign Callback"** et **"Sign Failure Callback"** contiennent le
placeholder `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET`. Remplacer par la même valeur que la variable
d'environnement `N8N_WEBHOOK_SECRET` côté Vercel (déjà configurée pour les workflows précédents —
copier le même secret).

### 3.2 Credentials

| Credential n8n | Type | Utilisé par |
|---|---|---|
| Supabase (service_role) | `supabaseApi` | "Update Run Status", "Hydrate Context" |
| Anthropic | `anthropicApi` | "Call LLM" |

Sélectionner ces credentials sur les nœuds correspondants après import (n8n ne les reporte pas
automatiquement).

### 3.3 RPC prérequise

`get_account_knowledge_context(p_workspace_id uuid, p_company_id uuid)` — migration
`20260707183536_049_account_knowledge_context_rpc.sql`, déjà appliquée en base (testée en direct
sur Voyage Privé : 7 missions, 1 opportunité, 6 contacts, 5 signaux FOLIO). `GRANT EXECUTE TO
service_role` — aucune config supplémentaire requise côté Supabase.

## 4. Provenance — contrainte spécifique à ce workflow (D-3)

Le nœud **"Parse & Validate Output"** rejette toute valeur de `provenance` hors de
`{relational, folio_legacy, inferred}` — **`human_verified`** (réservé à la curation manager côté
app, jamais émis par un LLM) et **`engine_researched`** (réservé aux futurs workflows de recherche
web datée, ce que celui-ci ne fait pas) sont des erreurs de génération, pas des valeurs valides
pour ce workflow. Si le run échoue systématiquement sur ce contrôle, relire le prompt système —
c'est un signal que le modèle dérive, pas un bug du garde-fou.

Décision documentée dans le prompt système : les faits dérivés de `context.processDiagnostic`
(diagnostic déjà produit par le moteur KREDO, pas un import FOLIO ni une recherche web) sont tagués
`relational` — le fit avec les 5 valeurs de l'enum est imparfait ici (aucune ne décrit exactement
"artefact moteur historique"), c'est un choix assumé documenté dans le code, pas un oubli.

## 5. Test avant activation

1. Dans n8n, ouvrir "Webhook — Account Knowledge" → copier l'URL de test.
2. Depuis Kredo, ouvrir un compte avec du relationnel riche (ex. Voyage Privé — 7 missions, 1 opp,
   6 contacts, 5 signaux) et cliquer "Lancer/actualiser la connaissance compte" dans l'onglet
   Connaissance compte.
3. Vérifier dans n8n → **Executions** que les 11 nœuds du chemin nominal s'exécutent sans erreur
   (Webhook → Verify Signature → Validate Entity → Update Run Status → Hydrate Context → Assemble
   Prompt → Call LLM → Parse & Validate Output → Quality Check → Prepare Callback → Sign Callback → Callback).
4. Vérifier dans Supabase qu'une ligne apparaît dans `ai_intelligence_results` avec
   `result_type = 'account_knowledge'`, `content_json.schema_version = 1`, et les 6 clés attendues
   (`identity_positioning`, `commercial_relationship`, `key_contacts`, `organisation_observed`,
   `frictions_and_signals`, `open_questions`).
5. Vérifier que l'onglet Connaissance compte affiche la synthèse générée (section "Synthèse générée
   (moteur IA)") avec les boutons de curation (✓ confirmer / ★ épingler / ✕ écarter) fonctionnels.
6. Tester un échec volontaire (couper `ANTHROPIC_API_KEY` temporairement) pour vérifier que le run
   passe à `failed` proprement et que l'UI affiche le message d'erreur.

## 6. Validation déjà faite dans cette session (sans VPS)

- Syntaxe JS des 6 nœuds `code` validée via `node --check`.
- **Exécution réelle** (pas seulement syntaxique) via harnais Node avec mocks réalistes
  (`Validate Entity` bon/mauvais `entityType`, `Parse & Validate Output` bon cas + cas de rejet
  provenance interdite, `Quality Check`, `Prepare Callback`, `Prepare Failure Callback`).
- **Cross-check de contrat** : le `contentJson` produit par "Prepare Callback" a été comparé
  programmatiquement aux clés exactes attendues par `parseAccountKnowledgeContent()`
  (`src/lib/intelligence/intelligence-data.ts`) — match confirmé.
- RPC `get_account_knowledge_context` testée en direct sur données réelles (voir §3.3).

## 7. Activation

Une fois le test §5 validé de bout en bout : activer le workflow (toggle en haut à droite de
l'écran n8n).

## 8. Non fait dans cette session (Lot 2)

- Import/activation réels sur le VPS (checklist ci-dessus à dérouler par Guillaume).
- Tiering Haiku/Sonnet (D-6 de l'ADR) — ce workflow utilise Sonnet comme tous les workflows
  existants ; le tiering économique reste une optimisation à appliquer plus tard, pas un blocage V1.
- Parsers dédiés côté UI pour un futur `sector_snapshot` (Lot 3) — sans rapport direct avec ce
  workflow mais noté dans `intelligence-data.ts` pour la session suivante.
