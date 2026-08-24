import "server-only"

/**
 * Provider de corpus `staffing_horizon` — ADR-0020 §5.1 et roadmap `09` §3.
 *
 * Hydrate la capacité de staffing sur un horizon prospectif de 4 mois calendaires : le
 * mois analysé (`periodStart`/`periodEnd` du sélecteur) et les 3 mois calendaires
 * suivants — symétrique de la profondeur d'historique de `delivery_period` (L6), mais
 * tournée vers l'avant plutôt que vers l'arrière.
 *
 * ── POURQUOI CET HORIZON ─────────────────────────────────────────────────────────
 * Une photo du mois courant ne dit rien de qui se libère bientôt. Regarder 3 mois en
 * avant permet d'anticiper les fins de mission et de rapprocher un consultant qui se
 * libère d'un besoin ouvert, avant que l'intercontrat ne soit déjà là.
 *
 * ── MODE D'EXÉCUTION : `user_rls` ────────────────────────────────────────────────
 * Les 5 sources sont interrogées avec le client de l'utilisateur sous RLS (`authenticated`).
 * Le `.eq("workspace_id", ctx.workspaceId)` est appliqué systématiquement sur chaque
 * relation portant cette colonne comme seconde serrure — sauf `v_collaborator_ytd_activity`,
 * une vue qui n'expose pas cette colonne (le code applicatif existant, `analyze-activity.ts`,
 * ne la filtre pas non plus : sa portée workspace est garantie par `security_invoker`).
 *
 * ── L'ANGLE MORT À NE JAMAIS COMBLER PAR DÉFAUT ──────────────────────────────────
 * 🔴 Une mission sans `end_date` connue n'est PAS une mission sans risque de banc — c'est
 * une INCONNUE. Ce provider ne traduit jamais l'absence de date en absence de risque :
 * chaque item de mission active porte explicitement soit une date de fin, soit la mention
 * « sans date de fin connue », jamais un silence qui laisserait le LLM en déduire un statu
 * quo confortable.
 *
 * ── PRÉ-CALCUL DES NOMBRES ────────────────────────────────────────────────────────
 * Les taux d'activité YTD et l'écart au TACI cible viennent déjà calculés de
 * `v_collaborator_ytd_activity` — jamais recalculés ici ni par le LLM.
 *
 * Jointures en deux temps, jamais d'embed PostgREST (doctrine du repo) : les noms de
 * personnes et de compétences sont résolus via des `Map` construites après coup.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — capacité de staffing prospective. */
export const STAFFING_HORIZON_WEIGHT = 88

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const COLLABORATORS_QUERY_LIMIT = 200
export const ACTIVE_MISSIONS_QUERY_LIMIT = 300
export const ABSENCES_QUERY_LIMIT = 300
export const YTD_ACTIVITY_QUERY_LIMIT = 200
export const PERSON_SKILLS_QUERY_LIMIT = 800
export const OPEN_OPPORTUNITIES_QUERY_LIMIT = 150
export const OPPORTUNITY_SKILLS_QUERY_LIMIT = 500

/** Niveau minimum pour qu'une compétence soit considérée significative (§3.2). */
const SIGNIFICANT_SKILL_LEVEL = 3

/** Stages terminaux — mêmes valeurs que `action-priorities-rules.ts` (legacy comprises). */
const TERMINAL_OPPORTUNITY_STAGES = "(gagne,perdu,abandonne,win,lost)"

/**
 * Dérive l'horizon de 4 mois calendaires : le mois analysé (`periodStart`) jusqu'à la fin
 * du 3e mois calendaire suivant `periodEnd`.
 */
export function deriveStaffingHorizon(
  periodStart: string,
  periodEnd: string,
): { windowStart: string; windowEnd: string } {
  const [yStr, mStr] = periodEnd.split("-")
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  let endYear = year
  let endMonth = month + 3
  while (endMonth > 12) {
    endMonth -= 12
    endYear += 1
  }
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate()
  const windowEnd = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  return { windowStart: periodStart, windowEnd }
}

function line(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? `${label} : ${text}` : null
}

function compose(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n")
}

