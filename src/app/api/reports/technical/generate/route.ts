import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createReportsServiceClient,
  saveAsDocumentWithClient,
} from "@/app/(app)/reports/_data/reports-actions"
import type {
  ReportPeriodPreset,
  SaveAsDocumentInput,
  TechnicalAlertItem,
  TechnicalReportDocumentContent,
  TechnicalReportFacts,
  TopAutomationItem,
  WorkflowCostItem,
} from "@/app/(app)/reports/_data/reports-types"
import { workflowLabelForRunType } from "@/lib/automations/workflow-labels"

type GenerateBody = {
  periodPreset?: ReportPeriodPreset | "day"
  customStart?: string
  customEnd?: string
}

function formatDateFR(dateIso: string): string {
  if (!dateIso) return ""
  const d = new Date(dateIso)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function POST(request: Request) {
  // ── 1. Authentification ────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  // ── 2. Résolution du workspace ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Workspace introuvable" }, { status: 403 })
  }

  const workspaceId = profile.workspace_id

  // ── 3. Parsing du body ─────────────────────────────────────────────────────
  let body: GenerateBody
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const preset = (body.periodPreset ?? "month") as ReportPeriodPreset | "day"
  const now = new Date()
  let startDate = new Date(now)
  let endDate = new Date(now)

  if (preset === "day") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  } else if (preset === "week") {
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0)
    endDate = new Date(now)
  } else if (preset === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    endDate = new Date(now)
  } else if (preset === "quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3
    startDate = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0)
    endDate = new Date(now)
  } else if (preset === "year") {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
    endDate = new Date(now)
  } else if (preset === "custom" && body.customStart && body.customEnd) {
    startDate = new Date(`${body.customStart}T00:00:00`)
    endDate = new Date(`${body.customEnd}T23:59:59`)
  }

  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  let periodLabel = "Mois en cours"
  if (preset === "day") periodLabel = `Journée du ${formatDateFR(startISO)}`
  else if (preset === "week") periodLabel = `Semaine du ${formatDateFR(startISO)} au ${formatDateFR(endISO)}`
  else if (preset === "month") periodLabel = `Mois (${now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })})`
  else if (preset === "quarter") periodLabel = `Trimestre T${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
  else if (preset === "year") periodLabel = `Année ${now.getFullYear()}`
  else if (preset === "custom") periodLabel = `Du ${formatDateFR(startISO)} au ${formatDateFR(endISO)}`

  try {
    const serviceClient = await createReportsServiceClient()

    // Requête sur les runs de la période
    const runsRes = await serviceClient
      .from("ai_intelligence_runs")
      .select("id, run_type, status, created_at, started_at, completed_at, failed_at, error_message")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: false })

    if (runsRes.error) {
      throw new Error(`Impossible de charger les exécutions: ${runsRes.error.message}`)
    }

    const runs = runsRes.data ?? []

    // Récupérer les coûts pour ces runs
    const runIds = runs.map((r) => r.id)
    const costsMap = new Map<string, {
      durationMs: number | null
      costEstimate: number | null
      hasCostGap: boolean
    }>()

    if (runIds.length > 0) {
      const costsRes = await serviceClient
        .from("v_ai_run_costs")
        .select("run_id, duration_ms, cost_estimate, has_pricing_gap, has_tokens_gap")
        .in("run_id", runIds)

      if (costsRes.error) {
        throw new Error(`Impossible de charger les coûts d'exécution: ${costsRes.error.message}`)
      }

      for (const row of costsRes.data ?? []) {
        if (row.run_id) {
          costsMap.set(row.run_id, {
            durationMs: row.duration_ms,
            costEstimate: row.cost_estimate,
            hasCostGap: Boolean(row.has_pricing_gap || row.has_tokens_gap || row.cost_estimate === null),
          })
        }
      }
    }

    const totalRuns = runs.length
    let successCount = 0
    let failureCount = 0
    let totalCost = 0
    let hasPricingGap = false

    const countsByWorkflow = new Map<string, {
      count: number
      totalDuration: number
      durationCount: number
      cost: number
      hasCostGap: boolean
    }>()
    const alerts: TechnicalAlertItem[] = []

    for (const r of runs) {
      if (r.status === "succeeded") {
        successCount++
      } else if (r.status === "failed") {
        failureCount++
      }

      const costData = costsMap.get(r.id)
      const hasCostGap = !costData || costData.hasCostGap || costData.costEstimate === null
      const cost = costData?.costEstimate
      if (cost !== null && cost !== undefined) totalCost += cost
      if (hasCostGap) hasPricingGap = true

      const wfKey = r.run_type ?? "inconnu"
      const existing = countsByWorkflow.get(wfKey) ?? {
        count: 0,
        totalDuration: 0,
        durationCount: 0,
        cost: 0,
        hasCostGap: false,
      }
      existing.count++
      if (cost !== null && cost !== undefined) existing.cost += cost
      if (hasCostGap) existing.hasCostGap = true
      if (costData?.durationMs) {
        existing.totalDuration += costData.durationMs
        existing.durationCount++
      }
      countsByWorkflow.set(wfKey, existing)

      if (r.status === "failed" || r.error_message) {
        alerts.push({
          id: r.id,
          runType: r.run_type ?? "inconnu",
          label: workflowLabelForRunType(r.run_type ?? ""),
          errorMessage: r.error_message || "Échec d'exécution du workflow",
          failedAt: r.failed_at || r.created_at,
          runId: r.id,
        })
      }
    }

    const successRatePct = totalRuns > 0
      ? Math.round((successCount / totalRuns) * 1000) / 10
      : null
    const healthStatus: "optimal" | "warning" | "critical" | "unavailable" =
      successRatePct === null
        ? "unavailable"
        : successRatePct >= 95
          ? "optimal"
          : successRatePct >= 85
            ? "warning"
            : "critical"

    // Top 3 automatisations sollicitées
    const sortedWfs = Array.from(countsByWorkflow.entries()).sort((a, b) => b[1].count - a[1].count)
    const topAutomations: TopAutomationItem[] = sortedWfs.slice(0, 3).map(([runType, stats]) => ({
      runType,
      label: workflowLabelForRunType(runType),
      executionCount: stats.count,
      sharePct: Math.round((stats.count / totalRuns) * 1000) / 10,
      avgDurationMs: stats.durationCount > 0 ? Math.round(stats.totalDuration / stats.durationCount) : null,
      totalCost: stats.hasCostGap ? null : Math.round(stats.cost * 1000) / 1000,
    }))

    // Top 3 alertes les plus récentes
    const topAlerts = alerts.slice(0, 3)

    // Breakdown financier
    const costBreakdown: WorkflowCostItem[] = sortedWfs.map(([runType, stats]) => ({
      runType,
      label: workflowLabelForRunType(runType),
      costTotal: stats.hasCostGap ? null : Math.round(stats.cost * 1000) / 1000,
      runsCount: stats.count,
    }))

    const facts: TechnicalReportFacts = {
      periodLabel,
      periodPreset: preset === "day" ? "custom" : preset,
      periodStart: startISO,
      periodEnd: endISO,
      totalRuns,
      successCount,
      failureCount,
      successRatePct,
      healthStatus,
      topAutomations,
      topAlerts,
      totalCost: totalRuns === 0 || hasPricingGap ? null : Math.round(totalCost * 100) / 100,
      hasPricingGap,
      costBreakdown,
    }

    const title = `Rapport technique des automatisations — ${periodLabel}`
    const documentContent: TechnicalReportDocumentContent = {
      reportType: "technical",
      title,
      generatedAt: new Date().toISOString(),
      facts,
    }

    // Sauvegarde DB dans intelligence_documents
    const saveInput: SaveAsDocumentInput = {
      title,
      documentType: "workspace_diagnostic",
      origin: "generated",
      contentText: null,
      contentJson: documentContent,
      scopeJson: { periodPreset: preset, reportType: "technical" },
      periodStart: startISO.split("T")[0],
      periodEnd: endISO.split("T")[0],
      dataCutoffAt: new Date().toISOString(),
      status: "ready",
      sourceRefs: [],
      qaFlags: [],
    }

    const result = await saveAsDocumentWithClient(serviceClient, user.id, saveInput, {
      workspaceId,
    })

    return NextResponse.json({
      documentId: result.documentId ?? null,
      content: documentContent,
    })
  } catch (error) {
    console.error("[technical-report/generate] Unexpected error:", error)
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue lors de la génération" },
      { status: 500 }
    )
  }
}
