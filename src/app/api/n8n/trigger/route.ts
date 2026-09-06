import "server-only"

// CORE-001 — Passerelle de déclenchement Next → n8n
//
// Ce que fait cette route :
//   1. Vérifie la session Supabase (user connecté, workspace résolu)
//   2. Valide le body (workflowId, companyId, input)
//   3. Crée un run "queued" dans ai_intelligence_runs
//   4. Lance l'appel vers n8n en background (sans await bloquant)
//   5. Répond 202 + { runId } immédiatement → jamais de timeout Vercel
//
// Le front poll ai_intelligence_runs via Supabase Realtime pour voir le résultat.

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import { resolveKnowledgeScope } from "@/features/content-collections/data/resolve-knowledge-scope"
import { findMissionSpec } from "@/features/intelligence-missions/domain/mission-catalog"
import { buildMissionRunType } from "@/features/intelligence-missions/domain/mission-run-type"
import { parseCorpusSelectors } from "@/features/intelligence-missions/domain/mission-selectors"
import { resolveMissionCorpus } from "@/features/intelligence-missions/data/resolve-mission-corpus"
import { assembleMissionPrompt } from "@/features/intelligence-missions/data/assemble-mission-prompt"
import {
  buildMissionEnvelope,
  buildMissionInputSnapshot,
  buildMissionRunConfig,
  resolveMissionRunEntity,
} from "@/features/intelligence-missions/data/build-mission-launch"
import { validateWatchAnalysisInput } from "@/features/watch-analysis/domain/watch-analysis-contracts"
import { resolveWatchAnalysisSources } from "@/features/watch-analysis/data/resolve-watch-analysis-sources"
import {
  buildWatchAnalysisRunEnvelope,
  buildWatchAnalysisInputSnapshot,
} from "@/features/watch-analysis/data/build-watch-analysis-launch"
import { parseDigestLaunchInput } from "@/features/veille/digest/domain/digest-launch-contracts"
import { resolveDigestLaunch } from "@/features/veille/digest/data/resolve-digest-launch"
import {
  buildDigestRunEnvelope,
  buildDigestInputSnapshot,
} from "@/features/veille/digest/data/build-digest-launch"
import type {
  N8nEntityType,
  N8nWorkflowId,
  TriggerResponse,
  TriggerErrorResponse,
} from "@/lib/n8n/types"


type UserScopedClient = Awaited<ReturnType<typeof createClient>>

// entityType/entityId généralisés (REPORT-001 Lot 0) : companyId reste accepté
// pour compatibilité et n'est utilisé que quand entityType === "company".
// Pour un rapport transverse (ex. activité commerciale du mois), le front
// envoie entityType: "workspace", entityId: workspaceId, companyId omis.
type TriggerBody = {
  workflowId: N8nWorkflowId
  entityType?: N8nEntityType
  entityId?: string
  companyId?: string
  input: Record<string, unknown>
  // ADR-0020 — un lancement de mission n'a ni `workflowId` ni `input` : il ne porte
  // que l'identifiant du preset et les sélecteurs de corpus qu'il a le droit de fournir.
  missionSlug?: string
  selectors?: unknown
}

