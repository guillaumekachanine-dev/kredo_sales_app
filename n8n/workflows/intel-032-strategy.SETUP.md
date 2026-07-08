# ADR-0012 Lot 5 — intel-032-strategy : import & configuration VPS

## 1. Rôle dans la chaîne de décision

Étape 4 (« Stratégie commerciale ») de la chaîne de décision ADR-0012. Génère
`commercial_strategy` — content_json PUR (D-5, pas de matérialisation en table
contrairement aux enjeux du Lot 4) : mapping enjeu↔offre, angles d'approche,
messages clés par persona, objections anticipées. Auto-sauvegardé en
bibliothèque documentaire (`intelligence_documents`, `isEligibleDocumentResult`)
comme les autres analyses (`client_summary`, `commercial_pitch`...). 15 nœuds,
squelette identique à `intel-031-issues-map.json`.

Déclenché par le bouton de l'onglet Stratégie via `POST /api/n8n/trigger`
(`workflowId: "intel-032-strategy"`, `entityType: "company"`).

**Ne remplace pas** `intel-020-communication` (canaux `spoken_pitch_30s`/
`meeting_briefing`, ADR-0009) : ce workflow produit la STRATÉGIE (le mapping),
pas le texte final d'un pitch à prononcer. Le bouton "Générer un pitch" de
l'onglet Stratégie reste branché sur `intel-020-communication`, inchangé.

## 2. Import

1. n8n → **Workflows → Import from File** → sélectionner `intel-032-strategy.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).

## 3. Configuration requise

### 3.1 Secret HMAC (nœuds Crypto)

**"Verify Signature"**, **"Sign Callback"** et **"Sign Failure Callback"** —
remplacer `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` par la valeur de
`N8N_WEBHOOK_SECRET` (même secret que les workflows précédents).

### 3.2 Credentials

| Credential n8n | Type | Utilisé par |
|---|---|---|
| Supabase (service_role) | `supabaseApi` | "Update Run Status", "Hydrate Context" |
| Anthropic | `anthropicApi` | "Call LLM" |

### 3.3 RPC prérequise

`get_commercial_strategy_context(p_workspace_id uuid, p_company_id uuid)` —
migration `20260707225318_052_commercial_strategy_context_rpc.sql`, déjà
appliquée. Testée en direct sur Ascoma (secteur Banque-Finance-Assurance riche :
playbook + pain points + 41 offres actives + grille tarifaire par practice).
`openIssues` renvoie `[]` tant que `intel-031-issues-map` (Lot 4) n'a pas encore
été importé/activé sur ce VPS — comportement attendu, pas un bug (voir §6.2).

### 3.4 Type de document requis

`intelligence_document_type` doit inclure la valeur `commercial_strategy` —
migration `20260707225628_053_commercial_strategy_document_type.sql`, déjà
appliquée. Sans elle, l'auto-sauvegarde en bibliothèque échoue silencieusement
côté callback (contrainte enum Postgres).

## 4. Provenance — même contrainte que intel-030/intel-031 (D-3)

Le nœud **"Parse & Validate Output"** rejette toute `provenance` hors de
`{relational, folio_legacy, inferred}` sur chaque `offer_match`, et rejette tout
`issue_id`/`offer_id` absent du contexte hydraté (jamais un id halluciné).

## 5. Contraintes de forme validées durement

- `approach_angles` : 2 à 4 entrées (rejeté sinon).
- `objections` : au moins 2 entrées.
- `key_messages_by_persona` : chaque clé doit avoir au moins un message.
- `offer_matches` : peut être vide si `context.openIssues` est vide (Lot 4 pas
  encore alimenté) — le workflow ne doit JAMAIS inventer un enjeu pour compenser.

## 6. Test avant activation

### 6.1 Cas nominal (avec enjeux déjà cartographiés)

1. Prérequis : `intel-031-issues-map` déjà importé/activé et au moins un run
   réussi sur le compte de test (pour peupler `account_issues`).
2. Dans n8n, ouvrir "Webhook — Strategy" → copier l'URL de test.
3. Depuis Kredo, ouvrir ce compte et déclencher la génération depuis l'onglet
   Stratégie.
4. Vérifier dans n8n → **Executions** que les 11 nœuds du chemin nominal
   s'exécutent sans erreur.
5. Vérifier dans Supabase : une ligne `ai_intelligence_results` avec
   `result_type='commercial_strategy'`, ET une ligne `intelligence_documents`
   correspondante (auto-sauvegarde).
6. Vérifier que l'onglet Stratégie affiche la matrice enjeu→offre, les angles
   d'approche, les messages par persona et les objections.

### 6.2 Cas dégradé (sans enjeux — Lot 4 pas encore actif)

Sur un compte sans aucun `account_issues` ouvert : le workflow doit quand même
réussir avec `offer_matches: []`. Vérifier que l'UI affiche alors le message
"Cartographie d'abord les enjeux (étape 3)..." plutôt qu'une matrice vide sans
explication.

### 6.3 Échec volontaire

Couper `ANTHROPIC_API_KEY` pour vérifier que le run passe à `failed` proprement
(callback de failure signé, pas de document orphelin créé).

## 7. Validation déjà faite dans cette session (sans VPS)

- Syntaxe JS des 6 nœuds `code` validée via `node --check`.
- **Exécution réelle** via harnais Node avec mocks : cas nominal (1 mapping,
  2 enjeux dans le contexte), rejet provenance interdite, rejet `issue_id`
  inconnu, rejet `offer_id` inconnu, rejet nombre d'angles hors 2-4 (trop peu
  et trop), rejet nombre d'objections < 2.
- **Cross-check de contrat** : les clés de `contentJson` (callback) comparées
  programmatiquement aux clés exactes de `CommercialStrategyContent`
  (`src/lib/intelligence/account-intelligence-contracts.ts`) et de
  `CommercialStrategyOfferMatch` — match confirmé.
- RPC `get_commercial_strategy_context` testée en direct sur données réelles
  (voir §3.3).

## 8. Activation

Une fois les tests §6.1/6.2/6.3 validés de bout en bout : activer le workflow.

## 9. Non fait dans cette session (Lot 5)

- Import/activation réels sur le VPS.
- Import/activation de `intel-031-issues-map` (Lot 4) — prérequis pour tester
  le cas nominal §6.1 avec de vrais enjeux (sinon seul le cas dégradé §6.2 est
  testable).
- Tiering Haiku/Sonnet (D-6) — Sonnet comme tous les workflows précédents.
- Playbook sectoriel affiché dans l'onglet Stratégie : consultable seulement
  via le mapping/contenu généré, pas de vue dédiée dupliquant
  `SectorSnapshotContent.tsx` (onglet Secteur) — décision de scope, pas un oubli.
