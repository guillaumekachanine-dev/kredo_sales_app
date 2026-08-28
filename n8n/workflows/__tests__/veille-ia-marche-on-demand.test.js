"use strict"

/* eslint-disable @typescript-eslint/no-require-imports */

// Harnais du DEUXIÈME déclencheur du workflow veille : le webhook
// `veille-ia-marche-on-demand` (génération de digest à la demande).
//
// Le pipeline métier (collecte → classement → analyse → digest) est couvert par
// `veille-hebdomadaire-kredo.test.js` — ce harnais ne teste QUE ce que le patch
// `scripts/patch-veille-on-demand.py` ajoute : entrée webhook, vérification HMAC,
// nœud de contexte commun, cycle de vie du run, callbacks signés, et
// non-régression de la branche cron.
//
// À lancer explicitement (hors `npm test`) :
//   node n8n/workflows/__tests__/veille-ia-marche-on-demand.test.js

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const crypto = require("node:crypto")

const workflowPath = path.join(__dirname, "..", "veille-hebdomadaire-kredo.json")
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"))
const nodes = Object.fromEntries(workflow.nodes.map((node) => [node.name, node]))
const conn = workflow.connections

const SECRET = "test-secret"
const CTX_NODE = "Résoudre Contexte Déclenchement"
const CRON_WS = "98dcd39d-f87b-4f9d-add9-ce76d635953a"

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

function checkThrows(label, fn) {
  try {
    fn()
    failed += 1
    console.error(`FAIL ${label} — aucune exception levée`)
  } catch {
    passed += 1
    console.log(`ok   ${label}`)
  }
}

/** Exécute un nœud Code (`runOnceForAllItems`) avec voisins + globales n8n simulés. */
function runCodeNode(name, { input = [], registry = {} } = {}) {
  const node = nodes[name]
  if (!node) throw new Error(`Nœud introuvable : ${name}`)
  const items = input.map((json) => ({ json }))
  const sandbox = {
    $input: { first: () => items[0], all: () => items },
    $: (nodeName) => {
      if (!(nodeName in registry)) throw new Error(`Nœud non exécuté : ${nodeName}`)
      const rows = registry[nodeName]
      return {
        all: () => rows.map((json) => ({ json })),
        first: () => ({ json: rows[0] }),
        item: { json: rows[0] },
      }
    },
    $execution: { id: "exec-test-1" },
    $workflow: { id: "wf-test-1" },
    console: { log() {}, error() {} },
    Date, JSON, Math, URL, Array, Object, Set, Map, Number, String, RegExp, Error,
  }
  const script = new vm.Script(`(() => {\n${node.parameters.jsCode}\n})()`, { filename: `${name}.js` })
  return script.runInContext(vm.createContext(sandbox))
}

// ─── 1. Structure : nouveaux nœuds présents ─────────────────────────────────
const webhook = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook")
check("workflow renommé « KREDO — Veille IA & Marché »", workflow.name === "KREDO — Veille IA & Marché", workflow.name)
check("nœud webhook présent", Boolean(webhook))
check("webhook path = veille-ia-marche-on-demand", webhook && webhook.parameters.path === "veille-ia-marche-on-demand")
check("webhook POST + réponse 202 immédiate",
  webhook && webhook.parameters.httpMethod === "POST" &&
  webhook.parameters.responseMode === "onReceived" &&
  webhook.parameters.options.responseCode === 202 &&
  webhook.parameters.options.rawBody === true)
check("scheduleTrigger cron conservé (0 6 * * 1)",
  workflow.nodes.some((n) =>
    n.type === "n8n-nodes-base.scheduleTrigger" &&
    JSON.stringify(n.parameters).includes("0 6 * * 1")))
for (const n of ["Vérifier Signature", "Valider Signature & Payload", "Contexte Déclenchement Programmé",
  CTX_NODE, "Router Run Manuel", "Marquer Run Running", "Router Callback Digest",
  "Préparer Callback Digest", "Signer Callback Digest", "Envoyer Callback Digest",
  "Préparer Callback Échec", "Signer Callback Échec", "Envoyer Callback Échec"]) {
  check(`nœud « ${n} » présent`, n in nodes)
}