// ── Lancement d'une mission d'intelligence (ADR-0020 M-5 / §5.2) ──────────────
// Une SEULE porte de lancement : cette route. Il n'y a pas d'action serveur
// concurrente, et cette fonction n'est appelée que d'ici.
//
// Même doctrine que le bloc « 3ter » plus bas : le serveur ne fait confiance qu'à
// deux choses — l'identifiant de mission (qui ne sert qu'à CHERCHER un preset relu et
// typé) et le `workspaceId` résolu depuis `profiles`. Tout le reste est soit imposé
// par le preset (intention, contraintes, budget, modèle, contrat de sortie), soit
// revalidé contre son allowlist de corpus. Le navigateur ne peut ni élargir le corpus,
// ni choisir un `resultType` (M-7), ni faire lire une ligne hors de son workspace.
async function launchMissionRun(params: {
  supabase: UserScopedClient
  workspaceId: string
  userId: string
  missionSlug: string
  rawSelectors: unknown
}): Promise<NextResponse<TriggerResponse | TriggerErrorResponse>> {
  const spec = findMissionSpec(params.missionSlug)
  if (!spec) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: `Mission « ${params.missionSlug} » inconnue.` },
      { status: 400 }
    )
  }

  const parsed = parseCorpusSelectors(params.rawSelectors)
  if ("error" in parsed) {
    return NextResponse.json<TriggerErrorResponse>({ error: parsed.error }, { status: 400 })
  }

  const corpus = await resolveMissionCorpus(
    { workspaceId: params.workspaceId, supabase: params.supabase },
    spec,
    parsed.selectors
  )
  if ("error" in corpus) {
    return NextResponse.json<TriggerErrorResponse>({ error: corpus.error }, { status: 400 })
  }

  // Un corpus vide ne produit qu'une hallucination coûteuse : on refuse plutôt que de
  // lancer un appel LLM sans matière.
  if (corpus.items.length === 0) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Corpus vide : aucune source lisible pour cette mission." },
      { status: 400 }
    )
  }

  const requestedAt = new Date().toISOString()
  const prompts = assembleMissionPrompt(spec, corpus)
  const entity = resolveMissionRunEntity(corpus, params.workspaceId)

  const result = await triggerN8nRun({
    workflowId: "mission-001-run",
    // M-3 — `run_type = 'mission:<slug>'`, sur une ligne `ai_intelligence_runs`
    // ordinaire. C'est aussi ce que la garde M-4 exclut des vues qui lisent `phase`.
    runType: buildMissionRunType(spec.slug),
    entityType: entity.entityType,
    entityId: entity.entityId,
    companyId: entity.companyId,
    workspaceId: params.workspaceId,
    userId: params.userId,
    // Vers n8n : les prompts assemblés (donc le contenu du corpus).
    input: buildMissionEnvelope(spec, corpus, prompts, requestedAt),
    // Persisté : la trace seule — références, titres, provenance (P2).
    inputSnapshot: buildMissionInputSnapshot(spec, corpus, parsed.selectors, requestedAt),
    extraConfig: buildMissionRunConfig(spec),
  })

  if (!result.ok) {
    console.error("[trigger] launchMissionRun failed:", result.error)
    return NextResponse.json<TriggerErrorResponse>(
      { error: result.error },
      { status: result.runId ? 502 : 500 }
    )
  }

  return NextResponse.json<TriggerResponse>(
    { runId: result.runId, status: "queued" },
    { status: 202 }
  )
}

