// Usage: node --env-file=.env.local scripts/n8n-status.mjs
//
// P0-1 (audit dette technique 2026-07-16) — visibilité repo <-> VPS n8n.
// Les 15 workflows sous n8n/workflows/*.json sont importés à la main sur le
// VPS Hostinger, session après session, sans garantie que ce qui tourne
// correspond au fichier committé. Ce script ne modifie RIEN sur le VPS —
// lecture seule via l'API REST n8n (GET /api/v1/workflows) — et compare
// juste le nombre de workflows présents et leur nombre de nœuds (proxy de
// drift, pas un diff complet : les credentials/webhook ids diffèrent par
// environnement par construction, un diff byte-à-byte serait bruyant).
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

function loadLocalWorkflows() {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".manifest.json"))
    .map((file) => {
      const json = JSON.parse(readFileSync(resolve(WORKFLOWS_DIR, file), "utf8"))
      return {
        file,
        name: json.name ?? basename(file, ".json"),
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

async function main() {
  const local = loadLocalWorkflows()
  const remote = await fetchRemoteWorkflows()
  const remoteByName = new Map(remote.map((w) => [w.name, w]))

  let missing = 0
  let nodeCountDrift = 0

  console.log("")
  console.log("Fichier                                        | Sur VPS | Actif VPS | Nœuds repo/VPS")
  console.log("-".repeat(100))

  for (const wf of local) {
    const remoteWf = remoteByName.get(wf.name)
    const onVps = Boolean(remoteWf)
    if (!onVps) missing++

    const remoteNodeCount = remoteWf?.nodes?.length ?? null
    const nodeDrift = onVps && remoteNodeCount !== null && remoteNodeCount !== wf.nodeCount
    if (nodeDrift) nodeCountDrift++

    const line = [
      wf.file.padEnd(46),
      (onVps ? "oui" : "NON").padEnd(7),
      (onVps ? (remoteWf.active ? "actif" : "inactif") : "-").padEnd(9),
      `${wf.nodeCount ?? "?"}/${remoteNodeCount ?? "?"}${nodeDrift ? "  <- DRIFT" : ""}`,
    ].join(" | ")
    console.log(line)
  }

  console.log("")
  console.log(
    `${local.length} workflows en repo · ${missing} absent(s) du VPS · ${nodeCountDrift} avec un nombre de nœuds différent`
  )

  if (missing > 0 || nodeCountDrift > 0) {
    console.log("")
    console.log("Action : pour chaque ligne signalée, réimporter le fichier repo via")
    console.log("n8n UI -> Workflows -> Import from File (voir le .SETUP.md correspondant).")
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error("Échec de connexion à l'API n8n :", err.message)
  process.exitCode = 2
})
