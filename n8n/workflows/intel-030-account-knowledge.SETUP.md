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

### 4.3 Règle de versionnement des secrets

Un export n8n destiné à Git ne doit jamais contenir de credential, clé, token, mot de passe, secret de callback ou header d'authentification inline. Avant tout commit, conserver uniquement les placeholders, variables autorisées ou références au credential store n8n et expurger toute valeur injectée dans l'instance distante.

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

76 assertions exécutant réellement les nœuds Code extraits de ce JSON (mocks n8n dans un `vm`) :
validation d'entrée, isolation FOLIO, ciblage de la recherche, collecte de preuves, déduplication
des sources, robustesse du parsing (bloc Markdown, CRLF, texte d'introduction, réponse tronquée),
rejets de sortie (fait/analyse non sourcés, source hors catalogue, placeholder,
confiance hors bornes, `identity.dynamic` produit par le modèle, contact halluciné), idempotence
des propositions, callbacks succès/échec, et trois profils de comptes réels
(riche / sans FOLIO / peu documenté).

### 5.1 Piège n8n : zéro item = chaîne interrompue

Un nœud qui n'émet aucun item n'exécute pas le suivant. L'exécution se termine alors en
**« Succeeded »** sans avoir rien fait, et le run reste en `running` jusqu'au reaper — c'est le
mode de défaillance le plus trompeur de ce workflow. Cas réellement rencontrés :

- `Upsert Sources` avec `resolution=ignore-duplicates` renvoie `[]` quand **toutes** les sources
  existent déjà (dès le 2ᵉ run sur un compte) ;
- `Delete Stale Proposals` / `Insert Fresh Proposals` en `return=minimal` ne renvoient rien ;
- `Load Active Proposals` renvoie `[]` sur un compte sans proposition active.

Tous les nœuds HTTP portent donc `alwaysOutputData: true`, et les nœuds Code en aval relisent leur
contexte via `$('Nœud nommé')` plutôt que via l'item reçu. Les deux règles sont vérifiées par le
harnais — **ne pas les retirer à l'édition dans n8n**.

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

## 9. Branche V3 (Lot 3 — AccountKnowledge V3)

Le **même** workflow porte désormais une branche V3 (56 nœuds au total). Elle produit un artefact
`account_knowledge` en **`schema_version: 3`** : étude riche à sept sections, entièrement sourcée,
dont **chaque affirmation est vérifiée indépendamment** avant publication. Détail complet et
architecture dans `docs/intelligence/LOT-3-HANDOFF.md`.

### 9.1 Activation — discriminateur explicite

La branche V3 ne s'emprunte **que** si le body du webhook porte
`accountKnowledgeSchemaVersion: 3`. Sinon, **comportement historique V2 inchangé**. Le trigger
Next.js **n'envoie pas encore** cette valeur (activation Lot 4 / mise en service) : tant que rien
n'est modifié côté application, `intel-030` continue de produire exclusivement du V2.

### 9.2 Nœuds V3 (résumé)

| Étape | Nœuds | Rôle |
|---|---|---|
| Routage | Route Account Knowledge Version | IF sur `accountKnowledgeSchemaVersion === 3` (TRUE→V3, FALSE→V2) |
| Recherche | V3 Prepare Context & Research Plan → V3 Fetch Official Site / Public Registry / Company News → V3 Consult & Normalize Sources | plan par section, garde SSRF, 3 canaux publics **réellement consultés**, snippets bannis |
| Sources | V3 Build Source Catalogue → V3 Upsert Sources → V3 Resolve Source Ids | conservation exhaustive + dédup + résolution des UUID réels |
| Génération | V3 Assemble Draft Prompt → V3 Call LLM (Draft) → V3 Parse Draft | **1ʳᵉ** invocation LLM — brouillon strict (7 sections, attribution, claims sourcés) |
| Vérification | V3 Assemble Verification Prompt → V3 Call LLM (Verify) → V3 Parse Verification | **2ᵉ** invocation LLM **indépendante** — un verdict par affirmation |
| Assemblage | V3 Assemble Artifact → V3 Validate Artifact | filtrage déterministe (seuls les `confirmed` publiés) + miroir JS de `validateAccountKnowledgeV3` |
| Enrichissement | V3 Load Active Proposals → V3 Build Enrichment Proposals → Delete/Has New?/Insert/Skip | propositions idempotentes, **jamais** d'écriture `companies` |
| Callback | V3 Prepare Callback → V3 Sign Callback → V3 Callback | `resultType=account_knowledge`, `contextSnapshot.schemaVersion=3` |
| Échec | *(partagé)* Prepare Failure Callback | toute erreur V3 y mène — run jamais laissé en `running` |

### 9.3 Configuration additionnelle

- **4ᵉ nœud Crypto** : `V3 Sign Callback` porte le même placeholder
  `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` — à remplacer par `N8N_WEBHOOK_SECRET`, comme les 3 autres.
- **Credentials** : `V3 Upsert Sources`, `V3 Resolve Source Ids`, `V3 Load Active Proposals`,
  `V3 Delete Stale Proposals`, `V3 Insert Fresh Proposals` → `Supabase_Service_Role_KREDO`.
  `V3 Call LLM (Draft)` et `V3 Call LLM (Verify)` → `anthropicApi`. `V3 Fetch …` et `V3 Callback` →
  aucune (`authentication: none`). Aucune nouvelle variable d'environnement, aucune nouvelle table,
  aucun fournisseur payant.
- **Coût** : deux appels LLM par génération (génération + vérification) — coût doublé vs V2, assumé.

### 9.4 Tests

```bash
node n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js   # 41 assertions (nœuds Code V3 réellement exécutés)
npx vitest run src/lib/intelligence/account-knowledge-v3-workflow.test.ts  # structure + validateur canonique
```

Le harnais Node V2 (`intel-030-account-knowledge.test.js`, 76 assertions) doit **rester vert** :
la branche V2 n'est pas modifiée.
