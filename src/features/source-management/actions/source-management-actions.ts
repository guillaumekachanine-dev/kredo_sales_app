"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { getSourceManagementSnapshot } from "../data/get-source-management-snapshot"
import {
  buildManualSourceKey,
  validateManualSourceInput,
  type ManualSourceFormInput,
  type SourceManagementSnapshot,
  type UpdateCorpusEditorialInput,
} from "../domain/source-management-contracts"

type MutationResult = { success: true } | { success: false; error: string }

type ExistingSourceSummary = {
  id: string
  name: string
  origin: "system" | "manual" | "corpus"
  isActive: boolean
}

export type ManualSourceMutationResult =
  | { success: true; id: string }
  | { success: false; error: string; duplicate?: ExistingSourceSummary }

type ActingWorkspace =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }

async function resolveActingWorkspace(): Promise<ActingWorkspace> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: "Non authentifié." }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.workspace_id) return { ok: false, error: "Workspace introuvable." }

  if (profile.role !== "owner" && profile.role !== "admin") {
    return { ok: false, error: "Réservé aux administrateurs du workspace." }
  }

  return { ok: true, supabase, userId: user.id }
}

export async function createManualSourceAction(input: ManualSourceFormInput): Promise<ManualSourceMutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase, userId } = acting

  const validation = validateManualSourceInput(input)
  if (!validation.ok) return { success: false, error: validation.error }
  const { name, searchDomain, homepageUrl, family, kredoCategory, collectionUrl } = validation.data

  const { data: existingMatches, error: lookupError } = await supabase
    .from("source_catalog")
    .select("id, name, origin, is_active, domain, search_domain")
    .or(`domain.eq.${searchDomain},search_domain.eq.${searchDomain}`)

  if (lookupError) return { success: false, error: lookupError.message }

  const existing = (existingMatches ?? []).find(
    (row) => row.domain === searchDomain || row.search_domain === searchDomain,
  )
  if (existing) {
    return {
      success: false,
      error:
        existing.origin === "manual"
          ? "Une source manuelle existe déjà pour ce domaine."
          : "Ce domaine est déjà référencé par le socle système ou un corpus.",
      duplicate: { id: existing.id, name: existing.name, origin: existing.origin, isActive: existing.is_active },
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("source_catalog")
    .insert({
      source_key: buildManualSourceKey(searchDomain),
      name,
      domain: searchDomain,
      search_domain: searchDomain,
      collection_url: collectionUrl,
      homepage_url: homepageUrl,
      family,
      kredo_category: kredoCategory,
      origin: "manual",
      content_temporality: "continuous",
      usage_scopes: ["news"],
      validation_status: "pending",
      is_active: true,
      is_locked: false,
      created_by: userId,
    })
    .select("id")
    .single()

  if (insertError || !inserted) return { success: false, error: insertError?.message ?? "Échec de la création." }

  revalidatePath("/veille")
  return { success: true, id: inserted.id }
}

export async function reactivateManualSourceAction(id: string): Promise<MutationResult> {
  return setManualSourceActiveAction(id, true)
}

export async function updateManualSourceAction(
  id: string,
  input: ManualSourceFormInput,
): Promise<ManualSourceMutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const validation = validateManualSourceInput(input)
  if (!validation.ok) return { success: false, error: validation.error }
  const { name, searchDomain, homepageUrl, family, kredoCategory, collectionUrl } = validation.data

  const { data: current, error: currentError } = await supabase
    .from("source_catalog")
    .select("id, origin, is_locked")
    .eq("id", id)
    .maybeSingle()
  if (currentError || !current) return { success: false, error: "Source introuvable." }
  if (current.origin === "system" || current.is_locked) {
    return { success: false, error: "Une source système ne peut pas être modifiée depuis le client." }
  }

  const { error: updateError } = await supabase
    .from("source_catalog")
    .update({
      name,
      domain: searchDomain,
      search_domain: searchDomain,
      collection_url: collectionUrl,
      homepage_url: homepageUrl,
      family,
      kredo_category: kredoCategory,
    })
    .eq("id", id)
    .eq("origin", "manual")

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath("/veille")
  return { success: true, id }
}

