import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateRunStatus } from "@/lib/n8n/runs"

type CancelBody = {
  runId: string
}

export async function POST(request: Request) {
  // ── 1. Authentification ────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401 }
    )
  }

  // ── 2. Validation du body ──────────────────────────────────────────────────
  let body: CancelBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Body JSON invalide" },
      { status: 400 }
    )
  }

  const { runId } = body

  if (!runId) {
    return NextResponse.json(
      { error: "runId est requis" },
      { status: 400 }
    )
  }

  // ── 3. Vérification des permissions sur le run ─────────────────────────────
  const { data: run, error: runError } = await supabase
    .from("ai_intelligence_runs")
    .select("owner_id, status, config")
    .eq("id", runId)
    .single()

  if (runError || !run) {
    return NextResponse.json(
      { error: "Run introuvable" },
      { status: 404 }
    )
  }

  if (run.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Non autorisé à annuler ce run" },
      { status: 403 }
    )
  }

  if (run.status !== "queued" && run.status !== "running") {
    return NextResponse.json(
      { error: "Le run n'est ni en file d'attente ni en cours" },
      { status: 400 }
    )
  }

  // ── 4. Tentative d'annulation sur n8n (Best effort) ──────────────────────
  const config = run.config as { n8nExecutionId?: string } | null
  const executionId = config?.n8nExecutionId

  if (executionId) {
    try {
      const n8nUrl = process.env.N8N_API_URL
      const n8nKey = process.env.N8N_API_KEY
      
      if (n8nUrl && n8nKey) {
        const res = await fetch(`${n8nUrl}/api/v1/executions/${executionId}`, {
          method: "DELETE",
          headers: {
            "X-N8N-API-KEY": n8nKey,
          },
        })
        
        if (!res.ok) {
          console.warn(`[cancel-run] Échec de l'annulation n8n pour l'execution ${executionId}: ${res.status}`)
        }
      }
    } catch (e) {
      console.error(`[cancel-run] Erreur lors de l'appel à l'API n8n:`, e)
    }
  }

  // ── 5. Mise à jour du statut Kredo ───────────────────────────────────────
  try {
    await updateRunStatus(runId, "cancelled", {
      errorMessage: "Annulé par l'utilisateur",
    })
  } catch (err) {
    console.error("[cancel-run] updateRunStatus failed:", err)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, runId })
}
