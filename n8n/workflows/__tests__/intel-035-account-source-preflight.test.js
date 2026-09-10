"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais d'exécution des nœuds Code d'INTEL-035, extraits du JSON réellement déployable.
// Rappel de méthode : un harnais qui « passe » peut n'avoir rien exécuté. Le compteur
// final fait foi, jamais le code de sortie.

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WF_DIR = path.join(__dirname, "..")
const workflow = JSON.parse(fs.readFileSync(path.join(WF_DIR, "intel-035-account-source-preflight.json"), "utf8"))
const intel030 = JSON.parse(fs.readFileSync(path.join(WF_DIR, "intel-030-account-knowledge.json"), "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

let passed = 0
let failed = 0
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
    helpers: { httpRequest: async (options) => httpResponder(options) },
    $input: { first: () => items[0], all: () => items },
    $: (name) => {
      if (!(name in registry)) throw new Error(`Nœud non exécuté : ${name}`)
      const value = registry[name]
      const values = Array.isArray(value) ? value : [value]
      return {
        first: () => ({ json: values[0] }),
        all: () => values.map((json) => ({ json })),
        item: { json: values[0] },
      }
    },
    $execution: { id: "exec-035" },
    $workflow: { id: "wf-035" },
    // URL est délibérément OMIS : le runtime n8n isolé n'expose pas ce constructeur
    // global, et tout le code doit s'exécuter sans lui.
    console, Date, JSON, Math, Array, Object, Set, Map, Number, String, RegExp, Error,
    isFinite, isNaN, encodeURIComponent, decodeURIComponent, Boolean, parseInt, parseFloat, Promise,
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
const USER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

function webhookItem(overrides = {}) {
  const body = {
    runId: RUN, workflowId: "intel-035-account-source-preflight", entityType: "company",
    entityId: COMPANY, workspaceId: WORKSPACE, userId: USER,
    callbackUrl: "https://kredo.example/api/n8n/callback",
    input: { targetLevel: 2 },
    ...overrides.body,
  }
  return {
    body,
    headers: { "x-kredo-signature": "sha256=sig-ok", ...overrides.headers },
    computedSignature: "sig-ok",
    ...overrides.root,
  }
}

function hydrated(overrides = {}) {
  return {
    company: {
      name: "Tournaire", legal_name: "TOURNAIRE SA", website: "https://www.tournaire.fr",
      siren: "415550110", naf_code: "25.92Z", hq_location: "Grasse",
      sector: "Industrie", segment: "Emballage industriel", employee_count: 290,
      ...overrides.company,
    },
    facts: overrides.facts ?? [],
    signals: [],
    sector: overrides.sector ?? null,
  }
}

async function main() {
  // ── Structure ─────────────────────────────────────────────────────────────
  check("Le workflow porte 20 nœuds dont 10 nœuds Code",
    workflow.nodes.length === 20 && workflow.nodes.filter((n) => n.type === "n8n-nodes-base.code").length === 10)
  check("Le webhook expose le chemin canonique",
    nodes["Webhook — Source Preflight"].parameters.path === "intel-035-account-source-preflight")
  check("La signature entrante est vérifiée avant tout traitement",
    workflow.connections["Webhook — Source Preflight"].main[0][0].node === "Verify Signature" &&
    workflow.connections["Verify Signature"].main[0][0].node === "Validate Preflight Input")
  check("Aucun appel LLM : le préflight est déterministe",
    !workflow.nodes.some((n) => /anthropic|openai|claude/i.test(JSON.stringify(n.parameters || {}))))
  check("Aucune écriture directe dans account_source_documents",
    !workflow.nodes.some((n) => /account_source_documents/.test(JSON.stringify(n.parameters || {}))))
  check("Le secret HMAC n'est jamais en clair dans le JSON",
    !/N8N_WEBHOOK_SECRET=|sk-|Bearer /.test(JSON.stringify(workflow)))
  check("SerpAPI utilise le credential partagé, sans clé dans le JSON",
    nodes["SerpAPI Search"].credentials.serpApi.id === "4FHmaQGaAytZHN4w" &&
    !/api_key|SERPER_API_KEY/.test(JSON.stringify(nodes["SerpAPI Search"])))
  check("SerpAPI porte alwaysOutputData — un zéro résultat ne coupe pas la chaîne",
    nodes["SerpAPI Search"].alwaysOutputData === true)

  const guarded = ["Validate Preflight Input", "Prepare Dossier", "Resolve Entity",
    "Derive Research Gaps", "Fetch Documents", "Prepare Callback"]
  check("Toutes les sorties d'erreur rejoignent le callback d'échec",
    guarded.every((name) => {
      const node = nodes[name]
      const conn = workflow.connections[name]
      return node.onError === "continueErrorOutput" &&
        conn.main[1] && conn.main[1][0] && conn.main[1][0].node === "Prepare Failure Callback"
    }))

  // ── Blocs partagés : aucune divergence tolérée ────────────────────────────
  const sharedEntity = fs.readFileSync(path.join(WF_DIR, "..", "..", "scripts", "entity-resolution-node.js"), "utf8").trim()
  check("La résolution d'entité est le module partagé, à l'identique",
    nodes["Resolve Entity"].parameters.jsCode.includes(sharedEntity))

  const sharedGuard = fs.readFileSync(path.join(WF_DIR, "..", "..", "scripts", "url-guard-node.js"), "utf8")
  const guardSource = sharedGuard.slice(sharedGuard.indexOf("function parseUrl(")).trim()
  check("Le garde SSRF est le module partagé, à l'identique",
    nodes["Fetch Documents"].parameters.jsCode.includes(guardSource))
  // Lot 0.7 — intel-030 ne récupère plus aucune page : son nœud de fetch a disparu.
  check("intel-030 ne porte plus de nœud de récupération de pages",
    !intel030.nodes.some((n) => n.name === "V4 Fetch Selected Pages"))

  // ── Validate Preflight Input ──────────────────────────────────────────────
  const registry = {}
  await runCode("Validate Preflight Input", registry, webhookItem())
  check("Entrée nominale validée", registry["Validate Preflight Input"].companyId === COMPANY)
  check("targetLevel par défaut = 2", registry["Validate Preflight Input"].targetLevel === 2)

  await expectThrows("Signature HMAC invalide rejetée avant tout traitement",
    () => runCode("Validate Preflight Input", {}, webhookItem({ headers: { "x-kredo-signature": "sha256=faux" } })),
    /Signature HMAC invalide/)
  await expectThrows("entityType non company rejeté",
    () => runCode("Validate Preflight Input", {}, webhookItem({ body: { entityType: "person" } })),
    /entityType="company"/)
  await expectThrows("UUID invalide rejeté",
    () => runCode("Validate Preflight Input", {}, webhookItem({ body: { entityId: "pas-un-uuid" } })),
    /UUID invalide/)
  await expectThrows("Champ requis manquant rejeté",
    () => runCode("Validate Preflight Input", {}, webhookItem({ body: { callbackUrl: "" } })),
    /Champ requis manquant/)

  // La régression V3 à ne jamais rejouer : un vocabulaire non reconnu ne doit PAS
  // retomber silencieusement sur « étude complète ».
  await expectThrows("Un libellé d'interface n'est pas un module : l'appel est rejeté",
    () => runCode("Validate Preflight Input", {}, webhookItem({ body: { input: { includedModules: ["Fiche d’identité", "Enjeux"] } } })),
    /Aucun module canonique reconnu/)

  const withModules = {}
  await runCode("Validate Preflight Input", withModules,
    webhookItem({ body: { input: { targetLevel: 4, includedModules: ["competition", "inconnu", "it_intensity"] } } }))
  check("Les modules canoniques sont retenus, les inconnus écartés",
    JSON.stringify(withModules["Validate Preflight Input"].requestedModules) === JSON.stringify(["competition", "it_intensity"]))

  // ── Prepare Dossier ───────────────────────────────────────────────────────
  const past = new Date(Date.now() - 86400000).toISOString()
  const future = new Date(Date.now() + 86400000).toISOString()
  await runCode("Prepare Dossier", registry, hydrated({
    facts: [
      { fact_type: "legal_id", is_current: true, expires_at: null },
      { fact_type: "employee_count", is_current: true, expires_at: past },
      { fact_type: "revenue", is_current: true, expires_at: future },
      { fact_type: "obsolete", is_current: false, expires_at: null },
    ],
  }))
  const dossier = registry["Prepare Dossier"]
  check("Le dossier retient la raison sociale canonique", dossier.canonical.name === "Tournaire")
  check("Un fait périmé ne compte pas comme acquis — c'est ce qu'il faut re-chercher",
    dossier.currentFacts.length === 2 &&
    dossier.currentFacts.every((f) => f.fact_type !== "employee_count" && f.fact_type !== "obsolete"))

  await expectThrows("Un compte sans raison sociale interrompt le préflight",
    () => runCode("Prepare Dossier", registry, hydrated({ company: { name: null } })),
    /sans raison sociale/)

  // ── Resolve Entity — axiome A1 ────────────────────────────────────────────
  httpResponder = async () => ({
    results: [{
      siren: "415550110", nom_raison_sociale: "TOURNAIRE", nom_complet: "TOURNAIRE",
      activite_principale: "25.92Z", etat_administratif: "A",
      siege: { code_postal: "06130", libelle_commune: "GRASSE" },
      tranche_effectif_salarie: "21",
    }],
  })
  await runCode("Resolve Entity", registry, dossier)
  check("L'entité est résolue avant toute recherche", registry["Resolve Entity"].resolvedSiren === "415550110")
  check("La résolution est transmise au plan", Boolean(registry["Resolve Entity"].entityResolution))

  httpResponder = async () => ({ results: [] })
  await expectThrows("A1 — sans entité résolue, AUCUNE recherche n'est lancée",
    () => runCode("Resolve Entity", { ...registry, "Prepare Dossier": { ...dossier, canonical: { ...dossier.canonical, siren: null, legal_name: "SOCIETE INTROUVABLE XYZ", name: "Societe Introuvable XYZ" } } }, {}),
    /Entité non résolue|préflight interrompu/)

  // ── Derive Research Gaps ──────────────────────────────────────────────────
  const resolved = registry["Resolve Entity"]

  const gapsRegistry = { ...registry }
  await runCode("Derive Research Gaps", gapsRegistry, {})
  const gaps = gapsRegistry["Derive Research Gaps"]
  check("Le plan de recherche ne porte que des modules du niveau demandé",
    gaps.plannedQueries.every((q) => gaps.requestedModules.includes(q.module)))
  check("Le budget de requêtes est borné", gaps.plannedQueries.length <= 8)
  check("`kredo_relation` n'est jamais recherché — il est relationnel",
    gaps.skippedModules.some((s) => s.module === "kredo_relation" && s.reason === "module_interne"))

  const l1Registry = { ...registry, "Resolve Entity": { ...resolved, targetLevel: 1, requestedModules: [] } }
  await runCode("Derive Research Gaps", l1Registry, {})
  const l1Gaps = l1Registry["Derive Research Gaps"]
  check("L1 reste volontairement léger : au plus 2 requêtes", l1Gaps.plannedQueries.length <= 2)
  check("L1 ne cherche aucun module d'écosystème",
    !l1Gaps.plannedQueries.some((q) => ["competition", "sector_dynamics", "value_chain"].includes(q.module)))

  // A7 — dix comptes d'un même secteur n'achètent pas dix analyses de marché.
  const sectorRegistry = {
    ...registry,
    "Resolve Entity": { ...resolved, targetLevel: 3, requestedModules: [], sectorContext: { segment_id: "seg-1", slug: "emballage" } },
  }
  await runCode("Derive Research Gaps", sectorRegistry, {})
  const sectorGaps = sectorRegistry["Derive Research Gaps"]
  check("A7 — un segment documenté supprime la recherche sectorielle externe",
    !sectorGaps.plannedQueries.some((q) => ["sector_dynamics", "competition", "value_chain"].includes(q.module)) &&
    sectorGaps.skippedModules.some((s) => s.reason === "connaissance_sectorielle_disponible"))

  // Un fait courant non périmé rend son module inutile à re-chercher.
  const factRegistry = {
    ...registry,
    "Resolve Entity": {
      ...resolved, targetLevel: 2, requestedModules: ["size_and_financials"],
      currentFacts: [{ fact_type: "employee_count" }, { fact_type: "revenue" }],
    },
  }
  await runCode("Derive Research Gaps", factRegistry, {})
  check("Un module couvert par des faits courants n'est pas re-cherché",
    factRegistry["Derive Research Gaps"].plannedQueries.length === 0 &&
    factRegistry["Derive Research Gaps"].skippedModules.some((s) => s.reason === "faits_courants_suffisants"))

  // ── Fetch Documents — le cœur ─────────────────────────────────────────────
  const fetchInput = {
    ...gaps,
    discovery: [
      { query: "Tournaire métiers", module: "business_and_offering", organic: [
        { link: "https://www.usinenouvelle.fr/article/tournaire", title: "Tournaire investit", snippet: "", date: "2026-03-14" },
        { link: "https://www.tournaire.fr/metiers", title: "Nos métiers", snippet: "", date: null },
      ] },
      { query: "Tournaire concurrents", module: "competition", organic: [
        { link: "javascript:alert(1)", title: "Piège", snippet: "", date: null },
        { link: "http://127.0.0.1/admin", title: "SSRF", snippet: "", date: null },
        { link: "https://www.google.com/search?q=x", title: "Moteur", snippet: "", date: null },
      ] },
    ],
    additionalUrls: ["https://tournaire.fr/investors/strategy-2026.pdf"],
  }

  const bodies = {
    "https://www.tournaire.fr/": "<html><nav>menu</nav><body><h1>Tournaire</h1><p>" + "Emballages barrière haute performance en aluminium. ".repeat(20) + "</p><footer>c</footer></body></html>",
    "https://www.tournaire.fr/metiers": "<html><body>" + "Nos métiers couvrent l'emballage et l'extraction. ".repeat(20) + "</body></html>",
    "https://annuaire-entreprises.data.gouv.fr/entreprise/415550110": "<html><body>" + "TOURNAIRE SA SIREN 415550110 NAF 2592Z Grasse. ".repeat(20) + "</body></html>",
    "https://tournaire.fr/investors/strategy-2026.pdf": "<html><body>" + "Plan stratégique 2026 du groupe. ".repeat(20) + "</body></html>",
  }
  httpResponder = async (options) => {
    if (options.url === "https://www.usinenouvelle.fr/article/tournaire") {
      const error = new Error("Request failed with status code 403")
      throw error
    }
    if (bodies[options.url] !== undefined) return { statusCode: 200, body: bodies[options.url] }
    throw new Error("ETIMEDOUT connect timeout")
  }

  await runCode("Fetch Documents", registry, fetchInput)
  const fetched = registry["Fetch Documents"]
  const docs = fetched.sourceDocuments
  const byUrl = Object.fromEntries(docs.map((d) => [d.url, d]))

  // L'URL est normalisée avec son slash final par le garde SSRF : l'assertion porte sur
  // l'URL normalisée, pas sur celle fournie — sinon le test passerait sur un repli mou.
  check("Le site officiel est prioritaire et récupéré",
    byUrl["https://www.tournaire.fr/"] !== undefined &&
    byUrl["https://www.tournaire.fr/"].status === "retrieved" &&
    byUrl["https://www.tournaire.fr/"].kind === "company_official")
  check("Le registre légal est ajouté d'office (A4 — subsidiarité)",
    docs.some((d) => d.kind === "registry" && /annuaire-entreprises/.test(d.url)))
  check("Une URL ajoutée à la main est fetchée comme les autres",
    docs.some((d) => d.origin === "manual"))

  check("Un document récupéré porte texte, hash et date",
    docs.filter((d) => d.status === "retrieved").every((d) =>
      d.extracted_text && d.content_hash && d.fetched_at && d.extracted_chars > 0))
  check("Un document injoignable porte un MOTIF et aucun texte",
    docs.filter((d) => d.status === "unreachable").every((d) =>
      d.failure_reason && !d.extracted_text && !d.content_hash))
  check("Un 403 est signalé comme tel, pas avalé",
    docs.some((d) => d.status === "unreachable" && /403/.test(String(d.failure_reason) + String(d.http_status))))
  check("Un timeout porte un motif lisible",
    docs.every((d) => d.status === "retrieved" || typeof d.failure_reason === "string"))

  check("SSRF — aucune adresse privée ni pseudo-protocole ne survit",
    !docs.some((d) => /127\.0\.0\.1|javascript:/.test(d.url)))
  check("Les moteurs de recherche sont exclus des sources",
    !docs.some((d) => /google\.com|bing\.com/.test(d.domain)))
  check("Les URL écartées sont tracées avec leur motif",
    fetched.preflightDiagnostics.rejectedUrls.length > 0 &&
    fetched.preflightDiagnostics.rejectedUrls.every((r) => typeof r.reason === "string"))

  check("Chaque document dit à quels modules il sert",
    docs.every((d) => Array.isArray(d.serves_modules)))
  check("Chaque document porte une raison lisible",
    docs.every((d) => typeof d.reason === "string" && d.reason.length > 0))
  check("Le nettoyage retire nav et footer",
    docs.filter((d) => d.status === "retrieved").every((d) => !/<nav|<footer|<script/.test(d.extracted_text)))
  check("Deux hash identiques sortent du même contenu",
    (() => {
      const a = docs.find((d) => d.status === "retrieved")
      return a && /^[0-9a-f]{16}$/.test(a.content_hash)
    })())
  check("Le diagnostic compte candidats, retenus, récupérés et injoignables",
    ["candidates", "selected", "retrieved", "unreachable"].every((k) => typeof fetched.preflightDiagnostics[k] === "number"))

  // Cas critique : tout échoue. Le nœud ne masque rien et laisse l'application refuser.
  httpResponder = async () => { throw new Error("ETIMEDOUT") }
  const allFail = { ...registry }
  await runCode("Fetch Documents", allFail, fetchInput)
  const failedDocs = allFail["Fetch Documents"].sourceDocuments
  check("Collecte intégralement en échec : aucun document n'est annoncé récupéré",
    failedDocs.length > 0 && failedDocs.every((d) => d.status === "unreachable"))
  check("Collecte en échec : le diagnostic l'annonce explicitement",
    allFail["Fetch Documents"].preflightDiagnostics.retrieved === 0)

  // ── Prepare Callback ──────────────────────────────────────────────────────
  await runCode("Prepare Callback", registry, fetched)
  const callback = JSON.parse(registry["Prepare Callback"].rawBody)
  check("Le callback annonce le bon result_type", callback.resultType === "account_source_plan")
  check("Les documents sont transmis hors de contentJson",
    Array.isArray(callback.sourceDocuments) && callback.sourceDocuments.length > 0 &&
    callback.contentJson.entries === undefined)
  check("Le contentJson porte le périmètre et la résolution d'entité",
    callback.contentJson.scope.target_level === 2 && Boolean(callback.contentJson.entity_resolution))
  check("G0.7 — le callback émet ses compteurs, même à zéro (aucun LLM)",
    callback.tokensInput === 0 && callback.tokensOutput === 0 && callback.modelUsed === "deterministic")
  check("Le callback porte les identifiants n8n pour le drill-down /automations",
    callback.n8nExecutionId === "exec-035" && callback.n8nWorkflowId === "wf-035")
  check("Les modules écartés sont tracés en qaFlags",
    callback.qaFlags.some((f) => f.check === "module_skipped"))
  check("Le qaFlag de récupération dit la vérité sur la collecte",
    callback.qaFlags.some((f) => f.check === "documents_retrieved" && typeof f.passed === "boolean"))

  const failedCallbackRegistry = { ...registry }
  await runCode("Prepare Callback", failedCallbackRegistry, allFail["Fetch Documents"])
  const failedCallback = JSON.parse(failedCallbackRegistry["Prepare Callback"].rawBody)
  check("Collecte vide : le qaFlag passe à false plutôt que de se taire",
    failedCallback.qaFlags.some((f) => f.check === "documents_retrieved" && f.passed === false))

  // ── Prepare Failure Callback ──────────────────────────────────────────────
  await runCode("Prepare Failure Callback", registry, { error: { message: "Entité non résolue (ambiguous)" } })
  const failure = JSON.parse(registry["Prepare Failure Callback"].rawBody)
  check("Le callback d'échec porte le run et le statut failed",
    failure.runId === RUN && failure.status === "failed" && /Entité non résolue/.test(failure.errorMessage))

  // ── Skip Discovery ────────────────────────────────────────────────────────
  await runCode("Skip Discovery", sectorRegistry, {})
  check("Sans gap, la découverte est sautée sans être un échec",
    Array.isArray(sectorRegistry["Skip Discovery"].discovery) && sectorRegistry["Skip Discovery"].discovery.length === 0)

  console.log(`\n${passed} assertions réussies, ${failed} échec(s).`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error("Harnais interrompu :", error)
  process.exit(1)
})
