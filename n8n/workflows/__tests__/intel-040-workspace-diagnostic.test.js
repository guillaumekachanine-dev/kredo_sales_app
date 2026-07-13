"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "intel-040-workspace-diagnostic.json")
const CONTRACT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "src",
  "lib",
  "intelligence",
  "diagnostic",
  "workspace-diagnostic-types.ts",
)

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"))
const contractSource = fs.readFileSync(CONTRACT_PATH, "utf8")
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))

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

async function runCodeNode(name, registry, input) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const sandbox = {
    $input: { first: () => ({ json: input ?? registry.__input ?? {} }) },
    $: (nodeName) => ({ item: { json: registry[nodeName] } }),
    console,
    Date,
    Intl,
    JSON,
    Array,
    Object,
    Set,
    Map,
    Number,
    String,
    RegExp,
    Error,
  }
  const context = vm.createContext(sandbox)
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, {
    filename: `${name}.js`,
  })
  const result = await script.runInContext(context)
  if (Array.isArray(result) && result[0]?.json) registry[name] = result[0].json
  return result
}

function webhookInput(overrides = {}) {
  return {
    body: {
      runId: "run-1",
      workflowId: "intel-040-workspace-diagnostic",
      entityType: "workspace",
      entityId: "workspace-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      callbackUrl: "https://kredo.example/api/n8n/callback",
      input: {
        diagnosticType: "workspace_diagnostic",
        asOfDate: "2026-07-13",
      },
      ...(overrides.body || {}),
    },
    headers: { "x-kredo-signature": "sha256=signature-ok" },
    computedSignature: "signature-ok",
    ...(overrides.root || {}),
  }
}

function contextFixture() {
  return {
    workspace: {
      id: "workspace-1",
      name: "Kredo",
      asOfDate: "2026-07-13",
      dataCutoffAt: "2026-07-13T06:00:00.000Z",
      caveats: [],
    },
    commerce: {
      pipeWeighted: 120000,
      pipeWeightedPrevMonth: 100000,
      oppsByStage: [],
      stagnatingOpps: [],
      topClientConcentration: [],
      oppsWithoutRecentAction: [],
      scoreBandDistribution: { A: 1, B: 2, C: 0, D: 0, U: 0 },
    },
    delivery: {
      activeMissionsCount: 8,
      missionsEndingSoon: [{ id: "mission-1", title: "Cloud", endDate: "2026-08-31", marginPct: 18 }],
      avgOccupancyRate: 82,
      marginAlerts: [],
      craNotValidatedCount: 0,
      negativeMarginCount: 0,
    },
    finance: {
      last6Months: [],
      ytdRevenue: 700000,
      ytdGrossMarginPct: 28,
      trend: "stable",
    },
    team: {
      totalCollaborators: 12,
      avgActivityRateYtd: 82,
      collaboratorsBelow70: [],
      intercontractRisk: [],
      topSkillGaps: [],
      upcomingAbsences: 5,
    },
    recruitment: {
      hiringFunnelSnapshot: [],
      oppsWithoutCandidate: [],
      openJobProfilesCount: 4,
    },
  }
}

function llmResponseFixture() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          schema_version: 1,
          executiveSummary: "La continuité du portefeuille doit être sécurisée sans fragiliser la capacité de delivery.",
          correlations: [
            {
              id: "continuite-portefeuille",
              title: "Continuité du portefeuille",
              narrative: "Les fins de mission et la structure du pipe doivent être pilotées ensemble.",
              axes: ["commerce", "delivery"],
              severity: "warning",
              evidenceRefs: [
                { metric: "commerce.pipeWeighted", value: "Pipe pondéré disponible" },
                { metric: "delivery.missionsEndingSoon", value: "Missions proches de leur terme" },
              ],
            },
          ],
          priorities: [
            {
              action: "Sécuriser la continuité commerciale et delivery",
              rationale: "La corrélation principale appelle un arbitrage conjoint.",
              relatedCorrelationIds: ["continuite-portefeuille"],
            },
          ],
          watchList: [
            {
              signal: "Évolution de la concentration",
              horizon: "Court terme",
              triggerCondition: "Devient critique si la dépendance commerciale se renforce.",
            },
          ],
          strengths: [{ observation: "La tendance financière reste stable." }],
        }),
      },
    ],
    usage: { input_tokens: 900, output_tokens: 600 },
    model: "claude-sonnet-5",
  }
}

