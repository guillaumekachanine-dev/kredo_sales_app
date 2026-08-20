"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const WORKFLOW_PATH = path.join(__dirname, "..", "mission-001-run.json")

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
    $input: {
      first: () => ({ json: input ?? registry.__input ?? {} }),
      all: () => (input ? (Array.isArray(input) ? input.map((j) => ({ json: j })) : [{ json: input }]) : []),
    },
    $: (nodeName) => {
      if (registry[nodeName] !== undefined) {
        return { item: { json: registry[nodeName] } }
      }
      throw new Error(`Nœud non trouvé dans registry : ${nodeName}`)
    },
    $execution: { id: "exec-test-1" },
    $workflow: { id: "wf-test-1" },
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
  const defaultBody = {
    runId: "run-mission-123",
    workflowId: "mission-001-run",
    entityType: "workspace",
    entityId: "ws-456",
    workspaceId: "ws-456",
    userId: "user-789",
    callbackUrl: "https://kredo.example/api/n8n/callback",
    input: {
      schemaVersion: 1,
      missionSlug: "analyse-concurrentielle",
      missionVersion: 1,
      systemPrompt: "Tu es un analyste stratégique expert Kredo.",
      userPrompt: "Analyse les mouvements concurrentiels du secteur Spatial.",
      model: {
        provider: "anthropic",
        model: "claude-sonnet-5",
        maxOutputTokens: 4000,
      },
      corpus: { kept: 8, requested: 8, dropped: 0, totalChars: 12500 },
      budget: { maxTotalChars: 120000, maxCharsPerItem: 4000, maxItems: 120 },
      requestedAt: "2026-08-18T10:00:00.000Z",
    },
  }

  const mergedBody = { ...defaultBody, ...(overrides.body || {}) }
  if (overrides.input) {
    mergedBody.input = { ...defaultBody.input, ...overrides.input }
  }

  return {
    body: mergedBody,
    headers: overrides.headers || { "x-kredo-signature": "sha256=test-sig-hex" },
    computedSignature: overrides.computedSignature !== undefined ? overrides.computedSignature : "test-sig-hex",
  }
}

function anthropicResponseFixture(overrides = {}) {
  return {
    id: "msg_123",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: overrides.text || "## Synthèse de la mission\nVoici l'analyse détaillée du secteur Spatial.",
      },
    ],
    model: overrides.model || "claude-sonnet-5",
    stop_reason: "end_turn",
    usage: {
      input_tokens: overrides.inputTokens ?? 1450,
      output_tokens: overrides.outputTokens ?? 820,
    },
  }
}

