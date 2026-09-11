import "server-only"

// ─── Conversion d'une étude : lancement, callbacks, finalisation ────────────
//
// Une conversion = N passes, chacune un run `mission-001-run` (run_type
// `mission:study-conversion`). L'état de la conversion n'est porté que par deux choses :
// le numéro de tentative sur l'étude, et les runs qui portent ce numéro dans leur
// `input_snapshot`. La finalisation est idempotente : elle se déclenche après chaque
// callback, n'assemble que lorsque toutes les passes de la tentative ont réussi, et
// n'écrit que si l'étude est toujours `converting` sur cette tentative (écriture
// conditionnelle) — deux callbacks simultanés produisent donc une seule écriture.

import { revalidatePath } from "next/cache"

import { saveResult, updateRunN8nIds, updateRunStatus } from "@/lib/n8n/runs"
import { triggerN8nRun } from "@/lib/n8n/trigger-run"
import type { N8nCallbackPayload } from "@/lib/n8n/types"
import type { Json } from "@/types/database"
import { parseSourceRegistryOutput } from "@/features/source-management/domain/source-registry-output"

import { assembleStudyKnowledge } from "../domain/assemble-study-knowledge"
import { prepareStudyStructure, readExtractionMeta } from "../domain/prepare-study-structure"
import {
  STUDY_CONVERSION_MODEL,
  STUDY_CONVERSION_PART_RESULT_TYPE,
  STUDY_CONVERSION_RUN_TYPE,
  type StudyConversionPartKind,
  type StudyConversionState,
  type StudyCoverage,
} from "../domain/study-contracts"
import {
  parseBlocksPartOutput,
  parseSourcesPartOutput,
  type ParsedBlocksPart,
  type ParsedSourcesPart,
} from "../domain/study-conversion-output"
import { planStudyConversion } from "../domain/study-conversion-plan"
import { validateStudyKnowledge } from "../domain/validate-study-knowledge"
import {
  getStudyServiceClient,
  loadStudyCompany,
  requireStudyActor,
  type StudyRow,
  type StudyServiceClient,
} from "./study-server"

const PART_PHASE = 1

type PartSnapshot = {
  study_id: string
  attempt: number
  part_key: string
  kind: StudyConversionPartKind
  block_ids: string[]
  source_ids: string[]
  part_count: number
}

function readPartSnapshot(raw: unknown): PartSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null
  const value = raw as Record<string, unknown>
  if (typeof value.study_id !== "string" || typeof value.attempt !== "number" || typeof value.part_key !== "string") return null
  if (value.kind !== "blocks" && value.kind !== "sources") return null
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [])
  return {
    study_id: value.study_id,
    attempt: value.attempt,
    part_key: value.part_key,
    kind: value.kind,
    block_ids: ids(value.block_ids),
    source_ids: ids(value.source_ids),
    part_count: typeof value.part_count === "number" ? value.part_count : 0,
  }
}

export function isStudyConversionRunType(runType: string | null | undefined): boolean {
  return runType === STUDY_CONVERSION_RUN_TYPE
}

function readConversion(raw: unknown): StudyConversionState | null {
  if (typeof raw !== "object" || raw === null) return null
  const value = raw as Partial<StudyConversionState>
  return typeof value.attempt === "number" && Array.isArray(value.parts) ? (value as StudyConversionState) : null
}

async function markStudyFailed(service: StudyServiceClient, studyId: string, attempt: number, message: string) {
  await service
    .from("account_research_studies")
    .update({ status: "failed", error_message: message.slice(0, 2000) })
    .eq("id", studyId)
    .eq("status", "converting")
    .eq("conversion->>attempt", String(attempt))
}

// ─── Lancement ──────────────────────────────────────────────────────────────