// ─── 2. Aucun secret en clair ──────────────────────────────────────────────
const rawJson = JSON.stringify(workflow)
check("aucun secret HMAC en clair (placeholder uniquement)",
  !/"secret"\s*:\s*"(?!REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET")[^"]+"/.test(rawJson))
check("les nœuds crypto utilisent le placeholder de secret",
  workflow.nodes.filter((n) => n.type === "n8n-nodes-base.crypto")
    .every((n) => n.parameters.secret === "REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET"))

// ─── 3. Vérification HMAC (Valider Signature & Payload) ─────────────────────
function signedBody(bodyObj) {
  const raw = JSON.stringify(bodyObj)
  const sig = "sha256=" + crypto.createHmac("sha256", SECRET).update(raw).digest("hex")
  return { raw, sig }
}
const validPayload = {
  runId: "run-123", workflowId: "veille-ia-marche-on-demand", entityType: "workspace",
  entityId: "ws-777", workspaceId: "ws-777", userId: "user-9",
  input: { schemaVersion: 1, triggerMode: "manual" },
  callbackUrl: "https://kredo.example/api/n8n/callback",
}
const { raw: validRaw, sig: validSig } = signedBody(validPayload)
const computed = crypto.createHmac("sha256", SECRET).update(validRaw).digest("hex")

const validItem = { body: validPayload, headers: { "x-kredo-signature": validSig }, computedSignature: computed }

const okOut = runCodeNode("Valider Signature & Payload", { input: [validItem] })
check("signature valide → normalise le contexte",
  okOut[0].json.__trigger === "webhook" &&
  okOut[0].json.runId === "run-123" &&
  okOut[0].json.workspaceId === "ws-777" &&
  okOut[0].json.userId === "user-9" &&
  okOut[0].json.callbackUrl === validPayload.callbackUrl &&
  okOut[0].json.triggerMode === "manual")

checkThrows("signature invalide → rejet", () =>
  runCodeNode("Valider Signature & Payload", {
    input: [{ body: validPayload, headers: { "x-kredo-signature": "sha256=deadbeef" }, computedSignature: computed }],
  }))
checkThrows("signature absente → rejet", () =>
  runCodeNode("Valider Signature & Payload", {
    input: [{ body: validPayload, headers: {}, computedSignature: computed }],
  }))
checkThrows("champ requis manquant (workspaceId) → rejet", () => {
  const body = { ...validPayload }
  delete body.workspaceId
  const { sig } = signedBody(body)
  const c = crypto.createHmac("sha256", SECRET).update(JSON.stringify(body)).digest("hex")
  runCodeNode("Valider Signature & Payload", { input: [{ body, headers: { "x-kredo-signature": sig }, computedSignature: c }] })
})
checkThrows("input.triggerMode ≠ manual → rejet", () => {
  const body = { ...validPayload, input: { schemaVersion: 1, triggerMode: "scheduled" } }
  const { sig } = signedBody(body)
  const c = crypto.createHmac("sha256", SECRET).update(JSON.stringify(body)).digest("hex")
  runCodeNode("Valider Signature & Payload", { input: [{ body, headers: { "x-kredo-signature": sig }, computedSignature: c }] })
})

// ─── 4. Contexte : manuel prend le workspace du PAYLOAD, cron la constante ──
const cronCtx = runCodeNode("Contexte Déclenchement Programmé", { input: [{}] })
check("branche cron : workspace = constante mono-tenant, triggerMode=scheduled",
  cronCtx[0].json.workspaceId === CRON_WS &&
  cronCtx[0].json.triggerMode === "scheduled" &&
  cronCtx[0].json.runId === null)

