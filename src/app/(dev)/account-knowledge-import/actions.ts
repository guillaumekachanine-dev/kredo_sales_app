"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { importExternalAccountKnowledge } from "@/lib/intelligence/import-external-account-knowledge"
import type { ValidationIssue } from "@/lib/intelligence/intelligence-validators"

export type ImportAccountKnowledgeResult =
  | { ok: true; runId: string; version: number }
  | { ok: false; error: string; issues: ValidationIssue[] }

async function requireUserAndWorkspace() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Non authentifié")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.workspace_id) {
    throw new Error("Workspace introuvable pour l'utilisateur courant")
  }

  return { supabase, userId: user.id, workspaceId: profile.workspace_id }
}

export async function importAccountKnowledgeAction(
  companyId: string,
  modelUsed: string,
  rawJson: string,
): Promise<ImportAccountKnowledgeResult> {
  if (!companyId) {
    return { ok: false, error: "Choisis un compte.", issues: [] }
  }
  if (!modelUsed.trim()) {
    return {
      ok: false,
      error: "Précise le moteur utilisé (ex : chatgpt-deep-research, gemini-deep-research).",
      issues: [],
    }
  }

  let contentJson: unknown
  try {
    contentJson = JSON.parse(rawJson)
  } catch {
    return {
      ok: false,
      error: "JSON invalide — vérifie qu'il n'y a rien avant `{` ni après `}`.",
      issues: [],
    }
  }

  const { supabase, userId, workspaceId } = await requireUserAndWorkspace()

  const result = await importExternalAccountKnowledge(supabase, {
    workspaceId,
    companyId,
    ownerId: userId,
    contentJson,
    modelUsed: modelUsed.trim(),
  })

  if (!result.ok) {
    return { ok: false, error: result.error, issues: result.issues }
  }

  return { ok: true, runId: result.runId, version: result.version }
}