export async function startStudyConversion(studyId: string): Promise<{ attempt: number; parts: number }> {
  const actor = await requireStudyActor()
  const { data: study } = await actor.supabase
    .from("account_research_studies")
    .select("id,company_id,title,status,raw_content,extraction,conversion,published_at")
    .eq("id", studyId)
    .maybeSingle()
  if (!study) throw new Error("Étude introuvable.")
  if (study.published_at) throw new Error("Une étude publiée est figée : importez une nouvelle étude pour la remplacer.")
  if (study.status === "converting") throw new Error("Conversion déjà en cours.")

  const company = await loadStudyCompany(actor.supabase, study.company_id)
  if (!company) throw new Error("Compte introuvable dans votre workspace.")

  const structure = prepareStudyStructure(study.raw_content, readExtractionMeta(study.extraction))
  const prompts = planStudyConversion({
    context: { companyName: company.name, segmentName: company.segmentName, studyTitle: study.title },
    blocks: structure.blocks,
    sources: structure.extraction.sources,
    authorities: structure.extraction.authorities,
    blockSourceRefs: structure.extraction.blockSourceRefs,
  })
  if (prompts.length === 0) throw new Error("Étude vide : rien à convertir.")

  const attempt = (readConversion(study.conversion)?.attempt ?? 0) + 1
  const startedAt = new Date().toISOString()

  // L'étude passe en conversion AVANT le déclenchement : un callback rapide doit trouver
  // la bonne tentative. L'écriture conditionnelle interdit deux lancements concurrents.
  const { data: locked } = await actor.supabase
    .from("account_research_studies")
    .update({
      status: "converting",
      error_message: null,
      conversion: { attempt, started_at: startedAt, model: STUDY_CONVERSION_MODEL, parts: [] } as unknown as Json,
    })
    .eq("id", study.id)
    .neq("status", "converting")
    .select("id")
  if (!locked || locked.length === 0) throw new Error("Conversion déjà en cours.")

  const results = await Promise.all(
    prompts.map((part) => {
      const snapshot: PartSnapshot = {
        study_id: study.id,
        attempt,
        part_key: part.key,
        kind: part.kind,
        block_ids: part.block_ids,
        source_ids: part.source_ids,
        part_count: prompts.length,
      }
      return triggerN8nRun({
        workflowId: "mission-001-run",
        runType: STUDY_CONVERSION_RUN_TYPE,
        entityType: "company",
        entityId: company.id,
        companyId: company.id,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        // Vers n8n : l'enveloppe de l'exécuteur générique (prompts compris).
        input: {
          schemaVersion: 1,
          missionSlug: "study-conversion",
          missionVersion: 1,
          systemPrompt: part.systemPrompt,
          userPrompt: part.userPrompt,
          model: { provider: "anthropic", model: part.model, maxOutputTokens: part.maxOutputTokens },
          requestedAt: startedAt,
        },
        // Persisté : la trace seule, jamais le prompt (qui contient l'étude).
        inputSnapshot: snapshot as unknown as Record<string, unknown>,
        extraConfig: { studyId: study.id, partKey: part.key },
      }).then((result) => ({ part, result }))
    }),
  )

  const conversion: StudyConversionState = {
    attempt,
    started_at: startedAt,
    model: STUDY_CONVERSION_MODEL,
    parts: results
      .filter(({ result }) => result.runId)
      .map(({ part, result }) => ({
        key: part.key,
        kind: part.kind,
        block_ids: part.block_ids,
        source_ids: part.source_ids,
        run_id: result.runId as string,
      })),
  }
  await actor.supabase
    .from("account_research_studies")
    .update({ conversion: conversion as unknown as Json })
    .eq("id", study.id)

  const failed = results.filter(({ result }) => !result.ok)
  if (failed.length > 0) {
    const reason = failed.map(({ part, result }) => `${part.key} : ${result.ok ? "" : result.error}`).join(" · ")
    await markStudyFailed(getStudyServiceClient(), study.id, attempt, `Déclenchement impossible — ${reason}`)
    throw new Error(`Déclenchement de la conversion impossible (${failed.length}/${prompts.length} passes). ${failed[0].result.ok ? "" : failed[0].result.error}`)
  }

  return { attempt, parts: prompts.length }
}

// ─── Callback d'une passe ───────────────────────────────────────────────────

type CallbackRun = {
  company_id: string | null
  workspace_id: string
  owner_id: string
  input_snapshot: unknown
}

