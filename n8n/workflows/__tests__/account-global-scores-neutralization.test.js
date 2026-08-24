"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const workflowsDir = path.join(__dirname, "..")
const workflowFiles = {
  report: "report-account-summary.json",
  communication: "intel-020-communication.json",
  strategy: "intel-032-strategy.json",
  diagnostic: "intel-040-workspace-diagnostic.json",
}

const allWorkflowFiles = fs.readdirSync(workflowsDir).filter((file) => file.endsWith(".json"))

const workflows = Object.fromEntries(
  Object.entries(workflowFiles).map(([key, file]) => [
    key,
    JSON.parse(fs.readFileSync(path.join(workflowsDir, file), "utf8")),
  ]),
)

let passed = 0
let failed = 0

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`ok  ${label}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`)
}

async function runCodeNode(workflow, nodeName, registry, input) {
  const node = workflow.nodes.find((candidate) => candidate.name === nodeName)
  if (!node?.parameters?.jsCode) throw new Error(`Nœud introuvable : ${nodeName}`)
  const sandbox = {
    $input: { first: () => ({ json: input }) },
    $: (name) => ({ item: { json: registry[name] } }),
    JSON,
    Object,
    Array,
    Error,
  }
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`)
  return script.runInNewContext(sandbox)
}

async function main() {
  const exactForbiddenTokens = [
    ["legacy", "folio", "score"].join("_"),
    ["legacy", "Folio", "Score"].join(""),
    ["potential", "score", "raw"].join("_"),
    ["account", "score", ""].join("_"),
    ["score", "band"].join("_"),
    ["score", "value"].join("_"),
    ["compute", "conviction", "score", "v1"].join("_"),
    ["compute", "investment", "score", "v1"].join("_"),
    ["scores", "conviction"].join("."),
    ["scores", "investment"].join("."),
    ["potential", "Score"].join(""),
    ["action", "Priority", "Score"].join(""),
    ["native", "Score"].join(""),
    ["REAL", "LEGACY"].join("_"),
    ["REAL", "NATIVE"].join("_"),
    ["company", "Score"].join(""),
    ["account", "Rank"].join(""),
  ]
  for (const file of allWorkflowFiles) {
    const serialized = fs.readFileSync(path.join(workflowsDir, file), "utf8")
    check(
      `${file} — aucun identifiant de note compte interdit`,
      exactForbiddenTokens.every((token) => !serialized.includes(token)),
    )
  }

  const reportFacts = {
    identity: { id: "company-1", name: "Acme", aiScore: 4 },
    potential: { openPipeWeighted: 1000, openOpportunitiesCount: 1, wonOpportunitiesCount: 0, totalOpportunitiesCount: 1 },
    scores: { conviction: 4, investment: 3 },
    caveats: [],
  }
  const reportResult = await runCodeNode(
    workflows.report,
    "Assemble Prompt",
    { "Validate Brief": { brief: {} } },
    reportFacts,
  )
  const reportOutput = reportResult[0].json
  check("REPORT-001 — contrat produit sans aiScore", !("aiScore" in reportOutput.facts.identity))
  check("REPORT-001 — contrat produit sans scores", !("scores" in reportOutput.facts))
  check("REPORT-001 — faits d'opportunités explicites", reportOutput.facts.opportunities.openPipeWeighted === 1000)
  check("REPORT-001 — prompt sans conviction/investissement", !/conviction|investissement|Score IA/i.test(reportOutput.systemPrompt))

  const strategyContext = {
    company: { id: "company-1", name: "Acme" },
    openIssues: [],
    offersCatalog: [],
    scores: { conviction: 5, investment: 5 },
  }
  const strategyResult = await runCodeNode(
    workflows.strategy,
    "Assemble Prompt",
    { "Validate Entity": { workspaceId: "workspace-1", companyId: "company-1" } },
    strategyContext,
  )
  const strategyOutput = strategyResult[0].json
  check("INTEL-032 — contexte produit sans scores", !("scores" in strategyOutput.context))
  check("INTEL-032 — prompt utilisateur sans scores", !/\"scores\"|conviction|investment/i.test(strategyOutput.userPrompt))

  const reportSerialized = JSON.stringify(workflows.report)
  check("REPORT-001 — aucun contrôle QA historique des notes", !/scores_on_five|Score IA|conviction sur 5|investissement sur 5/i.test(reportSerialized))

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
