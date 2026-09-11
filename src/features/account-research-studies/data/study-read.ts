import "server-only"

// ─── Lectures : état de la page compte, fichiers, PDF original ──────────────

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

import { STUDY_STORAGE_BUCKET, type AccountStudyKnowledge, type StudyCoverage, type StudyStatus } from "../domain/study-contracts"
import { validateStudyKnowledge } from "../domain/validate-study-knowledge"
import { getStudyServiceClient, requireStudyActor } from "./study-server"

export type AccountStudySummary = {
  id: string
  title: string
  status: StudyStatus
  createdAt: string
  publishedAt: string | null
  errorMessage: string | null
  coverage: StudyCoverage | null
}

export type AccountStudyState = {
  /** Étude publiée la plus récente : la connaissance courante du compte. */
  current: { id: string; title: string; publishedAt: string; knowledge: AccountStudyKnowledge } | null
  /** Briques publiées présentes mais illisibles — signalé, jamais masqué. */
  currentUnreadable: { id: string; issues: string[] } | null
  /** Dernières études du compte, sans leurs gros champs. */
  recent: AccountStudySummary[]
}

type RecentRow = {
  id: string
  title: string
  status: StudyStatus
  created_at: string
  published_at: string | null
  error_message: string | null
  coverage: StudyCoverage | null
}

/**
 * Deux requêtes parallèles : l'étude publiée (avec ses briques) et la liste courte des
 * études récentes (sans texte brut ni briques). Le texte intégral ne transite jamais
 * vers la page : il n'est lu qu'au téléchargement.
 */
export async function getAccountStudyState(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<AccountStudyState> {
  const [publishedResult, recentResult] = await Promise.all([
    supabase
      .from("account_research_studies")
      .select("id,title,published_at,knowledge_json")
      .eq("company_id", companyId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("account_research_studies")
      .select("id,title,status,created_at,published_at,error_message,coverage")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentRow[]>(),
  ])

  if (publishedResult.error) console.error("[account-study] published study query failed:", publishedResult.error.message)
  if (recentResult.error) console.error("[account-study] recent studies query failed:", recentResult.error.message)

  let current: AccountStudyState["current"] = null
  let currentUnreadable: AccountStudyState["currentUnreadable"] = null
  const published = publishedResult.data
  if (published?.published_at) {
    const validation = validateStudyKnowledge(published.knowledge_json)
    if (validation.ok) {
      current = { id: published.id, title: published.title, publishedAt: published.published_at, knowledge: validation.value }
    } else {
      currentUnreadable = { id: published.id, issues: validation.issues }
      console.error(`[account-study] briques illisibles (étude ${published.id}) :`, validation.issues.join(" | "))
    }
  }

  return {
    current,
    currentUnreadable,
    recent: (recentResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      publishedAt: row.published_at,
      errorMessage: row.error_message,
      coverage: row.coverage,
    })),
  }
}

export type StudyFileKind = "knowledge" | "sources" | "raw"

export async function readStudyFile(studyId: string, kind: StudyFileKind): Promise<{ fileName: string; content: string }> {
  const actor = await requireStudyActor()
  const { data } = await actor.supabase
    .from("account_research_studies")
    .select("title,original_file_name,raw_content,knowledge_json,sources_registry_json")
    .eq("id", studyId)
    .maybeSingle()
  if (!data) throw new Error("Étude introuvable.")
  const base = data.original_file_name.replace(/\.pdf$/i, "")

  if (kind === "raw") return { fileName: `${base} — texte intégral.md`, content: data.raw_content }
  if (kind === "knowledge") {
    if (!data.knowledge_json) throw new Error("Étude pas encore convertie.")
    return { fileName: `${base} — briques.json`, content: JSON.stringify(data.knowledge_json, null, 2) }
  }
  if (!data.sources_registry_json) throw new Error("Étude pas encore convertie.")
  return { fileName: `${base} — sources E3.json`, content: JSON.stringify(data.sources_registry_json, null, 2) }
}

/** URL signée (10 min) vers le PDF original, octet pour octet. */
export async function getStudyOriginalUrl(studyId: string): Promise<string> {
  const actor = await requireStudyActor()
  const { data } = await actor.supabase
    .from("account_research_studies")
    .select("original_file_path")
    .eq("id", studyId)
    .maybeSingle()
  if (!data) throw new Error("Étude introuvable.")
  const { data: signed, error } = await getStudyServiceClient()
    .storage.from(STUDY_STORAGE_BUCKET)
    .createSignedUrl(data.original_file_path, 600)
  if (error || !signed) throw new Error(`Lien vers le PDF impossible : ${error?.message ?? "réponse vide"}.`)
  return signed.signedUrl
}
