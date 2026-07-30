import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createReportsServiceClient,
  saveAsDocumentWithClient,
} from "@/app/(app)/reports/_data/reports-actions"
import type {
  FinancialReportDocumentContent,
  FinancialReportFacts,
  SaveAsDocumentInput,
} from "@/app/(app)/reports/_data/reports-types"

type GenerateBody = {
  fiscalYear?: number
  asOfDate?: string
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

  // ── 3. Parsing du body (période / année fiscale optionnelle) ───────────────
  let body: GenerateBody
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0] // YYYY-MM-DD
  const asOfDate = body.asOfDate ?? todayStr
  const fiscalYear = body.fiscalYear ?? new Date(asOfDate).getFullYear() ?? today.getFullYear()

  try {
    // ── 4. Appel RPC en mode service_role ────────────────────────────────────
    const serviceClient = await createReportsServiceClient()
    
    const { data: factsJson, error: rpcError } = await (serviceClient as any).rpc(
      "get_financial_report_facts",
      {
        p_workspace_id: workspaceId,
        p_fiscal_year: fiscalYear,
        p_as_of_date: asOfDate,
      }
    )

    if (rpcError || !factsJson) {
      console.error("[financial-report/generate] RPC get_financial_report_facts failed:", rpcError)
      return NextResponse.json(
        { error: "Impossible de calculer les faits financiers" },
        { status: 500 }
      )
    }

    const facts = factsJson as unknown as FinancialReportFacts

    // ── 5. Assemblage du Document ────────────────────────────────────────────
    const title = `Rapport financier ${fiscalYear}`
    const documentContent: FinancialReportDocumentContent = {
      reportType: "financial",
      title,
      generatedAt: new Date().toISOString(),
      facts,
    }

    // ── 6. Sauvegarde directe dans la base de données ────────────────────────
    const saveInput: SaveAsDocumentInput = {
      title,
      documentType: "financial",
      origin: "generated",
      contentText: null,
      contentJson: documentContent,
      scopeJson: { fiscalYear, reportType: "financial" },
      periodStart: `${fiscalYear}-01-01`,
      periodEnd: asOfDate,
      dataCutoffAt: new Date().toISOString(),
      status: "ready",
      sourceRefs: [],
      qaFlags: [],
    }

    const result = await saveAsDocumentWithClient(serviceClient, user.id, saveInput, {
      workspaceId,
    })

    if (result.error || !result.documentId) {
      console.error("[financial-report/generate] saveAsDocumentWithClient failed:", result.error)
      return NextResponse.json(
        { error: result.error ?? "Impossible d'enregistrer le document" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documentId: result.documentId,
      content: documentContent,
    })
  } catch (error) {
    console.error("[financial-report/generate] Unexpected error:", error)
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue lors de la génération" },
      { status: 500 }
    )
  }
}
