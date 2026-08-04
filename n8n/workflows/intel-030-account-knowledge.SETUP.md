# intel-030-account-knowledge — import & configuration VPS (V2, Lot 1)

## 1. Rôle

Étape « Connaissance entreprise » du Cockpit Intelligence. Produit **exclusivement** un artefact
`account_knowledge` en `schema_version: 2` (`AccountKnowledgeContentV2`,
`src/lib/intelligence/account-intelligence-contracts.ts`), dont **toute affirmation est sourcée** :
chaque `Claim` cite un ou plusieurs `intelligence_sources.id` réels du workspace.

**30 nœuds.** Un seul workflow — aucun workflow sectoriel n'est appelé, aucun second workflow créé.

Déclenché par le bouton **« Mettre à jour l'entreprise »** de l'onglet Entreprise
(`ClientIntelligenceCompanyTab.tsx` en desktop, `ClientIntelligenceMobileView.tsx` en mobile) via
`POST /api/n8n/trigger` (`workflowId: "intel-030-account-knowledge"`, `entityType: "company"`).

## 2. Séquence

| # | Nœud | Rôle |
|---|---|---|
| 1-3 | Webhook → Verify Signature → **Validate Entity** | HMAC + `entityType=company` + UUID `runId`/`entityId`/`workspaceId` + cohérence `companyId`/`entityId` |
| 4 | Update Run Status | run → `running` |
| 5 | Hydrate Context | `get_account_knowledge_context` (appel unique) |
| 6 | **Prepare Deterministic Context** | sépare canonique / faits vérifiés / sources / relationnel / diagnostic ; **FOLIO isolé comme legacy non sourcé** ; calcule les cibles de recherche (manquant ou périmé uniquement) |
| 7-11 | Needs External Research? → Fetch Official Site → Fetch Public Registry → **Collect External Evidence** / Skip External Research | recherche ciblée : page du site officiel réellement récupérée + API publique `recherche-entreprises.api.gouv.fr` (INSEE Sirene). **Aucun moteur de recherche, aucun snippet.** |
| 12-14 | Build Source Catalogue → **Upsert Sources** → Resolve Source Ids | upsert idempotent sur `intelligence_sources` (`on_conflict=workspace_id,source_key`, `resolution=ignore-duplicates`) — mécanisme existant réutilisé, aucun nouveau RPC |
| 15-16 | Assemble Prompt → Call LLM | le modèle ne peut citer que les identifiants du catalogue |
| 17-18 | **Parse & Validate Output** → Quality Check | validation stricte V2 + couverture de sourcing calculée |
| 19-23 | Load Active Proposals → **Build Enrichment Proposals** → Delete Stale → Has New? → Insert Fresh | propositions d'enrichissement idempotentes |
| 24-26 | Prepare Callback → Sign → Callback | `result_type=account_knowledge`, modèle/tokens/durée, `source_refs`, `qa_flags` |
| 27-29 | Prepare Failure Callback → Sign → Callback (Failure) | **toute** sortie d'erreur y mène : un run n'est jamais laissé en `running` |

## 3. Import

1. n8n → **Workflows → Import from File** → `intel-030-account-knowledge.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).

## 4. Configuration requise

### 4.1 Secret HMAC (3 nœuds Crypto)

`Verify Signature`, `Sign Callback` et `Sign Failure Callback` portent le placeholder
`REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` (convention des autres workflows du projet).
Le remplacer par la valeur de `N8N_WEBHOOK_SECRET` côté Vercel — **le même secret que les
workflows déjà déployés**.

### 4.2 Credentials

| Nœuds | Credential |
|---|---|
| `Update Run Status`, `Hydrate Context`, `Upsert Sources`, `Resolve Source Ids`, `Load Active Proposals`, `Delete Stale Proposals`, `Insert Fresh Proposals` | `Supabase_Service_Role_KREDO` (`supabaseApi`) |
| `Call LLM` | credential `anthropicApi` existante |
| `Fetch Official Site`, `Fetch Public Registry`, `Callback`, `Callback (Failure)` | aucune (`authentication: none`) — l'API `recherche-entreprises.api.gouv.fr` est publique et sans clé |

Aucune nouvelle variable d'environnement, aucune nouvelle table, aucun nouveau fournisseur payant.

## 5. Ce que le workflow n'a PAS le droit de faire

Ces règles sont vérifiées par le harnais de test (§6), pas seulement par le prompt :

- **Jamais d'écriture directe dans `companies`.** Toute donnée canonique (raison sociale, SIREN,
  code NAF, siège, effectif, activité principale, site) passe par `enrichment_proposals`, et
  seulement si la valeur **diffère réellement** de la valeur actuelle.
- **Jamais de `Claim` sans `source_refs`** — ni pour un fait, ni pour une analyse.
- **Jamais de source `folio_legacy` fabriquée.** FOLIO peut orienter une recherche ; il ne devient
  jamais une source citable, faute d'origine vérifiable.
- **Jamais de marqueur d'absence** (« Non trouvé », « N/A »…) comme contenu métier : une section
  sans matière reste vide.
- **Jamais de macro-sectoriel, de recommandation commerciale ou de roadmap.**
- **`identity.dynamic` vaut toujours `null` en sortie de workflow** : l'indicateur est calculé
  hors modèle par `account-dynamic-v1` (`src/lib/intelligence/account-dynamic.ts`) et injecté par
  le callback applicatif.

## 6. Tests

```bash
node n8n/workflows/__tests__/intel-030-account-knowledge.test.js
```

74 assertions exécutant réellement les nœuds Code extraits de ce JSON (mocks n8n dans un `vm`) :
validation d'entrée, isolation FOLIO, ciblage de la recherche, collecte de preuves, déduplication
des sources, robustesse du parsing (bloc Markdown, CRLF, texte d'introduction, réponse tronquée),
rejets de sortie (fait/analyse non sourcés, source hors catalogue, placeholder,
confiance hors bornes, `identity.dynamic` produit par le modèle, contact halluciné), idempotence
des propositions, callbacks succès/échec, et trois profils de comptes réels
(riche / sans FOLIO / peu documenté).

## 7. Double barrière côté application

Le callback (`src/app/api/n8n/callback/route.ts`) refait la validation via
`ingestAccountKnowledgeArtifact` : structure V2, existence et appartenance au workspace de chaque
UUID de source, présence du `company_id`, injection de l'indicateur déterministe, recalcul de
`source_coverage`. Un artefact refusé bascule le run en `failed` et répond 400 — il n'est jamais
persisté à moitié, et le run ne reste pas en `running`.

## 8. Test de bout en bout après activation

1. Compte riche en données (ex. **Schneider** — FOLIO, 21 contacts, 12 signaux) : vérifier que
   l'artefact cite bien des sources, que la couverture affichée est de 100 %, et que l'indicateur
   de dynamique remonte 5 preuves (les 7 signaux FOLIO non sourcés doivent être écartés).
2. Compte sans FOLIO (ex. **Thalès Alénia Space**) : la génération doit réussir, sections vides
   plutôt que remplies d'hypothèses.
3. Compte peu documenté (ex. **Griesser**) : recherche externe déclenchée sur raison sociale /
   siège / effectif / activité, propositions d'enrichissement créées, `companies` inchangée.
4. Relancer le même compte : aucune proposition dupliquée, aucune source dupliquée.
