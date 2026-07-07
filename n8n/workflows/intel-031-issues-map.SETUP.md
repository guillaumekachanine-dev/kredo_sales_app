# ADR-0012 Lot 4 — intel-031-issues-map : import & configuration VPS

## 1. Rôle dans la chaîne de décision

Étape 3 (« Cartographie des enjeux ») de la chaîne de décision ADR-0012. Génère
`account_issues_map` (sortie brute LLM, tracée en `ai_intelligence_results`),
**matérialisée automatiquement** par `/api/n8n/callback` en lignes `account_issues`
(D-5 : même pattern que `commercial_pitch` → `intelligence_documents`, mais "1
résultat → N lignes" au lieu de "1 résultat → 1 document"). 15 nœuds, squelette
identique à `intel-030-account-knowledge.json`.

Déclenché par le bouton de l'onglet Enjeux via `POST /api/n8n/trigger`
(`workflowId: "intel-031-issues-map"`, `entityType: "company"`).

## 2. Import

1. n8n → **Workflows → Import from File** → sélectionner `intel-031-issues-map.json`.
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

`get_account_issues_context(p_workspace_id uuid, p_company_id uuid)` — migration
`20260707201824_051_account_issues_context_rpc.sql`, déjà appliquée. Testée en
direct sur Voyage Privé (sans sector_id, `sectorContext=null`) et Ascoma (avec
sector_id, 8 pain points dont « Mise en conformité DORA », 5 échéances
réglementaires dont GAFI/DORA/Solvabilité II).

## 4. Matérialisation automatique — point critique à vérifier

Contrairement aux autres workflows (qui produisent un document unique), celui-ci
déclenche `materializeAccountIssues()` (`src/lib/intelligence/materialize-account-issues.ts`)
depuis `/api/n8n/callback/route.ts` : **chaque enjeu du tableau `issues[]` devient
une ligne `account_issues`** (`status='open'`, `generated_by_run_id` = ce run).
Si le contrat de sortie du LLM ne correspond pas exactement au schéma attendu
(vérifié par "Parse & Validate Output" côté n8n), la matérialisation échoue et
le callback renvoie 500 — vérifier les logs Next.js (`[callback] materializeAccountIssues failed`)
en cas de problème, pas seulement les logs n8n.

Chaque run crée un **nouveau lot** de lignes — pas de déduplication automatique
contre les enjeux déjà ouverts (le prompt reçoit `existingOpenIssues` pour limiter
les doublons en amont, best-effort seulement). Le QA flag `no_exact_title_duplicates`
signale les doublons détectés sans bloquer la sauvegarde.

## 5. Provenance — même contrainte que intel-030 (D-3)

Le nœud **"Parse & Validate Output"** rejette toute `provenance` hors de
`{relational, folio_legacy, inferred}`. Décision documentée dans le prompt : les
enjeux dérivés de `context.sectorContext` (pain points/réglementaire mutualisés)
sont tagués `relational` au même titre que le relationnel KREDO direct — ce sont
des faits de base de données, pas des déductions LLM.

## 6. Test avant activation

1. Dans n8n, ouvrir "Webhook — Issues Map" → copier l'URL de test.
2. Depuis Kredo, ouvrir un compte avec du contexte riche ET un secteur rattaché
   (ex. Ascoma — Banque-Finance-Assurance, 8 pain points réels) et déclencher la
   génération depuis l'onglet Enjeux.
3. Vérifier dans n8n → **Executions** que les 11 nœuds du chemin nominal
   s'exécutent sans erreur.
4. Vérifier dans Supabase : une ligne `ai_intelligence_results` avec
   `result_type='account_issues_map'`, ET plusieurs lignes `account_issues`
   nouvellement créées avec `company_id` correct, `status='open'`,
   `generated_by_run_id` = le run déclenché.
5. Vérifier que l'onglet Enjeux affiche la matrice/liste des enjeux nouvellement
   matérialisés.
6. Tester un échec volontaire (couper `ANTHROPIC_API_KEY`) pour vérifier que le
   run passe à `failed` sans créer de ligne `account_issues` orpheline.

## 7. Validation déjà faite dans cette session (sans VPS)

- Syntaxe JS des 6 nœuds `code` validée via `node --check`.
- **Exécution réelle** via harnais Node avec mocks : cas nominal (2 enjeux),
  rejet provenance interdite, rejet `contact_id` inconnu du contexte, rejet
  score hors plage 1-5, chemin d'échec.
- **Cross-check de contrat** : la forme de chaque enjeu dans `contentJson.issues[]`
  comparée programmatiquement aux clés exactes attendues par
  `materializeAccountIssues()` (`src/lib/intelligence/materialize-account-issues.ts`)
  — match confirmé, garantit que l'insertion en base ne cassera pas silencieusement.
- RPC `get_account_issues_context` testée en direct sur données réelles (voir §3.3).

## 8. Activation

Une fois le test §6 validé de bout en bout : activer le workflow.

## 9. Non fait dans cette session (Lot 4)

- Import/activation réels sur le VPS.
- Déduplication robuste entre runs successifs (V1 = best-effort prompt + QA flag
  uniquement, pas de merge/update automatique des enjeux existants).
- Tiering Haiku/Sonnet (D-6) — Sonnet comme tous les workflows précédents.
