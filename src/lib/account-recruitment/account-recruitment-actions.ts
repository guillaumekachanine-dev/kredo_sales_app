"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getOffersCatalog } from "@/lib/reference-data/get-offers-catalog"
import { computeMatching } from "@/lib/staffing-matching/compute-match"
import type {
  MatchingContext,
  MatchingNeed,
  MatchingProfile,
  SkillImportance,
} from "@/lib/staffing-matching/types"
import type { RunMatchingResult } from "@/lib/staffing-matching/actions"
import type {
  AccountRecruitmentAnalysis,
  CompanyOpportunityItem,
  EstimatedTechItem,
  IdentifiedNeedItem,
  IdentifiedNeedSkillItem,
  KredoAdequacyItem,
  TechnicalConfidence,
} from "./account-recruitment-types"

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

  return { supabase, user, workspaceId: profile.workspace_id }
}

export async function getAccountRecruitmentAnalysis(companyId: string): Promise<AccountRecruitmentAnalysis> {
  if (!companyId) {
    throw new Error("Identifiant de compte manquant")
  }

  const { supabase, workspaceId } = await requireUserAndWorkspace()

  // 1. Informations de l'entreprise
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single()

  const companyName = company?.name ?? "Compte"

  // 2. Opportunités du compte
  const { data: rawOpps } = await supabase
    .from("opportunities")
    .select("id, title, stage, practice, seniority, need_summary, created_at")
    .eq("company_id", companyId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  const opps = rawOpps ?? []
  const oppIds = opps.map((o) => o.id)

  // 3. Compétences associées aux opportunités
  let oppSkillsRaw: {
    opportunity_id: string
    skill_id: string
    importance: string
    min_level: number | null
    min_years: number | null
    skills: { id: string; name: string; category: string | null } | null
  }[] = []

  if (oppIds.length > 0) {
    const { data: skillsData } = await supabase
      .from("opportunity_skills")
      .select("opportunity_id, skill_id, importance, min_level, min_years, skills:skills(id, name, category)")
      .in("opportunity_id", oppIds)
      .eq("workspace_id", workspaceId)

    oppSkillsRaw = (skillsData as unknown as typeof oppSkillsRaw) ?? []
  }

  // 4. Faits du compte (account_facts)
  const { data: rawFacts } = await supabase
    .from("account_facts")
    .select("id, fact_type, value_text, value_json, confidence_score, origin")
    .eq("target_id", companyId)
    .eq("workspace_id", workspaceId)

  const facts = rawFacts ?? []

  // 5. Catalogue Offres & Practices
  const practicesCatalog = await getOfferPracticesCatalog(workspaceId)
  const offersCatalog = await getOffersCatalog(workspaceId)

  // ── Structuration Bloc 1 : Besoins identifiés ─────────────────────────────
  const skillsByOppId = new Map<string, IdentifiedNeedSkillItem[]>()
  for (const item of oppSkillsRaw) {
    if (!item.skills) continue
    const list = skillsByOppId.get(item.opportunity_id) ?? []
    list.push({
      skillId: item.skill_id,
      skillName: item.skills.name,
      importance: (item.importance as SkillImportance) || "indispensable",
      minLevel: item.min_level,
      minYears: item.min_years,
    })
    skillsByOppId.set(item.opportunity_id, list)
  }

  const identifiedNeeds: IdentifiedNeedItem[] = opps.map((opp) => ({
    id: opp.id,
    title: opp.title,
    stage: opp.stage,
    practice: opp.practice,
    seniority: opp.seniority,
    needSummary: opp.need_summary,
    skills: skillsByOppId.get(opp.id) ?? [],
    createdAt: opp.created_at,
  }))

  // ── Structuration Bloc 2 : Environnement technique estimé ─────────────────
  const skillOccurrences = new Map<string, { name: string; category: string; oppIds: Set<string> }>()
  for (const item of oppSkillsRaw) {
    if (!item.skills) continue
    const existing = skillOccurrences.get(item.skill_id) ?? {
      name: item.skills.name,
      category: item.skills.category ?? "Technique",
      oppIds: new Set<string>(),
    }
    existing.oppIds.add(item.opportunity_id)
    skillOccurrences.set(item.skill_id, existing)
  }

  // Corroboration avec account_facts
  const factTechs = new Set<string>()
  for (const fact of facts) {
    if (fact.value_text) {
      factTechs.add(fact.value_text.toLowerCase())
    }
  }

  const estimatedTechEnvironment: EstimatedTechItem[] = []
  for (const [skillId, info] of skillOccurrences.entries()) {
    const oppCount = info.oppIds.size
    const isCorroboratedByFact = factTechs.has(info.name.toLowerCase())

    let confidence: TechnicalConfidence
    if (oppCount >= 2 || isCorroboratedByFact) {
      confidence = "Forte"
    } else if (oppCount === 1) {
      confidence = "Moyenne"
    } else {
      confidence = "Faible"
    }

    const provenance = isCorroboratedByFact
      ? `Corroboré par ${oppCount} opp(s) & fait(s) du compte`
      : `Observé dans ${oppCount} opportunité(s)`

    estimatedTechEnvironment.push({
      id: skillId,
      name: info.name,
      category: info.category,
      sourceKind: "Observé",
      confidence,
      provenance,
    })
  }

  // Ajout des déductions basées sur les practices des opportunités
  const practiceCounts = new Map<string, number>()
  for (const opp of opps) {
    if (opp.practice) {
      practiceCounts.set(opp.practice, (practiceCounts.get(opp.practice) ?? 0) + 1)
    }
  }

  for (const [practiceName, count] of practiceCounts.entries()) {
    const practiceObject = practicesCatalog.find(
      (p) => p.name.toLowerCase() === practiceName.toLowerCase() || p.slug === practiceName
    )
    if (practiceObject && practiceObject.stack_tags) {
      for (const tag of practiceObject.stack_tags) {
        if (!estimatedTechEnvironment.some((e) => e.name.toLowerCase() === tag.toLowerCase())) {
          estimatedTechEnvironment.push({
            id: `tag-${tag}`,
            name: tag,
            category: "Déduit Practice",
            sourceKind: "Déduit",
            confidence: count >= 2 ? "Moyenne" : "Faible",
            provenance: `Déduit du périmètre practice "${practiceName}" (${count} opps)`,
          })
        }
      }
    }
  }

  // ── Structuration Bloc 3 : Adéquation KREDO ────────────────────────────────
  const kredoAdequacy: KredoAdequacyItem[] = []

  // Practices KREDO pertinentes
  for (const practice of practicesCatalog) {
    const matchingCount = estimatedTechEnvironment.filter((item) =>
      practice.stack_tags?.some((t) => t.toLowerCase() === item.name.toLowerCase())
    ).length

    const isDirectOpportunityPractice = opps.some(
      (o) => o.practice?.toLowerCase() === practice.name.toLowerCase() || o.practice === practice.slug
    )

    if (matchingCount > 0 || isDirectOpportunityPractice) {
      let confidence: TechnicalConfidence = "Faible"
      if (matchingCount >= 2 || (isDirectOpportunityPractice && matchingCount >= 1)) {
        confidence = "Forte"
      } else if (matchingCount === 1 || isDirectOpportunityPractice) {
        confidence = "Moyenne"
      }

      kredoAdequacy.push({
        id: `prac-${practice.id}`,
        title: `Practice : ${practice.name}`,
        kind: "practice",
        description: practice.description || practice.perimeter,
        confidence,
        provenance: `Alignement sur ${matchingCount} compétence(s) observée(s)`,
      })
    }
  }

  // Offres KREDO pertinentes
  for (const offer of offersCatalog) {
    const matchingTechs = estimatedTechEnvironment.filter((item) =>
      offer.keywords?.some((k) => k.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(k.toLowerCase()))
    )

    if (matchingTechs.length > 0) {
      kredoAdequacy.push({
        id: `offer-${offer.id}`,
        title: `Offre : ${offer.name}`,
        kind: "offer",
        description: offer.short_description,
        confidence: matchingTechs.length >= 2 ? "Forte" : "Moyenne",
        provenance: `Correspond aux compétences : ${matchingTechs.map((t) => t.name).join(", ")}`,
      })
    }
  }

  return {
    companyId,
    companyName,
    identifiedNeeds,
    estimatedTechEnvironment,
    kredoAdequacy,
  }
}

export async function fetchCompanyOpportunities(companyId: string): Promise<CompanyOpportunityItem[]> {
  const { supabase, workspaceId } = await requireUserAndWorkspace()

  const { data: rawOpps } = await supabase
    .from("opportunities")
    .select("id, title, company_id, practice, seniority, stage, company:companies(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!rawOpps) return []

  const opps: CompanyOpportunityItem[] = rawOpps.map((o) => {
    const compName = Array.isArray(o.company) ? o.company[0]?.name : (o.company as { name: string } | null)?.name
    return {
      id: o.id,
      title: o.title,
      companyId: o.company_id ?? companyId,
      companyName: compName ?? "Compte inconnu",
      practice: o.practice,
      seniority: o.seniority,
      stage: o.stage,
      isCurrentAccount: o.company_id === companyId,
    }
  })

  // Tri : opportunités du compte courant en premier
  return opps.sort((a, b) => (b.isCurrentAccount ? 1 : 0) - (a.isCurrentAccount ? 1 : 0))
}

export async function collectMatchingProfilesPool(): Promise<MatchingProfile[]> {
  const { supabase, workspaceId } = await requireUserAndWorkspace()

  const { data, error } = await supabase.rpc("get_matching_context", {
    p_workspace_id: workspaceId,
    p_opportunity_id: "00000000-0000-0000-0000-000000000000",
  })

  if (error) {
    throw new Error(`get_matching_context a échoué : ${error.message}`)
  }

  const context = data as unknown as MatchingContext
  return context?.profiles ?? []
}

export async function runCustomMatchingAction(need: MatchingNeed): Promise<RunMatchingResult> {
  if (!need.title) {
    return { ok: false, error: "Titre du besoin manquant." }
  }

  try {
    const profiles = await collectMatchingProfilesPool()
    const result = computeMatching({
      need,
      profiles,
      dataCutoffAt: new Date().toISOString(),
    })

    return { ok: true, result, persistedCount: 0 }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur pendant le matching personnalisé."
    console.error("runCustomMatchingAction a échoué:", err)
    return { ok: false, error: message }
  }
}
