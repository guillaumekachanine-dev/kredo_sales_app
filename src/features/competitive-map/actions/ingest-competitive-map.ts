"use server"

import "server-only"

// ADR-0019 Lot 5 — écriture de la cartographie déjà arbitrée par l'utilisateur
// (étape 3 du wizard, après le bac d'arbitrage de l'étape 2). Même doctrine
// que `applyAccountClassification`/`applyAccountScanProposals` : le navigateur
// n'envoie que des décisions déjà vues et validées côté client, jamais une
// valeur canonique "en confiance" ; toute la logique d'écriture (résolution du
// segment, garde-fous, upserts) vit dans la RPC `ingest_competitive_map_batch`
// (SECURITY DEFINER, migration 074).

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { saveAsDocumentWithClient } from "@/app/(app)/reports/_data/reports-actions"
import {
  COMPETITIVE_MAP_CATEGORY_VALUES,
  COMPETITIVE_MAP_CONFIANCE_VALUES,
  parseCompetitiveMapOutput,
  type CompetitiveMapCategory,
  type CompetitiveMapConfiance,
  type CompetitiveMapProfile,
} from "../domain/competitive-map-output"
import {
  buildCompetitiveMapImportDocumentTitle,
  buildCompetitiveMapImportReportText,
  type CompetitiveMapImportReportContent,
} from "../domain/competitive-map-import-report"

// Le fichier source est archivé tel quel dans `content_json.sourceJson` pour
// que l'utilisateur puisse le retélécharger depuis /reports. Au-delà de ce
// seuil on renonce à l'archiver (l'import CRM, lui, n'est jamais bloqué) :
// `intelligence_documents` n'a pas vocation à stocker des blobs de plusieurs
// mégaoctets, et `next.config.ts` plafonne de toute façon les Server Actions
// à `serverActions.bodySizeLimit`.
const SOURCE_JSON_ARCHIVE_MAX_BYTES = 400_000

export type CompetitiveMapIngestionDecision = {
  action: "attach" | "create"
  companyId: string | null
  name: string | null
  siren: string | null
  segmentSlug: string
  category: CompetitiveMapCategory
  positioning: string | null
  forces: string | null
  vulnerabilite: string | null
  angleEntree: string | null
  empreinteMetier: number | null
  maturiteNumerique: number | null
  appetenceScore: number | null
  /** Composante « accessibilité » (1-5), axe Y de la matrice. `null` = non renseigné, jamais substitué. */
  accessibiliteScore: number | null
  appetenceProvisoire: boolean
  /** `meta.compte_etalon` de l'étude -> `competitive_map_entries.is_benchmark_account`. */
  isBenchmarkAccount: boolean
  /** Narratif d'étude projeté dans `profile_json`. Jamais de fait chiffré sourcé ici (ADR-0019 D-4). */
  profileJson: CompetitiveMapProfile
  confiance: CompetitiveMapConfiance
  studySnapshotDate: string
  caMeur: number | null
  exercice: number | null
  perimetreCa: string | null
  effectifFrance: number | null
}

/**
 * Contexte d'archivage — le serveur re-dérive tout ce qui peut l'être
 * (secteur, comptes analysés) depuis `rawText` plutôt que de faire confiance
 * à des compteurs calculés côté client : même doctrine que les décisions
 * elles-mêmes, `rawText` est une donnée déjà vue et validée par
 * l'utilisateur, pas une valeur canonique envoyée "en confiance".
 */
export type CompetitiveMapImportContext = {
  /** Nom du fichier déposé, ou "JSON collé" si l'utilisateur a collé le contenu. */
  sourceFileName: string
  rawText: string
}

export type ConfirmCompetitiveMapIngestionResult = {
  error: string | null
  created: { companyId: string; name: string }[]
  attached: { companyId: string }[]
  errors: { name: string | null; code: string; sqlstate: string }[]
  /** `null` si l'archivage a échoué ou n'a pas été demandé — l'import CRM reste réussi dans tous les cas. */
  reportDocumentId: string | null
  reportError: string | null
}

const EMPTY: ConfirmCompetitiveMapIngestionResult = {
  error: null,
  created: [],
  attached: [],
  errors: [],
  reportDocumentId: null,
  reportError: null,
}

function isNullableIntegerInRange(value: number | null, min: number, max: number): boolean {
  if (value === null) return true
  return Number.isInteger(value) && value >= min && value <= max
}

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidDecision(decision: CompetitiveMapIngestionDecision): string | null {
  if (decision.action !== "attach" && decision.action !== "create") return "action invalide"
  if (decision.action === "attach" && !decision.companyId) return "companyId requis pour un rattachement"
  if (decision.action === "create" && !decision.name?.trim()) return "nom requis pour une création"
  if (!decision.segmentSlug) return "segment requis"
  if (!(COMPETITIVE_MAP_CATEGORY_VALUES as readonly string[]).includes(decision.category)) return "catégorie invalide"
  if (!(COMPETITIVE_MAP_CONFIANCE_VALUES as readonly string[]).includes(decision.confiance)) return "confiance invalide"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.studySnapshotDate)) return "date d'étude invalide"
  // Mêmes bornes que les CHECK de competitive_map_entries : une valeur hors
  // domaine est rejetée ici plutôt que d'aller échouer entrée par entrée dans
  // la RPC, où elle ne remonterait qu'en ligne d'erreur du bilan.
  if (!isNullableIntegerInRange(decision.accessibiliteScore, 1, 5)) return "accessibilité hors bornes (1-5)"
  if (!isNullableIntegerInRange(decision.appetenceScore, 0, 35)) return "score d'appétence hors bornes (0-35)"
  if (!isPlainObject(decision.profileJson)) return "profil d'étude invalide (objet attendu)"
  return null
}