function capExclusion(table: string, label: string, limit: number): CorpusExclusion {
  return {
    ref: { kind: "staffing_horizon", table, id: "__query_limit__" },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

export const staffingHorizonProvider: CorpusProvider<{
  kind: "staffing_horizon"
  periodStart: string
  periodEnd: string
}> = {
  kind: "staffing_horizon",
  execution: "user_rls",
  weight: STAFFING_HORIZON_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    const { windowStart, windowEnd } = deriveStaffingHorizon(selector.periodStart, selector.periodEnd)
    const horizonYear = parseInt(selector.periodStart.slice(0, 4), 10)

    // ── 1. LECTURES INDÉPENDANTES EN PARALLÈLE ──────────────────────────────
    const [
      collaboratorsResult,
      missionsResult,
      absencesResult,
      ytdResult,
      opportunitiesResult,
    ] = await Promise.all([
      ctx.supabase
        .from("collaborators")
        .select("id, person_id, status, practice, current_title")
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "active")
        .limit(COLLABORATORS_QUERY_LIMIT),

      ctx.supabase
        .from("missions")
        .select("id, collaborator_id, title, status, end_date, practice")
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "active")
        .limit(ACTIVE_MISSIONS_QUERY_LIMIT),

      ctx.supabase
        .from("collaborator_absences")
        .select("id, collaborator_id, absence_type, start_date, end_date, duration_days")
        .eq("workspace_id", ctx.workspaceId)
        .lte("start_date", windowEnd)
        .gte("end_date", windowStart)
        .limit(ABSENCES_QUERY_LIMIT),

      // Vue security_invoker sans colonne workspace_id sélectionnable — cf. en-tête.
      ctx.supabase
        .from("v_collaborator_ytd_activity")
        .select("collaborator_id, full_name, ytd_activity_rate, taci_target, gap_vs_target")
        .eq("year", horizonYear)
        .limit(YTD_ACTIVITY_QUERY_LIMIT),

      ctx.supabase
        .from("opportunities")
        .select("id, title, stage, company_id, opportunity_type, practice, seniority, duration_days")
        .eq("workspace_id", ctx.workspaceId)
        .not("stage", "in", TERMINAL_OPPORTUNITY_STAGES)
        .limit(OPEN_OPPORTUNITIES_QUERY_LIMIT),
    ])

    if (collaboratorsResult.error) {
      throw new Error(`Lecture des collaborateurs actifs impossible : ${collaboratorsResult.error.message}`)
    }
    if (missionsResult.error) {
      throw new Error(`Lecture des missions actives impossible : ${missionsResult.error.message}`)
    }
    if (absencesResult.error) {
      throw new Error(`Lecture des absences impossible : ${absencesResult.error.message}`)
    }
    if (ytdResult.error) {
      throw new Error(`Lecture de l'activité YTD impossible : ${ytdResult.error.message}`)
    }
    if (opportunitiesResult.error) {
      throw new Error(`Lecture des opportunités ouvertes impossible : ${opportunitiesResult.error.message}`)
    }

    const collaboratorRows = collaboratorsResult.data ?? []
    if (collaboratorRows.length === COLLABORATORS_QUERY_LIMIT) {
      exclusions.push(capExclusion("collaborators", "Collaborateurs actifs", COLLABORATORS_QUERY_LIMIT))
    }

    const missionRows = missionsResult.data ?? []
    if (missionRows.length === ACTIVE_MISSIONS_QUERY_LIMIT) {
      exclusions.push(capExclusion("missions", "Missions actives", ACTIVE_MISSIONS_QUERY_LIMIT))
    }

    const absenceRows = absencesResult.data ?? []
    if (absenceRows.length === ABSENCES_QUERY_LIMIT) {
      exclusions.push(capExclusion("collaborator_absences", "Absences recouvrant l'horizon", ABSENCES_QUERY_LIMIT))
    }

    const ytdRows = ytdResult.data ?? []
    if (ytdRows.length === YTD_ACTIVITY_QUERY_LIMIT) {
      exclusions.push(capExclusion("v_collaborator_ytd_activity", "Activité YTD", YTD_ACTIVITY_QUERY_LIMIT))
    }

    const opportunityRows = opportunitiesResult.data ?? []
    if (opportunityRows.length === OPEN_OPPORTUNITIES_QUERY_LIMIT) {
      exclusions.push(capExclusion("opportunities", "Opportunités ouvertes", OPEN_OPPORTUNITIES_QUERY_LIMIT))
    }

    if (collaboratorRows.length === 0 && opportunityRows.length === 0) {
      return { items, exclusions }
    }

    // ── 2. RÉSOLUTIONS DÉPENDANTES EN PARALLÈLE ─────────────────────────────
    const personIds = Array.from(
      new Set(collaboratorRows.map((c) => c.person_id).filter((id): id is string => Boolean(id))),
    )
    const opportunityIds = opportunityRows.map((o) => o.id).filter((id): id is string => Boolean(id))

    const [personsResult, personSkillsResult, opportunitySkillsResult, opportunityCompaniesResult] =
      await Promise.all([
        personIds.length > 0
          ? ctx.supabase
              .from("persons")
              .select("id, full_name")
              .eq("workspace_id", ctx.workspaceId)
              .in("id", personIds)
          : Promise.resolve({ data: [], error: null }),

        personIds.length > 0
          ? ctx.supabase
              .from("person_skills")
              .select("person_id, skill_id, level")
              .eq("workspace_id", ctx.workspaceId)
              .in("person_id", personIds)
              .gte("level", SIGNIFICANT_SKILL_LEVEL)
              .limit(PERSON_SKILLS_QUERY_LIMIT)
          : Promise.resolve({ data: [], error: null }),

        opportunityIds.length > 0
          ? ctx.supabase
              .from("opportunity_skills")
              .select("opportunity_id, skill_id, importance, min_level")
              .eq("workspace_id", ctx.workspaceId)
              .in("opportunity_id", opportunityIds)
              .limit(OPPORTUNITY_SKILLS_QUERY_LIMIT)
          : Promise.resolve({ data: [], error: null }),

        opportunityIds.length > 0
          ? ctx.supabase
              .from("companies")
              .select("id, name")
              .eq("workspace_id", ctx.workspaceId)
              .in(
                "id",
                Array.from(
                  new Set(opportunityRows.map((o) => o.company_id).filter((id): id is string => Boolean(id))),
                ),
              )
          : Promise.resolve({ data: [], error: null }),
      ])

    if (personsResult.error) {
      throw new Error(`Lecture des personnes des collaborateurs impossible : ${personsResult.error.message}`)
    }
    if (personSkillsResult.error) {
      throw new Error(`Lecture des compétences significatives impossible : ${personSkillsResult.error.message}`)
    }
    if (opportunitySkillsResult.error) {
      throw new Error(`Lecture des compétences requises impossible : ${opportunitySkillsResult.error.message}`)
    }
    if (opportunityCompaniesResult.error) {
      throw new Error(`Lecture des comptes des opportunités impossible : ${opportunityCompaniesResult.error.message}`)
    }

    const personSkillRows = personSkillsResult.data ?? []
    if (personSkillRows.length === PERSON_SKILLS_QUERY_LIMIT) {
      exclusions.push(capExclusion("person_skills", "Compétences significatives", PERSON_SKILLS_QUERY_LIMIT))
    }

    const opportunitySkillRows = opportunitySkillsResult.data ?? []
    if (opportunitySkillRows.length === OPPORTUNITY_SKILLS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("opportunity_skills", "Compétences requises", OPPORTUNITY_SKILLS_QUERY_LIMIT),
      )
    }

    // Résolution des noms de compétences (skill_id → name), toutes sources confondues.
    const allSkillIds = Array.from(
      new Set([
        ...personSkillRows.map((r) => r.skill_id),
        ...opportunitySkillRows.map((r) => r.skill_id),
      ].filter((id): id is string => Boolean(id))),
    )
    let skillNameById = new Map<string, string>()
    if (allSkillIds.length > 0) {
      const { data: skillRows, error: skillsError } = await ctx.supabase
        .from("skills")
        .select("id, name")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", allSkillIds)

      if (skillsError) {
        throw new Error(`Lecture du référentiel compétences impossible : ${skillsError.message}`)
      }
      skillNameById = new Map((skillRows ?? []).map((s) => [s.id, s.name]))
    }

    const personNameById = new Map<string, string>()
    for (const person of personsResult.data ?? []) {
      if (person.id && person.full_name) personNameById.set(person.id, person.full_name)
    }

    const companyNameById = new Map<string, string>()
    for (const company of opportunityCompaniesResult.data ?? []) {
      if (company.id && company.name) companyNameById.set(company.id, company.name)
    }

    const collaboratorNameById = new Map<string, string>()
    for (const collab of collaboratorRows) {
      if (!collab.id) continue
      const name = collab.person_id ? personNameById.get(collab.person_id) : null
      collaboratorNameById.set(collab.id, name ?? collab.current_title ?? "Consultant")
    }

    // ── 3. HYDRATATION — 1 ITEM PAR CONSULTANT : STATUT DE STAFFING ─────────
    const activeMissionByCollaborator = new Map<string, (typeof missionRows)[number]>()
    for (const mission of missionRows) {
      if (!mission.collaborator_id) continue
      // Un seul item par consultant : en cas de multi-missions actives, la première
      // rencontrée suffit à documenter qu'il n'est pas en intercontrat — le détail
      // financier par mission relève de `delivery_period`, pas de cette mission.
      if (!activeMissionByCollaborator.has(mission.collaborator_id)) {
        activeMissionByCollaborator.set(mission.collaborator_id, mission)
      }
    }

    for (const collab of collaboratorRows) {
      if (!collab.id) continue
      const compName = collaboratorNameById.get(collab.id) ?? "Consultant"
      const mission = activeMissionByCollaborator.get(collab.id)

      const content = mission
        ? compose([
            line("Consultant", compName),
            line("Practice", collab.practice),
            line("Mission en cours", mission.title),
            // 🔴 Ne jamais traduire une date de fin absente en absence de risque.
            line("Date de fin de mission", mission.end_date ?? "sans date de fin connue"),
          ])
        : compose([
            line("Consultant", compName),
            line("Practice", collab.practice),
            line("Mission en cours", "aucune mission active — disponible dès maintenant"),
          ])

      if (!content) continue

      items.push({
        ref: { kind: "staffing_horizon", table: "collaborators", id: collab.id },
        title: `Staffing · ${compName}`,
        date: mission?.end_date ?? null,
        provenance: "collaborators",
        content,
        chars: content.length,
      })
    }

    // ── 4. HYDRATATION DES ABSENCES RECOUVRANT L'HORIZON ────────────────────
    for (const absence of absenceRows) {
      if (!absence.id || !absence.collaborator_id) continue
      const compName = collaboratorNameById.get(absence.collaborator_id) ?? "Consultant"

      const content = compose([
        line("Consultant", compName),
        line("Type d'absence", absence.absence_type),
        line("Du", absence.start_date),
        line("Au", absence.end_date),
        line("Durée (jours)", absence.duration_days),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "staffing_horizon", table: "collaborator_absences", id: absence.id },
        title: `Absence · ${compName}`,
        date: absence.start_date,
        provenance: "collaborator_absences",
        content,
        chars: content.length,
      })
    }

    // ── 5. HYDRATATION DE L'ACTIVITÉ YTD (DÉJÀ CALCULÉE) ────────────────────
    for (const row of ytdRows) {
      if (!row.collaborator_id) continue
      // Ne garder que les lignes rattachées à un consultant réellement dans le corpus :
      // la vue peut porter des collaborateurs hors du périmètre "actif" retenu en §1.
      if (!collaboratorNameById.has(row.collaborator_id)) continue

      const content = compose([
        line("Consultant", row.full_name ?? collaboratorNameById.get(row.collaborator_id)),
        line("Taux d'activité YTD", row.ytd_activity_rate !== null ? `${row.ytd_activity_rate} %` : null),
        line("TACI cible", row.taci_target !== null ? `${row.taci_target} %` : null),
        line("Écart à la cible", row.gap_vs_target !== null ? `${row.gap_vs_target} pts` : null),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "staffing_horizon", table: "v_collaborator_ytd_activity", id: row.collaborator_id },
        title: `Activité YTD · ${row.full_name ?? "Consultant"}`,
        date: null,
        provenance: "v_collaborator_ytd_activity",
        content,
        chars: content.length,
      })
    }

    // ── 6. HYDRATATION DES COMPÉTENCES SIGNIFICATIVES PAR CONSULTANT ────────
    const skillsByPerson = new Map<string, string[]>()
    for (const row of personSkillRows) {
      if (!row.person_id || !row.skill_id) continue
      const name = skillNameById.get(row.skill_id)
      if (!name) continue
      const list = skillsByPerson.get(row.person_id) ?? []
      list.push(name)
      skillsByPerson.set(row.person_id, list)
    }

    for (const collab of collaboratorRows) {
      if (!collab.id || !collab.person_id) continue
      const skillNames = skillsByPerson.get(collab.person_id)
      if (!skillNames || skillNames.length === 0) continue

      const compName = collaboratorNameById.get(collab.id) ?? "Consultant"
      const content = compose([
        line("Consultant", compName),
        line("Compétences significatives", skillNames.join(", ")),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "staffing_horizon", table: "person_skills", id: collab.id },
        title: `Compétences · ${compName}`,
        date: null,
        provenance: "person_skills",
        content,
        chars: content.length,
      })
    }

    // ── 7. HYDRATATION DES BESOINS OUVERTS ET LEURS COMPÉTENCES ─────────────
    const skillReqsByOpportunity = new Map<string, string[]>()
    for (const row of opportunitySkillRows) {
      if (!row.opportunity_id || !row.skill_id) continue
      const name = skillNameById.get(row.skill_id)
      if (!name) continue
      const importanceLabel = row.importance ? ` (${row.importance})` : ""
      const list = skillReqsByOpportunity.get(row.opportunity_id) ?? []
      list.push(`${name}${importanceLabel}`)
      skillReqsByOpportunity.set(row.opportunity_id, list)
    }

    for (const opp of opportunityRows) {
      if (!opp.id) continue
      const compName = opp.company_id ? companyNameById.get(opp.company_id) : null

      const content = compose([
        line("Besoin", opp.title),
        line("Compte", compName),
        line("Stage", opp.stage),
        line("Type", opp.opportunity_type),
        line("Practice", opp.practice),
        line("Séniorité", opp.seniority),
        line("Durée (jours)", opp.duration_days),
        line("Compétences requises", skillReqsByOpportunity.get(opp.id)?.join(", ") ?? null),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "staffing_horizon", table: "opportunities", id: opp.id },
        title: `Besoin ouvert · ${opp.title ?? "Opportunité"}`,
        date: null,
        provenance: "opportunities",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
