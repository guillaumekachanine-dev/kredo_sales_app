"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais d'exécution des nœuds Code V4 extraits du JSON réellement déployable.
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "intel-030-account-knowledge.json"), "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))
let passed = 0
let failed = 0
let httpCalls = []
let httpResponder = async () => ({})

function check(label, condition, detail = "") {
  if (condition) { passed++; console.log(`ok   ${label}`) }
  else { failed++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`) }
}

async function expectThrows(label, fn, matcher) {
  try { await fn(); failed++; console.error(`FAIL ${label} — aucune erreur levée`) }
  catch (error) {
    const message = String(error.message || error)
    if (matcher && !matcher.test(message)) { failed++; console.error(`FAIL ${label} — ${message}`) }
    else { passed++; console.log(`ok   ${label}`) }
  }
}

function sandbox(registry, items) {
  return {
    helpers: { httpRequest: async (options) => { httpCalls.push(options); return httpResponder(options) } },
    $input: { first: () => items[0], all: () => items },
    $: (name) => {
      if (!(name in registry)) throw new Error(`Nœud non exécuté : ${name}`)
      const value = registry[name]
      const values = Array.isArray(value) ? value : [value]
      return { first: () => ({ json: values[0] }), all: () => values.map((json) => ({ json })), item: { json: values[0] } }
    },
    $execution: { id: "exec-v4" }, $workflow: { id: "wf-030" },
    // URL est intentionnellement OMIS ici pour reproduire fidèlement le runtime n8n isolé
    // où typeof URL === "undefined". Tout le code V4 doit s'exécuter sans constructeur global URL.
    console, Date, JSON, Math, Array, Object, Set, Map, Number, String, RegExp, Error,
    isFinite, encodeURIComponent, Boolean, parseInt, parseFloat,
  }
}

async function runCode(name, registry, input = {}, allInput) {
  const node = nodes[name]
  if (!node || node.type !== "n8n-nodes-base.code") throw new Error(`Nœud Code introuvable : ${name}`)
  const items = (allInput || [input]).map((json) => ({ json }))
  const context = vm.createContext(sandbox(registry, items))
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
  const result = await script.runInContext(context)
  if (result && result[0] && result[0].json) {
    registry[name] = result.length === 1 ? result[0].json : result.map((item) => item.json)
  }
  return result
}

const WORKSPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMPANY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const RUN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const EXTERNAL_REGISTRY = "11111111-1111-4111-8111-111111111111"
const EXTERNAL_PAGE = "22222222-2222-4222-8222-222222222222"

function upstream() {
  return { runId: RUN, workflowId: "intel-030-account-knowledge", workspaceId: WORKSPACE,
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", companyId: COMPANY,
    callbackUrl: "https://kredo.example/api/n8n/callback", startedAtMs: Date.now() - 1000,
    accountKnowledgeSchemaVersion: 4, includedSubjects: null }
}

function context() {
  return {
    company: { id: COMPANY, name: "Tournaire", legal_name: "Groupe Tournaire (Tournaire SA)",
      siren: null, naf_code: "25.92Z", hq_location: "Grasse", website: "https://www.tournaire.fr",
      sector: "Industrie manufacturière, électronique & équipements", segment: "Emballages industriels",
      description: "Fabricant d'emballages techniques", employee_count: 70, revenue: null, lifecycle_status: "prospect" },
    accountFacts: [{ id: "f1", fact_type: "description", proof_level: "declared", value_text: "Emballages" }],
    factSources: [], factSourceLinks: [],
    signals: [{ id: "s1", status: "archived", title: "Modernisation industrielle", detected_at: "2026-01-02T00:00:00Z" }],
    accountIssues: [{ id: "i1", label: "Traçabilité" }],
    intelligenceDocuments: [{ id: "d1", title: "Note historique", document_type: "folio" }],
    contacts: [], recentInteractions: [], opportunities: [{ id: "o1", title: "ERP", loss_reason: "budget" }],
    missions: [{ id: "m1", title: "Data", daily_rate: 900 }],
    sectorKnowledge: { segment_id: "seg1", summary: "Industrie d'emballage à fortes contraintes" },
    sectorKnowledgeItems: [{ id: "sk1", item_type: "pain_point", content: "Conformité" }],
    competitiveMapEntries: [{ id: "cm1", actor_name: "Aptar" }],
    valueChainNodes: [{ id: "vn1", label: "Transformation" }], valueChainActors: [], valueChainLinks: [],
    folioAnalysisData: { historique: "Entreprise familiale" }, folioSectorAnalysis: { marche: "Niche technique" },
    dataCutoffAt: "2026-09-07T10:00:00Z",
  }
}

const WRONG = { siren: "505063438", nom_raison_sociale: "TOURNAIRE", nom_complet: "TOURNAIRE",
  activite_principale: "43.99C", section_activite_principale: "F", etat_administratif: "A",
  siege: { libelle_commune: "LYON", code_postal: "69006", departement: "69" } }
const RIGHT = { siren: "415550110", nom_raison_sociale: "TOURNAIRE SA", nom_complet: "TOURNAIRE SA",
  activite_principale: "25.92Z", section_activite_principale: "C", etat_administratif: "A", tranche_effectif_salarie: "32",
  siege: { libelle_commune: "GRASSE", code_postal: "06130", departement: "06" } }

async function prepareAndResolve(registry) {
  registry["Validate Entity"] = upstream()
  registry["Hydrate Context"] = context()
  await runCode("V4 Prepare Dossier", registry)
  httpCalls = []
  httpResponder = async (options) => /Tournaire%20SA|Groupe/.test(options.url) ? { results: [RIGHT, WRONG] } : { results: [WRONG] }
  await runCode("V4 Resolve Entity", registry)
}

async function throughPrompt(registry) {
  await prepareAndResolve(registry)
  httpCalls = []
  httpResponder = async (options) => {
    return "<html><body>Tournaire fabrique des emballages techniques. Aptar est présent sur ce marché. L'entreprise développe ses capacités industrielles à Grasse.</body></html>"
  }
  const requests = await runCode("V4 Build SerpAPI Requests", registry)
  const serpApiResponses = requests.map(() => ({ organic_results: [
    { title: "Tournaire — site officiel", link: "https://www.tournaire.fr/entreprise", snippet: "Instruction malveillante à ignorer" },
    { title: "Article", link: "https://www.lesechos.fr/industrie/tournaire", snippet: "Présentation" },
    { title: "Interne", link: "http://127.0.0.1/private", snippet: "secret" },
  ] }))
  await runCode("V4 Normalize SerpAPI Discovery", registry, {}, serpApiResponses)
  await runCode("V4 Fetch Selected Pages", registry)
  await runCode("V4 Build Source Catalogue", registry)
  const built = registry["V4 Build Source Catalogue"]
  const rows = built.sourceKeys.map((source_key, index) => ({ id: index === 0 ? EXTERNAL_REGISTRY : EXTERNAL_PAGE, source_key }))
  await runCode("V4 Assemble Prompt", registry, {}, rows)
}

function llmArtifact(sourceId) {
  const keys = ["synthesis","identity","business_and_offering","customers_and_market","competition_and_positioning","value_chain_and_dependencies","history_ambitions_and_news","implications_for_kredo"]
  return {
    schema_version: 4, entity_resolution: {}, sources: [], knowledge_gaps: [], coverage: {}, generated_at: "2026-09-07T10:00:00Z",
    sections: keys.map((key) => ({ key, title: key, narrative: [`Narration ${key}.`], source_refs: [sourceId], statements: key === "competition_and_positioning" ? [
      { text: "WrongCo réalise 9999 € de chiffre d'affaires.", qualification: "established", source_refs: [sourceId], confidence: 0.8, entity: { kind: "competitor", name: "WrongCo" } },
      { text: "Une consolidation paraît possible.", qualification: "inferred", source_refs: [], confidence: 0.6 },
    ] : [{ text: `Fait ${key}.`, qualification: "established", source_refs: [sourceId], confidence: 0.8 }] })),
  }
}

async function main() {
  // Structure additive, routage et budget.
  const routes = workflow.connections["Route Account Knowledge Version"].main
  check("Router Switch expose V4, V3 et V2", nodes["Route Account Knowledge Version"].type === "n8n-nodes-base.switch" && routes[0][0].node === "V4 Prepare Dossier" && routes[1][0].node === "V3 Prepare Context & Research Plan" && routes[2][0].node === "Prepare Deterministic Context")
  check("Hydrate Context choisit la nouvelle RPC uniquement pour V4", /get_account_understanding_context/.test(nodes["Hydrate Context"].parameters.url) && /get_account_knowledge_context/.test(nodes["Hydrate Context"].parameters.url))
  check("V4 utilise un seul nœud LLM", workflow.nodes.filter((n) => n.name.startsWith("V4 Call LLM")).length === 1)
  check("Budget V4 = 16000 tokens", /max_tokens: 16000/.test(nodes["V4 Call LLM"].parameters.jsonBody))
  check("Aucun vérificateur LLM V4", !workflow.nodes.some((n) => /^V4 .*Verif/i.test(n.name)))
  check("Aucune écriture V4 directe dans companies", !workflow.nodes.some((n) => n.name.startsWith("V4 ") && /\/rest\/v1\/companies/.test(JSON.stringify(n.parameters))))
  const serpApiNode = nodes["V4 SerpAPI Search"]
  check("SerpAPI utilise le credential n8n existant, sans clé dans le JSON", serpApiNode.parameters.authentication === "predefinedCredentialType" && serpApiNode.parameters.nodeCredentialType === "serpApi" && serpApiNode.credentials.serpApi.id === "4FHmaQGaAytZHN4w" && serpApiNode.credentials.serpApi.name === "SerpAPI_KREDO" && !/api_key|SERPER_API_KEY/.test(JSON.stringify(serpApiNode)))
  check("SerpAPI appelle le bon fournisseur", serpApiNode.parameters.url === "https://serpapi.com/search.json" && serpApiNode.parameters.queryParameters.parameters.some((p) => p.name === "engine" && p.value === "google"))
  check("SerpAPI utilise continueRegularOutput pour préserver le flux en cas d'erreur ponctuelle", serpApiNode.onError === "continueRegularOutput")
  check("V4 SerpAPI Search a une sortie unique vers V4 Normalize SerpAPI Discovery", workflow.connections["V4 SerpAPI Search"]?.main?.length === 1 && workflow.connections["V4 SerpAPI Search"]?.main[0][0]?.node === "V4 Normalize SerpAPI Discovery")
  const supabaseNodes = workflow.nodes.filter((n) => n.parameters && n.parameters.nodeCredentialType === "supabaseApi")
  check("Tous les nœuds Supabase référencent le credential stable", supabaseNodes.length > 0 && supabaseNodes.every((n) => n.credentials?.supabaseApi?.id === "GBrm2aWU0dDf85QS" && n.credentials.supabaseApi.name === "Supabase_Service_Role_KREDO"))
  const anthropicNodes = workflow.nodes.filter((n) => n.parameters && n.parameters.nodeCredentialType === "anthropicApi")
  check("Tous les nœuds Anthropic référencent le credential stable", anthropicNodes.length > 0 && anthropicNodes.every((n) => n.credentials?.anthropicApi?.id === "MERo2FsyLlNgDQXh" && n.credentials.anthropicApi.name === "Anthropic API (KREDO)"))
  check("Ancien nœud Serper.dev supprimé", !workflow.nodes.some((n) => /google\.serper\.dev/.test(JSON.stringify(n))) && !workflow.connections["V4 Serper Discovery"])

  const registry = {}
  await prepareAndResolve(registry)
  const prepared = registry["V4 Prepare Dossier"]
  const resolved = registry["V4 Resolve Entity"]
  check("Plan de recherche contient 12 requêtes", prepared.researchPlan.length === 12)
  check("Requêtes compte ancrées sur raison sociale et siège", prepared.researchPlan.slice(0, 6).every((p) => /Groupe Tournaire.*Grasse/.test(p.query)))
  check("Contexte conserve les signaux archivés", prepared.fullContext.signals[0].status === "archived")
  check("Contexte transporte FOLIO et connaissance sectorielle", !!prepared.fullContext.folioAnalysisData && !!prepared.fullContext.sectorKnowledge)
  check("Tournaire résolu sur le bon SIREN", resolved.entityResolution.decision === "resolved" && resolved.entityResolution.siren === "415550110")
  check("Mauvais Tournaire conservé dans la trace, jamais choisi", resolved.entityResolution.candidates.some((c) => c.siren === "505063438") && resolved.entityResolution.siren !== "505063438")
  check("Résolution utilise plusieurs requêtes registre per_page=10", httpCalls.length >= 2 && httpCalls.every((c) => /per_page=10/.test(c.url)))

  const unresolvedRegistry = { "Validate Entity": upstream(), "Hydrate Context": context() }
  await runCode("V4 Prepare Dossier", unresolvedRegistry)
  httpResponder = async () => ({ results: [WRONG] })
  await expectThrows("Entité ambiguë bloque avant recherche et tokens", () => runCode("V4 Resolve Entity", unresolvedRegistry), /Résolution entité V4 bloquante/)

  // ── Validation approfondie SerpAPI Discovery : 12/12 nominal, 11+1 erreur, couplage & cardinalité ──
  const testDiscoveryRegistry = { "V4 Resolve Entity": resolved }
  const requests = await runCode("V4 Build SerpAPI Requests", testDiscoveryRegistry)
  check("V4 Build SerpAPI Requests produit 12 items ordonnés", requests.length === 12 && requests.every((r, idx) => r.json.index === idx && typeof r.json.query === "string"))

  // Cas nominal 12/12
  const nominalResponses = requests.map((r, i) => ({
    organic_results: [{ title: `Titre ${i}`, link: `https://www.tournaire.fr/page-${i}`, snippet: `Extrait ${i}` }],
  }))
  const nominalNormResult = await runCode("V4 Normalize SerpAPI Discovery", testDiscoveryRegistry, {}, nominalResponses)
  const nominalDiscovery = nominalNormResult[0].json.discovery
  check("Cas nominal 12/12 : 12 entrées discovery produites", nominalDiscovery.length === 12)
  check(
    "Cas nominal 12/12 : couplage exact 1-pour-1 sans décalage requête/réponse",
    nominalDiscovery.every((item, i) =>
      item.index === i &&
      item.query === requests[i].json.query &&
      item.organic.length === 1 &&
      item.organic[0].title === `Titre ${i}` &&
      item.organic[0].link === `https://www.tournaire.fr/page-${i}` &&
      !item.error
    )
  )

  // Cas 11 succès + 1 erreur SerpAPI (index 4 en erreur)
  const partialErrorResponses = requests.map((r, i) => {
    if (i === 4) {
      return { error: "Google hasn't returned any results for this query." }
    }
    return {
      organic_results: [{ title: `Titre ${i}`, link: `https://www.tournaire.fr/page-${i}`, snippet: `Extrait ${i}` }],
    }
  })
  const partialErrorResult = await runCode("V4 Normalize SerpAPI Discovery", testDiscoveryRegistry, {}, partialErrorResponses)
  const partialDiscovery = partialErrorResult[0].json.discovery
  check("Cas 11 succès + 1 erreur : pipeline produit 12 entrées", partialDiscovery.length === 12)
  check(
    "Cas 11 succès + 1 erreur : l'élément en erreur est typé {index, query, organic:[], error}",
    partialDiscovery[4].index === 4 &&
    partialDiscovery[4].query === requests[4].json.query &&
    Array.isArray(partialDiscovery[4].organic) &&
    partialDiscovery[4].organic.length === 0 &&
    partialDiscovery[4].error === "Google hasn't returned any results for this query."
  )
  check(
    "Cas 11 succès + 1 erreur : aucun décalage requête/réponse sur les 11 autres recherches",
    partialDiscovery.every((item, i) => {
      if (i === 4) return true
      return (
        item.index === i &&
        item.query === requests[i].json.query &&
        item.organic.length === 1 &&
        item.organic[0].title === `Titre ${i}` &&
        item.organic[0].link === `https://www.tournaire.fr/page-${i}` &&
        !item.error
      )
    })
  )

  // Vérification que le pipeline continue après 11 succès + 1 erreur
  testDiscoveryRegistry["V4 Normalize SerpAPI Discovery"] = partialErrorResult[0].json
  httpCalls = []
  httpResponder = async () => "<html><body>Contenu page de test Tournaire Grasse. Aptar concurrent.</body></html>"
  await runCode("V4 Fetch Selected Pages", testDiscoveryRegistry)
  check(
    "Cas 11 succès + 1 erreur : V4 Fetch Selected Pages continue sans planter",
    Array.isArray(testDiscoveryRegistry["V4 Fetch Selected Pages"].selectedPages) &&
    testDiscoveryRegistry["V4 Fetch Selected Pages"].selectedPages.length > 0
  )

  // Cas de rejet sur cardinalité incomplète (< 12 réponses transmises)
  await expectThrows(
    "Contrôle cardinalité SerpAPI : 11 réponses pour 12 requêtes lève une exception",
    () => runCode("V4 Normalize SerpAPI Discovery", testDiscoveryRegistry, {}, nominalResponses.slice(0, 11)),
    /Réponses SerpAPI incomplètes : 11\/12/
  )

  const full = {}
  await throughPrompt(full)
  check("SerpAPI prépare exactement les 12 requêtes", full["V4 Build SerpAPI Requests"].length === 12 && full["V4 Normalize SerpAPI Discovery"].discovery.length === 12)
  check("SSRF bloque localhost avant le fetch", !full["V4 Fetch Selected Pages"].selectedPages.some((p) => /127\.0\.0\.1/.test(p.link)))
  check("Au plus 6 pages externes sont consultées", full["V4 Fetch Selected Pages"].fetchedPages.length <= 6)
  check("Snippets absents du catalogue de sources", !JSON.stringify(full["V4 Build Source Catalogue"].sourcesPayload).includes("Instruction malveillante"))
  check("Le prompt marque les snippets comme non-preuves", /discovery_only_not_evidence/.test(full["V4 Assemble Prompt"].userPrompt) && /ne les cite jamais/.test(full["V4 Assemble Prompt"].systemPrompt))
  check("Le dossier prompt contient FOLIO, enjeux et historique KREDO", /Entreprise familiale/.test(full["V4 Assemble Prompt"].userPrompt) && /Traçabilité/.test(full["V4 Assemble Prompt"].userPrompt) && /daily_rate/.test(full["V4 Assemble Prompt"].userPrompt))

  const llmNode = nodes["V4 Call LLM"]
  check("V4 Call LLM a contentType json", llmNode.parameters.contentType === "json")
  check("V4 Call LLM désactive explicitement thinking pour Claude 3.7", /thinking:\s*\{\s*type:\s*['"]disabled['"]\s*\}/.test(llmNode.parameters.jsonBody))
  check("V4 Call LLM utilise neverError pour acheminer les erreurs HTTP au parseur", llmNode.parameters.options?.response?.response?.neverError === true)
  check("V4 Call LLM utilise continueRegularOutput", llmNode.onError === "continueRegularOutput")
  check("V4 Call LLM a une sortie unique vers V4 Truncated?", workflow.connections["V4 Call LLM"]?.main?.length === 1 && workflow.connections["V4 Call LLM"]?.main[0][0]?.node === "V4 Truncated?")

  const sourceId = full["V4 Assemble Prompt"].sourceCatalogue.find((s) => s.source_type === "regulatory_filing").id

  // ── Tests diagnostiques V4 Parse & Guard (cas d'erreurs et réponses anormales) ──
  const apiErrorRegistry = { ...full }
  apiErrorRegistry["V4 Call LLM"] = {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "temperature cannot be specified when thinking is enabled"
    }
  }
  await expectThrows(
    "Réponse API en erreur sans content : V4 Parse & Guard remonte l'erreur Anthropic explicite",
    () => runCode("V4 Parse & Guard", apiErrorRegistry),
    /Anthropic V4 error: \[LLM_API_ERROR\] invalid_request_error — temperature cannot be specified when thinking is enabled/
  )

  const httpErrorRegistry = { ...full }
  httpErrorRegistry["V4 Call LLM"] = {
    error: {
      message: '400 - "{\\"type\\":\\"error\\",\\"error\\":{\\"type\\":\\"invalid_request_error\\",\\"message\\":\\"model claude-sonnet-5 not found\\"}}"'
    }
  }
  await expectThrows(
    "Réponse HTTP en erreur n8n : V4 Parse & Guard extrait le message API original",
    () => runCode("V4 Parse & Guard", httpErrorRegistry),
    /Anthropic V4 error: \[LLM_API_ERROR\] invalid_request_error — model claude-sonnet-5 not found/
  )

  const emptyRegistry = { ...full }
  emptyRegistry["V4 Call LLM"] = {}
  await expectThrows(
    "Réponse réellement vide {} : V4 Parse & Guard lève LLM_EMPTY_RESPONSE",
    () => runCode("V4 Parse & Guard", emptyRegistry),
    /Anthropic V4 error: \[LLM_EMPTY_RESPONSE\] Réponse LLM V4 vide \(réponse vide reçue\)/
  )

  const emptyContentRegistry = { ...full }
  emptyContentRegistry["V4 Call LLM"] = { content: [] }
  await expectThrows(
    "Réponse content[] vide : V4 Parse & Guard lève LLM_EMPTY_RESPONSE",
    () => runCode("V4 Parse & Guard", emptyContentRegistry),
    /Anthropic V4 error: \[LLM_EMPTY_RESPONSE\] Réponse LLM V4 vide \(content\[\] absent ou vide\)/
  )

  const thinkingOnlyRegistry = { ...full }
  thinkingOnlyRegistry["V4 Call LLM"] = {
    content: [{ type: "thinking", thinking: "Je réfléchis au problème..." }],
    usage: { input_tokens: 100, output_tokens: 500 }
  }
  await expectThrows(
    "Réponse avec thinking sans bloc text : V4 Parse & Guard lève LLM_EMPTY_RESPONSE",
    () => runCode("V4 Parse & Guard", thinkingOnlyRegistry),
    /Anthropic V4 error: \[LLM_EMPTY_RESPONSE\] Réponse LLM V4 vide \(aucun bloc text non vide dans content\[\]\)/
  )

  const nonJsonRegistry = { ...full }
  nonJsonRegistry["V4 Call LLM"] = {
    content: [{ type: "text", text: "Voici le rapport narratif sans aucun format JSON." }],
    usage: { input_tokens: 100, output_tokens: 50 }
  }
  await expectThrows(
    "Réponse texte non-JSON : V4 Parse & Guard lève LLM_INVALID_FORMAT",
    () => runCode("V4 Parse & Guard", nonJsonRegistry),
    /Anthropic V4 error: \[LLM_INVALID_FORMAT\] JSON V4 invalide/
  )

  // ── Cas nominal Anthropic ──
  full["V4 Call LLM"] = { content: [{ type: "text", text: JSON.stringify(llmArtifact(sourceId)) }], usage: { input_tokens: 4000, output_tokens: 2500 }, model: "claude-sonnet-5" }
  await runCode("V4 Parse & Guard", full)
  const guarded = full["V4 Parse & Guard"]
  const compStatements = guarded.accountKnowledge.sections[4].statements
  check("Chiffre absent du dossier est neutralisé et signalé", !/9999/.test(compStatements[0].text) && guarded.qaFlags.some((f) => f.check === "unsourced_figure"))
  check("Concurrent absent du dossier est rétrogradé en hypothèse", compStatements[0].qualification === "hypothesis" && guarded.qaFlags.some((f) => f.check === "competitor_domain_mismatch"))
  check("Déduction sans source est rétrogradée", compStatements[1].qualification === "hypothesis" && guarded.qaFlags.some((f) => f.check === "unsourced_statement"))
  await runCode("V4 Validate Artifact", full)
  check("Artefact gardé passe le validateur n8n V4", full["V4 Validate Artifact"].accountKnowledge.schema_version === 4)
  await runCode("V4 Prepare Callback", full)
  const callback = JSON.parse(full["V4 Prepare Callback"].rawBody)
  check("Callback porte entityResolution et QA dédiée", callback.contextSnapshot.entityResolution.siren === "415550110" && callback.qaFlags.some((f) => f.check === "entity_resolution" && f.passed))
  check("Callback annonce un seul appel LLM", callback.qaFlags.some((f) => f.check === "single_llm_call" && f.passed))
  check("sourceRefs callback ne contient que des UUID persistés", callback.sourceRefs.every((r) => /^[0-9a-f-]{36}$/i.test(r.entityId)))

  // ── 7 Tests obligatoires V4 (sélection, site officiel, déduplication, SSRF, résilience, diagnostic, segment) ──

  // Test 7 : les recherches sectorielles utilisent segment avant sector
  const segmentCtx = context()
  segmentCtx.company.segment = "Emballages industriels"
  segmentCtx.company.sector = "Industrie manufacturière, électronique & équipements"
  const segmentRegistry = { "Validate Entity": upstream(), "Hydrate Context": segmentCtx }
  await runCode("V4 Prepare Dossier", segmentRegistry)
  const segmentPlan = segmentRegistry["V4 Prepare Dossier"].researchPlan
  check(
    "Exigence 7 : les recherches sectorielles utilisent segment avant sector",
    segmentPlan.slice(6, 12).every((p) => p.query.includes('"Emballages industriels"') && !p.query.includes('"Industrie manufacturière'))
  )

  // Fallback si segment absent
  const noSegmentCtx = context()
  noSegmentCtx.company.segment = null
  noSegmentCtx.company.sector = "Industrie manufacturière, électronique & équipements"
  const noSegmentReg = { "Validate Entity": upstream(), "Hydrate Context": noSegmentCtx }
  await runCode("V4 Prepare Dossier", noSegmentReg)
  const noSegmentPlan = noSegmentReg["V4 Prepare Dossier"].researchPlan
  check(
    "Exigence 7 bis : repli sectoriel sur sector si segment absent",
    noSegmentPlan.slice(6, 12).every((p) => p.query.includes('"Industrie manufacturière, électronique & équipements"'))
  )

  // Test 1, 2, 3, 4 : 12 recherches avec résultats → au moins 3 pages, site officiel prioritaire, déduplication, SSRF bloqué
  const richDiscovery = [
    { index: 0, query: "q0", organic: [
      { title: "Tournaire — Page 1", link: "https://www.tournaire.fr/solutions", snippet: "Solutions" },
      { title: "Doublon avec hash", link: "https://www.tournaire.fr/solutions#contact", snippet: "Contact" },
      { title: "SSRF Localhost", link: "http://localhost:3000/admin", snippet: "Admin" },
      { title: "SSRF IP privée 10", link: "http://10.0.0.1/secret", snippet: "Secret" },
      { title: "SSRF IP privée 192", link: "http://192.168.1.1/router", snippet: "Router" },
      { title: "SSRF IP privée 172", link: "http://172.16.0.1/lan", snippet: "LAN" },
    ] },
    { index: 1, query: "q1", organic: [
      { title: "Usine Nouvelle — Tournaire", link: "https://www.usinenouvelle.com/article/tournaire-grasse.html", snippet: "Article presse" },
      { title: "Doublon exact", link: "https://www.usinenouvelle.com/article/tournaire-grasse.html", snippet: "Article presse bis" },
    ] },
    { index: 2, query: "q2", organic: [
      { title: "Les Echos — Emballage", link: "https://www.lesechos.fr/industrie/emballage-industriel", snippet: "Eco" },
    ] },
    { index: 3, query: "q3", organic: [
      { title: "Insee — Données", link: "https://www.insee.fr/fr/statistiques/12345", snippet: "Stats" },
    ] },
    { index: 4, query: "q4", organic: [
      { title: "Techniques de l'Ingénieur", link: "https://www.techniques-ingenieur.fr/emballage", snippet: "Ingénierie" },
    ] },
    { index: 5, query: "q5", organic: [] },
    { index: 6, query: "q6", organic: [
      { title: "Autre page", link: "https://www.actu-environnement.com/dechets-emballages", snippet: "RSE" },
    ] },
    { index: 7, query: "q7", organic: [] },
    { index: 8, query: "q8", organic: [] },
    { index: 9, query: "q9", organic: [] },
    { index: 10, query: "q10", organic: [] },
    { index: 11, query: "q11", organic: [] },
  ]
  const suiteRegistry = {
    ...resolved,
    "V4 Normalize SerpAPI Discovery": {
      ...resolved,
      discovery: richDiscovery,
    }
  }
  httpCalls = []
  httpResponder = async () => {
    return "<html><body>Contenu public complet de la page pour Tournaire à Grasse. Les emballages en aluminium et inox sont certifiés conformes.</body></html>"
  }
  await runCode("V4 Fetch Selected Pages", suiteRegistry)
  const selectedList = suiteRegistry["V4 Fetch Selected Pages"].selectedPages

  // Test 1 : 12 recherches avec résultats → au moins 3 pages sélectionnées
  check(
    "Exigence 1 : 12 recherches avec résultats → au moins 3 pages sélectionnées (et <= 6)",
    selectedList.length >= 3 && selectedList.length <= 6,
    `selectedPages count = ${selectedList.length}`
  )

  // Test 2 : site officiel connu → candidat prioritaire
  check(
    "Exigence 2 : site officiel connu (canonical.website) est candidat prioritaire en tête de sélection",
    selectedList.length > 0 && selectedList[0].link.startsWith("https://www.tournaire.fr") && selectedList[0].score >= 100
  )

  // Test 3 : doublons supprimés
  const urlsInSelected = selectedList.map((p) => p.link)
  const uniqueUrls = new Set(urlsInSelected)
  check(
    "Exigence 3 : doublons d'URL (y compris avec #hash) supprimés de la sélection",
    urlsInSelected.length === uniqueUrls.size
  )

  // Test 4 : localhost / IP privées rejetés
  check(
    "Exigence 4 : localhost et adresses IP privées strictement rejetés de la sélection",
    !selectedList.some((p) => /localhost|127\.0\.0\.1|10\.|192\.168\.|172\.16\./.test(p.link))
  )

  // Test 5 : certaines pages échouent → les autres restent exploitables
  const partialFailRegistry = {
    ...resolved,
    "V4 Normalize SerpAPI Discovery": {
      ...resolved,
      discovery: richDiscovery,
    }
  }
  httpCalls = []
  httpResponder = async (options) => {
    if (options.url.includes("usinenouvelle") || options.url.includes("insee")) {
      throw new Error("HTTP 503 Service Unavailable")
    }
    return "<html><body>Contenu public complet, valide et détaillé de la page consultée avec succès sur le site web. L'entreprise Tournaire fabrique des emballages industriels de haute performance à Grasse, notamment des bidons et fûts en aluminium et acier inoxydable pour la pharmacie et la chimie fine.</body></html>"
  }
  await runCode("V4 Fetch Selected Pages", partialFailRegistry)
  const partialFetchRes = partialFailRegistry["V4 Fetch Selected Pages"]
  check(
    "Exigence 5 : certaines pages échouent → les autres restent exploitables dans fetchedPages et fetchFailures est renseigné",
    partialFetchRes.fetchedPages.length > 0 &&
    partialFetchRes.fetchFailures.length > 0 &&
    partialFetchRes.fetchedPages.every((p) => p.fetched) &&
    partialFetchRes.fetchFailures.every((p) => !p.fetched && p.error.includes("503"))
  )

  // Test 6 : discoveryCount > 0 + zéro page récupérée → diagnostic explicite
  // Cas A : Toutes les pages sélectionnées échouent au fetch -> external_research_degraded
  const allFailRegistry = {
    ...resolved,
    "V4 Normalize SerpAPI Discovery": {
      ...resolved,
      discovery: richDiscovery,
    }
  }
  httpCalls = []
  httpResponder = async () => { throw new Error("Network timeout") }
  await runCode("V4 Fetch Selected Pages", allFailRegistry)
  const allFailFetch = allFailRegistry["V4 Fetch Selected Pages"]
  check(
    "Exigence 6a : toutes les pages échouent → externalResearchStatus vaut external_research_degraded",
    allFailFetch.externalResearchStatus === "external_research_degraded" &&
    allFailFetch.selectedPages.length > 0 &&
    allFailFetch.fetchedPages.length === 0
  )

  // Vérifier la trace QA dans Parse & Guard pour external_research_degraded
  const allFailGuardRegistry = {
    ...allFailRegistry,
    "V4 Assemble Prompt": {
      ...allFailFetch,
      sourceCatalogue: [
        { id: "reg-1", source_type: "regulatory_filing", label: "Registre" },
      ],
      dossierText: "tournaire grasse emballages",
    },
    "V4 Call LLM": {
      content: [{ type: "text", text: JSON.stringify(llmArtifact("reg-1")) }],
      usage: { input_tokens: 2000, output_tokens: 1000 },
      model: "claude-sonnet-5"
    }
  }
  await runCode("V4 Parse & Guard", allFailGuardRegistry)
  const allFailQa = allFailGuardRegistry["V4 Parse & Guard"].qaFlags
  check(
    "Exigence 6b : external_research_degraded est tracé explicitement avec passed: false dans qaFlags",
    allFailQa.some((f) => f.check === "external_research" && f.passed === false && f.detail.includes("external_research_degraded"))
  )

  // Cas B : discoveryCount > 0 mais 0 URLs exploitables -> lève une anomalie pipeline
  const anomalyRegistry = {
    "V4 Normalize SerpAPI Discovery": {
      canonical: { name: "TestCo", website: null },
      discovery: [
        { index: 0, query: "q0", organic: [
          { title: "Privé", link: "http://127.0.0.1/foo", snippet: "" },
          { title: "Local", link: "http://localhost/bar", snippet: "" },
        ] }
      ]
    }
  }
  await expectThrows(
    "Exigence 6c : discoveryCount > 0 et 0 candidat sélectionné lève une anomalie pipeline explicite",
    () => runCode("V4 Fetch Selected Pages", anomalyRegistry),
    /Anomalie pipeline V4 : aucune URL exploitable sélectionnée malgré 2 résultats découverts/
  )

  // ── Correctif Lot V4.1 : Tests sandbox sans URL global + Invariant canonical.website + Payload 83572 ──

  // Test Invariant : canonical.website valide + discoveryCount > 0 -> le site officiel est toujours sélectionnable
  // Même si 100% des résultats SerpAPI sont rejetés (ex. moteurs de recherche ou IP privées),
  // candidates.length ne doit jamais être zéro et le site officiel doit être retenu.
  const invariantRegistry = {
    "V4 Normalize SerpAPI Discovery": {
      canonical: { name: "Tournaire", website: "https://www.tournaire.fr/" },
      discovery: [
        { index: 0, query: "q0", organic: [
          { title: "Google Search", link: "https://www.google.fr/search?q=tournaire", snippet: "" },
          { title: "IP privée", link: "http://192.168.1.1/admin", snippet: "" },
          { title: "Localhost", link: "http://localhost:3000/", snippet: "" },
        ] }
      ]
    }
  }
  const invariantFetchResult = await runCode("V4 Fetch Selected Pages", invariantRegistry)
  const invariantFetch = invariantFetchResult[0].json
  check(
    "Invariant V4.1 : canonical.website valide garantit candidates >= 1 même si tous les résultats SerpAPI sont rejetés",
    invariantFetch.selectedPages.length >= 1 && invariantFetch.selectedPages[0].link === "https://www.tournaire.fr/"
  )
  check(
    "Invariant V4.1 : urlSelectionDiagnostics trace l'acceptation du site officiel et les rejets spécifiques",
    invariantFetch.urlSelectionDiagnostics.canonicalWebsiteAccepted === true &&
    invariantFetch.urlSelectionDiagnostics.rejected.search_engine === 1 &&
    invariantFetch.urlSelectionDiagnostics.rejected.private_network === 1 &&
    invariantFetch.urlSelectionDiagnostics.rejected.invalid_hostname === 1
  )
  check(
    "Runtime n8n V4.1 : V4 Fetch Selected Pages s'exécute sans constructeur global URL (typeof URL === 'undefined')",
    invariantFetch.urlSelectionDiagnostics.urlGlobalType === "undefined"
  )

  // Test Payload réel 83572 : 56 résultats SerpAPI découverts sur 12 requêtes
  const realisticDiscovery = [
    { index: 0, query: 'Tournaire Grasse', organic: [
      { title: 'Tournaire : Equipements et emballages', link: 'https://www.tournaire.fr/', snippet: 'Site officiel' },
      { title: 'Histoire Tournaire', link: 'https://www.tournaire.fr/notre-histoire', snippet: 'Fondé en 1833' },
      { title: 'Google Résultat', link: 'https://www.google.com/search?q=tournaire', snippet: '' },
      { title: 'Wikipédia Emballage', link: 'https://fr.wikipedia.org/wiki/Emballage', snippet: 'Encyclopédie' },
      { title: 'Économie Gouv', link: 'https://www.economie.gouv.fr/entreprises/tournaire', snippet: 'Fiche entreprise' },
    ] },
    { index: 1, query: 'Tournaire SA Grasse', organic: [
      { title: 'Tournaire SA Solutions', link: 'https://www.tournaire.fr/solutions-emballage', snippet: 'Solutions alu' },
      { title: 'Usine Nouvelle Tournaire', link: 'https://www.usinenouvelle.com/article/tournaire-investit-grasse.N12345', snippet: 'Investissement usine' },
      { title: 'Les Échos Tournaire', link: 'https://lesechos.fr/industrie/tournaire-packaging', snippet: 'Croissance' },
      { title: 'Local Router', link: 'http://192.168.1.1/config', snippet: 'LAN' },
      { title: 'Societe.com Tournaire', link: 'https://www.societe.com/societe/tournaire-sa-035650044.html', snippet: 'Informations légales' },
    ] },
    { index: 2, query: 'Groupe Tournaire Grasse', organic: [
      { title: 'Tournaire RSE', link: 'https://www.tournaire.fr/rse-engagement', snippet: 'Index 89/100' },
      { title: 'Bfmtv Tournaire', link: 'https://www.bfmtv.com/economie/entreprises/tournaire-grasse_AN-2024.html', snippet: 'Reportage' },
      { title: 'DuckDuckGo Search', link: 'https://duckduckgo.com/?q=tournaire', snippet: '' },
      { title: 'Techniques Ingénieur Tournaire', link: 'https://www.techniques-ingenieur.fr/actualite/articles/tournaire-emballage-12345/', snippet: 'Procédés industriels' },
      { title: 'Infogreffe Tournaire', link: 'https://www.infogreffe.fr/entreprise/tournaire/035650044', snippet: 'Greffe' },
    ] },
    // 9 requêtes supplémentaires complétant le total à 56 résultats (comme l'exécution 83572)
    ...Array.from({ length: 9 }, (_, qIdx) => ({
      index: qIdx + 3,
      query: `Requête sectorielle ${qIdx + 3}`,
      organic: Array.from({ length: qIdx < 5 ? 5 : 4 }, (__, rIdx) => ({
        title: `Résultat Q${qIdx + 3}-${rIdx}`,
        link: `https://revue-emballages-${qIdx + 3}.fr/article-${rIdx}`,
        snippet: `Extrait article emballages industriels ${qIdx + 3}-${rIdx}`,
        date: '2026-08-15',
      }))
    }))
  ]

  const totalDiscoveryCount = realisticDiscovery.reduce((n, s) => n + s.organic.length, 0)
  check("Payload 83572 : contient exactement 56 résultats découverts", totalDiscoveryCount === 56)

  const realistic83572Registry = {
    ...resolved,
    "V4 Normalize SerpAPI Discovery": {
      ...resolved,
      canonical: {
        id: "cde3d719-f1ef-4bd5-a55d-1f37c7642637",
        name: "Tournaire",
        website: "https://www.tournaire.fr/",
        segment: "Emballages industriels",
        sector: "Industrie manufacturière, électronique & équipements",
      },
      discovery: realisticDiscovery,
    }
  }

  httpCalls = []
  httpResponder = async () => {
    return "<html><body>Contenu public complet de la page pour Tournaire à Grasse. Les emballages en aluminium et inox sont certifiés conformes. Activité industrielle de pointe.</body></html>"
  }

  const realistic83572FetchResult = await runCode("V4 Fetch Selected Pages", realistic83572Registry)
  const realisticFetch = realistic83572FetchResult[0].json
  check("Payload 83572 : découverte 56 résultats → sélection de 3 à 6 pages", realisticFetch.selectedPages.length >= 3 && realisticFetch.selectedPages.length <= 6)
  check("Payload 83572 : site officiel https://www.tournaire.fr/ sélectionné en priorité (score 200)", realisticFetch.selectedPages[0].link === "https://www.tournaire.fr/" && realisticFetch.selectedPages[0].score === 200)
  check("Payload 83572 : au moins 3 pages externes récupérées avec succès", realisticFetch.fetchedPages.length >= 3)
  check("Payload 83572 : externalResearchStatus vaut nominal", realisticFetch.externalResearchStatus === "nominal")
  check("Payload 83572 : urlSelectionDiagnostics trace les 56 découverts et les rejets filtrés",
    realisticFetch.urlSelectionDiagnostics.discovered === 56 &&
    realisticFetch.urlSelectionDiagnostics.accepted >= 3 &&
    realisticFetch.urlSelectionDiagnostics.rejected.search_engine === 2 &&
    realisticFetch.urlSelectionDiagnostics.rejected.private_network === 1
  )

  // Vérifier que le Catalogue de sources s'exécute sans URL global
  await runCode("V4 Build Source Catalogue", {
    ...realistic83572Registry,
    "V4 Fetch Selected Pages": realisticFetch,
  })
  check("Catalogue V4.1 : V4 Build Source Catalogue s'exécute avec succès sans URL global", true)

  // Résilience : Catalogue avec fetchedPages undefined ne doit jamais lever d'exception
  const degradedFetch = { ...realisticFetch, fetchedPages: undefined }
  const degradedCatalogueRes = await runCode("V4 Build Source Catalogue", {
    ...realistic83572Registry,
    "V4 Fetch Selected Pages": degradedFetch,
  })
  check(
    "Résilience Catalogue : fetchedPages undefined ne provoque pas d'erreur et conserve au moins la preuve registre",
    degradedCatalogueRes[0].json.externalEvidence.length === 1 &&
    degradedCatalogueRes[0].json.externalEvidence[0].kind === "registry"
  )

  // Résilience : Callback avec fetchedPages undefined ne doit jamais lever d'exception
  const degradedValidate = {
    ...realisticFetch,
    fetchedPages: undefined,
    externalResearchStatus: undefined,
    accountKnowledge: llmArtifact("source-1"),
  }
  const degradedCallbackRes = await runCode("V4 Prepare Callback", {
    ...realistic83572Registry,
    "V4 Validate Artifact": degradedValidate,
  })
  check(
    "Résilience Callback : fetchedPages undefined produit un callback réussi avec external_research_degraded",
    degradedCallbackRes[0].json.rawBody.includes('"externalResearchStatus":"external_research_degraded"')
  )

  const v4WithErrors = workflow.nodes.filter((n) => n.name.startsWith("V4 ") && n.onError === "continueErrorOutput")
  const missingFailure = v4WithErrors.filter((n) => !((workflow.connections[n.name] || {}).main || [])[1]?.some((c) => c.node === "Prepare Failure Callback"))
  check("Toutes les sorties d'erreur V4 rejoignent le callback d'échec", missingFailure.length === 0, missingFailure.map((n) => n.name).join(", "))

  console.log(`\n${passed} assertions réussies, ${failed} échec(s).`)
  if (failed) process.exit(1)
}

main().catch((error) => { console.error(error); process.exit(1) })
