// CORE-002 — Callback de persistance durci n8n → Next
//
// Ce que fait cette route :
//   1. Vérifie la signature HMAC (rejette immédiatement si invalide)
//   2. Parse et valide le payload (champs obligatoires)
//   3. Récupère le run pour retrouver company_id / workspace_id / owner_id
//   4. Upsert idempotent dans ai_intelligence_results (UNIQUE run_id + phase)
//   5. Met à jour le statut du run (succeeded / failed)
//   6. Répond 200 à n8n
//
// Sécurité : service-role key dans runs.ts (hors RLS).
// Idempotence : rejouer le même callback est sans danger.

import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyHmac } from "@/lib/n8n/hmac"
import { saveResult, updateRunStatus, updateRunN8nIds } from "@/lib/n8n/runs"
import { createClient } from "@supabase/supabase-js"
import { saveResultAsDocumentWithSupabaseClient } from "@/components/accounts-contacts/intelligence/save-as-document"
import { materializeAccountIssues } from "@/lib/intelligence/materialize-account-issues"
import { ingestAccountKnowledgeArtifact } from "@/lib/intelligence/account-knowledge-ingest"
import {
  ACCOUNT_ISSUES_MAP_RESULT_TYPE,
  ACCOUNT_KNOWLEDGE_RESULT_TYPE,
} from "@/lib/intelligence/account-intelligence-contracts"
import { isEligibleDocumentResultType } from "@/lib/communication/communication-result-documents"
import { isMissionRunType } from "@/features/intelligence-missions/domain/mission-run-type"
import {
  readCorpusTrace,
  validateMissionReport,
} from "@/features/intelligence-missions/domain/validate-mission-report"
import { renderMissionReportText } from "@/features/intelligence-missions/domain/render-mission-report-text"
import type { Database } from "@/types/database"
import type { N8nCallbackPayload } from "@/lib/n8n/types"

/**
 * ADR-0020 M-7 / M-4 — les deux valeurs qu'une mission ne configure JAMAIS.
 * Le callback les impose à partir du seul préfixe `mission:` de `run_type`, de sorte
 * qu'aucune intention rédigée en texte libre dans un preset ne puisse décider de ce qui
 * est ÉCRIT : `ai_intelligence_results.result_type`/`phase`, et par conséquence le
 * `intelligence_documents.document_type` que le chemin document en dérive.
 *
 * L'imposition porte sur le CONTENU écrit ET sur l'AIGUILLAGE : dès qu'un run de mission
 * est reconnu, `resultType`/`phase` sont réassignés (pas seulement `persistedPayload`), de
 * sorte que les blocs suivants — `account_issues_map`, le chemin document, la revalidation
 * `account_watch_refresh`, `updateRunStatus` — dispatchent sur la valeur IMPOSÉE, jamais sur
 * celle qu'aurait envoyée n8n. Le bloc `account_knowledge`, qui s'exécute AVANT ce portail,
 * exclut explicitement `isMissionRunType(run.run_type)` pour la même raison symétrique :
 * sans cette exclusion, un payload de mission au `resultType` erroné y serait rejeté avant
 * même d'être validé comme rapport de mission.
 */
