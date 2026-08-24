"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais d'exécution RÉELLE des nœuds Code de la branche V3 de
// intel-030-account-knowledge. Comme le harnais V2 voisin, les nœuds sont
// extraits du JSON source-controlled et exécutés dans un `vm` avec des mocks
// n8n : on teste le code qui partira sur le VPS, pas une réécriture.
//
//   node n8n/workflows/__tests__/intel-030-account-knowledge-v3.test.js

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

function makeSandbox(registry, items) {
  return {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      return { item: { json: registry[nodeName] }, first: () => ({ json: registry[nodeName] }) }
    },
    $execution: { id: "exec-v3" },
    $workflow: { id: "wf-030" },
    console, Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error,
    isFinite, encodeURIComponent, Boolean, parseInt, parseFloat,
  }
}

async function runCodeNode(name, registry, input, allInput) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  if (node.type !== "n8n-nodes-base.code") throw new Error(`Pas un nœud Code : ${name}`)
  const items = (allInput ?? [input ?? {}]).map((json) => ({ json }))
  const context = vm.createContext(makeSandbox(registry, items))
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
const FACT_SOURCE_ID = "44444444-4444-4444-8444-444444444444"
const SIGNAL_SOURCE_ID = "55555555-5555-4555-8555-555555555555"
const FOREIGN_SOURCE_ID = "99999999-9999-4999-8999-999999999999"
const SIGNAL_A = "a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1"
const SIGNAL_B = "b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2"
const SIGNAL_C = "c3c3c3c3-3333-4333-8333-c3c3c3c3c3c3"
const SIGNAL_D = "d4d4d4d4-4444-4444-8444-d4d4d4d4d4d4"

function validatedEntity(schemaVersion = 3) {
  return {
    runId: RUN,
    workflowId: "intel-030-account-knowledge",
    workspaceId: WORKSPACE,
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    companyId: COMPANY,
    callbackUrl: "https://kredo.example/api/n8n/callback",
    startedAtMs: Date.now() - 5000,
    accountKnowledgeSchemaVersion: schemaVersion,
  }
}

function rpcContext(overrides = {}) {
  return {
    company: {
      id: COMPANY, name: "Voyage Privé", legal_name: null, lifecycle_status: "client_actif",
      sector: "Services", sector_id: null, segment: "ETI", hq_location: "Aix-en-Provence",
      employee_count: 900, revenue: null, size_band: "501-1000", priority: "haute",
      description: null, website: "https://www.voyage-prive.com",
    },
    contacts: [{ id: CONTACT, full_name: "A. Dupont", job_title: "DSI", relationship_role: "dsi" }],
    recentInteractions: [{ id: "i1", type: "email", occurred_at: "2026-07-01T10:00:00Z" }],
    opportunities: [{ id: "o1", title: "Refonte data", stage: "qualification" }],
    missions: [{ id: "m1", title: "Data platform", practice: "Data", status: "active" }],
    signals: [
      { id: SIGNAL_A, primary_source_id: SIGNAL_SOURCE_ID, title: "Levée de fonds", summary: "Tour de table", relevance_score: 0.9, urgency_score: 0.7, confidence_score: 0.8, detected_at: "2026-07-20T00:00:00Z", expires_at: null },
      { id: SIGNAL_B, primary_source_id: null, title: "Recrutements data", summary: "Postes ouverts", relevance_score: 0.6, urgency_score: 0.4, confidence_score: 0.7, detected_at: "2026-07-15T00:00:00Z", expires_at: null },
      { id: SIGNAL_C, primary_source_id: null, title: "Nouveau DSI", summary: "Nomination", relevance_score: 0.5, urgency_score: 0.3, confidence_score: 0.6, detected_at: "2026-07-10T00:00:00Z", expires_at: null },
      { id: SIGNAL_D, primary_source_id: null, title: "Signal faible", summary: "Rumeur", relevance_score: 0.2, urgency_score: 0.1, confidence_score: 0.3, detected_at: "2026-07-05T00:00:00Z", expires_at: null },
    ],
    accountFacts: [{ id: "f1", fact_type: "legal_name", verified_at: "2026-06-01T00:00:00Z", value_text: "VOYAGE PRIVE", primary_source_id: FACT_SOURCE_ID }],
    factSources: [{ id: FACT_SOURCE_ID, source_type: "regulatory_filing", source_name: "Atout France — immatriculation", canonical_url: "https://atout-france.fr/x", source_url: "https://atout-france.fr/x", published_at: null, evidence_excerpt: "Immatriculation IM013..." }],
    factSourceLinks: [],
    folioAnalysisData: { identite: { ca_estime: "300 M€" } },
    folioSectorAnalysis: null,
    processDiagnostic: null,
    dataCutoffAt: "2026-08-05T00:00:00Z",
    ...overrides,
  }
}

