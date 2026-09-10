import "server-only"

// ─────────────────────────────────────────────────────────────────────────────
//  Instrumentation de diagnostic — audit performance data (2026-09-10)
//
//  Enveloppe le `fetch` du client Supabase serveur pour tracer CHAQUE requête
//  PostgREST : table/vue visée, durée, taille de la réponse, ordre d'émission.
//  Objectif : compter les allers-retours réellement déclenchés par une page et
//  distinguer les requêtes parallèles des cascades séquentielles.
//
//  STRICTEMENT INERTE hors `KREDO_PERF_TRACE=1` : `createTracingFetch()` renvoie
//  `undefined`, donc `@supabase/ssr` conserve son `fetch` par défaut. Aucun coût
//  en production, aucune dépendance ajoutée.
//
//  Lecture : chaque ligne `[perf]` est un aller-retour réseau. `t0` est l'offset
//  d'émission depuis le premier appel de la requête HTTP courante — deux lignes
//  au même `t0` sont parallèles, des `t0` croissants par paliers = waterfall.
// ─────────────────────────────────────────────────────────────────────────────

export const PERF_TRACE_ENABLED = process.env.KREDO_PERF_TRACE === "1"

let origin: number | null = null

function relative(now: number): number {
  if (origin === null || now - origin > 15_000) origin = now
  return Math.round(now - origin)
}

/** Extrait `table?select=…` d'une URL PostgREST, tronqué pour rester lisible. */
function describe(url: string): string {
  const q = url.indexOf("/rest/v1/")
  if (q === -1) return url.slice(0, 120)
  const tail = url.slice(q + "/rest/v1/".length)
  const [path, search = ""] = tail.split("?")
  const params = new URLSearchParams(search)
  const select = params.get("select") ?? ""
  params.delete("select")
  const filters = params.toString()
  return [
    path,
    select ? `select=${select.length > 90 ? select.slice(0, 90) + "…" : select}` : "",
    filters ? `[${filters.length > 70 ? filters.slice(0, 70) + "…" : filters}]` : "",
  ]
    .filter(Boolean)
    .join(" ")
}

export function createTracingFetch(): typeof fetch | undefined {
  if (!PERF_TRACE_ENABLED) return undefined

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const started = performance.now()
    const t0 = relative(started)
    const response = await fetch(input as RequestInfo, init)
    const clone = response.clone()
    const body = await clone.text().catch(() => "")
    const ms = performance.now() - started
    const kind = url.includes("/rest/v1/rpc/") ? "RPC " : url.includes("/auth/v1/") ? "AUTH" : "REST"
    console.log(
      `[perf] ${kind} t0=${String(t0).padStart(5)}ms dur=${ms.toFixed(1).padStart(7)}ms ` +
        `bytes=${String(body.length).padStart(7)} ${describe(url)}`,
    )
    return response
  }
}