export async function setManualSourceActiveAction(id: string, isActive: boolean): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { data: current, error: currentError } = await supabase
    .from("source_catalog")
    .select("id, origin, is_locked")
    .eq("id", id)
    .maybeSingle()
  if (currentError || !current) return { success: false, error: "Source introuvable." }
  if (current.origin === "system" || current.is_locked) {
    return { success: false, error: "Une source système ne peut pas être modifiée depuis le client." }
  }

  const { error } = await supabase
    .from("source_catalog")
    .update({ is_active: isActive, validation_status: isActive ? "pending" : "rejected" })
    .eq("id", id)
    .eq("origin", "manual")

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function deleteManualSourceAction(id: string): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { data: current, error: currentError } = await supabase
    .from("source_catalog")
    .select("id, origin, is_locked")
    .eq("id", id)
    .maybeSingle()
  if (currentError || !current) return { success: false, error: "Source introuvable." }
  if (current.origin === "system" || current.is_locked) {
    return { success: false, error: "Une source système ne peut pas être supprimée depuis le client." }
  }

  const { error } = await supabase.from("source_catalog").delete().eq("id", id).eq("origin", "manual")
  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function setCorpusActivationAction(
  corpusId: string,
  activationState: "draft" | "active",
): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { error } = await supabase
    .from("source_corpora")
    .update({ activation_state: activationState })
    .eq("id", corpusId)
    .in("scope_kind", ["sector", "thematic"])

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function setCorpusNewsEnabledAction(corpusId: string, enabled: boolean): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { error } = await supabase
    .from("source_corpora")
    .update({ enabled_for_news: enabled })
    .eq("id", corpusId)
    .eq("scope_kind", "sector")

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function setCorpusAccountWatchEnabledAction(corpusId: string, enabled: boolean): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { error } = await supabase
    .from("source_corpora")
    .update({ enabled_for_account_watch: enabled })
    .eq("id", corpusId)
    .eq("scope_kind", "sector")

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function setCorpusItemEnabledAction(itemId: string, enabled: boolean): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { error } = await supabase
    .from("source_corpus_items")
    .update({ is_enabled: enabled })
    .eq("id", itemId)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function updateCorpusEditorialAction(
  corpusId: string,
  input: UpdateCorpusEditorialInput,
): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const normalizedName = (input.name ?? "").trim().replace(/\s+/g, " ")
  if (!normalizedName) {
    return { success: false, error: "Le nom du corpus ne peut pas être vide." }
  }
  if (normalizedName.length > 120) {
    return { success: false, error: "Le nom du corpus ne peut pas dépasser 120 caractères." }
  }

  const rawDescription = input.description != null ? input.description.trim() : null
  const normalizedDescription = rawDescription ? rawDescription.replace(/\r\n/g, "\n") : null
  if (normalizedDescription && normalizedDescription.length > 500) {
    return { success: false, error: "La description ne peut pas dépasser 500 caractères." }
  }

  const { data: current, error: currentError } = await supabase
    .from("source_corpora")
    .select("id, metadata, scope_kind")
    .eq("id", corpusId)
    .maybeSingle()

  if (currentError || !current) return { success: false, error: "Corpus introuvable." }
  if (current.scope_kind === "system") {
    return { success: false, error: "Un corpus système ne peut pas être modifié." }
  }

  const currentMeta =
    typeof current.metadata === "object" && current.metadata !== null && !Array.isArray(current.metadata)
      ? (current.metadata as Record<string, unknown>)
      : {}
  const currentEditorial =
    typeof currentMeta.editorial === "object" && currentMeta.editorial !== null && !Array.isArray(currentMeta.editorial)
      ? (currentMeta.editorial as Record<string, unknown>)
      : {}

  const updatedEditorial = {
    ...currentEditorial,
    name: normalizedName,
    description: normalizedDescription,
  }

  const updatedMetadata = {
    ...currentMeta,
    editorial: updatedEditorial,
  }

  const { error: updateError } = await supabase
    .from("source_corpora")
    .update({ metadata: updatedMetadata as unknown as Json })
    .eq("id", corpusId)
    .neq("scope_kind", "system")

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function renameCorpusSourceAction(
  itemId: string,
  name: string,
): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const normalizedName = (name ?? "").trim().replace(/\s+/g, " ")
  if (!normalizedName) {
    return { success: false, error: "Le nom de la source ne peut pas être vide." }
  }
  if (normalizedName.length > 120) {
    return { success: false, error: "Le nom de la source ne peut pas dépasser 120 caractères." }
  }

  const { data: item, error: itemError } = await supabase
    .from("source_corpus_items")
    .select("id, corpus_id, source_id")
    .eq("id", itemId)
    .maybeSingle()

  if (itemError || !item) return { success: false, error: "Source du corpus introuvable." }

  const { data: corpus, error: corpusError } = await supabase
    .from("source_corpora")
    .select("id, scope_kind")
    .eq("id", item.corpus_id)
    .maybeSingle()

  if (corpusError || !corpus) return { success: false, error: "Corpus introuvable." }
  if (corpus.scope_kind === "system") {
    return { success: false, error: "Les sources d'un corpus système ne peuvent pas être modifiées." }
  }

  const { data: source, error: sourceError } = await supabase
    .from("source_catalog")
    .select("id, origin, is_locked")
    .eq("id", item.source_id)
    .maybeSingle()

  if (sourceError || !source) return { success: false, error: "Source introuvable dans le catalogue." }
  if (source.origin === "system" || source.is_locked) {
    return { success: false, error: "Une source système ou verrouillée ne peut pas être modifiée." }
  }

  const { error: updateError } = await supabase
    .from("source_catalog")
    .update({ name: normalizedName })
    .eq("id", item.source_id)
    .neq("origin", "system")
    .eq("is_locked", false)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function removeSourceFromCorpusAction(itemId: string): Promise<MutationResult> {
  const acting = await resolveActingWorkspace()
  if (!acting.ok) return { success: false, error: acting.error }
  const { supabase } = acting

  const { data: item, error: itemError } = await supabase
    .from("source_corpus_items")
    .select("id, corpus_id, source_id")
    .eq("id", itemId)
    .maybeSingle()

  if (itemError || !item) return { success: false, error: "Source du corpus introuvable." }

  const { data: corpus, error: corpusError } = await supabase
    .from("source_corpora")
    .select("id, scope_kind")
    .eq("id", item.corpus_id)
    .maybeSingle()

  if (corpusError || !corpus) return { success: false, error: "Corpus introuvable." }
  if (corpus.scope_kind === "system") {
    return { success: false, error: "Impossible de retirer une source d'un corpus système." }
  }

  const { error: deleteError } = await supabase
    .from("source_corpus_items")
    .delete()
    .eq("id", itemId)

  if (deleteError) return { success: false, error: deleteError.message }
  revalidatePath("/veille")
  return { success: true }
}


// ─────────────────────────────────────────────────────────────────────────────
//  Chargeur autoportant du socle de sources.
//
//  Même raison que pour le simulateur de cadence : la page /veille charge le
//  snapshot côté serveur et le passe en prop, le Cockpit Intelligence n'a pas
//  ce contexte. Passe-plat, aucune règle dupliquée.
// ─────────────────────────────────────────────────────────────────────────────
export async function loadSourceManagementSnapshot(): Promise<SourceManagementSnapshot> {
  return getSourceManagementSnapshot()
}