const SITE_BODY = "<html><head><script>alert(1)</script></head><body>" +
  "Voyage Prive est le specialiste de la vente privee de voyages haut de gamme. " +
  "Nous proposons des sejours exclusifs negocies aupres d hotels de luxe en France et en Europe. " +
  "Notre raison d etre : rendre le luxe accessible au plus grand nombre. </body></html>"

const REGISTRY_BODY = {
  results: [{
    siren: "344962102", nom_raison_sociale: "VOYAGE PRIVE", nom_complet: "VOYAGE PRIVE",
    activite_principale: "79.11Z", libelle_activite_principale: "Activites des agences de voyage",
    date_mise_a_jour: "2026-01-01",
    siege: { libelle_commune: "AIX EN PROVENCE", code_postal: "13100" },
    tranche_effectif_salarie: "32",
  }],
}

const NEWS_BODY = "<rss><channel>" +
  "<item><title>Voyage Prive leve 100 millions d euros</title><link>https://www.lesechos.fr/voyage-prive-levee</link><pubDate>Mon, 20 Jul 2026 08:00:00 GMT</pubDate></item>" +
  "<item><title>Voyage Prive nomme un nouveau DSI</title><link>https://www.usine-digitale.fr/voyage-prive-dsi</link><pubDate>Fri, 10 Jul 2026 08:00:00 GMT</pubDate></item>" +
  "</channel></rss>"

function llmDraftResponse(artifact) {
  return { content: [{ type: "text", text: JSON.stringify(artifact) }], usage: { input_tokens: 2000, output_tokens: 1500 }, model: "claude-sonnet-5" }
}
function llmVerifyResponse(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj) }], usage: { input_tokens: 1200, output_tokens: 600 }, model: "claude-sonnet-5" }
}

function v3c(text, refs, nature = "fact", attribution = "independent") {
  return { text, nature, attribution, source_refs: refs, confidence: 0.8, verified_at: null }
}

// Brouillon V3 représentatif : toutes les sources citées appartiennent au
// catalogue résolu de la chaîne (CRM/site/registre/presse/fait/signal).
function draftArtifact(cat) {
  const { crm, site, registry, press, fact, signal } = cat
  return {
    schema_version: 3,
    account_summary: v3c("Voyage Prive, acteur du voyage premium en ligne, s appuie sur un modele de ventes privees.", [crm], "analysis"),
    identity: {
      company_name: v3c("Voyage Prive", [registry]),
      legal_name: null,
      primary_activity: v3c("Vente privee de voyages haut de gamme", [site]),
      headquarters: v3c("Aix-en-Provence", [registry]),
      sector: null, business_segment: null, revenue: null, employee_count: null,
      geographic_reach: [v3c("Presence en France et en Europe", [site])],
      dynamic: null,
    },
    market_positioning: {
      account_positioning: v3c("Positionne sur le voyage premium en ligne", [site]),
      competitive_environment: null,
      direct_competitors: [v3c("Secret Escapes cite comme comparable dans la presse", [press])],
      competitive_advantages: [], opportunities: [], threats: [],
      policy_and_ambitions: {
        purpose: v3c("« Rendre le luxe accessible » selon sa communication institutionnelle", [site], "fact", "institutional"),
        philosophy: null,
        culture: [],
        public_statements: [v3c("L entreprise declare viser l excellence de service", [site], "fact", "institutional")],
        ambitions: [], strategic_axes: [], leadership_posture: [], claimed_identity: null,
      },
    },
    offers_and_customers: {
      core_business: v3c("Ventes flash de sejours haut de gamme", [site]),
      offers: [], covered_domains: [], services: [], service_models: [], complementary_activities: [],
      uncovered_activities: [v3c("aucune offre publique identifiee sur la billetterie seche", [site], "analysis")],
      customer_profile: null, customer_segments: [], segment_weights: [], behavioral_trends: [], unmet_needs: [],
    },
    value_chain: {
      description: null,
      value_proposition: v3c("Acces exclusif a des offres negociees", [site], "analysis"),
      key_links: [], critical_partners_or_suppliers: [], dependencies: [], vulnerabilities: [], end_customer_relationship: null,
    },
    regulatory_environment: {
      current_regulations: [v3c("Immatriculation Atout France requise pour la vente de voyages", [fact])],
      required_certifications: [], compliance_risks: [],
    },
    trends_and_news: {
      analysis: v3c("Les signaux recents pointent une dynamique d investissement produit et de renforcement data.", [signal], "analysis"),
    },
  }
}