export type StudyCallbackOutcome = { status: number; body: Record<string, unknown> }

/**
 * Appelé par `/api/n8n/callback` pour un run `mission:study-conversion`, AVANT le
 * validateur de rapport de mission (qui refuserait une sortie qui n'en est pas un).
 */
export async function handleStudyConversionCallback(input: {
  runId: string
  run: CallbackRun
  payload: N8nCallbackPayload
}): Promise<StudyCallbackOutcome> {
  const { runId, run, payload } = input
  const service = getStudyServiceClient()
  const snapshot = readPartSnapshot(run.input_snapshot)
  if (!snapshot) {
    await updateRunStatus(runId, "failed", { phase: PART_PHASE, errorMessage: "Passe de conversion sans trace d'étude." })
    return { status: 400, body: { error: "input_snapshot de passe illisible" } }
  }

  if (payload.n8nExecutionId || payload.n8nWorkflowId) {
    await updateRunN8nIds(runId, { n8nExecutionId: payload.n8nExecutionId, n8nWorkflowId: payload.n8nWorkflowId })
  }

  if (payload.status !== "succeeded") {
    const message = payload.errorMessage ?? "Échec de l'exécuteur n8n"
    await updateRunStatus(runId, "failed", { phase: PART_PHASE, errorMessage: message })
    await markStudyFailed(service, snapshot.study_id, snapshot.attempt, `Passe ${snapshot.part_key} en échec : ${message}`)
    return { status: 200, body: { ok: true, studyId: snapshot.study_id, part: snapshot.part_key, failed: true } }
  }

  const rawOutput = typeof payload.contentJson?.rawOutput === "string" ? payload.contentJson.rawOutput : ""
  const parsed = snapshot.kind === "blocks"
    ? parseBlocksPartOutput(rawOutput, { blockIds: snapshot.block_ids, sourceIds: snapshot.source_ids })
    : parseSourcesPartOutput(rawOutput, { sourceIds: snapshot.source_ids })

  if (!parsed.ok) {
    await updateRunStatus(runId, "failed", { phase: PART_PHASE, errorMessage: parsed.error })
    await markStudyFailed(service, snapshot.study_id, snapshot.attempt, `Passe ${snapshot.part_key} illisible : ${parsed.error}`)
    return { status: 400, body: { error: parsed.error } }
  }

  // La sortie BRUTE est conservée : la finalisation la relit avec le même parseur.
  await saveResult(runId, run.company_id, run.workspace_id, run.owner_id, {
    ...payload,
    phase: PART_PHASE,
    resultType: STUDY_CONVERSION_PART_RESULT_TYPE,
    contentJson: {
      study_id: snapshot.study_id,
      attempt: snapshot.attempt,
      part_key: snapshot.part_key,
      kind: snapshot.kind,
      raw_output: rawOutput,
    },
    contentText: undefined,
    title: `Conversion d'étude — ${snapshot.part_key}`,
  })
  await updateRunStatus(runId, "succeeded", { phase: PART_PHASE })

  const finalized = await finalizeStudyConversion(service, snapshot.study_id, snapshot.attempt)
  return { status: 200, body: { ok: true, studyId: snapshot.study_id, part: snapshot.part_key, finalized } }
}

// ─── Finalisation ───────────────────────────────────────────────────────────

type PartRunRow = {
  id: string
  status: string
  input_snapshot: unknown
}

type PartResultRow = { run_id: string; content_json: unknown }

