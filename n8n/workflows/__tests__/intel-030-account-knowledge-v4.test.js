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
const DOC_A = "d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1"
const DOC_B = "d2d2d2d2-2222-4222-8222-d2d2d2d2d2d2"

function upstream(overrides = {}) {
  return { runId: RUN, workflowId: "intel-030-account-knowledge", workspaceId: WORKSPACE,
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", companyId: COMPANY,
    callbackUrl: "https://kredo.example/api/n8n/callback", startedAtMs: Date.now() - 1000,
    accountKnowledgeSchemaVersion: 4, includedSubjects: null,
    // Lot 0.7 — le corpus approuvé remplace la découverte.
    sourceDocumentIds: [DOC_A, DOC_B], sourcePolicy: "approved_only", ...overrides }
}

/** Lignes `account_source_documents` telles que PostgREST les rend. */
function documentRows() {
  return [
    { id: DOC_A, url: "https://www.tournaire.fr/entreprise", canonical_url: "https://www.tournaire.fr/entreprise",
      title: "Tournaire — site officiel", kind: "company_official", serves_modules: ["business_and_offering"],
      status: "retrieved", fetched_at: "2026-09-10T10:00:00.000Z",
      extracted_text: "Tournaire fabrique des emballages techniques. Aptar est présent sur ce marché. L'entreprise développe ses capacités industrielles à Grasse." },
    { id: DOC_B, url: "https://www.lesechos.fr/industrie/tournaire", canonical_url: "https://www.lesechos.fr/industrie/tournaire",
      title: "Tournaire investit", kind: "press", serves_modules: ["news"],
      status: "retrieved", fetched_at: "2026-09-10T10:05:00.000Z",
      extracted_text: "Le groupe annonce un investissement industriel sur son site historique." },
  ]
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
  // Lot 0.7 — aucun responder de page n'est nécessaire : V4 n'émet plus une seule
  // requête HTTP vers l'extérieur après la résolution d'entité.
  // Lot 0.7 — V4 ne découvre ni ne récupère plus rien. Il lit le corpus approuvé,
  // constitué et validé en amont par INTEL-035. Toute la couverture de sélection, de
  // fetch, de SSRF et d'échec partiel vit désormais dans le harnais d'INTEL-035.
  await runCode("V4 Normalize Source Documents", registry, {}, documentRows())
  await runCode("V4 Build Source Catalogue", registry)
  const built = registry["V4 Build Source Catalogue"]
  const rows = built.sourceKeys.map((source_key, index) => ({ id: index === 0 ? EXTERNAL_REGISTRY : EXTERNAL_PAGE, source_key }))
  await runCode("V4 Assemble Prompt", registry, {}, rows)
}