// Fait tourner la chaîne V3 jusqu'à "V3 Assemble Draft Prompt" inclus et rend
// le registre + le catalogue de source_id résolus.
async function runUpToDraftPrompt(registry, ctxOverrides = {}, fetchOverrides = {}) {
  registry["Validate Entity"] = validatedEntity(3)
  registry["Hydrate Context"] = rpcContext(ctxOverrides)

  await runCodeNode("V3 Prepare Context & Research Plan", registry, {})

  registry["V3 Fetch Official Site"] = fetchOverrides.site ?? { statusCode: 200, body: SITE_BODY }
  registry["V3 Fetch Public Registry"] = fetchOverrides.registry ?? { statusCode: 200, body: REGISTRY_BODY }
  registry["V3 Fetch Company News"] = fetchOverrides.news ?? { statusCode: 200, body: NEWS_BODY }

  await runCodeNode("V3 Consult & Normalize Sources", registry, {})
  await runCodeNode("V3 Build Source Catalogue", registry, {})

  // Résolution des source_id : une ligne par source_key produit par le catalogue.
  const cat = registry["V3 Build Source Catalogue"]
  const resolvedRows = cat.sourceKeys.map((key, i) => {
    let id = "70000000-0000-4000-8000-0000000000" + String(10 + i)
    if (key === `account_knowledge:crm:${COMPANY}`) id = CRM_SOURCE_ID
    return { id, source_key: key, source_type: "x", source_name: "src", canonical_url: null, source_url: null, published_at: null, reliability_score: 0.7 }
  })
  await runCodeNode("V3 Assemble Draft Prompt", registry, {}, resolvedRows)

  // Mappe kind d'évidence -> source_id résolu, pour construire un brouillon citable.
  const keyToId = new Map(resolvedRows.map((r) => [r.source_key, r.id]))
  const ev = registry["V3 Consult & Normalize Sources"].externalEvidence
  const idFor = (kind) => { const e = ev.find((x) => x.kind === kind); return e ? keyToId.get(e.sourceKey) : null }
  return {
    crm: CRM_SOURCE_ID,
    site: idFor("official_site"),
    registry: idFor("registry"),
    press: idFor("press"),
    fact: FACT_SOURCE_ID,
    signal: SIGNAL_SOURCE_ID,
  }
}

// Construit la réponse de vérification à partir des vrais chemins du brouillon
// parsé (robuste aux évolutions du brouillon). `verdictFor(path)` decide.
function buildVerifyResponse(registry, verdictFor) {
  const claims = registry["V3 Parse Draft"].draftClaimsForVerify
  return {
    verifications: claims.map((c) => {
      const verdict = verdictFor(c.claim_path)
      return {
        claim_path: c.claim_path,
        verdict,
        supporting_source_refs: verdict === "confirmed" ? [c.source_refs[0]] : [],
        contradicting_source_refs: verdict === "contradicted" ? [c.source_refs[0]] : [],
        rationale: null,
        checked_at: "2026-08-05T12:00:00Z",
      }
    }),
  }
}

