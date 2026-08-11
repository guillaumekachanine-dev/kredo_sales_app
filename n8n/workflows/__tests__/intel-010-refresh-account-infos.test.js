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

  console.log(`\n${passed} vérification(s) réussie(s), ${failed} échec(s).`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
