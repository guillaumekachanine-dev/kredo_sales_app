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
//
// Lot 4 — V3 rejoint ce portail avec deux contrôles supplémentaires que sa
// structure rend nécessaires :
//   7. les UUID cités par les `verification_results` (sources de confirmation
//      ET de contradiction) sont vérifiés au même titre que ceux des claims —
//      une vérification « indépendante » adossée à une source fantôme ne prouve
//      rien ;
//   8. chaque `significant_signal_ids` doit désigner un `account_signals`
//      existant, du workspace du run ET rattaché au compte du run. Un signal
//      d'un autre compte afficherait l'actualité du voisin sur la fiche.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import {
  buildQualitySummary,
  type Claim,
} from "./intelligence-common-contracts"
import {
  collectAccountKnowledgeV3Claims,
  type AccountKnowledgeContent,
  type AccountKnowledgeContentV2,
  type AccountKnowledgeContentV3,
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
  | { ok: true; version: 3; content: AccountKnowledgeContentV3 }
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
 * UUID distincts à contrôler pour un artefact V3.
 *
 * Trois gisements, et pas seulement celui des claims : le vérificateur cite ses
 * propres sources de confirmation et de contradiction, et l'indicateur
 * déterministe injecté cite les siennes. Les omettre laisserait passer des
 * références non vérifiées dans un artefact par ailleurs conforme.
 *
 * L'appelant passe le contenu APRÈS injection de `identity.dynamic` : c'est la
 * valeur réellement persistée qui doit être contrôlée, pas celle reçue de n8n.
 */
export function collectAccountKnowledgeV3SourceIds(
  content: AccountKnowledgeContentV3,
): string[] {
  const ids = new Set<string>()

  for (const { claim } of collectAccountKnowledgeV3Claims(content)) {
    for (const ref of claim.source_refs) ids.add(ref)
  }

  for (const result of content.verification_results) {
    for (const ref of result.supporting_source_refs) ids.add(ref)
    for (const ref of result.contradicting_source_refs) ids.add(ref)
  }

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
 * Vérifie qu'un lot d'UUID de signaux correspond à des lignes `account_signals`
 * existantes, du workspace du run ET rattachées au compte du run.
 *
 * Le triple filtre est volontaire : `workspace_id` seul laisserait un artefact
 * afficher, en tête de la section « Tendances et actualité », l'actualité d'un
 * autre compte du même workspace. Comme pour les sources, le message renvoyé ne
 * distingue pas inexistant / hors workspace / autre compte.
 */
async function findUnknownSignalIds(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  companyId: string,
  signalIds: readonly string[],
): Promise<{ unknown: string[] } | { error: string }> {
  if (signalIds.length === 0) return { unknown: [] }

  const { data, error } = await supabase
    .from("account_signals")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("company_id", companyId)
    .in("id", [...signalIds])

  if (error) return { error: error.message }

  const known = new Set((data ?? []).map((row) => row.id))
  return { unknown: signalIds.filter((id) => !known.has(id)) }
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

  // V3 (Lot 4) : chemin dédié, jamais celui de V2 — les deux contrats n'ont
  // aucune section en commun, tomber dans le chemin V2 fabriquerait des
  // sections absentes du contrat.
  if (parsed.version === 3) {
    return ingestV3(supabase, { workspaceId, companyId, content: parsed.content })
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

/**
 * Ingestion d'un artefact V3 déjà validé structurellement par
 * `parseAccountKnowledgeArtifact` (sept sections, correspondance exacte
 * claim ↔ verification_result, verdict confirmé, ≤ 3 signaux…).
 *
 * Ce qui reste à faire ici, et que la validation structurelle ne peut pas faire
 * seule — elle ne connaît que le JSON, jamais la base :
 *   - normaliser ce qui est déterministe (`identity.dynamic`, `source_coverage`) ;
 *   - confronter chaque UUID cité à la réalité de la base, dans le workspace
 *     du run pour les sources, dans le workspace ET le compte du run pour les
 *     signaux.
 *
 * L'ordre importe : la dynamique est injectée AVANT la collecte des UUID, pour
 * que les sources de l'indicateur réellement persisté soient contrôlées elles
 * aussi. Aucun contrôle n'est « réparé » : un artefact fautif est refusé en
 * bloc, il n'est jamais publié amputé de ses références douteuses.
 */
async function ingestV3(
  supabase: SupabaseClient<Database>,
  params: { workspaceId: string; companyId: string; content: AccountKnowledgeContentV3 },
): Promise<AccountKnowledgeIngestResult> {
  const { workspaceId, companyId, content } = params

  const dynamic = await computeDynamicForCompany(supabase, workspaceId, companyId)
  if ("error" in dynamic) {
    return {
      ok: false,
      error: `Calcul de la dynamique impossible : ${dynamic.error}`,
      issues: [],
    }
  }

  // Le contenu candidat : dynamique déterministe injectée (la valeur reçue du
  // workflow, quelle qu'elle soit, est écrasée) et couverture recalculée depuis
  // les claims réellement publiés — jamais le résumé annoncé par n8n.
  const candidate: AccountKnowledgeContentV3 = {
    ...content,
    identity: { ...content.identity, dynamic: dynamic.indicator },
    source_coverage: buildQualitySummary({
      claims: collectAccountKnowledgeV3Claims(content),
      // Mêmes deux exceptions qu'en V2 : seul le moteur observe la fraîcheur
      // des sources et les contradictions relevées pendant la vérification.
      stalePaths: content.source_coverage?.stale_source_paths ?? [],
      contradictionPaths: content.source_coverage?.contradiction_paths ?? [],
    }),
  }

  const sourceIds = collectAccountKnowledgeV3SourceIds(candidate)
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

  const signalIds = candidate.trends_and_news.significant_signal_ids
  const signalCheck = await findUnknownSignalIds(supabase, workspaceId, companyId, signalIds)
  if ("error" in signalCheck) {
    return {
      ok: false,
      error: `Vérification des signaux impossible : ${signalCheck.error}`,
      issues: [],
    }
  }
  if (signalCheck.unknown.length > 0) {
    return {
      ok: false,
      error: "Signaux cités inconnus du compte",
      issues: signalCheck.unknown.map((id) => ({
        path: "$.trends_and_news.significant_signal_ids",
        message: `Signal ${id} inexistant, hors workspace ou rattaché à un autre compte.`,
      })),
    }
  }

  return { ok: true, version: 3, content: candidate }
}