async function main() {
  // ── 0. Discriminateur de version (Lot 4) ──────────────────────────────────
  // CORE-001 transporte les paramètres métier sous `body.input` : la lecture
  // racine seule rendait la branche V3 inatteignable depuis l'application.
  {
    const webhookItem = (bodyOverrides = {}) => ({
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
        ...bodyOverrides,
      },
    })

    const versionOf = async (bodyOverrides) => {
      const store = {}
      await runCodeNode("Validate Entity", store, webhookItem(bodyOverrides))
      return store["Validate Entity"].accountKnowledgeSchemaVersion
    }

    check("Version absente → V2 historique", (await versionOf({ input: {} })) === 2)
    check("Aucun champ input du tout → V2 historique", (await versionOf({})) === 2)
    check("input.accountKnowledgeSchemaVersion = 3 → V3",
      (await versionOf({ input: { accountKnowledgeSchemaVersion: 3 } })) === 3)
    check("input.accountKnowledgeSchemaVersion = 2 → V2",
      (await versionOf({ input: { accountKnowledgeSchemaVersion: 2 } })) === 2)
    check("Compatibilité temporaire : valeur à la racine encore acceptée",
      (await versionOf({ accountKnowledgeSchemaVersion: 3 })) === 3)
    check("input prime sur la racine en cas de divergence",
      (await versionOf({ accountKnowledgeSchemaVersion: 2, input: { accountKnowledgeSchemaVersion: 3 } })) === 3)
    await expectThrows(
      "Version explicite inconnue → rejet (jamais un repli silencieux sur V2)",
      () => versionOf({ input: { accountKnowledgeSchemaVersion: 4 } }),
      /Version AccountKnowledge non supportée/,
    )
    await expectThrows(
      "Version non numérique → rejet",
      () => versionOf({ input: { accountKnowledgeSchemaVersion: "latest" } }),
      /Version AccountKnowledge non supportée/,
    )
  }

  // ── 1. Chaîne complète, chemin nominal ────────────────────────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    check("Catalogue résout site/registre/presse réellement consultés",
      !!cat.site && !!cat.registry && !!cat.press,
      JSON.stringify(cat))

    const allowed = registry["V3 Assemble Draft Prompt"].allowedSourceIds
    check("allowedSourceIds inclut CRM + fait + signal", allowed.includes(CRM_SOURCE_ID) && allowed.includes(FACT_SOURCE_ID) && allowed.includes(SIGNAL_SOURCE_ID))

    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    check("Parse Draft catalogue 14 claims", registry["V3 Parse Draft"].draftClaimCount === 14, String(registry["V3 Parse Draft"].draftClaimCount))

    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    const verify = buildVerifyResponse(registry, () => "confirmed")
    await runCodeNode("V3 Parse Verification", registry, llmVerifyResponse(verify))
    await runCodeNode("V3 Assemble Artifact", registry, {})
    const assembled = registry["V3 Assemble Artifact"]
    check("Tous confirmés → 14 claims publiés", assembled.publishedClaimCount === 14, String(assembled.publishedClaimCount))
    check("14 résultats de vérification, un par claim", assembled.accountKnowledge.verification_results.length === 14)

    // Ne doit pas lever.
    let validated = null
    try { await runCodeNode("V3 Validate Artifact", registry, assembled); validated = registry["V3 Validate Artifact"] }
    catch (e) { validated = null; console.error("throw Validate:", e.message) }
    check("V3 Validate Artifact accepte l'artefact nominal", validated !== null)

    // ── Signaux plafonnés à 3 (4 en entrée) ────────────────────────────────
    const sigIds = assembled.accountKnowledge.trends_and_news.significant_signal_ids
    check("Au maximum 3 signaux significatifs", sigIds.length === 3, JSON.stringify(sigIds))
    check("Signaux uniques et triés par significativité (A en tête)", sigIds[0] === SIGNAL_A && new Set(sigIds).size === 3)

    // ── Locution d'absence prudente conservée ──────────────────────────────
    const uncovered = assembled.accountKnowledge.offers_and_customers.uncovered_activities
    check("Locution « aucune offre publique identifiée » conservée",
      uncovered.length === 1 && /aucune offre publique identifiee/.test(uncovered[0].text.toLowerCase()))

    // ── supporting_source_refs inclus dans les source_refs du claim ─────────
    const collect = collectPaths(assembled.accountKnowledge)
    const byPath = new Map(collect.map((e) => [e.path, e.claim]))
    let supportingOk = true
    for (const r of assembled.accountKnowledge.verification_results) {
      const claim = byPath.get(r.claim_path)
      for (const s of r.supporting_source_refs) if (!claim.source_refs.includes(s)) supportingOk = false
    }
    check("supporting_source_refs ⊆ source_refs du claim", supportingOk)
  }

  // ── 2. Filtrage : contredit exclu ─────────────────────────────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    const verify = buildVerifyResponse(registry, (p) => p === "$.identity.company_name" ? "contradicted" : "confirmed")
    await runCodeNode("V3 Parse Verification", registry, llmVerifyResponse(verify))
    await runCodeNode("V3 Assemble Artifact", registry, {})
    const ak = registry["V3 Assemble Artifact"].accountKnowledge
    check("Claim contredit exclu de l'artefact (identity.company_name = null)", ak.identity.company_name === null)
    check("Aucun verification_result pour le claim contredit", !ak.verification_results.some((r) => r.claim_path === "$.identity.company_name"))
    check("Diagnostic conserve la trace du contredit", (registry["V3 Assemble Artifact"].droppedClaims || []).some((d) => d.verdict === "contradicted"))
    // toujours valide après filtrage
    let ok = true
    try { await runCodeNode("V3 Validate Artifact", registry, registry["V3 Assemble Artifact"]) } catch (e) { ok = false; console.error(e.message) }
    check("Artefact reste valide après exclusion d'un contredit", ok)
  }

  // ── 3. Filtrage : preuve insuffisante exclue ──────────────────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    const verify = buildVerifyResponse(registry, (p) => p === "$.trends_and_news.analysis" ? "insufficient_evidence" : "confirmed")
    await runCodeNode("V3 Parse Verification", registry, llmVerifyResponse(verify))
    await runCodeNode("V3 Assemble Artifact", registry, {})
    const ak = registry["V3 Assemble Artifact"].accountKnowledge
    check("Claim à preuve insuffisante exclu (trends analysis = null)", ak.trends_and_news.analysis === null)
    check("Un claim confirmé voisin reste publié", ak.identity.company_name !== null)
  }

  // ── 4. Confirmé sans source de confirmation → non publié ──────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    const claims = registry["V3 Parse Draft"].draftClaimsForVerify
    const verify = { verifications: claims.map((c) => ({
      claim_path: c.claim_path,
      verdict: "confirmed",
      supporting_source_refs: c.claim_path === "$.identity.company_name" ? [] : [c.source_refs[0]],
      contradicting_source_refs: [],
      rationale: null, checked_at: "2026-08-05T12:00:00Z",
    })) }
    await runCodeNode("V3 Parse Verification", registry, llmVerifyResponse(verify))
    await runCodeNode("V3 Assemble Artifact", registry, {})
    const ak = registry["V3 Assemble Artifact"].accountKnowledge
    check("Confirmé sans supporting → claim non publié", ak.identity.company_name === null)
  }

  // ── 5. Rejets de Parse Draft ──────────────────────────────────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)

    await expectThrows("Parse Draft rejette institutional + analysis", async () => {
      const bad = draftArtifact(cat)
      bad.value_chain.value_proposition = v3c("Analyse portée par le compte", [cat.site], "analysis", "institutional")
      await runCodeNode("V3 Parse Draft", { ...registry }, llmDraftResponse(bad))
    }, /institutionnelle incompatible/)

    await expectThrows("Parse Draft rejette une source hors catalogue (non résolue)", async () => {
      const bad = draftArtifact(cat)
      bad.identity.company_name = v3c("Voyage Prive", [FOREIGN_SOURCE_ID])
      await runCodeNode("V3 Parse Draft", { ...registry }, llmDraftResponse(bad))
    }, /hors catalogue/)

    await expectThrows("Parse Draft rejette la rubrique réglementations à venir", async () => {
      const bad = draftArtifact(cat)
      bad.regulatory_environment.upcoming_regulations = [v3c("Futur reglement", [cat.fact])]
      await runCodeNode("V3 Parse Draft", { ...registry }, llmDraftResponse(bad))
    }, /reglementation a venir|Rubrique reglementaire interdite/)

    await expectThrows("Parse Draft rejette un bloc organisation (relocalisé)", async () => {
      const bad = draftArtifact(cat)
      bad.organisation = { departments: [] }
      await runCodeNode("V3 Parse Draft", { ...registry }, llmDraftResponse(bad))
    }, /Bloc interdit/)

    await expectThrows("Parse Draft rejette un marqueur d'absence", async () => {
      const bad = draftArtifact(cat)
      bad.identity.company_name = v3c("Non trouve", [cat.crm])
      await runCodeNode("V3 Parse Draft", { ...registry }, llmDraftResponse(bad))
    }, /absence interdit/)

    await expectThrows("Parse Draft rejette un brouillon tronqué (max_tokens)", async () => {
      await runCodeNode("V3 Parse Draft", { ...registry }, { content: [{ type: "text", text: "{" }], stop_reason: "max_tokens" })
    }, /tronquee/)
  }

  // ── 6. Séparation génération / vérification ───────────────────────────────
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    const draftPrompt = registry["V3 Assemble Draft Prompt"].draftSystemPrompt
    const verifyPrompt = registry["V3 Assemble Verification Prompt"].verifySystemPrompt
    check("Prompt de génération ≠ prompt de vérification", draftPrompt !== verifyPrompt)
    check("Le vérificateur n'a pas accès au raisonnement du générateur", /AUCUN acces a son raisonnement/.test(verifyPrompt))
    check("Le vérificateur reçoit les claims du brouillon", /CLAIMS_A_VERIFIER/.test(registry["V3 Assemble Verification Prompt"].verifyUserPrompt))
    // Le prompt de vérification ne reprend PAS les instructions de rédaction du générateur.
    check("Le prompt de vérification n'inclut pas le format de sortie du générateur",
      !/REGLE FONDATRICE — TOUTE AFFIRMATION EST SOURCEE ET ATTRIBUEE/.test(verifyPrompt))
  }

  // ── 7. Enrichissement : propositions uniquement, jamais d'écriture companies ─
  {
    const registry = {}
    const cat = await runUpToDraftPrompt(registry)
    await runCodeNode("V3 Parse Draft", registry, llmDraftResponse(draftArtifact(cat)))
    await runCodeNode("V3 Assemble Verification Prompt", registry, {})
    await runCodeNode("V3 Parse Verification", registry, llmVerifyResponse(buildVerifyResponse(registry, () => "confirmed")))
    await runCodeNode("V3 Assemble Artifact", registry, {})
    await runCodeNode("V3 Validate Artifact", registry, registry["V3 Assemble Artifact"])
    await runCodeNode("V3 Build Enrichment Proposals", registry, {}, []) // aucune proposition active
    const prop = registry["V3 Build Enrichment Proposals"]
    check("Propositions d'enrichissement générées (registre résolu)", prop.proposalsCount > 0, String(prop.proposalsCount))
    check("Toutes les propositions ciblent target_type=company via enrichment_proposals",
      prop.toInsert.every((p) => p.target_type === "company" && p.proposal_key.startsWith("account_scan:")))
    check("Aucune proposition n'écrit une valeur = valeur canonique actuelle",
      prop.toInsert.every((p) => p.attribute_name !== "revenue"))

    // Callback succès : phase 1, resultType account_knowledge, contentJson V3.
    registry["V3 Skip Proposals Insert"] = { proposalsInserted: 0 }
    await runCodeNode("V3 Prepare Callback", registry, {})
    const body = JSON.parse(registry["V3 Prepare Callback"].rawBody)
    check("Callback : status succeeded / phase 1 / resultType account_knowledge",
      body.status === "succeeded" && body.phase === 1 && body.resultType === "account_knowledge")
    check("Callback : contentJson = artefact V3 (schema_version 3)", body.contentJson && body.contentJson.schema_version === 3)
    check("Callback : n8nExecutionId + n8nWorkflowId présents", body.n8nExecutionId === "exec-v3" && body.n8nWorkflowId === "wf-030")
    check("Callback : identity.dynamic reste null (calcul hors modèle)", body.contentJson.identity.dynamic === null)
  }

  // ── 8. Chemin d'échec partagé : phase/run propagés ────────────────────────
  {
    const registry = {
      "Webhook — Account Knowledge": { body: { runId: RUN, callbackUrl: "https://kredo.example/api/n8n/callback" } },
      "Validate Entity": validatedEntity(3)
    }
    await runCodeNode("Prepare Failure Callback", registry, { error: "Contexte compte introuvable" })
    const body = JSON.parse(registry["Prepare Failure Callback"].rawBody)
    check("Failure callback V3 : status failed / phase 1 / resultType account_knowledge",
      body.status === "failed" && body.phase === 1 && body.resultType === "account_knowledge" && body.runId === RUN)
  }

  // ── 8b. Troncature et reprise V3 ─────────────────────────────────────────
  {
    const registry = {}
    await runCodeNode("Prepare Truncated Error", registry, {})
    const errObj = registry["Prepare Truncated Error"].error
    check("Prepare Truncated Error émet la structure V3_DRAFT_TRUNCATED",
      errObj && errObj.code === "V3_DRAFT_TRUNCATED" && errObj.stopReason === "max_tokens" && errObj.phase === "v3_draft_generation")
  }

  // ── 8c. Tests Génération Segmentée & Fusion ──────────────────────────────
  {
    const registry = {
      "V3 Call LLM (Draft)": { content: [{ text: JSON.stringify({ schema_version: 3, account_summary: v3c("Summary text", [CRM_SOURCE_ID]), identity: { company_name: v3c("Name", [CRM_SOURCE_ID]) }, market_positioning: {} }) }], usage: { input_tokens: 1000, output_tokens: 500 } },
      "V3 Call LLM (Draft B)": { content: [{ text: JSON.stringify({ schema_version: 3, offers_and_customers: {}, value_chain: {} }) }], usage: { input_tokens: 1100, output_tokens: 600 } },
      "V3 Call LLM (Draft C)": { content: [{ text: JSON.stringify({ schema_version: 3, regulatory_environment: {}, trends_and_news: {} }) }], usage: { input_tokens: 1200, output_tokens: 700 } }
    }

    // 1. Succès des trois fragments & fusion dans l'ordre exact des 7 sections
    await runCodeNode("V3 Merge Segments", registry, {})
    const merged = JSON.parse(registry["V3 Merge Segments"].content[0].text)
    check("Merge succède avec les trois fragments", merged !== null && merged.schema_version === 3)
    
    const keys = Object.keys(merged)
    const expectedKeys = [
      "schema_version",
      "account_summary",
      "identity",
      "market_positioning",
      "offers_and_customers",
      "value_chain",
      "regulatory_environment",
      "trends_and_news"
    ]
    const orderOk = expectedKeys.every((k, idx) => keys[idx] === k)
    check("Fusion dans l'ordre exact des 7 sections", orderOk, JSON.stringify(keys))

    check("Merge cumule l'usage des tokens",
      registry["V3 Merge Segments"].usage.input_tokens === 3300 &&
      registry["V3 Merge Segments"].usage.output_tokens === 1800)

    // 2. Absence d'un fragment
    const registryMissing = {
      "V3 Call LLM (Draft)": null,
      "V3 Call LLM (Draft B)": { content: [{ text: "{}" }] },
      "V3 Call LLM (Draft C)": { content: [{ text: "{}" }] }
    }
    await expectThrows(
      "Absence d'un fragment de génération lève une erreur",
      () => runCodeNode("V3 Merge Segments", registryMissing, {}),
      /Failed to parse|Cannot read properties/
    )

    // 3. Doublons de claim_path
    const registryDup = {
      "V3 Call LLM (Draft)": { content: [{ text: JSON.stringify({ schema_version: 3, account_summary: null, identity: { company_name: v3c("Name A", [CRM_SOURCE_ID]) }, market_positioning: {} }) }] },
      "V3 Call LLM (Draft B)": { content: [{ text: JSON.stringify({ schema_version: 3, offers_and_customers: { core_business: v3c("Core", [CRM_SOURCE_ID]) }, value_chain: {} }) }] },
      "V3 Call LLM (Draft C)": { content: [{ text: JSON.stringify({ schema_version: 3, regulatory_environment: { current_regulations: [ v3c("Reg", [CRM_SOURCE_ID]) ] }, trends_and_news: { analysis: v3c("Analysis from C", [CRM_SOURCE_ID]) } }) }] }
    }
    registryDup["V3 Call LLM (Draft B)"].content[0].text = JSON.stringify({
      schema_version: 3,
      identity: { company_name: v3c("Name B", [CRM_SOURCE_ID]) },
      offers_and_customers: {},
      value_chain: {}
    })
    await expectThrows(
      "Doublons de claim_path détectés lève une erreur",
      () => runCodeNode("V3 Merge Segments", registryDup, {}),
      /Doublons de claim_path/
    )

    // 4. Troncature et connectivité
    const connA = (workflow.connections["V3 A Truncated?"] || {}).main || []
    const connB = (workflow.connections["V3 B Truncated?"] || {}).main || []
    const connC = (workflow.connections["V3 C Truncated?"] || {}).main || []
    check("V3 A Truncated? TRUE -> Prepare Truncated Error", connA[0]?.[0]?.node === "Prepare Truncated Error")
    check("V3 B Truncated? TRUE -> Prepare Truncated Error", connB[0]?.[0]?.node === "Prepare Truncated Error")
    check("V3 C Truncated? TRUE -> Prepare Truncated Error", connC[0]?.[0]?.node === "Prepare Truncated Error")
  }

  // ── 9. Structure statique de la branche V3 ────────────────────────────────
  {
    // Discriminateur explicite.
    const router = nodes["Route Account Knowledge Version"]
    const routerCond = router.parameters.conditions.conditions[0]
    check("Router branche sur accountKnowledgeSchemaVersion === 3",
      String(routerCond.leftValue).includes("accountKnowledgeSchemaVersion") &&
      routerCond.rightValue === 3 &&
      routerCond.operator.operation === "equals")
    // TRUE (index 0) → V3, FALSE (index 1) → V2.
    const routes = workflow.connections["Route Account Knowledge Version"].main
    check("Router TRUE → V3 Prepare Context, FALSE → V2 Prepare Deterministic Context",
      routes[0][0].node === "V3 Prepare Context & Research Plan" &&
      routes[1][0].node === "Prepare Deterministic Context")

    // Aucune écriture directe dans companies.
    const companyWrites = workflow.nodes.filter((n) =>
      n.type === "n8n-nodes-base.httpRequest" &&
      /\/rest\/v1\/companies(\?|$|\b)/.test(JSON.stringify(n.parameters)) &&
      ["POST", "PATCH", "PUT", "DELETE"].includes((n.parameters.method || "GET").toUpperCase()))
    check("Aucun nœud HTTP n'écrit dans la table companies", companyWrites.length === 0, companyWrites.map((n) => n.name).join(", "))

    // Prompt du générateur : interdictions de snippets / sources non consultées.
    const draftNode = nodes["V3 Assemble Draft Prompt"]
    check("Le prompt de génération interdit snippets et sources non consultées",
      /snippet de moteur de recherche/.test(draftNode.parameters.jsCode) &&
      /URL non consultee/.test(draftNode.parameters.jsCode))
    check("Le prompt de génération V3 interdit FOLIO pour frictions, signaux et trends_and_news.analysis",
      /FOLIO ne constitue JAMAIS une preuve/.test(draftNode.parameters.jsCode) &&
      /trends_and_news\.analysis ne peuvent JAMAIS s'appuyer sur FOLIO_LEGACY/.test(draftNode.parameters.jsCode))

    // Toutes les sorties d'erreur V3 mènent au failure callback partagé.
    const v3Nodes = workflow.nodes.filter((n) => String(n.id).startsWith("n030v3-"))
    const v3WithError = v3Nodes.filter((n) => n.onError === "continueErrorOutput").map((n) => n.name)
    const missingErr = v3WithError.filter((name) => {
      const branches = (workflow.connections[name] || {}).main || []
      const errBranch = branches[1] || []
      return !errBranch.some((c) => c.node === "Prepare Failure Callback")
    })
    check("Toute sortie d'erreur V3 mène au Prepare Failure Callback partagé", missingErr.length === 0, missingErr.join(", "))

    // Les fetches externes ne consultent que http/https (via garde SSRF dans le contexte).
    const prepNode = nodes["V3 Prepare Context & Research Plan"]
    check("Garde SSRF : localhost / IP privées bloqués avant fetch",
      /isSafePublicUrl/.test(prepNode.parameters.jsCode) &&
      /127|192\.168|169\.254|localhost/.test(prepNode.parameters.jsCode))
  }

  console.log(`\n${passed} succès, ${failed} échec(s)`)
  if (failed > 0) process.exit(1)
}