export async function POST(request: Request) {
  // ── 1. Authentification ────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Non authentifié" },
      { status: 401 }
    )
  }

  // ── 2. Résolution du workspace ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Workspace introuvable" },
      { status: 403 }
    )
  }

  // ── 3. Validation du body ──────────────────────────────────────────────────
  let body: TriggerBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "Body JSON invalide" },
      { status: 400 }
    )
  }

  // ── 3bis-mission. Branche « mission d'intelligence » (ADR-0020) ────────────
  // Placée AVANT la validation `workflowId`/`input` : une mission n'en porte aucun.
  if (typeof body.missionSlug === "string" && body.missionSlug.length > 0) {
    return launchMissionRun({
      supabase,
      workspaceId: profile.workspace_id,
      userId: user.id,
      missionSlug: body.missionSlug,
      rawSelectors: body.selectors,
    })
  }

  const { workflowId, companyId, input } = body

  if (!workflowId || typeof input !== "object") {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "workflowId et input sont requis" },
      { status: 400 }
    )
  }

  // Rétrocompatibilité : les appelants existants (INTEL-020/021/022) envoient
  // uniquement companyId, sans entityType/entityId — on déduit entityType="company"
  // dans ce cas. Les nouveaux appelants (REPORT-001) envoient entityType/entityId
  // explicitement, y compris entityType="workspace" pour les rapports transverses.
  const entityType: N8nEntityType = body.entityType ?? (companyId ? "company" : "workspace")
  const entityId = body.entityId ?? companyId ?? profile.workspace_id
  const resolvedCompanyId = entityType === "company" ? (companyId ?? entityId) : null

  if (entityType !== "workspace" && !entityId) {
    return NextResponse.json<TriggerErrorResponse>(
      { error: "entityId est requis pour entityType !== \"workspace\"" },
      { status: 400 }
    )
  }

  // ── 3bis. Validation des entrées INTEL-010 ──────────────────────────────────
  if (workflowId === "intel-010-refresh" && (input as Record<string, unknown>).operation === "account_scan") {
    const selectedSiren = (input as Record<string, unknown>).selectedSiren
    
    // Si un SIREN est explicitement transmis, valider sa forme (9 chiffres)
    if (selectedSiren !== null && selectedSiren !== undefined && selectedSiren !== "") {
      if (typeof selectedSiren !== "string" || !/^\d{9}$/.test(selectedSiren.trim())) {
        return NextResponse.json<TriggerErrorResponse>(
          { error: "Le SIREN fourni doit contenir exactement 9 chiffres" },
          { status: 400 }
        )
      }
    }
  }

  // ── 3ter. Résolution du Knowledge Scope (ADR-0012bis Lot 4) ─────────────────
  // Le serveur repart toujours du seul collectionId : un `refs` éventuellement
  // fourni par le navigateur est écrasé ici, jamais transmis tel quel à n8n.
  if (workflowId === "intel-020-communication") {
    const context = (input as { context?: { knowledgeScope?: { collectionId?: unknown } } }).context
    const collectionId = context?.knowledgeScope?.collectionId
    if (typeof collectionId === "string" && collectionId) {
      const resolved = await resolveKnowledgeScope(supabase, collectionId)
      if ("error" in resolved) {
        return NextResponse.json<TriggerErrorResponse>(
          { error: `Périmètre de connaissance introuvable : ${resolved.error}` },
          { status: 400 }
        )
      }
      ;(input as { context?: Record<string, unknown> }).context = {
        ...context,
        knowledgeScope: {
          collectionId: resolved.collectionId,
          kind: resolved.kind,
          name: resolved.name,
          itemCount: resolved.itemCount,
          refs: resolved.refs,
        },
      }
    }
  }

  // ── 3quater. Branche V2 « Analyse à la demande » (INTEL-021 V2) ─────────────
  if (workflowId === "intel-021-monthly-watch-analysis" && (input as Record<string, unknown>).schemaVersion === 2) {
    const validated = validateWatchAnalysisInput(input)
    if (!validated.ok) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: validated.error },
        { status: 400 }
      )
    }

    const resolved = await resolveWatchAnalysisSources(supabase, profile.workspace_id, validated.value)
    if ("error" in resolved) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: resolved.error },
        { status: 400 }
      )
    }

    const n8nEnvelope = buildWatchAnalysisRunEnvelope(validated.value, resolved)
    const inputSnapshot = buildWatchAnalysisInputSnapshot(validated.value, resolved)

    const v2Result = await triggerN8nRun({
      workflowId,
      entityType: "workspace",
      entityId: profile.workspace_id,
      companyId: null,
      workspaceId: profile.workspace_id,
      userId: user.id,
      input: n8nEnvelope as unknown as Record<string, unknown>,
      inputSnapshot: inputSnapshot as unknown as Record<string, unknown>,
    })

    if (!v2Result.ok) {
      console.error("[trigger] INTEL-021 V2 triggerN8nRun failed:", v2Result.error)
      return NextResponse.json<TriggerErrorResponse>(
        { error: v2Result.error },
        { status: v2Result.runId ? 502 : 500 }
      )
    }

    return NextResponse.json<TriggerResponse>(
      { runId: v2Result.runId, status: "queued" },
      { status: 202 }
    )
  }

  // ── 3quinquies. Branche V2 « Digest Sujet × Corpus » (ADR-0022 Lot 2B) ─────
  if (
    workflowId === "veille-ia-marche-on-demand" &&
    (input as Record<string, unknown>).schemaVersion === 2
  ) {
    const validated = parseDigestLaunchInput(input)
    if (!validated.ok) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: validated.error },
        { status: 400 }
      )
    }

    const resolved = await resolveDigestLaunch(supabase, profile.workspace_id, validated.value)
    if ("error" in resolved) {
      return NextResponse.json<TriggerErrorResponse>(
        { error: resolved.error },
        { status: 400 }
      )
    }

    const n8nEnvelope = buildDigestRunEnvelope(validated.value, resolved)
    const inputSnapshot = buildDigestInputSnapshot(validated.value, resolved)

    const v2Result = await triggerN8nRun({
      workflowId,
      entityType: "workspace",
      entityId: profile.workspace_id,
      companyId: null,
      workspaceId: profile.workspace_id,
      userId: user.id,
      input: n8nEnvelope as unknown as Record<string, unknown>,
      inputSnapshot: inputSnapshot as unknown as Record<string, unknown>,
    })

    if (!v2Result.ok) {
      console.error("[trigger] veille-ia-marche-on-demand V2 triggerN8nRun failed:", v2Result.error)
      return NextResponse.json<TriggerErrorResponse>(
        { error: v2Result.error },
        { status: v2Result.runId ? 502 : 500 }
      )
    }

    return NextResponse.json<TriggerResponse>(
      { runId: v2Result.runId, status: "queued" },
      { status: 202 }
    )
  }

  // ── 4. Création du run + déclenchement n8n (factorisé, ADR-0010 Lot 2) ──────

  const result = await triggerN8nRun({
    workflowId,
    entityType,
    entityId,
    companyId: resolvedCompanyId,
    workspaceId: profile.workspace_id,
    userId: user.id,
    input,
  })

  if (!result.ok) {
    console.error("[trigger] triggerN8nRun failed:", result.error)
    return NextResponse.json<TriggerErrorResponse>(
      { error: result.error },
      { status: result.runId ? 502 : 500 }
    )
  }

  // ── 5. Réponse immédiate ───────────────────────────────────────────────────
  return NextResponse.json<TriggerResponse>(
    { runId: result.runId, status: "queued" },
    { status: 202 }
  )
}
