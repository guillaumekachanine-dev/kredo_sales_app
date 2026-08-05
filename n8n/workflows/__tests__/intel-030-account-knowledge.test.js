"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais d'exécution RÉELLE des nœuds Code de intel-030-account-knowledge.
// Les nœuds sont extraits du JSON source-controlled et exécutés dans un `vm`
// avec des mocks n8n : on teste le code qui partira sur le VPS, pas une
// réécriture parallèle de sa logique.
//
//   node n8n/workflows/__tests__/intel-030-account-knowledge.test.js

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "intel-030-account-knowledge.json")
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

let passed = 0
let failed = 0

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`ok   ${label}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`)
}

async function expectThrows(label, fn, matcher) {
  try {
    await fn()
    failed += 1
    console.error(`FAIL ${label} — aucune erreur levée`)
  } catch (error) {
    const message = String(error.message || error)
    if (matcher && !matcher.test(message)) {
      failed += 1
      console.error(`FAIL ${label} — message inattendu : ${message}`)
      return
    }
    passed += 1
    console.log(`ok   ${label}`)
  }
}

async function runCodeNode(name, registry, input, allInput) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const items = (allInput ?? [input ?? {}]).map((json) => ({ json }))
  const sandbox = {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      return { item: { json: registry[nodeName] }, first: () => ({ json: registry[nodeName] }) }
    },
    $execution: { id: "exec-1" },
    $workflow: { id: "wf-1" },
    console,
    Date,
    JSON,
    Math,
    URL,
    Array,
    Object,
    Set,
    Map,
    Number,
    String,
    RegExp,
    Error,
    isFinite,
    encodeURIComponent,
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
  const result = await script.runInContext(context)
  if (Array.isArray(result) && result[0] && result[0].json) registry[name] = result[0].json
  return result
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const CONTACT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const CRM_SOURCE_ID = "11111111-1111-4111-8111-111111111111"
const SITE_SOURCE_ID = "22222222-2222-4222-8222-222222222222"
const REGISTRY_SOURCE_ID = "33333333-3333-4333-8333-333333333333"
const FOREIGN_SOURCE_ID = "99999999-9999-4999-8999-999999999999"

function validatedEntity() {
  return {
    runId: RUN,
    workflowId: "intel-030-account-knowledge",
    workspaceId: WORKSPACE,
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    companyId: COMPANY,
    callbackUrl: "https://kredo.example/api/n8n/callback",
    startedAtMs: Date.now() - 5000,
  }
}

function rpcContext(overrides = {}) {
  return {
    company: {
      id: COMPANY,
      name: "Voyage Privé",
      legal_name: null,
      lifecycle_status: "client_actif",
      sector: "Services",
      sector_id: null,
      segment: "ETI",
      hq_location: "Aix-en-Provence",
      employee_count: 900,
      revenue: null,
      size_band: "501-1000",
      priority: "haute",
      description: null,
      website: "https://www.voyage-prive.com",
    },
    contacts: [{ id: CONTACT, full_name: "A. Dupont", job_title: "DSI", relationship_role: "dsi" }],
    recentInteractions: [{ id: "i1", type: "email", occurred_at: "2026-07-01T10:00:00Z" }],
    opportunities: [{ id: "o1", title: "Refonte data", stage: "qualification" }],
    missions: [{ id: "m1", title: "Data platform", practice: "Data", status: "active" }],
    signals: [],
    accountFacts: [],
    factSources: [],
    factSourceLinks: [],
    folioAnalysisData: { identite: { ca_estime: "300 M€" } },
    folioSectorAnalysis: null,
    processDiagnostic: null,
    dataCutoffAt: "2026-08-04T00:00:00Z",
    ...overrides,
  }
}

function claim(text, refs = [CRM_SOURCE_ID], nature = "fact") {
  return { text, nature, source_refs: refs, confidence: 0.8, verified_at: null }
}

function llmResponse(artifact) {
  return {
    content: [{ type: "text", text: JSON.stringify(artifact) }],
    usage: { input_tokens: 1200, output_tokens: 900 },
    model: "claude-sonnet-5",
  }
}

