# HANDOFF — HOTFIX L2 : Refactoring de l'hydratation V2 (`INTEL-021`)

**Date** : 2026-08-19  
**Statut** : Hotfix d'hydratation validé avec succès. Lot L4 non commencé.

---

## 1. Incident observé & Erreur runtime n8n

Lors d'un run réel V2 (`triggerMode: "manual_custom"`) exécuté sur n8n 2.0.3, le nœud `Hydrate Corpus V2` a échoué avec l'erreur :

```text
Hydrate Corpus V2
process is not defined [line 5]
```

### Cause racine
Le Code node JavaScript tentait d'accéder à `process.env.NEXT_PUBLIC_SUPABASE_URL` / `process.env.SUPABASE_SERVICE_ROLE_KEY` et d'exécuter des appels réseau JS via `fetch` ou `this.helpers.httpRequest`. Dans la sandbox de n8n 2.x, l'objet global `process` n'est pas exposé aux Code nodes.

### Masquage par le harnais de test initial
Le harnais de test unitaire Node.js (`executeCodeNode`) injectait artificiellement `process` et `fetch` dans l'environnement du test, masquant ainsi l'incompatibilité avec la sandbox n8n réelle.

---

## 2. Nouvelle architecture de l'hydratation V2

La branche V2 du workflow `INTEL-021` a été refactorée pour séparer la logique de préparation, l'exécution HTTP native et l'assemblage du corpus.

```text
Mark Run Running V2
         │
Prepare Hydration Requests V2 (Code node pur)
         │
   Fetch Corpus V2 (HTTP Request node natif n8n + supabaseApi)
         │
Assemble Hydrated Corpus V2 (Code node pur)
         │
  Assemble Prompt V2
```

---

## 3. Détail des nœuds d'hydratation V2

### 1. `Prepare Hydration Requests V2` (Code node pur)
- **Type** : `n8n-nodes-base.code` (version 2, `mode: "runOnceForAllItems"`)
- **Rôle** : Transforme les références canoniques reçues dans `input.refs` en un tableau de requêtes HTTP cibles sans exécuter d'appel réseau.
- **Support des types** :
  - `veille_digest` : résout les articles par `articleIds` (filtre `id=in.(...)`) ou par `digest_id` (`digest_id=eq....`).
  - `veille_article` : requête ciblée sur `veille_articles` (`id=eq....`).
  - `account_signal` : requête ciblée sur `account_signals` (`id=eq....`).
  - `intelligence_document` : requête ciblée sur `intelligence_documents` (`id=eq....`).
- **Sécurité & Contrôle** : Vérifie la présence de `workspaceId` et valide la structure des `refs`.
- **Aucune API interdite** : 0 `process.env`, 0 secret Supabase, 0 `fetch`, 0 `this.helpers.httpRequest`.

