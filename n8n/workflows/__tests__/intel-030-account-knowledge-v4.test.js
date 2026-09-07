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
    console, Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error,
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

  const v4WithErrors = workflow.nodes.filter((n) => n.name.startsWith("V4 ") && n.onError === "continueErrorOutput")
  const missingFailure = v4WithErrors.filter((n) => !((workflow.connections[n.name] || {}).main || [])[1]?.some((c) => c.node === "Prepare Failure Callback"))
  check("Toutes les sorties d'erreur V4 rejoignent le callback d'échec", missingFailure.length === 0, missingFailure.map((n) => n.name).join(", "))

  console.log(`\n${passed} assertions réussies, ${failed} échec(s).`)
  if (failed) process.exit(1)
}

main().catch((error) => { console.error(error); process.exit(1) })