const MISSION_REPORT_RESULT_TYPE = "mission_report"
const MISSION_REPORT_PHASE = 1

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  // ── 1. Lecture du body brut (nécessaire pour la vérification HMAC) ─────────
  const rawBody = await request.text()
  const signature = request.headers.get("x-kredo-signature") ?? ""

  // ── 2. Vérification HMAC ───────────────────────────────────────────────────
  if (!verifyHmac(rawBody, signature)) {
    console.warn("[callback] HMAC invalide — requête rejetée")
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
  }

  // ── 3. Parse du payload ────────────────────────────────────────────────────
  let payload: N8nCallbackPayload
  try {
    payload = JSON.parse(rawBody) as N8nCallbackPayload
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const { runId, status, contentJson } = payload
  // `resultType`/`phase` sont mutables : le portail mission (4 ter) les réassigne pour que
  // TOUT ce qui suit — matérialisation account_issues, chemin document, revalidation
  // account_watch_refresh, updateRunStatus — dispatche sur la valeur IMPOSÉE, jamais sur
  // celle qu'a envoyée n8n. Avant ce portail, ce sont encore les valeurs brutes du payload.
  let resultType = payload.resultType
  let phase = payload.phase

  if (!runId || phase === undefined || !resultType || !status || !contentJson) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants : runId, phase, resultType, status, contentJson" },
      { status: 400 }
    )
  }

  // ── 4. Récupération du run pour company_id / workspace_id / owner_id ───────
  const supabase = getServiceClient()
  const { data: run, error: runError } = await supabase
    .from("ai_intelligence_runs")
    .select("company_id, workspace_id, owner_id, trigger_source, status, run_type, input_snapshot")
    .eq("id", runId)
    .single()

  if (runError || !run) {
    console.error("[callback] Run introuvable:", runId, runError?.message)
    return NextResponse.json({ error: "Run introuvable" }, { status: 404 })
  }

  // ── 4a. Vérification du statut d'annulation ────────────────────────────────
  if (run.status === "cancelled") {
    console.warn(`[callback] Callback ignoré car le run ${runId} a été annulé par l'utilisateur.`)
    return NextResponse.json({ ok: true, ignored: true, reason: "Run cancelled" })
  }

  // ── 4 bis. Portail account_knowledge (Lot 1) ──────────────────────────────
  // V1 et V2 sont toutes deux acceptées ; V2 est validée, ses sources vérifiées
  // contre le workspace du run, et son indicateur de dynamique recalculé
  // côté applicatif (jamais celui du LLM). Un artefact refusé ne doit JAMAIS
  // laisser le run en `running` : on le bascule explicitement en `failed`.
  //
  // `!isMissionRunType(run.run_type)` : un run de mission n'a rien à faire ici, quel que
  // soit le `resultType` du payload — un payload malformé/erroné ne doit pas le faire
  // échouer sur le mauvais contrat avant même d'atteindre son propre validateur (4 ter).
  let persistedPayload = payload
  if (status === "succeeded" && resultType === ACCOUNT_KNOWLEDGE_RESULT_TYPE && !isMissionRunType(run.run_type)) {
    const ingest = await ingestAccountKnowledgeArtifact(supabase, {
      workspaceId: run.workspace_id,
      companyId: run.company_id,
      contentJson,
    })

    if (!ingest.ok) {
      const detail = ingest.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")
      console.error("[callback] account_knowledge rejeté:", ingest.error, detail)
      try {
        await updateRunStatus(runId, "failed", {
          phase,
          errorMessage: `${ingest.error}${detail ? ` — ${detail}` : ""}`.slice(0, 2000),
        })
      } catch (err) {
        console.error("[callback] updateRunStatus(failed) after rejection failed:", err)
      }
      return NextResponse.json({ error: ingest.error, issues: ingest.issues }, { status: 400 })
    }

    persistedPayload = { ...payload, contentJson: ingest.content as unknown as N8nCallbackPayload["contentJson"] }
  }

  // ── 4 ter. Portail mission d'intelligence (ADR-0020 lot L3) ───────────────
  // Le dispatch se fait sur `run.run_type`, écrit par la gateway de lancement (L1) et
  // donc contrôlé par Kredo — JAMAIS sur `payload.resultType`, que n8n envoie. Une fois
  // la mission reconnue, `resultType` et `phase` sont IMPOSÉS (M-7 / M-4), quoi qu'ait
  // envoyé le workflow — et cette imposition se propage à tout le reste de la route (les
  // deux variables sont réassignées ci-dessous, pas seulement portées par
  // `persistedPayload`).
  //
  // `mission-001-run` ne parse jamais la sortie du modèle : elle arrive telle quelle dans
  // `contentJson.rawOutput` (une CHAÎNE). Elle est validée ICI, une seule fois (M-2),
  // avant toute persistance — mêmes conséquences qu'un refus `account_knowledge` : run
  // basculé en `failed`, réponse 400, `saveResult` jamais appelé. Aucune réparation de
  // JSON, aucun élagage de citation : l'utilisateur relance.
  if (status === "succeeded" && isMissionRunType(run.run_type)) {
    // Un champ absent ou non textuel est traité comme une sortie absente par le validateur.
    const rawOutput = typeof contentJson.rawOutput === "string" ? contentJson.rawOutput : ""
    const validation = validateMissionReport(rawOutput, readCorpusTrace(run.input_snapshot))

    if (!validation.valid) {
      const detail = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")
      console.error("[callback] rapport de mission rejeté:", run.run_type, detail)
      try {
        await updateRunStatus(runId, "failed", {
          phase: MISSION_REPORT_PHASE,
          errorMessage: `Rapport de mission invalide — ${detail}`.slice(0, 2000),
        })
      } catch (err) {
        console.error("[callback] updateRunStatus(failed) after mission rejection failed:", err)
      }
      return NextResponse.json(
        { error: "Rapport de mission invalide", issues: validation.issues },
        { status: 400 }
      )
    }

    // Réassignés, pas seulement portés par `persistedPayload` : tout ce qui suit dans la
    // route (matérialisation account_issues, chemin document, revalidation
    // account_watch_refresh, `updateRunStatus`) lit ces variables, jamais `payload` — sans
    // cette réassignation, un `resultType` erroné envoyé par n8n survivrait à l'imposition
    // et piloterait encore l'aiguillage en aval (cf. commentaire de tête de fichier).
    resultType = MISSION_REPORT_RESULT_TYPE
    phase = MISSION_REPORT_PHASE

    persistedPayload = {
      ...payload,
      resultType,
      phase,
      contentJson: validation.value as unknown as N8nCallbackPayload["contentJson"],
      // Le JSON du modèle serait illisible dans /reports : `buildResultContentText` ne
      // reconnaît pas la forme `MissionReportV1` et retomberait sur ce champ tel quel.
      contentText: renderMissionReportText(validation.value),
      title: validation.value.title,
    }
  }

  // ── 5. Sauvegarde du résultat (upsert idempotent) ─────────────────────────
  let resultId: string
  try {
    resultId = await saveResult(
      runId,
      run.company_id,
      run.workspace_id,
      run.owner_id,
      persistedPayload
    )
  } catch (err) {
    console.error("[callback] saveResult failed:", err)
    return NextResponse.json({ error: "Erreur sauvegarde résultat" }, { status: 500 })
  }

  // ── 6. Mise à jour du statut du run ───────────────────────────────────────
  try {
    const runStatus = status === "succeeded" ? "succeeded" : "failed"
    await updateRunStatus(runId, runStatus, {
      phase,
      errorMessage: payload.errorMessage,
    })
  } catch (err) {
    // Non bloquant : le résultat est déjà sauvé, on log et on continue
    console.error("[callback] updateRunStatus failed:", err)
  }

  // Lot 0 alerte échec (2026-07-18) : capture des identifiants n8n internes pour
  // le lien "Ouvrir dans n8n" du drill-down. Non bloquant — un run reste
  // exploitable sans lien direct.
  if (payload.n8nExecutionId || payload.n8nWorkflowId) {
    await updateRunN8nIds(runId, {
      n8nExecutionId: payload.n8nExecutionId,
      n8nWorkflowId: payload.n8nWorkflowId,
    })
  }

  // ADR-0012 Lot 4 / D-5 : matérialisation "1 résultat → N lignes account_issues",
  // distincte du chemin document (1 résultat → 1 intelligence_documents) ci-dessous.
  if (status === "succeeded" && resultType === ACCOUNT_ISSUES_MAP_RESULT_TYPE) {
    if (!run.company_id) {
      console.error("[callback] account_issues_map sans company_id — run:", runId)
      return NextResponse.json({ error: "account_issues_map requiert un run scopé compte" }, { status: 400 })
    }
    const materializeResult = await materializeAccountIssues(
      supabase,
      { workspaceId: run.workspace_id, companyId: run.company_id, runId },
      contentJson,
    )
    if (!materializeResult.success) {
      console.error("[callback] materializeAccountIssues failed:", materializeResult.error)
      return NextResponse.json({ error: "Erreur matérialisation enjeux" }, { status: 500 })
    }
  }

  if (status === "succeeded" && isEligibleDocumentResultType(resultType)) {
    const documentResult = await saveResultAsDocumentWithSupabaseClient(supabase, resultId)
    if (!documentResult.success) {
      console.error("[callback] auto saveResultAsDocument failed:", documentResult.error)
      return NextResponse.json({ error: "Erreur création document" }, { status: 500 })
    }
  }

  // La fiche compte est un Server Component : sans invalidation, un run terminé
  // pendant que l'utilisateur la consulte n'apparaît qu'après un rechargement
  // manuel. Cas le plus visible : la veille (`account_watch_refresh`) écrit des
  // lignes `account_signals` mais ne produit aucun document, donc rien dans le
  // Realtime auquel les drawers sont abonnés.
  // Non bloquant : le callback a déjà tout persisté à ce stade, un échec
  // d'invalidation ne doit pas faire répondre 500 à n8n (qui rejouerait).
  if (status === "succeeded" && run.company_id) {
    try {
      revalidatePath(`/prospection/accounts/${run.company_id}`)
      if (resultType === "account_watch_refresh") {
        revalidatePath("/veille")
      }
    } catch (revalidateError) {
      console.error("[callback] revalidatePath failed:", revalidateError)
    }
  }

  return NextResponse.json({ ok: true, runId, phase })
}