async function main() {
  console.log("── Début des tests structurels mission-001-run")

  // ─── 1. Assertions structurelles sur le JSON ─────────────────────────────
  check("workflow JSON valide et inactif par défaut", workflow.active === false)
  check("workflow name défini", Boolean(workflow.name))
  check("workflow settings executionOrder v1", workflow.settings?.executionOrder === "v1")
  check("workflow contient exactement 11 nœuds", workflow.nodes.length === 11, `trouvé ${workflow.nodes.length}`)

  const expectedNodeNames = [
    "Webhook — Mission Run",
    "Verify Signature",
    "Validate Envelope",
    "Mark Run Running",
    "Call LLM",
    "Prepare Callback",
    "Sign Callback",
    "Callback",
    "Prepare Failure Callback",
    "Sign Failure Callback",
    "Callback (Failure)",
  ]

  for (const name of expectedNodeNames) {
    check(`nœud présent : "${name}"`, Boolean(nodes[name]))
  }

  // Interdiction de tout nœud métier
  const forbiddenKeywords = [
    "Assemble Prompt",
    "Hydrate Context",
    "Load Digests",
    "Load Articles",
    "Validate Output",
    "Quality Check",
    "Parse & Validate Output",
  ]
  for (const kw of forbiddenKeywords) {
    check(
      `aucun nœud de métier "${kw}"`,
      !workflow.nodes.some((n) => n.name.toLowerCase().includes(kw.toLowerCase())),
    )
  }

  // Configuration Webhook
  const webhookNode = nodes["Webhook — Mission Run"]
  check("Webhook path === 'mission-001-run'", webhookNode?.parameters?.path === "mission-001-run")
  check("Webhook httpMethod === 'POST'", webhookNode?.parameters?.httpMethod === "POST")
  check("Webhook responseMode === 'onReceived'", webhookNode?.parameters?.responseMode === "onReceived")
  check("Webhook options.rawBody === true", webhookNode?.parameters?.options?.rawBody === true)
  check("Webhook options.responseCode === 202", webhookNode?.parameters?.options?.responseCode === 202)

  // Secret HMAC unique dans les nœuds crypto
  check(
    "Verify Signature utilise REMPLACE_PAR_N8N_WEBHOOK_SECRET",
    nodes["Verify Signature"]?.parameters?.secret === "REMPLACE_PAR_N8N_WEBHOOK_SECRET",
  )
  check(
    "Sign Callback utilise REMPLACE_PAR_N8N_WEBHOOK_SECRET",
    nodes["Sign Callback"]?.parameters?.secret === "REMPLACE_PAR_N8N_WEBHOOK_SECRET",
  )
  check(
    "Sign Failure Callback utilise REMPLACE_PAR_N8N_WEBHOOK_SECRET",
    nodes["Sign Failure Callback"]?.parameters?.secret === "REMPLACE_PAR_N8N_WEBHOOK_SECRET",
  )

  // Nœud Call LLM — vérification stricte M-6
  const llmNode = nodes["Call LLM"]
  check("Call LLM url Anthropic Messages", llmNode?.parameters?.url === "https://api.anthropic.com/v1/messages")
  check("Call LLM retryOnFail: true", llmNode?.retryOnFail === true)
  check("Call LLM maxTries: 3", llmNode?.maxTries === 3)
  check("Call LLM waitBetweenTries: 3000", llmNode?.waitBetweenTries === 3000)
  check("Call LLM timeout 180000", llmNode?.parameters?.options?.timeout === 180000)

  const llmBody = llmNode?.parameters?.jsonBody || ""
  check(
    "Call LLM jsonBody référence explicitement Validate Envelope pour model.model",
    llmBody.includes("$('Validate Envelope').item.json.model.model"),
  )
  check(
    "Call LLM jsonBody référence explicitement Validate Envelope pour maxOutputTokens",
    llmBody.includes("$('Validate Envelope').item.json.model.maxOutputTokens"),
  )
  check(
    "Call LLM jsonBody référence explicitement Validate Envelope pour systemPrompt",
    llmBody.includes("$('Validate Envelope').item.json.systemPrompt"),
  )
  check(
    "Call LLM jsonBody référence explicitement Validate Envelope pour userPrompt",
    llmBody.includes("$('Validate Envelope').item.json.userPrompt"),
  )
  check(
    "Call LLM jsonBody ne dépend plus de $json.model",
    !llmBody.includes("$json.model"),
  )
  check(
    "Call LLM jsonBody ne dépend plus de $json.systemPrompt",
    !llmBody.includes("$json.systemPrompt"),
  )
  check(
    "Call LLM jsonBody ne dépend plus de $json.userPrompt",
    !llmBody.includes("$json.userPrompt"),
  )
  check(
    "Call LLM ne contient AUCUN identifiant 'claude-' en dur (M-6)",
    !llmBody.includes("claude-"),
  )

  // Gestion d'erreur et câblage continueErrorOutput sur 3, 4, 5, 6
  const faillibleNodes = ["Validate Envelope", "Mark Run Running", "Call LLM", "Prepare Callback"]
  for (const name of faillibleNodes) {
    check(`${name} onError === "continueErrorOutput"`, nodes[name]?.onError === "continueErrorOutput")
    const mainConnections = workflow.connections[name]?.main || []
    const errorBranch = mainConnections[1]
    check(
      `${name} relié en main[1] à Prepare Failure Callback`,
      Array.isArray(errorBranch) && errorBranch.some((c) => c.node === "Prepare Failure Callback"),
    )
  }

  // Vérification Prepare Callback code statique
  const prepareCallbackCode = nodes["Prepare Callback"]?.parameters?.jsCode || ""
  check(
    "Prepare Callback contient resultType: 'mission_report' littéral",
    prepareCallbackCode.includes("'mission_report'"),
  )
  check("Prepare Callback contient phase: 1", prepareCallbackCode.includes("phase: 1") || prepareCallbackCode.includes("phase:1"))
  check("Prepare Callback ne contient AUCUN JSON.parse (M-2)", !prepareCallbackCode.includes("JSON.parse"))
  check("Prepare Callback ne contient aucun mapResultType (M-7)", !prepareCallbackCode.includes("mapResultType"))

  // ─── 2. Assertions exécutables des nœuds Code ───────────────────────────
  console.log("\n── Début des tests exécutables des nœuds Code")

  // --- Tests Validate Envelope ---
  const validRegistry = { __input: webhookInput() }
  const validated = await runCodeNode("Validate Envelope", validRegistry)
  const valItem = validated[0].json

  check("Validate Envelope extrait runId", valItem.runId === "run-mission-123")
  check("Validate Envelope extrait workspaceId", valItem.workspaceId === "ws-456")
  check("Validate Envelope extrait userId", valItem.userId === "user-789")
  check("Validate Envelope extrait callbackUrl", valItem.callbackUrl === "https://kredo.example/api/n8n/callback")
  check("Validate Envelope extrait missionSlug", valItem.missionSlug === "analyse-concurrentielle")
  check("Validate Envelope extrait missionVersion", valItem.missionVersion === 1)
  check("Validate Envelope transmet systemPrompt intact", valItem.systemPrompt === "Tu es un analyste stratégique expert Kredo.")
  check("Validate Envelope transmet userPrompt intact", valItem.userPrompt === "Analyse les mouvements concurrentiels du secteur Spatial.")
  check("Validate Envelope transmet model", valItem.model?.model === "claude-sonnet-5" && valItem.model?.maxOutputTokens === 4000)

  // Rejet signature invalide
  let badSigError = false
  try {
    await runCodeNode("Validate Envelope", { __input: webhookInput({ headers: { "x-kredo-signature": "sha256=wrong" } }) })
  } catch (err) {
    badSigError = err.message.includes("Signature HMAC invalide")
  }
  check("Validate Envelope rejette une signature HMAC invalide", badSigError)

  // Tolérance header Majuscule X-KREDO-Signature
  let upperHeaderAccepted = false
  try {
    const res = await runCodeNode("Validate Envelope", {
      __input: webhookInput({
        headers: { "X-KREDO-Signature": "sha256=test-sig-hex" },
      }),
    })
    upperHeaderAccepted = res[0]?.json?.runId === "run-mission-123"
  } catch {
    upperHeaderAccepted = false
  }
  check("Validate Envelope accepte l'en-tête X-KREDO-Signature majuscule", upperHeaderAccepted)

  // Rejet workflowId incorrect
  let badWfError = false
  try {
    await runCodeNode("Validate Envelope", { __input: webhookInput({ body: { workflowId: "intel-021-monthly-watch-analysis" } }) })
  } catch (err) {
    badWfError = err.message.includes("workflowId invalide")
  }
  check("Validate Envelope rejette un workflowId incorrect", badWfError)

  // Rejet schemaVersion différent de 1
  let badSchemaError = false
  try {
    await runCodeNode("Validate Envelope", { __input: webhookInput({ input: { schemaVersion: 2 } }) })
  } catch (err) {
    badSchemaError = err.message.includes("schemaVersion doit valoir 1")
  }
  check("Validate Envelope rejette schemaVersion !== 1", badSchemaError)

  // Rejet champs racine manquants
  for (const f of ["runId", "workspaceId", "userId", "input", "callbackUrl"]) {
    let missingField = false
    try {
      await runCodeNode("Validate Envelope", { __input: webhookInput({ body: { [f]: undefined } }) })
    } catch (err) {
      missingField = err.message.includes("Champ requis manquant")
    }
    check(`Validate Envelope rejette si ${f} racine manque`, missingField)
  }

  // Rejet champs enveloppe manquants
  for (const f of ["missionSlug", "missionVersion", "systemPrompt", "userPrompt", "model"]) {
    let missingEnvField = false
    try {
      await runCodeNode("Validate Envelope", { __input: webhookInput({ input: { [f]: undefined } }) })
    } catch (err) {
      missingEnvField = err.message.includes("Champ enveloppe manquant")
    }
    check(`Validate Envelope rejette si input.${f} manque`, missingEnvField)
  }

  // Rejet model.model ou maxOutputTokens manquants
  let missingModelSubField = false
  try {
    await runCodeNode("Validate Envelope", { __input: webhookInput({ input: { model: { provider: "anthropic" } } }) })
  } catch (err) {
    missingModelSubField = err.message.includes("model.model / model.maxOutputTokens requis")
  }
  check("Validate Envelope rejette si model.model/maxOutputTokens manquent", missingModelSubField)

  // --- Tests Prepare Callback ---
  const llmFixture = anthropicResponseFixture()
  const callbackRegistry = {
    "Validate Envelope": valItem,
  }
  const callbackResult = await runCodeNode("Prepare Callback", callbackRegistry, llmFixture)
  const cbJson = callbackResult[0].json
  check("Prepare Callback renvoie callbackUrl", cbJson.callbackUrl === "https://kredo.example/api/n8n/callback")

  const payload = JSON.parse(cbJson.rawBody)
  check("Payload callback n8nExecutionId === 'exec-test-1'", payload.n8nExecutionId === "exec-test-1")
  check("Payload callback n8nWorkflowId === 'wf-test-1'", payload.n8nWorkflowId === "wf-test-1")
  check("Payload callback runId conforme", payload.runId === "run-mission-123")
  check("Payload callback phase === 1", payload.phase === 1)
  check("Payload callback resultType === 'mission_report'", payload.resultType === "mission_report")
  check("Payload callback status === 'succeeded'", payload.status === "succeeded")
  check("Payload callback contentJson.schemaVersion === 1", payload.contentJson?.schemaVersion === 1)
  check("Payload callback contentJson.missionSlug === 'analyse-concurrentielle'", payload.contentJson?.missionSlug === "analyse-concurrentielle")
  check(
    "Payload callback contentJson.rawOutput === texte brut LLM (aucun parse)",
    payload.contentJson?.rawOutput === llmFixture.content[0].text,
  )
  check("Payload callback contentText === texte brut LLM", payload.contentText === llmFixture.content[0].text)
  check("Payload callback title === 'Mission — analyse-concurrentielle'", payload.title === "Mission — analyse-concurrentielle")
  check("Payload callback modelProvider === 'anthropic'", payload.modelProvider === "anthropic")
  check("Payload callback modelUsed === 'claude-sonnet-5'", payload.modelUsed === "claude-sonnet-5")
  check("Payload callback tokensInput === 1450", payload.tokensInput === 1450)
  check("Payload callback tokensOutput === 820", payload.tokensOutput === 820)

  // Test conservation du markdown JSON brut sans altération
  const jsonMarkdownFixture = anthropicResponseFixture({
    text: "```json\n{\n  \"schemaVersion\": 1,\n  \"title\": \"Rapport\"\n}\n```",
  })
  const jsonMarkdownRes = await runCodeNode("Prepare Callback", callbackRegistry, jsonMarkdownFixture)
  const jsonMarkdownPayload = JSON.parse(jsonMarkdownRes[0].json.rawBody)
  check(
    "Prepare Callback préserve textuellement les blocs de code Markdown",
    jsonMarkdownPayload.contentJson.rawOutput === jsonMarkdownFixture.content[0].text,
  )

  // Test concaténation de multiples blocs text
  const multiBlockFixture = {
    content: [
      { type: "text", text: "Partie 1. " },
      { type: "image", source: {} },
      { type: "text", text: "Partie 2." },
    ],
    model: "claude-3-5-sonnet",
    usage: { input_tokens: 100, output_tokens: 50 },
  }
  const multiBlockRes = await runCodeNode("Prepare Callback", callbackRegistry, multiBlockFixture)
  const multiBlockPayload = JSON.parse(multiBlockRes[0].json.rawBody)
  check("Prepare Callback concatène tous les blocs de type text", multiBlockPayload.contentJson.rawOutput === "Partie 1. Partie 2.")

  // Test rejet si réponse LLM vide
  let emptyLlmError = false
  try {
    await runCodeNode("Prepare Callback", callbackRegistry, { content: [] })
  } catch (err) {
    emptyLlmError = err.message.includes("Réponse LLM vide")
  }
  check("Prepare Callback lève une erreur si la réponse LLM est vide", emptyLlmError)

  // --- Tests Prepare Failure Callback ---
  // Cas 1 : Échec après validation (Validate Envelope a réussi, erreur survient sur Call LLM)
  const failureInput = { error: { message: "Anthropic API overloaded" } }
  const failureRegistryNominal = {
    "Webhook — Mission Run": webhookInput(),
    "Validate Envelope": valItem,
  }
  const failRes1 = await runCodeNode("Prepare Failure Callback", failureRegistryNominal, failureInput)
  const failPayload1 = JSON.parse(failRes1[0].json.rawBody)

  check("Prepare Failure Callback status === 'failed'", failPayload1.status === "failed")
  check("Prepare Failure Callback phase === 1", failPayload1.phase === 1)
  check("Prepare Failure Callback resultType === 'mission_report'", failPayload1.resultType === "mission_report")
  check("Prepare Failure Callback runId conservé", failPayload1.runId === "run-mission-123")
  check("Prepare Failure Callback contentJson.error contient le message", failPayload1.contentJson?.error === "Anthropic API overloaded")
  check("Prepare Failure Callback contentText === ''", failPayload1.contentText === "")
  check("Prepare Failure Callback errorMessage conforme", failPayload1.errorMessage === "Anthropic API overloaded")
  check("Prepare Failure Callback title conforme", failPayload1.title === "Mission — analyse-concurrentielle — échec")
  check("Prepare Failure Callback n8nExecutionId présent", failPayload1.n8nExecutionId === "exec-test-1")
  check("Prepare Failure Callback n8nWorkflowId présent", failPayload1.n8nWorkflowId === "wf-test-1")

  // Cas 2 : Échec dès l'entrée (Validate Envelope a échoué, repli sur Webhook direct)
  const failureRegistryEarly = {
    "Webhook — Mission Run": webhookInput(),
  }
  const failRes2 = await runCodeNode("Prepare Failure Callback", failureRegistryEarly, { message: "Signature HMAC invalide" })
  const failPayload2 = JSON.parse(failRes2[0].json.rawBody)
  check("Prepare Failure Callback repli webhook extrait runId", failPayload2.runId === "run-mission-123")
  check("Prepare Failure Callback repli webhook extrait slug", failPayload2.title === "Mission — analyse-concurrentielle — échec")
  check("Prepare Failure Callback repli webhook callbackUrl valide", failRes2[0].json.callbackUrl === "https://kredo.example/api/n8n/callback")

  // Cas 3 : Ni Validate Envelope ni Webhook n'ont de runId / callbackUrl
  let missingBothError = false
  try {
    await runCodeNode("Prepare Failure Callback", { "Webhook — Mission Run": {} }, { message: "Erreur totale" })
  } catch (err) {
    missingBothError = err.message.includes("runId/callbackUrl absents")
  }
  check("Prepare Failure Callback lève une erreur si runId/callbackUrl introuvables", missingBothError)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error("Erreur fatale dans le harnais :", err)
  process.exitCode = 1
})