export async function finalizeStudyConversion(
  service: StudyServiceClient,
  studyId: string,
  attempt: number,
): Promise<"assembled" | "pending" | "failed" | "stale"> {
  const { data: study } = await service
    .from("account_research_studies")
    .select("id,company_id,title,status,raw_content,raw_sha256,original_file_name,extraction,conversion,created_at")
    .eq("id", studyId)
    .maybeSingle<StudyRow>()
  if (!study) return "stale"
  const conversion = readConversion(study.conversion)
  if (study.status !== "converting" || conversion?.attempt !== attempt) return "stale"

  const { data: runs } = await service
    .from("ai_intelligence_runs")
    .select("id,status,input_snapshot")
    .eq("run_type", STUDY_CONVERSION_RUN_TYPE)
    .eq("input_snapshot->>study_id", studyId)
    .eq("input_snapshot->>attempt", String(attempt))
    .returns<PartRunRow[]>()

  const partRuns = (runs ?? [])
    .map((run) => ({ run, snapshot: readPartSnapshot(run.input_snapshot) }))
    .filter((entry): entry is { run: PartRunRow; snapshot: PartSnapshot } => entry.snapshot !== null)
  const expected = partRuns[0]?.snapshot.part_count ?? 0

  if (partRuns.some(({ run }) => run.status === "failed" || run.status === "cancelled")) {
    await markStudyFailed(service, studyId, attempt, "Au moins une passe de conversion a échoué.")
    return "failed"
  }
  if (expected === 0 || partRuns.length < expected || partRuns.some(({ run }) => run.status !== "succeeded")) return "pending"

  const { data: results } = await service
    .from("ai_intelligence_results")
    .select("run_id,content_json")
    .in("run_id", partRuns.map(({ run }) => run.id))
    .eq("result_type", STUDY_CONVERSION_PART_RESULT_TYPE)
    .returns<PartResultRow[]>()
  const rawByRun = new Map(
    (results ?? []).map((row) => [row.run_id, (row.content_json as { raw_output?: unknown })?.raw_output]),
  )

  try {
    const company = await loadStudyCompany(service, study.company_id)
    if (!company) throw new Error("Compte introuvable.")

    const blocksOutputs: ParsedBlocksPart[] = []
    const sourcesOutputs: ParsedSourcesPart[] = []
    const ordered = [...partRuns].sort((a, b) => a.snapshot.part_key.localeCompare(b.snapshot.part_key))
    for (const { run, snapshot } of ordered) {
      const raw = rawByRun.get(run.id)
      if (typeof raw !== "string") throw new Error(`Sortie de la passe ${snapshot.part_key} introuvable.`)
      if (snapshot.kind === "blocks") {
        const parsed = parseBlocksPartOutput(raw, { blockIds: snapshot.block_ids, sourceIds: snapshot.source_ids })
        if (!parsed.ok) throw new Error(parsed.error)
        blocksOutputs.push(parsed.value)
      } else {
        const parsed = parseSourcesPartOutput(raw, { sourceIds: snapshot.source_ids })
        if (!parsed.ok) throw new Error(parsed.error)
        sourcesOutputs.push(parsed.value)
      }
    }

    const structure = prepareStudyStructure(study.raw_content, readExtractionMeta(study.extraction))
    const { knowledge, registry } = assembleStudyKnowledge({
      study: {
        id: study.id,
        companyId: study.company_id,
        title: study.title,
        fileName: study.original_file_name,
        rawContent: study.raw_content,
        rawSha256: study.raw_sha256,
        importedAt: study.created_at,
      },
      company: { name: company.name, segmentSlug: company.segmentSlug, segmentName: company.segmentName },
      blocks: structure.blocks,
      extraction: structure.extraction,
      parts: ordered.map(({ run, snapshot }) => ({ key: snapshot.part_key, kind: snapshot.kind, run_id: run.id })),
      blocksOutputs,
      sourcesOutputs,
      convertedAt: new Date().toISOString(),
      model: conversion.model,
    })

    const check = validateStudyKnowledge(JSON.parse(JSON.stringify(knowledge)))
    if (!check.ok) throw new Error(`Briques invalides : ${check.issues.slice(0, 5).join(" · ")}`)

    const { data: written } = await service
      .from("account_research_studies")
      .update({
        status: "ready",
        error_message: null,
        knowledge_json: knowledge as unknown as Json,
        sources_registry_json: registry as unknown as Json,
        coverage: knowledge.coverage as unknown as Json,
      })
      .eq("id", studyId)
      .eq("status", "converting")
      .eq("conversion->>attempt", String(attempt))
      .select("id")
    if (written && written.length > 0) revalidatePath(`/prospection/accounts/${study.company_id}`)
    return "assembled"
  } catch (error) {
    await markStudyFailed(service, studyId, attempt, `Assemblage impossible : ${error instanceof Error ? error.message : String(error)}`)
    return "failed"
  }
}