const resolvedManual = runCodeNode(CTX_NODE, { input: [okOut[0].json] })
check("Résoudre Contexte (manuel) : workspace du payload, runId conservé, date du jour",
  resolvedManual[0].json.workspaceId === "ws-777" &&
  resolvedManual[0].json.runId === "run-123" &&
  resolvedManual[0].json.triggerMode === "manual" &&
  /^\d{4}-\d{2}-\d{2}$/.test(resolvedManual[0].json.digestDate))
check("Résoudre Contexte (manuel) ≠ constante mono-tenant en dur",
  resolvedManual[0].json.workspaceId !== CRON_WS)

const resolvedCron = runCodeNode(CTX_NODE, { input: [cronCtx[0].json] })
check("Résoudre Contexte (cron) : runId null, workspace constante",
  resolvedCron[0].json.runId === null && resolvedCron[0].json.workspaceId === CRON_WS)

// ─── 5. Build Contexte KREDO : plus de workspace en dur ────────────────────
const buildCtxCode = nodes["Build Contexte KREDO"].parameters.jsCode
check("Build Contexte KREDO ne contient plus l'UUID workspace en dur",
  !buildCtxCode.includes(CRON_WS))
check("Build Contexte KREDO lit workspaceId/digestDate depuis Résoudre Contexte",
  buildCtxCode.includes(`$('${CTX_NODE}').first().json.workspaceId`) &&
  buildCtxCode.includes(`$('${CTX_NODE}').first().json.digestDate`))
check("Préparer Lignes Articles & Créer Digest sans UUID en dur",
  !nodes["Préparer Lignes Articles"].parameters.jsCode.includes(CRON_WS) &&
  !JSON.stringify(nodes["Créer Digest"].parameters).includes(CRON_WS))