function validArtifact(overrides = {}) {
  return {
    schema_version: 2,
    identity: {
      primary_activity: claim("Vente privée de voyages haut de gamme", [SITE_SOURCE_ID]),
      headquarters: claim("Aix-en-Provence", [REGISTRY_SOURCE_ID]),
      revenue: null,
      employee_count: null,
      dynamic: null,
    },
    account_summary: claim("Client actif, une mission Data en cours.", [CRM_SOURCE_ID], "analysis"),
    market_positioning: {
      positioning: claim("Positionné sur le voyage premium en ligne.", [SITE_SOURCE_ID]),
      direct_competitors: [],
      customer_segments: [],
      differentiators: [],
      uncovered_scope: [],
      claimed_identity: null,
      threats: [],
      opportunities: [],
    },
    company_value_chain: {
      description: null,
      value_proposition: null,
      key_links: [],
      dependencies: [],
      vulnerabilities: [],
      customer_base: [],
    },
    organisation: {
      departments: [],
      strategic_weight: null,
      key_contacts: [{ contact_id: CONTACT, role_summary: claim("DSI, interlocuteur technique", [CRM_SOURCE_ID]) }],
      process_observations: [],
    },
    open_questions: [{ question: "Qui arbitre le budget data ?", why_it_matters: "Détermine le sponsor." }],
    generated_at: "2026-08-04T10:00:00Z",
    ...overrides,
  }
}

const RESOLVED_SOURCES = [
  { id: CRM_SOURCE_ID, source_key: `account_knowledge:crm:${COMPANY}` },
  { id: SITE_SOURCE_ID, source_key: "account_knowledge:site:PLACEHOLDER" },
  { id: REGISTRY_SOURCE_ID, source_key: "account_knowledge:registry:344962102" },
]

const SITE_RESPONSE = {
  statusCode: 200,
  body: "<html><head><title>Voyage Privé</title></head><body><h1>Ventes privées de voyages</h1>"
    + "<p>Voyage Privé conçoit des offres de voyage haut de gamme pour ses membres, en Europe et en Asie. "
    + "Nous opérons depuis Aix-en-Provence avec plus de 900 collaborateurs et des filiales en Italie et en Espagne.</p></body></html>",
}

const REGISTRY_RESPONSE = {
  statusCode: 200,
  body: {
    results: [{
      siren: "344962102",
      nom_raison_sociale: "VOYAGE PRIVE",
      nom_complet: "VOYAGE PRIVE",
      activite_principale: "79.11Z",
      libelle_activite_principale: "Activités des agences de voyage",
      tranche_effectif_salarie: "41",
      date_mise_a_jour: "2026-05-02",
      siege: { libelle_commune: "AIX-EN-PROVENCE", code_postal: "13100" },
    }],
  },
}

// ─── Scénarios ──────────────────────────────────────────────────────────────

async function buildUpToCatalogue({ contextOverrides = {}, site = SITE_RESPONSE, registry = REGISTRY_RESPONSE } = {}) {
  const registryStore = { "Validate Entity": validatedEntity() }
  await runCodeNode("Prepare Deterministic Context", registryStore, rpcContext(contextOverrides))
  registryStore["Fetch Official Site"] = site
  await runCodeNode("Collect External Evidence", registryStore, registry)
  await runCodeNode("Build Source Catalogue", registryStore, registryStore["Collect External Evidence"])
  return registryStore
}

async function buildUpToPrompt(options = {}) {
  const store = await buildUpToCatalogue(options)
  const keys = store["Build Source Catalogue"].sourceKeys
  const resolved = keys.map((key) => {
    const known = RESOLVED_SOURCES.find((s) => s.source_key === key)
    if (known) return { id: known.id, source_key: key }
    if (key.startsWith("account_knowledge:site:")) return { id: SITE_SOURCE_ID, source_key: key }
    if (key.startsWith("account_knowledge:registry:")) return { id: REGISTRY_SOURCE_ID, source_key: key }
    return { id: CRM_SOURCE_ID, source_key: key }
  })
  await runCodeNode("Assemble Prompt", store, resolved[0], resolved)
  return store
}

