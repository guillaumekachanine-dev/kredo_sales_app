// Usage: node --env-file=.env.local scripts/n8n-status.mjs
//
// P0-1 (audit dette technique 2026-07-16) — visibilité repo <-> VPS n8n.
// Les workflows sous n8n/workflows/*.json sont importés à la main sur le VPS
// Hostinger, session après session, sans garantie que ce qui tourne
// correspond au fichier committé. Ce script ne modifie RIEN sur le VPS —
// lecture seule via l'API REST n8n (GET /api/v1/workflows).
//
// Identifiant de matching : le PATH du nœud Webhook (ce que Next.js appelle
// réellement via callN8nWebhook — cf. src/lib/n8n/client.ts, POST
// {BASE}/webhook/{path}), PAS le nom affiché du workflow. Le nom est
// renommé à la main dans l'UI n8n au fil des sessions (v2/v3/VAugm/Lot N/
// FINAL stable...) et n'est donc pas un identifiant stable — vérifié en
// audit live le 2026-07-16 : matcher par nom exact rate des workflows bien
// présents ET peut piocher au hasard entre deux copies homonymes.
// Les workflows déclenchés par cron (pas de nœud Webhook) retombent sur un
// matching par nom, en dernier recours, signalé comme tel.
//
// Limite assumée : le nombre de nœuds est un proxy de drift, pas un diff de
// contenu. Une édition en place (paramètres/code d'un nœud existant modifié
// sans ajouter/retirer de nœud) ne sera pas détectée — vérifié en audit live
// sur "intel-020-communication" (copie VPS active renommée "VAugm", nombre
// de nœuds identique au repo, contenu non comparé ici).
//
// Prérequis (une fois, sur le VPS) :
//   n8n UI -> Settings -> n8n API -> Create an API Key
//   Ajouter dans .env.local (jamais commité — voir .env.example) :
//     N8N_API_URL=https://n8n.srv1209998.hstgr.cloud
//     N8N_API_KEY=<la clé>

import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve, basename } from "node:path"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const WORKFLOWS_DIR = resolve(ROOT, "n8n/workflows")

const API_URL = process.env.N8N_API_URL
const API_KEY = process.env.N8N_API_KEY

if (!API_URL || !API_KEY) {
  console.error(
    "Manque N8N_API_URL et/ou N8N_API_KEY dans l'environnement.\n" +
      "Génère une clé : VPS n8n -> Settings -> n8n API -> Create an API Key.\n" +
      "Puis ajoute-les à .env.local (voir .env.example)."
  )
  process.exit(2)
}

function webhookPathOf(nodes) {
  const wh = (nodes ?? []).find((n) => n.type?.includes("webhook"))
  return wh?.parameters?.path ?? null
}

function loadLocalWorkflows() {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".manifest.json"))
    .map((file) => {
      const json = JSON.parse(readFileSync(resolve(WORKFLOWS_DIR, file), "utf8"))
      return {
        file,
        name: json.name ?? basename(file, ".json"),
        webhookPath: webhookPathOf(json.nodes),
        nodeCount: Array.isArray(json.nodes) ? json.nodes.length : null,
      }
    })
}

async function fetchRemoteWorkflows() {
  const results = []
  let cursor
  do {
    const url = new URL("/api/v1/workflows", API_URL)
    url.searchParams.set("limit", "250")
    if (cursor) url.searchParams.set("cursor", cursor)
    const res = await fetch(url, { headers: { "X-N8N-API-KEY": API_KEY } })
    if (!res.ok) {
      throw new Error(`n8n API ${res.status} ${res.statusText}: ${await res.text()}`)
    }
    const body = await res.json()
    results.push(...(body.data ?? []))
    cursor = body.nextCursor ?? null
  } while (cursor)
  return results
}

function matchRemote(wf, remote) {
  if (wf.webhookPath) {
    return {
      kind: "path",
      matches: remote.filter((w) => webhookPathOf(w.nodes) === wf.webhookPath),
    }
  }
  return {
    kind: "name (pas de webhook — cron, best-effort)",
    matches: remote.filter((w) => w.name === wf.name),
  }
}

async function main() {
  const local = loadLocalWorkflows()
  const remote = await fetchRemoteWorkflows()

  let missing = 0
  let nodeCountDrift = 0
  let duplicateClutter = 0

  console.log("")
  for (const wf of local) {
    const { kind, matches } = matchRemote(wf, remote)
    const active = matches.filter((m) => m.active)
    const reference = active[0] ?? matches[0] ?? null

    console.log(`${wf.file}  (match par ${kind})`)

    if (matches.length === 0) {
      console.log(`  -> ABSENT du VPS`)
      missing++
    } else {
      if (matches.length > 1) {
        console.log(`  -> ${matches.length} copies sur le VPS (${active.length} active(s)) — clutter à nettoyer`)
        duplicateClutter++
      }
      const nodeDrift = reference.nodes.length !== wf.nodeCount
      if (nodeDrift) nodeCountDrift++
      console.log(
        `  -> référence: id=${reference.id} active=${reference.active} nœuds repo/VPS=${wf.nodeCount}/${reference.nodes.length}${nodeDrift ? "  <- DRIFT" : ""}`
      )
      if (!reference.active) {
        console.log(`  -> ATTENTION: aucune copie active pour ce path/name`)
      }
    }
    console.log("")
  }

  console.log(
    `${local.length} workflows en repo · ${missing} absent(s) · ${nodeCountDrift} avec un nombre de nœuds différent · ${duplicateClutter} avec des doublons sur le VPS`
  )

  if (missing > 0 || nodeCountDrift > 0) {
    console.log("")
    console.log("Action : réimporter le fichier repo via n8n UI -> Workflows -> Import from")
    console.log("File (voir le .SETUP.md correspondant) pour les lignes ABSENT/DRIFT.")
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error("Échec de connexion à l'API n8n :", err.message)
  process.exitCode = 2
})
