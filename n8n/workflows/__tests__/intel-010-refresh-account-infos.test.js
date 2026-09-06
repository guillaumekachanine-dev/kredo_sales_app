// Harnais d'exécution réelle des nœuds Code touchés par INTEL-010.
// Le JSON est la source déployée dans n8n : ce test n'en réimplémente pas la logique.
// Exécuter : node n8n/workflows/__tests__/intel-010-refresh-account-infos.test.js
/* eslint-disable @typescript-eslint/no-require-imports */
"use strict"

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "INTEL-010 — intel-010-refresh-account-infos.json")
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

let passed = 0
let failed = 0

let httpCalls = []
let httpResponder = () => ({ results: [] })

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`ok   ${label}`)
  } else {
    failed += 1
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`)
  }
}

async function expectThrows(label, run, matcher) {
  try {
    await run()
    check(label, false, "aucune erreur levée")
  } catch (error) {
    check(label, matcher.test(String(error.message || error)), String(error.message || error))
  }
}

async function runCodeNode(name, { input, registry = {} }) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const sandbox = {
    $input: { first: () => ({ json: input }) },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      return { item: { json: registry[nodeName] }, first: () => ({ json: registry[nodeName] }) }
    },
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
    $execution: { id: "execution-test" },
    $workflow: { id: "workflow-test" },
    isFinite,
    encodeURIComponent,
    Boolean,
    parseInt,
    parseFloat,
    // Requêtes émises depuis un nœud Code (`this.helpers.httpRequest`) — c'est ainsi
    // que « Resolve Entity » complète la première page du registre par des requêtes
    // sur les variantes de raison sociale.
    helpers: {
      httpRequest: async (options) => {
        httpCalls.push(options.url)
        return httpResponder(options.url)
      },
    },
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
  const result = await script.runInContext(context)
  return result[0].json
}

function evaluateN8nExpression(expression, json) {
  if (!expression.startsWith("={{") || !expression.endsWith("}}")) {
    throw new Error("Expression n8n JSON inattendue")
  }
  const source = expression.slice(3, -2).trim()
  return new vm.Script(`(${source})`).runInNewContext({ $json: json })
}

function findEnumsOnUnionTypes(value, currentPath = "schema") {
  if (!value || typeof value !== "object") return []
  const matches = Array.isArray(value.type) && Array.isArray(value.enum) ? [currentPath] : []
  for (const [key, child] of Object.entries(value)) {
    matches.push(...findEnumsOnUnionTypes(child, `${currentPath}.${key}`))
  }
  return matches
}

function validClassification() {
  return {
    activite_dominante: "Entreprise de construction",
    segment_slug: "seg-btp",
    tests: { concurrence: true, acheteurs: true, contraintes: true, offres: true },
    regime_achat: "prive",
    modele_eco: "b2b_projet",
    tier: "grand_compte",
    vertical_client: ["BTP & construction"],
    relation_type: "prospect",
    moment: null,
    moment_preuve: null,
    classification_confiance: "haute",
    classification_note: null,
    alternatives_ecartees: [],
  }
}

function llmResponse(artifact) {
  return { content: [{ type: "text", text: JSON.stringify(artifact) }], usage: {}, model: "claude-sonnet-5" }
}

function upstream(requestClassification) {
  return {
    requestClassification,
    classificationSegments: [{ slug: "seg-btp", macroSlug: "construction" }],
    maxContacts: 5,
  }
}

async function parse(artifact, requestClassification = false) {
  return runCodeNode("Parse & Validate LLM Output", {
    input: llmResponse(artifact),
    registry: { "Assemble Extraction Prompt": upstream(requestClassification) },
  })
}

async function main() {
  const prompt = await runCodeNode("Assemble Extraction Prompt", { input: upstream(true) })
  const callBody = evaluateN8nExpression(nodes["Call LLM"].parameters.jsonBody, prompt)
  check(
    "prompt — vertical_client réservé à classification",
    /vertical_client" appartient EXCLUSIVEMENT au bloc "classification"[\s\S]*Ne le duplique JAMAIS dans "facts"/.test(prompt.systemPrompt),
  )
  check(
    "appel Anthropic — sortie JSON structurée activée",
    callBody.output_config?.format?.type === "json_schema" && callBody.output_config.format.schema === prompt.outputSchema,
  )
  check(
    "schéma structuré — facts exclut vertical_client",
    prompt.outputSchema.properties.facts.items.properties.attribute.enum.includes("technology") &&
      !prompt.outputSchema.properties.facts.items.properties.attribute.enum.includes("vertical_client"),
  )
  check(
    "schéma structuré — vertical_client reste dans classification",
    prompt.outputSchema.properties.classification.properties.vertical_client.type === "array",
  )
  check(
    "schéma structuré — aucun enum sur un type nullable union",
    findEnumsOnUnionTypes(prompt.outputSchema).length === 0,
    findEnumsOnUnionTypes(prompt.outputSchema).join(", "),
  )

  const normal = await parse({
    schema_version: 1,
    description: null,
    fields: {},
    facts: [{ attribute: "technology", text: "Kubernetes", explicit: true }],
    contact_candidates: [],
    classification: null,
  })
  check("sortie normale — succès", normal.llmFacts.length === 1 && normal.llmFacts[0].attribute === "technology")

  const classificationOnly = await parse({
    schema_version: 1,
    description: null,
    fields: {},
    facts: [],
    contact_candidates: [],
    classification: validClassification(),
  }, true)
  check(
    "vertical_client uniquement dans classification — succès",
    classificationOnly.llmFacts.length === 0 && classificationOnly.llmClassification?.verticalClient?.[0] === "BTP & construction",
  )

  const duplicated = await parse({
    schema_version: 1,
    description: null,
    fields: {},
    facts: [{ attribute: "vertical_client", text: "BTP & construction", explicit: true }],
    contact_candidates: [],
    classification: validClassification(),
  }, true)
  check(
    "duplication vertical_client — succès et fait supprimé",
    duplicated.llmFacts.length === 0 && duplicated.llmClassification?.verticalClient?.[0] === "BTP & construction",
  )

  await expectThrows(
    "autre attribut inconnu — rejet maintenu",
    () => parse({
      schema_version: 1,
      description: null,
      fields: {},
      facts: [{ attribute: "attribut_inconnu", text: "doit échouer", explicit: true }],
      contact_candidates: [],
      classification: null,
    }, true),
    /Attribut de fait non autorisé : "attribut_inconnu"/,
  )

  const failure = await runCodeNode("Prepare Failure Callback", {
    input: { error: { message: "Réponse LLM non-JSON" } },
    // Reproduit le chemin réel : Validate & Route n'est pas lisible depuis ce
    // branchement d'erreur, mais Assemble Extraction Prompt l'est encore.
    registry: {
      "Assemble Extraction Prompt": {
        ...upstream(true),
        runId: "run-failure-test",
        callbackUrl: "https://kredo.example/api/n8n/callback",
      },
    },
  })
  const failureBody = JSON.parse(failure.rawBody)
  check(
    "callback d'échec — récupère le contexte sans Validate & Route",
    failure.callbackUrl === "https://kredo.example/api/n8n/callback" &&
      failureBody.runId === "run-failure-test" &&
      failureBody.status === "failed" &&
      failureBody.errorMessage === "Réponse LLM non-JSON",
  )


  // ── Résolution d'entité légale (Lot 1 Account Knowledge V4) ────────────────
  {
    const ORBIT_PARIS = {
      siren: "400276754", nom_raison_sociale: "ORBIT", nom_complet: "ORBIT",
      activite_principale: "56.10C", section_activite_principale: "I", etat_administratif: "A",
      siege: { libelle_commune: "PARIS", code_postal: "75015", departement: "75", adresse: "337 RUE DE VAUGIRARD 75015 PARIS" },
    }
    const DEPIL_TECH = {
      siren: "529850455", nom_raison_sociale: "DEPIL TECH", nom_complet: "DEPIL TECH",
      activite_principale: "96.02B", section_activite_principale: "S", etat_administratif: "A",
      siege: { libelle_commune: "NICE", code_postal: "06200", departement: "06" },
    }
    const TOURNAIRE_LYON = {
      siren: "505063438", nom_raison_sociale: "TOURNAIRE", nom_complet: "TOURNAIRE",
      activite_principale: "43.99C", section_activite_principale: "F", etat_administratif: "A",
      siege: { libelle_commune: "LYON", code_postal: "69006", departement: "69" },
    }
    const TOURNAIRE_SA = {
      siren: "415550110", nom_raison_sociale: "TOURNAIRE SA", nom_complet: "TOURNAIRE SA",
      activite_principale: "25.92Z", section_activite_principale: "C", etat_administratif: "A",
      tranche_effectif_salarie: "32",
      siege: { libelle_commune: "GRASSE", code_postal: "06130", departement: "06" },
    }

    function scanPlan(overrides = {}) {
      return {
        selectedSiren: null,
        locationHint: null,
        knownCompany: { name: null, legalName: null, nafCode: null, siren: null },
        company: { name: null, legal_name: null, hq_location: null, sector: null, naf_code: null, employee_count: null },
        ...overrides,
      }
    }

    async function resolve(plan, firstPage, responder = () => ({ results: [] })) {
      httpCalls = []
      httpResponder = responder
      return runCodeNode("Resolve Entity", {
        input: { results: firstPage },
        registry: { "Build Scan Plan": plan },
      })
    }

    // D-Orbit : ni raison sociale, ni siège, ni secteur au CRM. L'ancien scoring
    // résolvait sur le seul nom et sortait « ORBIT », restauration parisienne.
    const dorbit = await resolve(
      scanPlan({ knownCompany: { name: "D-Orbit", legalName: null, nafCode: null, siren: null }, company: { name: "D-Orbit", legal_name: null, hq_location: null, sector: null, naf_code: null, employee_count: null } }),
      [ORBIT_PARIS],
    )
    check("D-Orbit n'est plus résolu sur le seul nom", dorbit.resolution.status !== "resolved", dorbit.resolution.status)
    check("D-Orbit : les candidats restent proposés à l'arbitrage humain", dorbit.resolution.candidates.length > 0)
    // Nuance : « ORBIT » n'est pas *incohérent* — le CRM ne dit ni le siège ni le
    // secteur de D-Orbit, donc rien ne le contredit. Il est *non confirmé*, ce qui
    // suffit à interdire la résolution automatique. Le motif doit être dit.
    check("D-Orbit : le motif du refus est explicite",
      dorbit.warnings.some((w) => /confirmation indépendante/.test(w)), JSON.stringify(dorbit.warnings))
    check("D-Orbit : le candidat porte son score pour l'arbitrage",
      dorbit.resolution.candidates.every((c) => typeof c.matchScore === "number" && typeof c.coherent === "boolean"))

    // Tournaire : la bonne entité n'apparaît que sur la requête par raison sociale.
    const tournaire = await resolve(
      scanPlan({
        knownCompany: { name: "Tournaire", legalName: "Groupe Tournaire (Tournaire SA)", nafCode: null, siren: null },
        company: { name: "Tournaire", legal_name: "Groupe Tournaire (Tournaire SA)", hq_location: "Grasse", sector: "Industrie manufacturière, électronique & équipements", naf_code: null, employee_count: 70 },
      }),
      [TOURNAIRE_LYON],
      (url) => (/Tournaire%20SA|Groupe/.test(url) ? { results: [TOURNAIRE_SA, TOURNAIRE_LYON] } : { results: [TOURNAIRE_LYON] }),
    )
    check("Tournaire : entité résolue sur la raison sociale", tournaire.resolution.status === "resolved", tournaire.resolution.status)
    check("Tournaire : SIREN 415550110 retenu", tournaire.resolution.siren === "415550110", String(tournaire.resolution.siren))
    check("Tournaire : des requêtes registre supplémentaires sont émises", httpCalls.length >= 1, String(httpCalls.length))

    // Un SIREN confirmé par un humain reste souverain — mais la contradiction est dite.
    const mmv = await resolve(
      scanPlan({
        selectedSiren: "529850455",
        knownCompany: { name: "MMV", legalName: null, nafCode: null, siren: null },
        company: { name: "MMV", legal_name: null, hq_location: null, sector: "Tourisme, Hôtellerie & Loisirs", naf_code: null, employee_count: null },
      }),
      [DEPIL_TECH],
    )
    check("SIREN confirmé manuellement : le choix humain reste souverain", mmv.resolution.status === "resolved" && mmv.resolution.siren === "529850455")
    check("SIREN confirmé manuellement : la contradiction est signalée",
      mmv.warnings.some((w) => /signaux contradictoires/.test(w)), JSON.stringify(mmv.warnings))

    check("Search Legal Registry demande au moins 10 résultats",
      /per_page=10/.test(nodes["Search Legal Registry"].parameters.url))

    // Invariant partagé : les deux workflows portent la même transcription.
    const sharedHelpers = fs.readFileSync(path.join(__dirname, "..", "..", "..", "scripts", "entity-resolution-node.js"), "utf8")
    const intel030 = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "intel-030-account-knowledge.json"), "utf8"))
    const intel030Code = intel030.nodes.find((n) => n.name === "V3 Consult & Normalize Sources").parameters.jsCode
    const intel010Code = nodes["Resolve Entity"].parameters.jsCode
    for (const marker of ["const RESOLVED_MIN_SCORE = 4;", "const RESOLVED_MIN_NAME_SCORE = 0.65;", "const REGISTRY_PER_PAGE = 10;"]) {
      check(`Invariant partagé présent dans les deux workflows : ${marker}`,
        sharedHelpers.includes(marker) && intel030Code.includes(marker) && intel010Code.includes(marker))
    }

    httpResponder = () => ({ results: [] })
  }

  console.log(`\n${passed} vérification(s) réussie(s), ${failed} échec(s).`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