async function main() {
  // ── 1. Validation d'entrée ────────────────────────────────────────────────
  const validateStore = {}
  const webhookItem = (overrides = {}) => ({
    computedSignature: "sig",
    headers: { "x-kredo-signature": "sha256=sig" },
    body: {
      runId: RUN,
      workflowId: "intel-030-account-knowledge",
      entityType: "company",
      entityId: COMPANY,
      workspaceId: WORKSPACE,
      userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      callbackUrl: "https://kredo.example/api/n8n/callback",
      ...overrides,
    },
  })

  await runCodeNode("Validate Entity", validateStore, webhookItem())
  check("Validate Entity accepte un payload company conforme", validateStore["Validate Entity"].companyId === COMPANY)

  await expectThrows(
    "Validate Entity rejette entityType != company",
    () => runCodeNode("Validate Entity", {}, webhookItem({ entityType: "sector" })),
    /entityType="company"/,
  )
  await expectThrows(
    "Validate Entity rejette une incohérence companyId / entityId",
    () => runCodeNode("Validate Entity", {}, webhookItem({ companyId: FOREIGN_SOURCE_ID })),
    /Incohérence d'entité/,
  )
  await expectThrows(
    "Validate Entity rejette un workspaceId absent",
    () => runCodeNode("Validate Entity", {}, webhookItem({ workspaceId: "" })),
    /workspaceId/,
  )
  await expectThrows(
    "Validate Entity rejette une signature HMAC invalide",
    () => runCodeNode("Validate Entity", {}, { ...webhookItem(), computedSignature: "autre" }),
    /Signature HMAC invalide/,
  )

  // ── 2. Contexte déterministe ──────────────────────────────────────────────
  const ctxStore = { "Validate Entity": validatedEntity() }
  await runCodeNode("Prepare Deterministic Context", ctxStore, rpcContext())
  const prepared = ctxStore["Prepare Deterministic Context"]
  check("FOLIO est isolé du reste du contexte", prepared.folioLegacy.analysisData !== null && prepared.hasFolio === true)
  check(
    "Les cibles de recherche ne portent que sur le manquant ou le périmé",
    prepared.researchTargets.some((t) => t.field === "legal_name")
      && !prepared.researchTargets.some((t) => t.field === "hq_location"),
    JSON.stringify(prepared.researchTargets),
  )

  await expectThrows(
    "Prepare Deterministic Context rejette un contexte d'un autre compte",
    () => runCodeNode("Prepare Deterministic Context", { "Validate Entity": validatedEntity() },
      rpcContext({ company: { ...rpcContext().company, id: FOREIGN_SOURCE_ID } })),
    /Incohérence d'entité/,
  )

  // ── 3. Collecte de preuves ────────────────────────────────────────────────
  const richStore = await buildUpToCatalogue()
  const evidence = richStore["Collect External Evidence"].externalEvidence
  check("Le site officiel réellement récupéré devient une preuve", evidence.some((e) => e.kind === "official_site"))
  check("Le registre public officiel devient une preuve", evidence.some((e) => e.kind === "registry"))
  check(
    "Le contenu retenu est la page source, pas un extrait de moteur de recherche",
    evidence.find((e) => e.kind === "official_site").text.includes("haut de gamme"),
  )

  const noRegistryStore = await buildUpToCatalogue({ registry: { statusCode: 200, body: { results: [] } } })
  check(
    "Aucune entité trouvée au registre : rien n'est inventé, un avertissement est posé",
    noRegistryStore["Collect External Evidence"].externalEvidence.every((e) => e.kind !== "registry")
      && noRegistryStore["Collect External Evidence"].researchWarnings.length > 0,
  )

  const homonymStore = await buildUpToCatalogue({
    registry: {
      statusCode: 200,
      body: { results: [{ siren: "111111111", nom_raison_sociale: "BOULANGERIE MARTIN", siege: {} }] },
    },
  })
  check(
    "Une correspondance trop faible au registre est écartée",
    homonymStore["Collect External Evidence"].externalEvidence.every((e) => e.kind !== "registry"),
  )

  const noExternalStore = await buildUpToCatalogue({
    site: { statusCode: 503, body: "" },
    registry: { statusCode: 500, body: {} },
  })
  check(
    "Compte sans donnée externe : aucune preuve, la chaîne continue",
    noExternalStore["Collect External Evidence"].externalEvidence.length === 0
      && noExternalStore["Build Source Catalogue"].sourcesPayload.length === 1,
  )

  // ── 4. Catalogue de sources ───────────────────────────────────────────────
  const catalogue = richStore["Build Source Catalogue"]
  check(
    "Les sources sont dédupliquées par source_key avant l'upsert",
    new Set(catalogue.sourceKeys).size === catalogue.sourceKeys.length
      && catalogue.sourcesPayload.length === catalogue.sourceKeys.length,
  )
  check(
    "Aucune source de type folio_legacy n'est fabriquée",
    catalogue.sourcesPayload.every((s) => s.source_type !== "folio_legacy"),
  )
  check(
    "La base relationnelle KREDO est enregistrée comme source interne identifiable",
    catalogue.sourcesPayload.some((s) => s.source_type === "internal_crm" && s.source_key === `account_knowledge:crm:${COMPANY}`),
  )

  const skipStore = { "Prepare Deterministic Context": prepared }
  await runCodeNode("Skip External Research", skipStore, {})
  check(
    "La branche sans recherche émet toujours un item (run jamais bloqué)",
    Array.isArray(skipStore["Skip External Research"].externalEvidence),
  )

  // ── 5. Prompt ─────────────────────────────────────────────────────────────
  const promptStore = await buildUpToPrompt()
  const prompt = promptStore["Assemble Prompt"]
  check("Le catalogue expose des identifiants de source réels", prompt.allowedSourceIds.length >= 3)
  check("Le prompt interdit explicitement les marqueurs d'absence", prompt.systemPrompt.includes('Ne jamais écrire "Non trouvé"'))
  check("Le prompt réserve identity.dynamic au calcul déterministe", prompt.systemPrompt.includes('"identity.dynamic" vaut TOUJOURS null'))
  check("Le prompt exclut le macro-sectoriel et la roadmap",
    prompt.systemPrompt.includes("Aucune donnée sectorielle macro") && prompt.systemPrompt.includes("aucune roadmap"))
  check("FOLIO est présenté au modèle comme non sourcé", prompt.userPrompt.includes("FOLIO_LEGACY_NON_SOURCE"))

  // ── 6. Validation de sortie ───────────────────────────────────────────────
  await runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact()))
  const artifact = promptStore["Parse & Validate Output"].accountKnowledge
  check("Un V2 valide est accepté", artifact.schema_version === 2)
  check("La couverture de sourcing est calculée, pas rédigée par le modèle",
    artifact.source_coverage.passed === true && artifact.source_coverage.displayed_claims === 5,
    JSON.stringify(artifact.source_coverage))
  check("identity.dynamic reste null en sortie de workflow", artifact.identity.dynamic === null)
  check("Une section sans matière reste vide, sans placeholder",
    artifact.market_positioning.direct_competitors.length === 0)

  await expectThrows(
    "Un fait non sourcé est rejeté",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      account_summary: { text: "Compte stratégique", nature: "fact", source_refs: [], confidence: 0.5, verified_at: null },
    }))),
    /au moins une source requise/,
  )

  await expectThrows(
    "Une analyse non sourcée est rejetée",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      account_summary: { text: "Compte en croissance", nature: "analysis", source_refs: [], confidence: 0.5, verified_at: null },
    }))),
    /au moins une source requise/,
  )

  await expectThrows(
    "Une source hors catalogue (inconnue ou d'un autre workspace) est rejetée",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      account_summary: claim("Compte suivi", [FOREIGN_SOURCE_ID], "analysis"),
    }))),
    /source hors catalogue/,
  )

  await expectThrows(
    "Un placeholder « Non trouvé » est rejeté",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      account_summary: claim("Non trouvé", [CRM_SOURCE_ID], "fact"),
    }))),
    /marqueur d'absence interdit/,
  )

  await expectThrows(
    "Une confiance hors bornes est rejetée",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      account_summary: { text: "Compte suivi", nature: "fact", source_refs: [CRM_SOURCE_ID], confidence: 1.4, verified_at: null },
    }))),
    /hors bornes/,
  )

  await expectThrows(
    "Un identity.dynamic produit par le modèle est rejeté",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      identity: { ...validArtifact().identity, dynamic: claim("Croissance forte", [CRM_SOURCE_ID], "analysis") },
    }))),
    /identity\.dynamic/,
  )

  await expectThrows(
    "Un contact halluciné est rejeté",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({
      organisation: {
        ...validArtifact().organisation,
        key_contacts: [{ contact_id: FOREIGN_SOURCE_ID, role_summary: claim("DAF", [CRM_SOURCE_ID]) }],
      },
    }))),
    /contact inconnu du compte/,
  )

  await expectThrows(
    "Un schema_version 1 émis par le workflow V2 est rejeté",
    () => runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact({ schema_version: 1 }))),
    /schema_version doit valoir 2/,
  )

  // ── 6 bis. Robustesse du parsing de la réponse LLM ────────────────────────
  const fenced = (artifact, fence = "```json\n", close = "\n```") => ({
    content: [{ type: "text", text: `${fence}${JSON.stringify(artifact)}${close}` }],
    usage: { input_tokens: 10, output_tokens: 10 },
    model: "claude-sonnet-5",
  })

  await runCodeNode("Parse & Validate Output", promptStore, fenced(validArtifact()))
  check("Un bloc Markdown ```json est correctement dépouillé",
    promptStore["Parse & Validate Output"].accountKnowledge.schema_version === 2)

  await runCodeNode("Parse & Validate Output", promptStore, fenced(validArtifact(), "```json\r\n", "\r\n```"))
  check("Un bloc Markdown en CRLF est correctement dépouillé",
    promptStore["Parse & Validate Output"].accountKnowledge.schema_version === 2)

  await runCodeNode("Parse & Validate Output", promptStore, fenced(validArtifact(), "Voici l'artefact demandé :\n\n```\n", "\n```\n"))
  check("Un texte d'introduction avant le JSON n'empêche pas l'extraction",
    promptStore["Parse & Validate Output"].accountKnowledge.schema_version === 2)

  await expectThrows(
    "Une réponse tronquée est diagnostiquée comme telle, pas comme « non-JSON »",
    () => runCodeNode("Parse & Validate Output", promptStore, {
      content: [{ type: "text", text: "```json\n{\"schema_version\": 2, \"identity\": {" }],
      stop_reason: "max_tokens",
      usage: { input_tokens: 10, output_tokens: 16000 },
    }),
    /tronquée \(plafond de tokens atteint\)/,
  )

  await expectThrows(
    "Un JSON réellement invalide reste signalé avec son début ET sa fin",
    () => runCodeNode("Parse & Validate Output", promptStore, {
      content: [{ type: "text", text: "{ \"schema_version\": 2, oops }" }],
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
    /non-JSON .* fin:/s,
  )

  // Rétablit le résultat canonique : les variantes ci-dessus portent des `usage`
  // factices, que les tests de callback (§10) ne doivent pas lire.
  await runCodeNode("Parse & Validate Output", promptStore, llmResponse(validArtifact()))

  // ── 7. Compte sans FOLIO ──────────────────────────────────────────────────
  const noFolioStore = await buildUpToPrompt({ contextOverrides: { folioAnalysisData: null, folioSectorAnalysis: null } })
  check("Compte sans FOLIO : le contexte reste exploitable", noFolioStore["Prepare Deterministic Context"].hasFolio === false)
  await runCodeNode("Parse & Validate Output", noFolioStore, llmResponse(validArtifact()))
  check("Compte sans FOLIO : un V2 valide est tout de même produit",
    noFolioStore["Parse & Validate Output"].accountKnowledge.schema_version === 2)

  // ── 8. Contrôles qualité ──────────────────────────────────────────────────
  await runCodeNode("Quality Check", promptStore, promptStore["Parse & Validate Output"])
  const qaFlags = promptStore["Quality Check"].qaFlags
  const flag = (name) => qaFlags.find((f) => f.check === name)
  check("qa_flags atteste que toutes les affirmations sont sourcées", flag("all_claims_sourced").passed === true)
  check("qa_flags atteste qu'aucune source FOLIO n'est utilisée", flag("no_folio_source").passed === true)
  check("qa_flags atteste que la dynamique est calculée hors modèle", flag("dynamic_left_to_engine").passed === true)

  // ── 9. Propositions d'enrichissement ──────────────────────────────────────
  await runCodeNode("Build Enrichment Proposals", promptStore, {}, [])
  const firstRun = promptStore["Build Enrichment Proposals"]
  const attributes = firstRun.toInsert.map((p) => p.attribute_name)
  check("Une raison sociale absente donne lieu à une proposition", attributes.includes("legal_name"))
  check(
    "Aucune proposition pour une valeur identique à la valeur actuelle",
    !attributes.includes("hq_location") || firstRun.toInsert.find((p) => p.attribute_name === "hq_location").normalized_value !== "aix-en-provence",
  )
  check("Aucune proposition sur un site déjà renseigné", !attributes.includes("website"))
  check(
    "Les propositions ciblent toujours le compte, jamais la table companies",
    firstRun.toInsert.every((p) => p.target_type === "company" && p.target_id === COMPANY),
  )

  // Ré-exécution avec les mêmes propositions déjà en attente → rien à réécrire.
  const existing = firstRun.toInsert.map((p, index) => ({
    id: `prop-${index}`,
    proposal_key: p.proposal_key,
    attribute_name: p.attribute_name,
    status: "proposed",
    proposed_value: p.proposed_value,
  }))
  const rerunStore = { ...promptStore }
  await runCodeNode("Build Enrichment Proposals", rerunStore, existing[0], existing)
  check(
    "Ré-exécution idempotente : aucune proposition dupliquée",
    rerunStore["Build Enrichment Proposals"].toInsert.length === 0
      && rerunStore["Build Enrichment Proposals"].staleIdsToDelete.length === 0,
    JSON.stringify(rerunStore["Build Enrichment Proposals"].toInsert.map((p) => p.attribute_name)),
  )

  // Décision humaine déjà prise → jamais écrasée.
  const decidedStore = { ...promptStore }
  const decided = existing.map((p) => ({ ...p, status: "validated", proposed_value: "AUTRE VALEUR" }))
  await runCodeNode("Build Enrichment Proposals", decidedStore, decided[0], decided)
  check(
    "Une proposition déjà validée n'est jamais régénérée",
    decidedStore["Build Enrichment Proposals"].toInsert.length === 0
      && decidedStore["Build Enrichment Proposals"].proposalWarnings.some((w) => w.includes("déjà décidée")),
  )

  // ── 10. Callbacks ─────────────────────────────────────────────────────────
  await runCodeNode("Prepare Callback", promptStore, {})
  const callbackBody = JSON.parse(promptStore["Prepare Callback"].rawBody)
  check("Le callback de succès cible result_type=account_knowledge", callbackBody.resultType === "account_knowledge")
  check("Le callback de succès porte le statut succeeded", callbackBody.status === "succeeded")
  check("Le callback transporte l'artefact V2", callbackBody.contentJson.schema_version === 2)
  check("Le callback renseigne modèle, tokens et durée",
    callbackBody.modelUsed === "claude-sonnet-5" && callbackBody.tokensInput === 1200 && typeof callbackBody.durationMs === "number")
  check("Le callback expose l'union des sources citées", Array.isArray(callbackBody.sourceRefs) && callbackBody.sourceRefs.length >= 2)
  check("Le callback expose les contrôles qualité", Array.isArray(callbackBody.qaFlags) && callbackBody.qaFlags.length > 0)

  const failStore = {
    "Webhook — Account Knowledge": { body: { runId: RUN, callbackUrl: "https://kredo.example/api/n8n/callback" } },
    "Validate Entity": validatedEntity()
  }
  await runCodeNode("Prepare Failure Callback", failStore, { error: { message: "Le LLM a renvoyé un contenu vide" } })
  const failBody = JSON.parse(failStore["Prepare Failure Callback"].rawBody)
  check("Le callback d'échec porte le runId — le run ne reste pas en running", failBody.runId === RUN && failBody.status === "failed")
  check("Le message d'erreur est transmis", failBody.errorMessage.includes("contenu vide"))

  await expectThrows(
    "Un échec non notifiable (runId/callbackUrl introuvables) échoue bruyamment plutôt que d'appeler une URL nulle",
    () => runCodeNode("Prepare Failure Callback", {}, { message: "boom" }),
    /non notifiable/,
  )

  // ── 11. Trois profils de comptes RÉELS ────────────────────────────────────
  // Objets `company` extraits en direct de get_account_knowledge_context sur la
  // base de production le 2026-08-04 (workspace KREDO), recopiés tels quels.
  const REAL_ACCOUNTS = [
    {
      label: "riche en données (Schneider — FOLIO, 21 contacts, 12 signaux)",
      contacts: 21,
      hasFolio: true,
      company: {
        id: COMPANY,
        name: "Schneider",
        sector: "Industrie manufacturière, électronique & équipements",
        revenue: null,
        segment: "Electronique",
        website: null,
        priority: "normale",
        size_band: null,
        legal_name: "Schneider Electric SE",
        description: "Le client identifié à Carros sous le nom 'Schneider' est très probablement un site ou une entité locale du groupe Schneider Electric SE…",
        hq_location: "Carros",
        employee_count: null,
        lifecycle_status: "prospect",
      },
      expectTargets: ["revenue", "website"],
      expectAbsent: ["legal_name", "hq_location", "description"],
    },
    {
      label: "sans FOLIO (Thalès Alénia Space — 0 contact, 0 signal)",
      contacts: 0,
      hasFolio: false,
      company: {
        id: COMPANY,
        name: "Thalès Alénia Space",
        sector: "Aéronautique, Spatial & Défense",
        revenue: null,
        segment: null,
        website: "https://www.thalesaleniaspace.com/fr",
        priority: "haute",
        size_band: null,
        legal_name: null,
        description: "Branche du groupe industriel Thalès dédiée au développement, à la production et au lancement de satellites civils et militaires.",
        hq_location: "Cannes",
        employee_count: null,
        lifecycle_status: "prospect",
      },
      expectTargets: ["legal_name", "revenue", "employee_count"],
      expectAbsent: ["website", "hq_location", "description"],
    },
    {
      label: "peu documenté (Griesser — ni siège, ni description, ni raison sociale)",
      contacts: 1,
      hasFolio: false,
      company: {
        id: COMPANY,
        name: "Griesser",
        sector: "BTP, Construction & Immobilier",
        revenue: null,
        segment: null,
        website: "https://www.griesser.com/eu/en/",
        priority: "normale",
        size_band: null,
        legal_name: null,
        description: null,
        hq_location: null,
        employee_count: null,
        lifecycle_status: "prospect",
      },
      expectTargets: ["legal_name", "hq_location", "employee_count", "revenue", "description"],
      expectAbsent: ["website"],
    },
  ]

  for (const account of REAL_ACCOUNTS) {
    const store = { "Validate Entity": validatedEntity() }
    const realContext = rpcContext({
      company: account.company,
      contacts: account.contacts > 0 ? [{ id: CONTACT, full_name: "Contact réel", job_title: null }] : [],
      signals: [],
      folioAnalysisData: account.hasFolio ? { identite: {} } : null,
    })
    await runCodeNode("Prepare Deterministic Context", store, realContext)
    const ctx = store["Prepare Deterministic Context"]
    const fields = ctx.researchTargets.map((t) => t.field)

    check(
      `Compte ${account.label} — cibles de recherche exactes`,
      account.expectTargets.every((f) => fields.includes(f)) && account.expectAbsent.every((f) => !fields.includes(f)),
      JSON.stringify(fields),
    )
    check(`Compte ${account.label} — FOLIO isolé (${ctx.hasFolio ? "présent" : "absent"})`, ctx.hasFolio === account.hasFolio)

    store["Fetch Official Site"] = ctx.hasSiteUrl ? SITE_RESPONSE : { statusCode: 0, body: "" }
    await runCodeNode("Collect External Evidence", store, { statusCode: 200, body: { results: [] } })
    await runCodeNode("Build Source Catalogue", store, store["Collect External Evidence"])
    check(
      `Compte ${account.label} — au moins une source citable, jamais zéro`,
      store["Build Source Catalogue"].sourcesPayload.length >= 1,
    )
  }

  // ── 12. Garanties structurelles du graphe ─────────────────────────────────
  const serialized = JSON.stringify(workflow)
  check("Le workflow n'écrit jamais dans la table companies", !serialized.includes("rest/v1/companies"))
  check("Aucun secret en dur : les credentials passent par l'environnement",
    !/sk-ant-|service_role_key|eyJhbGciOi/.test(serialized))
  check("Un seul workflow, aucun appel à un workflow sectoriel", !/sector_intelligence_analysis|get_sector_intelligence_context/.test(serialized))

  // Les nœuds IF ont eux aussi deux sorties, mais la seconde est la branche
  // « faux », pas une sortie d'erreur — seuls les nœuds en `continueErrorOutput`
  // sont concernés par cette garantie.
  const errorNodes = workflow.nodes.filter((n) => n.onError === "continueErrorOutput").map((n) => n.name)
  const missingErrorRoute = errorNodes.filter((name) => {
    const main = (workflow.connections[name] || {}).main || []
    return !(main[1] || []).some((c) => c.node === "Prepare Failure Callback")
  })
  check(
    "Toute sortie d'erreur mène au callback d'échec",
    missingErrorRoute.length === 0,
    missingErrorRoute.join(", "),
  )
  check("Les étapes à risque exposent bien une sortie d'erreur", errorNodes.length >= 12)

  // Un nœud n8n qui n'émet aucun item n'exécute pas le suivant : la chaîne
  // s'arrête, l'exécution se déclare « succeeded », et le run reste en
  // `running`. Tous les appels HTTP de la chaîne doivent donc émettre un item
  // même quand la réponse est vide (upsert entièrement dédupliqué,
  // `return=minimal`, liste de propositions vide…).
  const httpWithoutOutput = workflow.nodes
    .filter((n) => n.type === "n8n-nodes-base.httpRequest" && n.alwaysOutputData !== true)
    .map((n) => n.name)
  check(
    "Aucun appel HTTP ne peut interrompre la chaîne en renvoyant zéro item",
    httpWithoutOutput.length === 0,
    httpWithoutOutput.join(", "),
  )

  // Corollaire : les nœuds Code placés après un appel HTTP doivent lire leur
  // contexte via $('Nœud nommé'), jamais via le contenu de l'item reçu — sinon
  // l'item vide ci-dessus les ferait échouer au lieu de les déclencher.
  const contextFromInput = ["Build Source Catalogue", "Assemble Prompt", "Build Enrichment Proposals"]
    .filter((name) => !/\$\('[^']+'\)\.(first|item)/.test(nodes[name].parameters.jsCode))
  check(
    "Les nœuds post-HTTP relisent leur contexte depuis un nœud nommé",
    contextFromInput.length === 0,
    contextFromInput.join(", "),
  )

  console.log(`\n${passed} succès, ${failed} échec(s)`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
