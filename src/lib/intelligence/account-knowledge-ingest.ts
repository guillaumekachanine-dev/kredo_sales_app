// ─── Portail d'entrée applicatif d'un artefact account_knowledge ────────────
// Lot 1. Tout `content_json` de result_type=`account_knowledge` arrivant par le
// callback n8n passe par ici AVANT d'être écrit dans `ai_intelligence_results`.
//
// Ce que ce module garantit, et que ni le workflow ni les types ne peuvent
// garantir seuls :
//   1. V1 reste lisible et acceptée telle quelle (historique déjà en base) —
//      aucune conversion silencieuse V1 → V2, qui fabriquerait des sources.
//   2. V2 est validée structurellement (parseAccountKnowledgeArtifact).
//   3. Chaque UUID cité dans un `source_refs` existe RÉELLEMENT dans
//      `intelligence_sources` ET appartient au workspace du run. Le workflow
//      tourne avec la clé service_role : sans ce contrôle, un artefact pourrait
//      citer la source d'un autre tenant.
//   4. Un artefact compte sans `company_id` est refusé.
//   5. `identity.dynamic` est écrasé par le calcul déterministe
//      `account-dynamic-v1` — la valeur éventuellement produite par le LLM
//      n'est jamais retenue.
//   6. `source_coverage` est recalculé depuis le contenu réellement stocké,
//      plutôt que recopié depuis n8n.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import {
  buildQualitySummary,
  type Claim,
} from "./intelligence-common-contracts"
import type {
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
} from "./account-intelligence-contracts"
import {
  parseAccountKnowledgeArtifact,
  type ValidationIssue,
} from "./intelligence-validators"
import { computeAccountDynamic, type AccountDynamicSignalInput } from "./account-dynamic"

// Version et contenu sont corrélés dans le type : un appelant qui teste
// `version === 2` obtient directement le contrat V2, sans cast.
export type AccountKnowledgeIngestResult =
  | { ok: true; version: 1; content: AccountKnowledgeContent }
  | { ok: true; version: 2; content: AccountKnowledgeContentV2 }
  | { ok: false; error: string; issues: ValidationIssue[] }

/**
 * Énumère tous les `Claim` d'un artefact V2 avec leur chemin JSON.
 * Exporté : sert à la fois au recalcul de couverture et aux tests, qui
 * vérifient qu'aucune section n'est oubliée quand le contrat évolue.
 */
export function collectAccountKnowledgeV2Claims(
  content: AccountKnowledgeContentV2,
): Array<{ claim: Claim; path: string }> {
  const claims: Array<{ claim: Claim; path: string }> = []

  const pushOne = (claim: Claim | null, path: string) => {
    if (claim) claims.push({ claim, path })
  }
  const pushMany = (list: readonly Claim[] | undefined, path: string) => {
    ;(list ?? []).forEach((claim, index) => claims.push({ claim, path: `${path}[${index}]` }))
  }

  // identity.dynamic est volontairement absent : ce n'est pas un Claim mais un
  // indicateur déterministe, il ne relève pas de la couverture de sourcing.
  pushOne(content.identity.primary_activity, "identity.primary_activity")
  pushOne(content.identity.headquarters, "identity.headquarters")
  pushOne(content.identity.revenue, "identity.revenue")
  pushOne(content.identity.employee_count, "identity.employee_count")

  pushOne(content.account_summary, "account_summary")

  const mp = content.market_positioning
  pushOne(mp.positioning, "market_positioning.positioning")
  pushOne(mp.claimed_identity, "market_positioning.claimed_identity")
  pushMany(mp.direct_competitors, "market_positioning.direct_competitors")
  pushMany(mp.customer_segments, "market_positioning.customer_segments")
  pushMany(mp.differentiators, "market_positioning.differentiators")
  pushMany(mp.uncovered_scope, "market_positioning.uncovered_scope")
  pushMany(mp.threats, "market_positioning.threats")
  pushMany(mp.opportunities, "market_positioning.opportunities")

  const vc = content.company_value_chain
  pushOne(vc.description, "company_value_chain.description")
  pushOne(vc.value_proposition, "company_value_chain.value_proposition")
  pushMany(vc.key_links, "company_value_chain.key_links")
  pushMany(vc.dependencies, "company_value_chain.dependencies")
  pushMany(vc.vulnerabilities, "company_value_chain.vulnerabilities")
  pushMany(vc.customer_base, "company_value_chain.customer_base")

  const org = content.organisation
  pushOne(org.strategic_weight, "organisation.strategic_weight")
  pushMany(org.departments, "organisation.departments")
  pushMany(org.process_observations, "organisation.process_observations")
  ;(org.key_contacts ?? []).forEach((contact, index) => {
    claims.push({ claim: contact.role_summary, path: `organisation.key_contacts[${index}].role_summary` })
  })

  return claims
}