// Miroir de collectAccountKnowledgeV3Claims pour vérifier les invariants côté test.
function collectPaths(c) {
  const out = []
  const pn = (cl, p) => { if (cl !== null && cl !== undefined) out.push({ path: p, claim: cl }) }
  const pa = (cls, b) => (cls || []).forEach((cl, i) => out.push({ path: `${b}[${i}]`, claim: cl }))
  pn(c.account_summary, "$.account_summary")
  const i = c.identity
  pn(i.company_name, "$.identity.company_name"); pn(i.legal_name, "$.identity.legal_name")
  pn(i.primary_activity, "$.identity.primary_activity"); pn(i.headquarters, "$.identity.headquarters")
  pn(i.sector, "$.identity.sector"); pn(i.business_segment, "$.identity.business_segment")
  pn(i.revenue, "$.identity.revenue"); pn(i.employee_count, "$.identity.employee_count")
  pa(i.geographic_reach, "$.identity.geographic_reach")
  const m = c.market_positioning
  pn(m.account_positioning, "$.market_positioning.account_positioning")
  pn(m.competitive_environment, "$.market_positioning.competitive_environment")
  pa(m.direct_competitors, "$.market_positioning.direct_competitors")
  pa(m.competitive_advantages, "$.market_positioning.competitive_advantages")
  pa(m.opportunities, "$.market_positioning.opportunities")
  pa(m.threats, "$.market_positioning.threats")
  const p = m.policy_and_ambitions, pb = "$.market_positioning.policy_and_ambitions"
  pn(p.purpose, `${pb}.purpose`); pn(p.philosophy, `${pb}.philosophy`)
  pa(p.culture, `${pb}.culture`); pa(p.public_statements, `${pb}.public_statements`)
  pa(p.ambitions, `${pb}.ambitions`); pa(p.strategic_axes, `${pb}.strategic_axes`)
  pa(p.leadership_posture, `${pb}.leadership_posture`); pn(p.claimed_identity, `${pb}.claimed_identity`)
  const o = c.offers_and_customers
  pn(o.core_business, "$.offers_and_customers.core_business")
  pa(o.offers, "$.offers_and_customers.offers"); pa(o.covered_domains, "$.offers_and_customers.covered_domains")
  pa(o.services, "$.offers_and_customers.services"); pa(o.service_models, "$.offers_and_customers.service_models")
  pa(o.complementary_activities, "$.offers_and_customers.complementary_activities")
  pa(o.uncovered_activities, "$.offers_and_customers.uncovered_activities")
  pn(o.customer_profile, "$.offers_and_customers.customer_profile")
  pa(o.customer_segments, "$.offers_and_customers.customer_segments")
  pa(o.segment_weights, "$.offers_and_customers.segment_weights")
  pa(o.behavioral_trends, "$.offers_and_customers.behavioral_trends")
  pa(o.unmet_needs, "$.offers_and_customers.unmet_needs")
  const v = c.value_chain
  pn(v.description, "$.value_chain.description"); pn(v.value_proposition, "$.value_chain.value_proposition")
  pa(v.key_links, "$.value_chain.key_links"); pa(v.critical_partners_or_suppliers, "$.value_chain.critical_partners_or_suppliers")
  pa(v.dependencies, "$.value_chain.dependencies"); pa(v.vulnerabilities, "$.value_chain.vulnerabilities")
  pn(v.end_customer_relationship, "$.value_chain.end_customer_relationship")
  const r = c.regulatory_environment
  pa(r.current_regulations, "$.regulatory_environment.current_regulations")
  pa(r.required_certifications, "$.regulatory_environment.required_certifications")
  pa(r.compliance_risks, "$.regulatory_environment.compliance_risks")
  pn(c.trends_and_news.analysis, "$.trends_and_news.analysis")
  return out
}

main().catch((error) => { console.error(error); process.exit(1) })
