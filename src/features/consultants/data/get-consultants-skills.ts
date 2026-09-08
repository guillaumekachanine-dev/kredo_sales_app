import "server-only"

import { createClient } from "@/lib/supabase/server"
import { resolveCurrentWorkspaceId } from "@/lib/supabase/workspace"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getOffersCatalog } from "@/lib/reference-data/get-offers-catalog"
import { getSkillsCatalog } from "@/lib/reference-data/get-skills-catalog"
import { getJobProfilesCatalog } from "@/lib/reference-data/get-job-profiles-catalog"
import type { PracticeCollaborator } from "@/features/consultants/skills/types"
import {
  buildPoolCompetencesDataset,
  type OpportunitySkillDemandRow,
  type PersonSkillRow,
  type PoolCompetencesDataset,
} from "@/lib/consultants/pool-competences-data"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader du chapitre « Pool de compétences » (Lot 6).
//
//  Extrait à l'identique de `src/app/(app)/consultants/(tabbed)/pool-competences/
//  page.tsx` — 4 référentiels mis en cache 1h par workspace + 3 lectures live
//  (`collaborators`, `person_skills`, `opportunity_skills`). Aucun recalcul
//  métier : `buildPoolCompetencesDataset` (pur, `src/lib/consultants/`) est
//  inchangé, tout le rendu vit dans `PoolCompetencesMap`.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultantsSkillsData {
  dataset: PoolCompetencesDataset
  collaborators: PracticeCollaborator[]
}

export async function getConsultantsSkills(): Promise<ConsultantsSkillsData> {
  const supabase = await createClient()
  const workspaceId = await resolveCurrentWorkspaceId()
  if (!workspaceId) {
    throw new Error("Workspace introuvable")
  }

  const [
    practices,
    offers,
    skills,
    jobProfiles,
    collaboratorsResult,
    personSkillsResult,
    opportunitySkillsResult,
  ] = await Promise.all([
    // Référentiels quasi-statiques : mis en cache 1h par workspace (audit perf
    // Session 28) — évitent 4 allers-retours DB à chaque ouverture de cette page.
    getOfferPracticesCatalog(workspaceId),
    getOffersCatalog(workspaceId),
    getSkillsCatalog(workspaceId),
    getJobProfilesCatalog(workspaceId),
    supabase
      .from("collaborators")
      .select(`
        id,
        person_id,
        status,
        current_title,
        seniority,
        practice,
        person:persons ( first_name, last_name, full_name ),
        missions (
          id,
          title,
          status,
          company:companies ( name )
        )
      `),
    supabase
      .from("person_skills")
      .select("person_id, level, years, skill:skills(id, name, aliases, category, skill_description)")
      .order("level", { ascending: false, nullsFirst: false }),
    supabase
      .from("opportunity_skills")
      .select("weight, opportunity:opportunities(practice, stage), skill:skills(id, name, aliases, category, skill_description)"),
  ])

  const collaborators = (collaboratorsResult.data ?? []) as PracticeCollaborator[]
  const collaboratorPracticeByPersonId = new Map<string, string>()
  const collaboratorTitleByPersonId = new Map<string, string>()

  for (const collaborator of collaborators) {
    if (!collaborator.person_id) continue
    collaboratorPracticeByPersonId.set(collaborator.person_id, collaborator.practice ?? "")
    collaboratorTitleByPersonId.set(collaborator.person_id, collaborator.current_title ?? "")
  }

  const dataset = buildPoolCompetencesDataset({
    practices,
    offers,
    skills,
    jobProfiles,
    personSkills: (personSkillsResult.data ?? []) as unknown as PersonSkillRow[],
    opportunitySkillDemand: (opportunitySkillsResult.data ?? []) as unknown as OpportunitySkillDemandRow[],
    collaboratorPracticeByPersonId,
    collaboratorTitleByPersonId,
  })

  return { dataset, collaborators }
}