### 2. `Fetch Corpus V2` (HTTP Request node natif n8n)
- **Type** : `n8n-nodes-base.httpRequest` (version 4.2)
- **Authentication** : `nodeCredentialType: "supabaseApi"`, `authentication: "predefinedCredentialType"`.
- **URL** : `={{ $json.url }}` (évaluation dynamique par item de l'URL préparée).
- **Rôle** : Délègue l'exécution HTTP REST à l'agent HTTP natif de n8n avec injection sécurisée des credentials Supabase gérés par n8n.

### 3. `Assemble Hydrated Corpus V2` (Code node pur)
- **Type** : `n8n-nodes-base.code` (version 2, `mode: "runOnceForAllItems"`)
- **Rôle** : Reçoit les réponses HTTP de `Fetch Corpus V2`, identifie le type de chaque ligne (`veille_article`, `account_signal`, `intelligence_document`), applique les contrôles de correspondance stricts par référence, déduplique le corpus (`${kind}:${id}`) et vérifie la non-vacuité (`hydratedCorpus.length > 0`).
- **Sortie** : Injecte `hydratedCorpus` dans l'objet `base` transmis au nœud suivant `Assemble Prompt V2`.

---

## 4.1. Hotfix ciblé : Alias PostgREST `category:signal_category`

### Incident
Lors de l'exécution de `Fetch Corpus V2`, Supabase a retourné une erreur PostgREST :
`column account_signals.category does not exist`.

### Cause
La colonne réelle en base de données dans la table `account_signals` est `signal_category` (et non `category`).

### Correction apportée
Dans `Prepare Hydration Requests V2` ([`n8n/workflows/intel-021-monthly-watch-analysis.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.json)), le paramètre `select` de la requête `account_signals` a été mis à jour pour utiliser l'alias PostgREST :

`select=id,company_id,title,summary,category:signal_category,detected_at,recommended_action`

Grâce à cet alias, Supabase renvoie directement le champ JSON sous le nom `category`, garantissant la compatibilité avec le contrat interne V2 sans modifier `Assemble Hydrated Corpus V2` ni imposer de migration Supabase.

---

## 4.3. Hotfix ciblé : Simplification du wire-format Anthropic Structured Outputs (`Call LLM V2` / `Validate Output V2`)

### Incident Anthropic
Lors de l'exécution avec Structured Outputs, Anthropic retournait l'erreur :
`The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools.`

### Cause
La présence d'un schéma JSON trop complexe et profondément imbriqué (objets `evidenceRef` complets avec `kind`, `id`, `title`, `provenance`, ainsi que `schemaVersion`, `analysisKind` et `coverage` dupliqués dans chaque schéma de section) dépassait la limite de taille du compilateur de grammaire CFG d'Anthropic.

### Correction apportée
1. **Schéma LLM simplifié** dans `Call LLM V2` ([`n8n/workflows/intel-021-monthly-watch-analysis.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.json)) :
   - Suppression des champs `schemaVersion`, `analysisKind` et `coverage` de la requête LLM.
   - Simplification de `evidenceRefs` dans les 6 sections sous forme d'un simple tableau de chaînes `string[]` au format `"kind:id"` (ex: `"account_signal:uuid"`, `"veille_article:uuid"`).
2. **Parsing et Reconstruction canonique** dans `Validate Output V2` :
   - Parsing de chaque chaîne `evidenceRefs` (`"kind:id"`).
   - Validation de chaque ref contre le `corpusMap` hydraté (rejet des refs inconnues).
   - Reconstruction canonique de chaque preuve sous la forme `{ kind, id, title, provenance }`.
   - Injection de `schemaVersion: 2` et `analysisKind: "manual_custom"`.
   - Recalcul de `coverage` à partir du `hydratedCorpus`.
   - Production du contrat `WatchAnalysisOutputV2` complet et conforme pour les consommateurs aval.

---

## 4.4. Hotfix ciblé : Suppression du paired-item dans `Prepare Failure Callback` & `Callback (Failure)`

### Incident 2
En cas d'erreur runtime ou de validation sur la branche V2, `Prepare Failure Callback` échouait avec l'erreur n8n :
`Paired item data for item from node 'Assemble Hydrated Corpus V2' is unavailable`.

### Cause
`Prepare Failure Callback` tentait d'accéder à `$('Validate Input').item` et `$('Webhook — Monthly Watch').item`, qui sont indisponibles via item pairing lorsque le workflow se déroute en erreur depuis une branche aval.

### Correction apportée
1. Dans `Prepare Failure Callback`, remplacement des accès `.item` par la lecture directe du Webhook singleton :
   ```js
   const failure = $input.first().json;
   const webhook = $('Webhook — Monthly Watch').first().json.body || {};
   const runId = webhook.runId;
   const callbackUrl = webhook.callbackUrl;
   ```
2. Dans `Callback (Failure)`, consommation directe de l'item courant après signature :
   - `url` = `={{ $json.callbackUrl }}`
   - `body` = `={{ $json.rawBody }}`
   - `signature` = `sha256={{ $json.computedSignature }}`

---

## 4. Garanties de sécurité et de conformité

- **Zero process.env** : Aucun Code node de la branche V2 n'accède à `process` ou `process.env`.
- **Zero secret dans le JS** : Les clés d'API et tokens Supabase sont exclusivement gérés par le credential `supabaseApi` du nœud HTTP natif n8n.
- **Zero réseau JS** : Aucun `fetch(` ni `this.helpers.httpRequest` dans les Code nodes.
- **Intégrité du périmètre** : V1 mensuelle, prompts LLM, format de sortie V2 (`WatchAnalysisOutputV2`), callbacks et UI sont restés strictement intacts.

---

## 5. Mises à jour du harnais de test

Dans [`n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js) :
1. Assertion statique que `Call LLM V2` contient `output_config.format.type = json_schema` et que le schéma couvre le contrat V2.
2. Maintien de la vérification que `Validate Output V2` contrôle la présence des `evidenceRefs` dans l'allowlist du corpus hydraté.
3. Assertion statique que `Prepare Failure Callback` n'utilise plus `.item` vers `Validate Input` ou le Webhook, et utilise `.first().json`.
4. Assertion statique que `Callback (Failure)` utilise `$json.callbackUrl` et `$json.rawBody`.
5. Test unitaire d'exécution de la notification d'échec sur erreur provenant de `Validate Output V2`.

---

## 6. Commandes & Résultats de validation

| Commande | Résultat | Détails |
|---|---|---|
| `node n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js` | ✅ VERTE | 75 assertions validées avec succès |
| `npm run test:n8n` | ✅ VERTE | 114 harnais d'intégration n8n validés, 0 échec |
| `npm test` | ✅ VERTE | 162 fichiers / 1618 tests unitaires & d'intégration verts |
| `npm run typecheck` | ✅ VERTE | 0 erreur TypeScript (`tsc --noEmit`) |
| `npm run check:server-boundary` | ✅ VERTE | Frontière serveur/client respectée (`server-only`) |
| `npm run build` | ✅ VERTE | Build Next.js Turbopack de production réussi (Exit code 0) |

---

## 7. Périmètre des fichiers modifiés

1. [`n8n/workflows/intel-021-monthly-watch-analysis.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.json)  
   *Refactoring de l'hydratation V2 en 3 nœuds découpés (Prepare Requests -> Fetch HTTP Natif -> Assemble Corpus).*
2. [`n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js)  
   *Mise à jour des tests d'hydratation V2 et ajout du contrôle d'absence d'APIs interdites dans les Code nodes.*
3. [`docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/HANDOFF-L2-HOTFIX-HYDRATION.md`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/HANDOFF-L2-HOTFIX-HYDRATION.md)  
   *Ce document de handoff.*

---

## 8. Instructions d'action manuelle pour n8n (Guillaume)

Le workflow versionné dans le repository conserve `"active": false`. Aucun déploiement ni modification n'a été réalisé directement sur l'instance VPS n8n.

Pour appliquer la correction sur n8n :

1. **Réimporter / Remplacer** le workflow `INTEL-021` dans l'interface n8n avec le fichier JSON corrigé (`n8n/workflows/intel-021-monthly-watch-analysis.json`).
2. **Sauvegarder** le workflow.
3. **Réactiver** le workflow.
4. **Rejouer** le même run réel V2 qui avait échoué sur `Hydrate Corpus V2`.