function wrappedLlmResponseFixture() {
  const response = llmResponseFixture()
  response.content[0].text = [
    "Voici le diagnostic demandé :",
    "```json",
    response.content[0].text,
    "```",
  ].join("\n")
  return response
}

function envelopedLlmResponseFixture() {
  const response = llmResponseFixture()
  const payload = JSON.parse(response.content[0].text)
  response.content[0].text = JSON.stringify({
    schema_version: 1,
    executiveSummary: payload.executiveSummary,
    diagnostic: {
      correlations: payload.correlations,
      priorities: payload.priorities,
      watchList: payload.watchList,
      strengths: payload.strengths,
    },
  })
  return response
}

function groupedCorrelationsLlmResponseFixture() {
  const response = llmResponseFixture()
  const payload = JSON.parse(response.content[0].text)
  const [correlation] = payload.correlations
  response.content[0].text = JSON.stringify({
    ...payload,
    correlations: {
      warning: [{ ...correlation, severity: undefined }],
    },
  })
  return response
}

async function main() {
  check("workflow JSON valide et inactif par défaut", workflow.active === false)
  check("workflow principal contient quinze nœuds", workflow.nodes.length === 15, String(workflow.nodes.length))
  check(
    "un seul nœud hydrate le contexte",
    workflow.nodes.filter((node) => node.name === "Hydrate Context").length === 1,
  )
  check(
    "Hydrate Context cible la RPC canonique",
    nodes["Hydrate Context"].parameters.url.endsWith("/rpc/get_workspace_diagnostic_context"),
  )

  const registry = { __input: webhookInput() }
  const validated = await runCodeNode("Validate Request", registry)
  check("validation accepte le scope workspace", validated[0].json.workspaceId === "workspace-1")

  let badEntityRejected = false
  try {
    await runCodeNode("Validate Request", { __input: webhookInput({ body: { entityType: "company" } }) })
  } catch (error) {
    badEntityRejected = /workspace/.test(error.message)
  }
  check("validation rejette une entité company", badEntityRejected)

  let badSignatureRejected = false
  try {
    await runCodeNode("Validate Request", {
      __input: webhookInput({ root: { computedSignature: "wrong" } }),
    })
  } catch (error) {
    badSignatureRejected = /HMAC/.test(error.message)
  }
  check("validation rejette une signature invalide", badSignatureRejected)

  registry["Validate Request"] = validated[0].json
  const context = contextFixture()
  registry["Hydrate Context"] = context
  const assembled = await runCodeNode("Assemble Prompt", registry, context)
  check(
    "prompt interdit explicitement les chiffres inventés",
    assembled[0].json.systemPrompt.includes("Tu ne dois jamais inventer un chiffre"),
  )
  check(
    "prompt conserve le contexte sans transformation",
    assembled[0].json.context.commerce.pipeWeighted === 120000,
  )

  registry["Assemble Prompt"] = assembled[0].json
  const parsed = await runCodeNode("Parse & Validate Output", registry, llmResponseFixture())
  const diagnostic = parsed[0].json.diagnostic
  check("parseur produit schema_version=1", diagnostic.schema_version === 1)
  check("parseur ajoute generatedAt", typeof diagnostic.generatedAt === "string")
  check("parseur ajoute le rang déterministe", diagnostic.priorities[0].rank === 1)
  check("parseur ajoute le libellé de période", diagnostic.periodLabel.startsWith("Semaine du"))

  const parsedWrapped = await runCodeNode("Parse & Validate Output", registry, wrappedLlmResponseFixture())
  check(
    "parseur extrait le JSON d'une réponse LLM entourée",
    parsedWrapped[0].json.diagnostic.schema_version === 1,
  )

  const parsedEnvelope = await runCodeNode("Parse & Validate Output", registry, envelopedLlmResponseFixture())
  check(
    "parseur accepte une enveloppe diagnostic",
    parsedEnvelope[0].json.diagnostic.correlations.length === 1,
  )

  const parsedGrouped = await runCodeNode("Parse & Validate Output", registry, groupedCorrelationsLlmResponseFixture())
  check(
    "parseur aplatit les corrélations groupées par sévérité",
    parsedGrouped[0].json.diagnostic.correlations[0].severity === "warning",
  )

  registry["Parse & Validate Output"] = parsed[0].json
  const quality = await runCodeNode("Quality Check", registry, parsed[0].json)
  const flags = quality[0].json.qaFlags
  check("quality check produit exactement cinq flags", flags.length === 5, JSON.stringify(flags))
  check("fixture nominale passe no_invented_numbers", flags.find((flag) => flag.check === "no_invented_numbers")?.passed === true)
  check("fixture nominale passe evidence_refs_present", flags.find((flag) => flag.check === "evidence_refs_present")?.passed === true)

  const invented = structuredClone(parsed[0].json)
  invented.diagnostic.executiveSummary += " Valeur inventée 999."
  const inventedQuality = await runCodeNode("Quality Check", registry, invented)
  check(
    "no_invented_numbers détecte une valeur absente du contexte",
    inventedQuality[0].json.qaFlags.find((flag) => flag.check === "no_invented_numbers")?.passed === false,
  )

  const identifierCollision = structuredClone(parsed[0].json)
  identifierCollision.context.workspace.id = "workspace-999"
  identifierCollision.diagnostic.executiveSummary += " Valeur inventée 999."
  const identifierCollisionQuality = await runCodeNode("Quality Check", registry, identifierCollision)
  check(
    "un identifiant source ne légitime pas un nombre inventé",
    identifierCollisionQuality[0].json.qaFlags.find((flag) => flag.check === "no_invented_numbers")?.passed === false,
  )

  const structuralNumber = structuredClone(parsed[0].json)
  structuralNumber.diagnostic.correlations[0].id = "continuite-portefeuille-777"
  structuralNumber.diagnostic.priorities[0].relatedCorrelationIds = ["continuite-portefeuille-777"]
  const structuralNumberQuality = await runCodeNode("Quality Check", registry, structuralNumber)
  check(
    "les nombres structurels ne déclenchent pas de faux positif",
    structuralNumberQuality[0].json.qaFlags.find((flag) => flag.check === "no_invented_numbers")?.passed === true,
  )

  const monoAxis = structuredClone(parsed[0].json)
  monoAxis.diagnostic.correlations[0].axes = ["commerce"]
  const monoAxisQuality = await runCodeNode("Quality Check", registry, monoAxis)
  check(
    "correlations_cross_axes détecte une pseudo-corrélation",
    monoAxisQuality[0].json.qaFlags.find((flag) => flag.check === "correlations_cross_axes")?.passed === false,
  )

  registry["Quality Check"] = quality[0].json
  const callback = await runCodeNode("Prepare Callback", registry, quality[0].json)
  const callbackBody = JSON.parse(callback[0].json.rawBody)
  check("callback utilise resultType workspace_diagnostic", callbackBody.resultType === "workspace_diagnostic")
  check("callback persiste les cinq flags QA", callbackBody.qaFlags.length === 5)

  for (const token of [
    "WorkspaceDiagnostic",
    "schema_version",
    "generatedAt",
    "periodLabel",
    "executiveSummary",
    "correlations",
    "priorities",
    "watchList",
    "strengths",
    "evidenceRefs",
    "relatedCorrelationIds",
  ]) {
    check(`contrat TS contient ${token}`, contractSource.includes(token))
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
