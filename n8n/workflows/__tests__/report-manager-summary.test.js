"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "report-manager-summary.json")

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"))
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
    $execution: { id: "exec-mgr-summary" },
    $workflow: { id: "wf-mgr-summary" },
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

function webhookInput() {
  return {
    body: {
      runId: "run-mgr-1",
      workflowId: "report-manager-summary",
      entityType: "workspace",
      entityId: "ws-1",
      workspaceId: "ws-1",
      userId: "user-1",
      callbackUrl: "https://kredo.example/api/n8n/callback",
      input: {
        reportType: "manager_summary",
        period: { startDate: "2026-08-16", endDate: "2026-08-22", asOfDate: "2026-08-18" },
        scope: { ownerId: "user-1", isWorkspaceWide: false },
        facts: {
          period: { startDate: "2026-08-16", endDate: "2026-08-22", asOfDate: "2026-08-18" },
          owner: { id: "user-1", name: "Guillaume" },
          commercial: {
            meetingsCompletedCount: 2,
            meetingsDistribution: { rdv_client_suivi: 2 },
            topActiveClients: [{ companyId: "comp-1", name: "ESC", activityCount: 1 }],
            staffingNeedsOpenedCount: 0,
            treatedNeedsCount: 0,
            topRequestedSkills: [],
            candidatesProposedCount: 0,
            newOpportunitiesCount: 0,
            signatureConviction: {
              opportunityId: "opp-1",
              title: "SRE Booking",
              companyName: "Voyage Privé",
              probability: 70,
              weightedGain: 86100,
              nextAction: "Relancer sourcing",
            },
          },
          recruitment: {
            interviewsCompletedCount: 0,
            topCandidatesToKeep: [],
            jobOffersMadeCount: 0,
          },
          nextWeek: {
            priorities: [
              { title: "Relance Voyage Privé", description: "Finaliser SRE", nextAction: "Appeler le client" },
            ],
          },
          declared: {
            difficulties: "Ressources tendues en devops",
            specificRequests: "Valider budget externe",
          },
          strategy: {
            strategicFocus: "Ouvrir le compte Mane & Fils en 2026",
          },
          dataCutoffAt: "2026-08-18T00:00:00.000Z",
          caveats: [],
        },
      },
    },
    headers: { "x-kredo-signature": "sha256=signature-ok" },
    computedSignature: "signature-ok",
  }
}

function llmResponseFixture() {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          executiveSummary: "La semaine du 16 au 22 août est marquée par 2 RDV de suivi client réalisés et une conviction forte sur l'opportunité SRE Booking Voyage Privé.",
          commercialCommentary: "Activité commerciale rythmée par 2 RDV de suivi client chez ESC et Régie Ligne d'Azur.",
          recruitmentCommentary: "Aucun entretien réalisé cette semaine sur le périmètre.",
          signatureConvictionCommentary: "Porté par l'opportunité SRE Booking Voyage Privé valorisée 86100 € avec une probabilité de 70%.",
          strategyProgression: "L'objectif stratégique Ouvrir le compte Mane & Fils en 2026 progresse conformément au plan.",
        }),
      },
    ],
    usage: { input_tokens: 500, output_tokens: 300 },
    model: "claude-sonnet-5",
  }
}

async function main() {
  check("workflow JSON est présent et valide", workflow.name === "report-manager-summary")

  const registry = { __input: webhookInput() }

  const validated = await runCodeNode("Validate Brief", registry)
  check("Validate Brief accepte le payload", validated[0].json.brief.reportType === "manager_summary")

  registry["Validate Brief"] = validated[0].json
  const assembled = await runCodeNode("Assemble Prompt", registry)
  check(
    "prompt interdit le wording Brief hebdomadaire",
    !assembled[0].json.systemPrompt.includes("Brief hebdomadaire"),
  )
  check(
    "prompt exige les champs du Compte-rendu Manager",
    assembled[0].json.systemPrompt.includes("executiveSummary") &&
      assembled[0].json.systemPrompt.includes("commercialCommentary"),
  )

  registry["Assemble Prompt"] = assembled[0].json
  const parsed = await runCodeNode("Parse & Validate Output", registry, llmResponseFixture())
  check("Parse & Validate Output valide les 5 champs narratifs", Boolean(parsed[0].json.narrative.executiveSummary))

  registry["Parse & Validate Output"] = parsed[0].json
  const quality = await runCodeNode("Quality Check", registry, parsed[0].json)
  const flags = quality[0].json.qaFlags
  check(
    "top_priorities_traceability valide facts.nextWeek.priorities",
    flags.find((f) => f.check === "top_priorities_traceability")?.passed === true,
  )

  registry["Quality Check"] = quality[0].json
  const callback = await runCodeNode("Prepare Callback", registry, quality[0].json)
  const cb = JSON.parse(callback[0].json.rawBody)

  check("Titre callback = Compte-rendu Manager — Semaine du 2026-08-16", cb.title === "Compte-rendu Manager — Semaine du 2026-08-16")
  check("ContentText contient Synthèse", cb.contentText.includes("1. Synthèse"))
  check("ContentText contient Activité commerciale", cb.contentText.includes("2. Activité commerciale"))
  check("ContentText contient Conviction signature", cb.contentText.includes("4. Conviction signature"))
  check("ContentText contient Difficultés", cb.contentText.includes("Ressources tendues"))
  check("ContentText contient Focus stratégique", cb.contentText.includes("Ouvrir le compte Mane & Fils"))
  check("status = succeeded quand la QA passe", cb.status === "succeeded")

  // Test de la règle "Une QA en échec ne doit pas produire status: succeeded"
  const failedQuality = structuredClone(quality[0].json)
  failedQuality.qaFlags.push({ check: "custom_check", passed: false, detail: "Échec forcé" })
  const failedCallback = await runCodeNode("Prepare Callback", registry, failedQuality)
  const failedCb = JSON.parse(failedCallback[0].json.rawBody)
  check("status = failed quand une QA échoue", failedCb.status === "failed")

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