export async function confirmCompetitiveMapIngestion(
  decisions: CompetitiveMapIngestionDecision[],
  context: CompetitiveMapImportContext,
  reason?: string,
  sourceRunId?: string,
): Promise<ConfirmCompetitiveMapIngestionResult> {
  if (decisions.length === 0) {
    return { ...EMPTY, error: "Aucune décision à appliquer." }
  }

  for (const decision of decisions) {
    const validationError = isValidDecision(decision)
    if (validationError) {
      return { ...EMPTY, error: `Décision invalide (${decision.name ?? decision.companyId ?? "?"}) : ${validationError}` }
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ...EMPTY, error: "Non authentifié" }
  }

  const { data, error } = await supabase.rpc("ingest_competitive_map_batch", {
    p_decisions: decisions,
    ...(reason ? { p_reason: reason } : {}),
    ...(sourceRunId ? { p_source_run_id: sourceRunId } : {}),
  })

  if (error) {
    return { ...EMPTY, error: error.details || error.message }
  }

  const payload = (data ?? {}) as {
    created?: { companyId: string; name: string }[]
    attached?: { companyId: string }[]
    errors?: { name: string | null; code: string; sqlstate: string }[]
  }

  const created = payload.created ?? []
  const attached = payload.attached ?? []
  const errors = payload.errors ?? []

  revalidatePath("/prospection/accounts")
  revalidatePath("/intelligence")

  const { reportDocumentId, reportError } = await archiveCompetitiveMapImport({
    supabase,
    actorUserId: user.id,
    decisions,
    context,
    created,
    attached,
    errors,
  })

  return {
    error: null,
    created,
    attached,
    errors,
    reportDocumentId,
    reportError,
  }
}

/**
 * L'archivage est en pur best-effort : un import CRM réussi ne doit jamais
 * devenir un échec parce que l'écriture du rapport a raté. Toute erreur ici
 * remonte dans `reportError`, jamais dans `error`.
 */
async function archiveCompetitiveMapImport(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  actorUserId: string
  decisions: CompetitiveMapIngestionDecision[]
  context: CompetitiveMapImportContext
  created: { companyId: string; name: string }[]
  attached: { companyId: string }[]
  errors: { name: string | null; code: string; sqlstate: string }[]
}): Promise<{ reportDocumentId: string | null; reportError: string | null }> {
  const { supabase, actorUserId, decisions, context, created, attached, errors } = params

  try {
    const parsed = parseCompetitiveMapOutput(JSON.parse(context.rawText))
    if ("errors" in parsed) {
      return { reportDocumentId: null, reportError: "Le contenu source n'a pas pu être relu pour l'archivage." }
    }

    const segmentSlug = decisions[0]?.segmentSlug ?? null
    const studySnapshotDate = decisions[0]?.studySnapshotDate ?? null

    const { data: segmentRow } = segmentSlug
      ? await supabase.from("sector_intelligence").select("id, name").eq("slug", segmentSlug).maybeSingle()
      : { data: null }

    const analyzed = parsed.data.comptes.length
    const imported = created.length + attached.length
    const failed = errors.length
    const excluded = Math.max(analyzed - decisions.length, 0)
    const rejected = excluded + failed

    const rawTextBytes = Buffer.byteLength(context.rawText, "utf8")
    const sourceTruncated = rawTextBytes > SOURCE_JSON_ARCHIVE_MAX_BYTES
    const sourceJson = sourceTruncated ? null : JSON.parse(context.rawText)

    const content: CompetitiveMapImportReportContent = {
      schemaVersion: 1,
      sectorName: parsed.data.secteur,
      segmentName: segmentRow?.name ?? parsed.data.segmentLabel,
      segmentSlug: segmentSlug ?? "",
      studySnapshotDate: studySnapshotDate ?? "",
      importedAt: new Date().toISOString(),
      sourceFileName: context.sourceFileName,
      sourceJson,
      sourceTruncated,
      counts: { analyzed, imported, rejected, excluded, failed, created: created.length, attached: attached.length },
      createdAccounts: created,
      attachedAccounts: attached,
      errors,
    }

    const result = await saveAsDocumentWithClient(supabase, actorUserId, {
      title: buildCompetitiveMapImportDocumentTitle(content),
      documentType: "competitive_map_import",
      origin: "imported",
      status: "ready",
      contentText: buildCompetitiveMapImportReportText(content),
      contentJson: content,
      scopeJson: {
        feature: "competitive_map_import",
        sectorName: content.sectorName,
        segmentSlug: content.segmentSlug,
        sourceFileName: content.sourceFileName,
        importedAt: content.importedAt,
        analyzedCount: analyzed,
        importedCount: imported,
        rejectedCount: rejected,
      },
      primaryEntity: segmentRow ? { entityType: "sector", entityId: segmentRow.id } : null,
    })

    if (!result.success) {
      console.error("[competitive-map-import] Échec de l'archivage du document :", result.error)
      return { reportDocumentId: null, reportError: result.error }
    }

    revalidatePath("/reports")
    return { reportDocumentId: result.documentId, reportError: null }
  } catch (cause) {
    console.error("[competitive-map-import] Exception inattendue lors de l'archivage du document :", cause)
    return {
      reportDocumentId: null,
      reportError: cause instanceof Error ? cause.message : "Échec inattendu de l'archivage du rapport.",
    }
  }
}
