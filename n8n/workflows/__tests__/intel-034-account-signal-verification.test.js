"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const workflowPath = path.join(__dirname, "..", "intel-034-account-signal-verification.json")
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"))
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

async function runCodeNode(name, registry, input) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const items = [{ json: input ?? {} }]
  const sandbox = {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      return { item: { json: registry[nodeName] }, first: () => ({ json: registry[nodeName] }) }
    },
    $execution: { id: "exec-034" },
    $workflow: { id: "wf-034" },
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
    encodeURIComponent,
  }
  const script = new vm.Script(`(async () => {\n${node.parameters.jsCode}\n})()`, {
    filename: `${name}.js`,
  })
  const result = await script.runInContext(vm.createContext(sandbox))
  if (Array.isArray(result) && result[0]?.json) registry[name] = result[0].json
  return result
}

const ids = {
  workspace: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  company: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  signal: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  user: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  run: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
}

function validatedPayload() {
  return {
    runId: ids.run,
    workspaceId: ids.workspace,
    companyId: ids.company,
    signalId: ids.signal,
    userId: ids.user,
    callbackUrl: "https://kredo.example/api/n8n/callback",
    input: {
      schemaVersion: 1,
      companyId: ids.company,
      signal: { id: ids.signal, title: "Acquisition stratégique confirmée", summary: "Le groupe rachète Acme." },
      initialSource: { id: null, name: "Source initiale", url: "https://initial.example/article" },
    },
  }
}

async function main() {
  check("workflow livré inactif", workflow.active === false)
  check("webhook exact", nodes["Webhook — Account Signal Verification"].parameters.path === "intel-034-account-signal-verification")
  check("trois secrets restent des placeholders", workflow.nodes.filter((node) => node.parameters?.secret === "REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET").length === 3)

  const registry = {}
  const payload = validatedPayload()
  const validateResult = await runCodeNode("Validate Payload", registry, {
    body: {
      runId: payload.runId,
      workspaceId: payload.workspaceId,
      companyId: payload.companyId,
      entityId: payload.signalId,
      entityType: "account_signal",
      userId: payload.userId,
      callbackUrl: payload.callbackUrl,
      input: payload.input,
    },
    headers: { "x-kredo-signature": "sha256=valid" },
    computedSignature: "valid",
  })
  check("payload signé accepté", validateResult[0].json.signalId === ids.signal)

  const queryResult = await runCodeNode("Build Secondary Queries", registry, {
    id: ids.signal,
    workspace_id: ids.workspace,
    company_id: ids.company,
    title: payload.input.signal.title,
    summary: payload.input.signal.summary,
    detected_at: "2026-08-13T10:00:00.000Z",
    primary_source_id: null,
    companies: { id: ids.company, name: "Entreprise Test", website: "https://entreprise.example" },
    intelligence_sources: { source_name: "Source initiale", source_url: "https://initial.example/article" },
  })
  const queryContext = queryResult[0].json
  check("premier vecteur exclut le domaine initial", decodeURIComponent(queryContext.queryAUrl).includes("-site:initial.example"))
  check("second vecteur exclut le domaine initial", decodeURIComponent(queryContext.queryBUrl).includes("-site:initial.example"))
  check("deux vecteurs distincts sont construits", queryContext.queryA !== queryContext.queryB)
  check("deux moteurs de recherche distincts sont consultés", new URL(queryContext.queryAUrl).hostname !== new URL(queryContext.queryBUrl).hostname)

  registry["Secondary Search — Company + Signal"] = {
    body: '<rss><channel><item><title>Confirmation indépendante</title><link>https://news.google.test/a</link><source url="https://journal.example">Journal indépendant</source><pubDate>Wed, 13 Aug 2026 10:00:00 GMT</pubDate><description>Une confirmation.</description></item><item><title>Copie source initiale</title><link>https://initial.example/b</link><source url="https://initial.example">Source initiale</source></item></channel></rss>',
  }
  registry["Secondary Search — Event Terms"] = {
    body: '<rss><channel><item><title>Autre recoupement</title><link>https://media.example/c</link><source url="https://media.example">Média tiers</source></item></channel></rss>',
  }
  const evidenceResult = await runCodeNode("Assemble Independent Evidence", registry, queryContext)
  const evidenceContext = evidenceResult[0].json
  check("source initiale réellement exclue", evidenceContext.independentEvidence.every((item) => item.sourceName !== "Source initiale"))
  check("deux éditeurs indépendants conservés", evidenceContext.independentEvidence.length === 2)
  check("vecteurs tracés", new Set(evidenceContext.independentEvidence.map((item) => item.vector)).size === 2)

  await runCodeNode("Build Verification Prompt", registry, evidenceContext)
  const llmResponseWithoutProof = {
    model: "claude-sonnet-5",
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 40 },
    content: [{ type: "text", text: '{"verdict":"confirmed","rationale":"Certain","supportingEvidenceIds":[],"contradictingEvidenceIds":[]}' }],
  }
  const guardedResult = await runCodeNode("Parse Verification", registry, llmResponseWithoutProof)
  check("confirmation sans preuve rétrogradée", guardedResult[0].json.verification.verdict === "insufficient_evidence")

  const proofId = evidenceContext.independentEvidence[0].id
  const llmResponseWithProof = {
    ...llmResponseWithoutProof,
    content: [{ type: "text", text: `\`\`\`json\n{"verdict":"confirmed","rationale":"Recoupé","supportingEvidenceIds":["${proofId}","id-invente"],"contradictingEvidenceIds":[]}\n\`\`\`` }],
  }
  const confirmedResult = await runCodeNode("Parse Verification", registry, llmResponseWithProof)
  check("confirmation avec preuve indépendante conservée", confirmedResult[0].json.verification.verdict === "confirmed")
  check("identifiants inventés supprimés", confirmedResult[0].json.verification.supportingEvidenceIds.length === 1)

  registry["Parse Verification"] = confirmedResult[0].json
  const callbackResult = await runCodeNode("Prepare Callback", registry, confirmedResult[0].json)
  const callbackBody = JSON.parse(callbackResult[0].json.rawBody)
  check("résultat callback correctement typé", callbackBody.resultType === "account_signal_verification")
  check("callback contient le vrai verdict", callbackBody.contentJson.verdict === "confirmed")
  check("garde anti faux-vérifié exposée en QA", callbackBody.qaFlags.find((flag) => flag.check === "no_false_verified_state")?.passed === true)

  const insufficientResult = await runCodeNode("Build Insufficient Result", registry, { ...evidenceContext, independentEvidence: [] })
  check("absence de sources reste non concluante", insufficientResult[0].json.verification.verdict === "insufficient_evidence")
  check("absence de sources n'invente aucun modèle", insufficientResult[0].json.llmUsage.model === null)

  console.log(`\n${passed} assertion(s) OK, ${failed} échec(s).`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