// ─── 6. Callback succès : contrat vis-à-vis de OnDemandDigestInput / callback ─
const REGISTRY_OK = {
  [CTX_NODE]: [{ runId: "run-123", callbackUrl: "https://kredo.example/api/n8n/callback", digestDate: "2026-08-28" }],
  "Créer Digest": [{ id: "digest-abc", titre_digest: "Semaine du 28/08" }],
  "Remplacer Articles Digest (RPC)": [
    { id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }, { id: "a5" },
  ],
  "Dédup + Filtre Récence + Préfiltre Qualité": [
    { sourcesContributrices: 12 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
  ],
}
const cbOk = runCodeNode("Préparer Callback Digest", { input: [{}], registry: REGISTRY_OK })
const cbOkBody = JSON.parse(cbOk[0].json.rawBody)
check("callback succès : POST vers callbackUrl du contexte",
  cbOk[0].json.callbackUrl === "https://kredo.example/api/n8n/callback")
check("callback succès : resultType=watch_digest_generation, phase=1, status=succeeded",
  cbOkBody.resultType === "watch_digest_generation" && cbOkBody.phase === 1 && cbOkBody.status === "succeeded")
check("callback succès : runId propagé + identifiants n8n",
  cbOkBody.runId === "run-123" && cbOkBody.n8nExecutionId === "exec-test-1" && cbOkBody.n8nWorkflowId === "wf-test-1")
check("callback succès : contentJson porte exactement les 5 clés du contrat",
  ["digestId", "digestDate", "articlesCount", "candidatesCount", "sourcesCount"]
    .every((k) => k in cbOkBody.contentJson))
check("callback succès : valeurs contentJson dérivées des nœuds voisins",
  cbOkBody.contentJson.digestId === "digest-abc" &&
  cbOkBody.contentJson.digestDate === "2026-08-28" &&
  cbOkBody.contentJson.articlesCount === 5 &&
  cbOkBody.contentJson.candidatesCount === 40 &&
  cbOkBody.contentJson.sourcesCount === 12)

// ─── 7. Callback échec ────────────────────────────────────────────────────
const cbFail = runCodeNode("Préparer Callback Échec", {
  input: [{ error: { message: "LLM timeout" } }],
  registry: { [CTX_NODE]: [{ runId: "run-123", callbackUrl: "https://kredo.example/api/n8n/callback" }] },
})
const cbFailBody = JSON.parse(cbFail[0].json.rawBody)
check("callback échec : status=failed, resultType/phase imposés, errorMessage transmis",
  cbFailBody.status === "failed" && cbFailBody.resultType === "watch_digest_generation" &&
  cbFailBody.phase === 1 && cbFailBody.errorMessage.includes("LLM timeout"))

const cbFailCron = runCodeNode("Préparer Callback Échec", {
  input: [{ error: { message: "boom" } }],
  registry: { [CTX_NODE]: [{ runId: null, callbackUrl: null }] },
})
check("callback échec : déclenchement cron (runId null) → aucun item émis",
  Array.isArray(cbFailCron) && cbFailCron.length === 0)

// ─── 8. Câblage ───────────────────────────────────────────────────────────
const edge = (from, to, idx = 0) =>
  (conn[from]?.main?.[idx] ?? []).some((c) => c.node === to)

check("les DEUX déclencheurs convergent vers Résoudre Contexte",
  edge("Webhook Veille On-Demand", "Vérifier Signature") &&
  edge("Vérifier Signature", "Valider Signature & Payload") &&
  edge("Valider Signature & Payload", CTX_NODE) &&
  edge("Lundi 6h Europe Paris", "Contexte Déclenchement Programmé") &&
  edge("Contexte Déclenchement Programmé", CTX_NODE))
check("Résoudre Contexte alimente le pipeline existant (Récupérer Secteurs Actifs)",
  edge(CTX_NODE, "Récupérer Secteurs Actifs"))
check("le scheduleTrigger ne va PLUS directement au pipeline",
  !edge("Lundi 6h Europe Paris", "Récupérer Secteurs Actifs"))
check("cycle de vie : Résoudre Contexte → Router Run Manuel → Marquer Run Running",
  edge(CTX_NODE, "Router Run Manuel") &&
  edge("Router Run Manuel", "Marquer Run Running", 0))
check("Marquer Run Running : PATCH ai_intelligence_runs status=running",
  /ai_intelligence_runs\?id=eq/.test(nodes["Marquer Run Running"].parameters.url) &&
  /"running"|running/.test(nodes["Marquer Run Running"].parameters.jsonBody))
check("fin de pipeline : Remplacer Articles Digest (RPC) → Router Callback Digest → …",
  edge("Remplacer Articles Digest (RPC)", "Router Callback Digest") &&
  edge("Router Callback Digest", "Préparer Callback Digest", 0) &&
  edge("Préparer Callback Digest", "Signer Callback Digest") &&
  edge("Signer Callback Digest", "Envoyer Callback Digest"))

const guarded = ["Appel Claude Haiku — Classement", "Appel Claude Sonnet — Analyse", "Créer Digest", "Remplacer Articles Digest (RPC)"]
check("nœuds sensibles : sortie d'erreur → Préparer Callback Échec",
  guarded.every((g) =>
    nodes[g].onError === "continueErrorOutput" &&
    (conn[g]?.main?.[1] ?? []).some((c) => c.node === "Préparer Callback Échec")))
check("callback échec : Préparer → Signer → Envoyer",
  edge("Préparer Callback Échec", "Signer Callback Échec") &&
  edge("Signer Callback Échec", "Envoyer Callback Échec"))

// ─── 9. Idempotence du digest préservée ───────────────────────────────────
check("Créer Digest : upsert on_conflict=workspace_id,digest_date intact",
  nodes["Créer Digest"].parameters.url.includes("on_conflict=workspace_id,digest_date"))
check("remplacement d'articles via RPC replace_veille_digest_articles intact",
  nodes["Remplacer Articles Digest (RPC)"].parameters.url.includes("replace_veille_digest_articles"))

// ─── Bilan ────────────────────────────────────────────────────────────────
console.log(`\n${passed} ok · ${failed} échec(s)`)
process.exit(failed === 0 ? 0 : 1)