/** UUID distincts cités par l'ensemble des claims d'un artefact V2. */
export function collectAccountKnowledgeV2SourceIds(content: AccountKnowledgeContentV2): string[] {
  const ids = new Set<string>()
  for (const { claim } of collectAccountKnowledgeV2Claims(content)) {
    for (const ref of claim.source_refs) ids.add(ref)
  }
  // L'indicateur déterministe cite lui aussi ses sources : elles doivent être
  // vérifiées au même titre, même si elles ne comptent pas dans la couverture.
  for (const ref of content.identity.dynamic?.source_refs ?? []) ids.add(ref)
  return [...ids]
}

/**
 * Vérifie qu'un lot d'UUID correspond à des lignes `intelligence_sources`
 * existantes ET appartenant au workspace. Retourne les UUID fautifs — sans
 * distinguer « inexistant » de « autre workspace » dans le message renvoyé à
 * n8n, pour ne pas transformer le callback en oracle d'existence cross-tenant.
 */
async function findUnknownSourceIds(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  sourceIds: readonly string[],
): Promise<{ unknown: string[] } | { error: string }> {
  if (sourceIds.length === 0) return { unknown: [] }

  const { data, error } = await supabase
    .from("intelligence_sources")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("id", [...sourceIds])

  if (error) return { error: error.message }

  const known = new Set((data ?? []).map((row) => row.id))
  return { unknown: sourceIds.filter((id) => !known.has(id)) }
}

/**
 * Recharge les signaux du compte et recalcule l'indicateur de dynamique.
 * Lecture volontairement identique au périmètre de `get_account_knowledge_context`
 * (signaux non écartés, non expirés) pour que l'indicateur porte sur le même
 * matériau que celui présenté au moteur.
 */
async function computeDynamicForCompany(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("account_signals")
    .select("primary_source_id,detected_at,relevance_score,urgency_score,confidence_score,status,expires_at")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .not("status", "in", "(dismissed,false_positive,expired,archived)")

  if (error) return { error: error.message }

  const nowMs = Date.now()
  const signals: AccountDynamicSignalInput[] = (data ?? [])
    .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() >= nowMs)
    .map((row) => ({
      primary_source_id: row.primary_source_id,
      detected_at: row.detected_at,
      relevance_score: row.relevance_score,
      urgency_score: row.urgency_score,
      confidence_score: row.confidence_score,
    }))

  return { indicator: computeAccountDynamic(signals) }
}

/**
 * Point d'entrée unique appelé par `api/n8n/callback`.
 *
 * `companyId` provient du run (jamais du payload n8n) : c'est la seule source
 * de vérité sur le rattachement, et elle a déjà été résolue côté base.
 */
export async function ingestAccountKnowledgeArtifact(
  supabase: SupabaseClient<Database>,
  params: { workspaceId: string; companyId: string | null; contentJson: unknown },
): Promise<AccountKnowledgeIngestResult> {
  const { workspaceId, companyId, contentJson } = params

  const parsed = parseAccountKnowledgeArtifact(contentJson)

  if (parsed.version === null) {
    return {
      ok: false,
      error: "Artefact account_knowledge invalide",
      issues: parsed.issues,
    }
  }

  // Vrai pour V1 comme pour V2 : un artefact compte doit être rattaché à un compte.
  if (!companyId) {
    return {
      ok: false,
      error: "account_knowledge requiert un run scopé compte (company_id manquant)",
      issues: [{ path: "$.company_id", message: "company_id requis." }],
    }
  }

  // V1 : legacy réellement généré, lu tel quel. Aucun sourcing à exiger
  // rétroactivement, aucun indicateur à injecter (le contrat V1 n'en a pas).
  if (parsed.version === 1) {
    return { ok: true, version: 1, content: parsed.content }
  }

  const content = parsed.content

  const sourceIds = collectAccountKnowledgeV2SourceIds(content)
  const sourceCheck = await findUnknownSourceIds(supabase, workspaceId, sourceIds)
  if ("error" in sourceCheck) {
    return {
      ok: false,
      error: `Vérification des sources impossible : ${sourceCheck.error}`,
      issues: [],
    }
  }
  if (sourceCheck.unknown.length > 0) {
    return {
      ok: false,
      error: "Sources citées inconnues du workspace",
      issues: sourceCheck.unknown.map((id) => ({
        path: "$.source_refs",
        message: `Source ${id} inexistante ou hors workspace.`,
      })),
    }
  }

  const dynamic = await computeDynamicForCompany(supabase, workspaceId, companyId)
  if ("error" in dynamic) {
    return {
      ok: false,
      error: `Calcul de la dynamique impossible : ${dynamic.error}`,
      issues: [],
    }
  }

  const normalized: AccountKnowledgeContentV2 = {
    ...content,
    identity: { ...content.identity, dynamic: dynamic.indicator },
    source_coverage: buildQualitySummary({
      claims: collectAccountKnowledgeV2Claims(content),
      // Recalculés depuis le contenu, sauf ces deux listes que seul le moteur
      // peut établir (fraîcheur des sources citées, contradictions détectées).
      stalePaths: content.source_coverage?.stale_source_paths ?? [],
      contradictionPaths: content.source_coverage?.contradiction_paths ?? [],
    }),
  }

  return { ok: true, version: 2, content: normalized }
}