// ─── Publication ────────────────────────────────────────────────────────────

export async function publishStudy(studyId: string): Promise<void> {
  const actor = await requireStudyActor()
  const { data: study } = await actor.supabase
    .from("account_research_studies")
    .select("status,published_at,knowledge_json,sources_registry_json")
    .eq("id", studyId)
    .maybeSingle()
  if (!study) throw new Error("Étude introuvable.")
  if (study.status !== "ready" || study.published_at) {
    throw new Error("Seule une étude convertie et non encore publiée peut être publiée.")
  }

  const knowledge = validateStudyKnowledge(study.knowledge_json)
  if (!knowledge.ok) throw new Error(`Publication bloquée : briques invalides (${knowledge.issues[0]}).`)
  if (!knowledge.value.coverage.text.identical) {
    throw new Error("Publication bloquée : l’intégrité du texte source n’est pas démontrée.")
  }
  if (!knowledge.value.coverage.registry.importable) {
    throw new Error("Publication bloquée : le registre de sources E3 n’est pas importable.")
  }
  const registry = parseSourceRegistryOutput(study.sources_registry_json)
  if (!registry.ok) {
    throw new Error(`Publication bloquée : registre E3 invalide (${registry.errors[0]?.message ?? "erreur inconnue"}).`)
  }

  const { data, error } = await actor.supabase
    .from("account_research_studies")
    .update({ published_at: new Date().toISOString(), published_by: actor.userId })
    .eq("id", studyId)
    .eq("status", "ready")
    .is("published_at", null)
    .select("company_id")
  if (error) throw new Error(`Publication impossible : ${error.message}`)
  if (!data || data.length === 0) throw new Error("Seule une étude convertie et non encore publiée peut être publiée.")
  revalidatePath(`/prospection/accounts/${data[0].company_id}`)
}

// ─── État d'avancement (suivi dans l'UI) ────────────────────────────────────

export type StudyConversionProgress = {
  studyId: string
  status: StudyRow["status"]
  errorMessage: string | null
  attempt: number
  partsTotal: number
  partsSucceeded: number
  partsFailed: number
  startedAt: string | null
  publishedAt: string | null
  coverage: StudyCoverage | null
}

export async function getStudyConversionProgress(studyId: string): Promise<StudyConversionProgress> {
  const actor = await requireStudyActor()
  const { data: study } = await actor.supabase
    .from("account_research_studies")
    .select("id,status,error_message,conversion,published_at,coverage")
    .eq("id", studyId)
    .maybeSingle()
  if (!study) throw new Error("Étude introuvable.")
  const conversion = readConversion(study.conversion)

  let partsSucceeded = 0
  let partsFailed = 0
  let partsTotal = conversion?.parts.length ?? 0
  if (conversion) {
    const { data: runs } = await actor.supabase
      .from("ai_intelligence_runs")
      .select("status,input_snapshot")
      .eq("run_type", STUDY_CONVERSION_RUN_TYPE)
      .eq("input_snapshot->>study_id", studyId)
      .eq("input_snapshot->>attempt", String(conversion.attempt))
    for (const run of runs ?? []) {
      if (run.status === "succeeded") partsSucceeded += 1
      if (run.status === "failed" || run.status === "cancelled") partsFailed += 1
      const snapshot = readPartSnapshot(run.input_snapshot)
      if (snapshot) partsTotal = Math.max(partsTotal, snapshot.part_count)
    }
  }

  return {
    studyId: study.id,
    status: study.status,
    errorMessage: study.error_message,
    attempt: conversion?.attempt ?? 0,
    partsTotal,
    partsSucceeded,
    partsFailed,
    startedAt: conversion?.started_at ?? null,
    publishedAt: study.published_at,
    coverage: (study.coverage as StudyCoverage | null) ?? null,
  }
}