function llmArtifact(sourceId, internalFolioId = "internal:folio:" + COMPANY) {
  const keys = ["synthesis","identity","business_and_offering","customers_and_market","competition_and_positioning","value_chain_and_dependencies","history_ambitions_and_news","implications_for_kredo"]
  return {
    schema_version: 4, entity_resolution: {}, sources: [], knowledge_gaps: [], coverage: {}, generated_at: "2026-09-07T10:00:00Z",
    sections: keys.map((key) => ({ key, title: key, narrative: [`Narration ${key}.`], source_refs: [sourceId], statements: key === "competition_and_positioning" ? [
      // Une preoccupation par statement — le fixture d'origine melait chiffre non ancre et
      // concurrent hors dossier dans la meme phrase, ce qui rendait les deux gardes
      // indiscernables des que l'une supprimait le statement.
      { text: "WrongCo est un concurrent direct sur le segment premium.", qualification: "established", source_refs: [sourceId], confidence: 0.8, entity: { kind: "competitor", name: "WrongCo" } },
      { text: "Une consolidation paraît possible.", qualification: "inferred", source_refs: [], confidence: 0.6 },
      { text: "Le marché pèse 9999 € selon les estimations.", qualification: "established", source_refs: [sourceId], confidence: 0.8 },
      { text: "Le groupe a annoncé un partenariat stratégique.", qualification: "declared", source_refs: [internalFolioId], confidence: 0.7 },
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
  // ── Lot 0.7 — INTEL-030 est un pur consommateur de corpus ──
  for (const gone of ["V4 Build SerpAPI Requests", "V4 SerpAPI Search", "V4 Normalize SerpAPI Discovery", "V4 Fetch Selected Pages"]) {
    check(`Le nœud de collecte ${gone} a disparu de la branche V4`, nodes[gone] === undefined)
  }
  check("Plus aucune référence SerpAPI dans le workflow", !/serpapi/i.test(JSON.stringify(workflow)))
  check("V4 lit account_source_documents au lieu de récupérer des pages",
    /account_source_documents/.test(nodes["V4 Load Source Documents"].parameters.url) &&
    /status=eq\.retrieved/.test(nodes["V4 Load Source Documents"].parameters.url))
  check("La lecture du corpus est scopée au workspace du run",
    /workspace_id=eq\./.test(nodes["V4 Load Source Documents"].parameters.url))
  check("La lecture du corpus tolère un corpus vide sans couper la chaîne",
    nodes["V4 Load Source Documents"].alwaysOutputData === true)
  check("La chaîne V4 passe par le corpus entre résolution d'entité et catalogue",
    workflow.connections["V4 Resolve Entity"].main[0][0].node === "V4 Load Source Documents" &&
    workflow.connections["V4 Load Source Documents"].main[0][0].node === "V4 Normalize Source Documents" &&
    workflow.connections["V4 Normalize Source Documents"].main[0][0].node === "V4 Build Source Catalogue")
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

  const full = {}
  await throughPrompt(full)
  check("Le catalogue est bâti sur les documents du corpus approuvé",
    full["V4 Build Source Catalogue"].externalEvidence.some((e) => /tournaire\.fr\/entreprise/.test(String(e.url))) &&
    full["V4 Build Source Catalogue"].externalEvidence.some((e) => /lesechos\.fr/.test(String(e.url))))
  check("Le registre légal reste la première preuve du catalogue",
    full["V4 Build Source Catalogue"].externalEvidence[0].kind === "registry")
  check("Aucun snippet de moteur de recherche n'entre dans le catalogue",
    !JSON.stringify(full["V4 Build Source Catalogue"].sourcesPayload).includes("Instruction malveillante"))
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
  check("Concurrent absent du dossier est rétrogradé en hypothèse", compStatements[0].qualification === "hypothesis" && guarded.qaFlags.some((f) => f.check === "competitor_domain_mismatch"))
  check("Déduction sans source est rétrogradée", compStatements[1].qualification === "hypothesis" && guarded.qaFlags.some((f) => f.check === "unsourced_statement"))

  // ── Lot 0 — guardFigures retire la PHRASE, jamais un placeholder dans la phrase ──
  check("Aucun chiffre non ancré ne survit dans un statement", !compStatements.some((s) => /9999/.test(s.text)) && guarded.qaFlags.some((f) => f.check === "unsourced_figure"))
  check("Aucun placeholder « ordre de grandeur » ne pollue la prose", !guarded.accountKnowledge.sections.some((s) => (s.narrative || []).some((p) => /ordre de grandeur à confirmer/.test(p)) || (s.statements || []).some((st) => /ordre de grandeur à confirmer/.test(st.text))))
  check("Un statement vidé par le retrait de phrase disparaît au lieu de survivre en moignon", compStatements.every((s) => s.text.trim().length > 0))

  // ── Lot 0 — INV-1 : un seau interne n'ancre ni `established` ni `declared` ──
  const folioBacked = compStatements.find((s) => /partenariat stratégique/.test(s.text))
  check("INV-1 : un `declared` adossé au seul seau FOLIO est rétrogradé", folioBacked && folioBacked.qualification === "inferred" && guarded.qaFlags.some((f) => f.check === "internal_only_anchor"))
  check("INV-1 : un `established` cite toujours au moins une source externe", guarded.accountKnowledge.sections.every((s) => (s.statements || []).every((st) => st.qualification !== "established" || st.source_refs.some((id) => !String(id).startsWith("internal:")))))

  // ── Lot 0 — A2 : l'ancrage vit dans l'artefact ──
  const anchoring = guarded.accountKnowledge.anchoring
  check("L'artefact porte un bloc anchoring complet", Boolean(anchoring) && ["external_documents_used", "statements_total", "statements_externally_anchored", "anchoring_ratio", "research_status"].every((k) => k in anchoring))
  check("anchoring_ratio est cohérent avec ses compteurs", anchoring.statements_externally_anchored <= anchoring.statements_total && anchoring.anchoring_ratio >= 0 && anchoring.anchoring_ratio <= 1)
  check("research_status prend une des trois valeurs du contrat", ["nominal", "degraded", "internal_only"].includes(anchoring.research_status))
  check("Les statements ancrés ne comptent que les sources externes", anchoring.statements_externally_anchored === guarded.accountKnowledge.sections.flatMap((s) => s.statements).filter((st) => st.source_refs.some((id) => !String(id).startsWith("internal:"))).length)
  check("Un qaFlag anchoring est émis", guarded.qaFlags.some((f) => f.check === "anchoring"))
  await runCode("V4 Validate Artifact", full)
  check("Artefact gardé passe le validateur n8n V4", full["V4 Validate Artifact"].accountKnowledge.schema_version === 4)
  await runCode("V4 Prepare Callback", full)
  const callback = JSON.parse(full["V4 Prepare Callback"].rawBody)
  check("Callback porte entityResolution et QA dédiée", callback.contextSnapshot.entityResolution.siren === "415550110" && callback.qaFlags.some((f) => f.check === "entity_resolution" && f.passed))
  check("Callback annonce un seul appel LLM", callback.qaFlags.some((f) => f.check === "single_llm_call" && f.passed))
  check("sourceRefs callback ne contient que des UUID persistés", callback.sourceRefs.every((r) => /^[0-9a-f-]{36}$/i.test(r.entityId)))

  // ── Lot 0.7 — consommation du corpus approuvé ──
  //
  // Les « 7 exigences » historiques (sélection, site officiel prioritaire,
  // déduplication, SSRF, échec partiel, mode dégradé, diagnostic) portaient sur un
  // fetch qui n'existe plus ici. Leur couverture n'est pas perdue : elle a MIGRÉ vers
  // `intel-035-account-source-preflight.test.js`, où le fetch vit désormais.

  const corpusRegistry = {}
  await prepareAndResolve(corpusRegistry)
  await runCode("V4 Normalize Source Documents", corpusRegistry, {}, documentRows())
  const corpus = corpusRegistry["V4 Normalize Source Documents"]

  check("Les documents du corpus prennent la forme attendue par le catalogue",
    corpus.fetchedPages.length === 2 &&
    corpus.fetchedPages.every((p) => p.link && p.title && p.text && p.consulted_at))
  check("Chaque page conserve l'identifiant du document dont elle provient",
    corpus.fetchedPages.every((p) => [DOC_A, DOC_B].includes(p.document_id)))
  check("Le diagnostic de corpus compte demandés et chargés",
    corpus.corpusDiagnostics.requested === 2 && corpus.corpusDiagnostics.loaded === 2 &&
    corpus.corpusDiagnostics.missing.length === 0)
  check("La politique de sources est transmise à l'aval",
    corpus.corpusDiagnostics.sourcePolicy === "approved_only")

  // Un document approuvé introuvable en base est une anomalie de cohérence, pas un
  // échec de collecte : il est tracé, jamais silencieux.
  const partialRegistry = {}
  await prepareAndResolve(partialRegistry)
  await runCode("V4 Normalize Source Documents", partialRegistry, {}, [documentRows()[0]])
  check("Un document approuvé absent de la base est tracé comme manquant",
    partialRegistry["V4 Normalize Source Documents"].corpusDiagnostics.missing.length === 1 &&
    partialRegistry["V4 Normalize Source Documents"].corpusDiagnostics.missing[0] === DOC_B)

  // Une ligne `unreachable` ou sans texte ne devient JAMAIS de la matière d'analyse.
  const dirtyRegistry = {}
  await prepareAndResolve(dirtyRegistry)
  await runCode("V4 Normalize Source Documents", dirtyRegistry, {}, [
    { id: DOC_A, url: "https://ko.fr", status: "unreachable", extracted_text: null },
    { id: DOC_B, url: "https://vide.fr", status: "retrieved", extracted_text: null },
  ])
  check("Un document injoignable ou vide n'entre pas dans la matière d'analyse",
    dirtyRegistry["V4 Normalize Source Documents"].fetchedPages.length === 0)

  // A2 — corpus vide : `internal_only`, jamais un rapport qui prétend avoir cherché.
  const noCorpusRegistry = {}
  noCorpusRegistry["Validate Entity"] = upstream({ sourceDocumentIds: [] })
  noCorpusRegistry["Hydrate Context"] = context()
  await runCode("V4 Prepare Dossier", noCorpusRegistry)
  httpResponder = async (options) => /Tournaire%20SA|Groupe/.test(options.url) ? { results: [RIGHT, WRONG] } : { results: [WRONG] }
  await runCode("V4 Resolve Entity", noCorpusRegistry)
  await runCode("V4 Normalize Source Documents", noCorpusRegistry, {}, [])
  const noCorpus = noCorpusRegistry["V4 Normalize Source Documents"]
  check("Corpus vide : aucune page, aucune sélection annoncée",
    noCorpus.fetchedPages.length === 0 && noCorpus.selectedPages.length === 0)

  noCorpusRegistry["V4 Validate Artifact"] = { ...noCorpus, accountKnowledge: llmArtifact("source-1") }
  const noCorpusCallback = await runCode("V4 Prepare Callback", noCorpusRegistry)
  check("A2 — corpus vide produit `internal_only`, jamais `nominal`",
    noCorpusCallback[0].json.rawBody.includes('"externalResearchStatus":"internal_only"'))

  // Corpus demandé mais rien de chargé : c'est `degraded`, à distinguer d'`internal_only`.
  const degradedRegistry = {}
  await prepareAndResolve(degradedRegistry)
  await runCode("V4 Normalize Source Documents", degradedRegistry, {}, [])
  degradedRegistry["V4 Validate Artifact"] = {
    ...degradedRegistry["V4 Normalize Source Documents"],
    accountKnowledge: llmArtifact("source-1"),
  }
  const degradedCallback = await runCode("V4 Prepare Callback", degradedRegistry)
  check("Corpus attendu mais vide : `external_research_degraded`, pas `internal_only`",
    degradedCallback[0].json.rawBody.includes('"externalResearchStatus":"external_research_degraded"'))

  check("Le callback porte les diagnostics de corpus, plus ceux d'un fetch disparu",
    JSON.parse(degradedCallback[0].json.rawBody).contextSnapshot.corpusDiagnostics !== undefined &&
    JSON.parse(degradedCallback[0].json.rawBody).contextSnapshot.urlSelectionDiagnostics === null)


  const v4WithErrors = workflow.nodes.filter((n) => n.name.startsWith("V4 ") && n.onError === "continueErrorOutput")
  const missingFailure = v4WithErrors.filter((n) => !((workflow.connections[n.name] || {}).main || [])[1]?.some((c) => c.node === "Prepare Failure Callback"))
  check("Toutes les sorties d'erreur V4 rejoignent le callback d'échec", missingFailure.length === 0, missingFailure.map((n) => n.name).join(", "))

  console.log(`\n${passed} assertions réussies, ${failed} échec(s).`)
  if (failed) process.exit(1)
}

main().catch((error) => { console.error(error); process.exit(1) })
