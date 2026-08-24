import "server-only"

/**
 * Provider de corpus `hiring_period` — ADR-0020 §5.1 et roadmap L7.6.
 *
 * Hydrate les processus de recrutement internes (`candidate_hiring_processes`), leurs jalons
 * datés (`candidate_hiring_milestones`) avec délais pré-calculés entre étapes consécutives,
 * le référentiel des candidats et profils recherchés (`candidates`, `job_profiles`), ainsi que
 * les présentations client associées (`opportunity_candidates`).
 *
 * ── POURQUOI CETTE PROFONDEUR ───────────────────────────────────────────────────
 * L'action déterministe `analyze_funnel` fournit un instantané statique des étapes. Cette mission
 * est sa version V2 prospective et historique : elle lit les jalons datés pour calculer les
 * vrais délais de transition entre étapes et identifier où le funnel perd des candidats.
 *
 * ── MODE D'EXÉCUTION : `user_rls` ET CONFIDENTIALITÉ ─────────────────────────────
 * Les sources interrogées sont exécutées en `user_rls`. Le `.eq("workspace_id", ctx.workspaceId)`
 * est appliqué sur chaque relation par seconde verrou.
 *
 * 🔴 RÈGLE DE CONFIDENTIALITÉ NON NÉGOCIABLE :
 * Les prétentions salariales (`expected_salary`) et rémunérations passées (`last_salary`) ne sont
 * JAMAIS incluses. Seul le TJM attendu (`expected_daily_rate`) peut être exposé pour le staffing.
 *
 * ── RÈGLE ANTI-RECALCUL DE DÉLAI ──────────────────────────────────────────────────
 * Les délais entre jalons consécutifs d'un même process sont TOUJOURS calculés par le provider
 * (en JS/TS) avant d'être transmis au LLM. Le premier jalon d'un process n'a pas de délai.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — processus et délais de recrutement. */
export const HIRING_PERIOD_WEIGHT = 75

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const HIRING_PROCESSES_QUERY_LIMIT = 100
export const HIRING_MILESTONES_QUERY_LIMIT = 300
export const HIRING_CANDIDATES_QUERY_LIMIT = 100
export const HIRING_OPPORTUNITY_CANDIDATES_QUERY_LIMIT = 100

export function formatRate(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(val)) return null
  const rounded = Math.round(val * 100) / 100
  const isInteger = Number.isInteger(rounded)
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(rounded)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
  return `${formatted} €/j`
}

function line(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? `${label} : ${text}` : null
}

function compose(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n")
}

function capExclusion(
  table: string,
  label: string,
  limit: number,
): CorpusExclusion {
  return {
    ref: { kind: "hiring_period", table, id: "__query_limit__" },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

export function getMilestoneTimestamp(milestone: {
  completed_at?: string | null
  scheduled_at?: string | null
  created_at?: string | null
}): number {
  const dateStr = milestone.completed_at ?? milestone.scheduled_at ?? milestone.created_at
  if (!dateStr) return 0
  const time = new Date(dateStr).getTime()
  return Number.isNaN(time) ? 0 : time
}

export const hiringPeriodProvider: CorpusProvider<{
  kind: "hiring_period"
  periodStart: string
  periodEnd: string
}> = {
  kind: "hiring_period",
  execution: "user_rls",
  weight: HIRING_PERIOD_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    // ── 1. PROCESSUS DE RECRUTEMENT DANS LA FENÊTRE ──────────────────────────
    // Deux requêtes en parallèle pour la fenêtre sur started_at OU closed_at.
    const processColumns =
      "id, candidate_id, status, current_step, close_reason, started_at, closed_at, created_at, updated_at, job_profile_id, opportunity_candidate_id, recruiter_id"

    const [startedAtResult, closedAtResult] = await Promise.all([
      ctx.supabase
        .from("candidate_hiring_processes")
        .select(processColumns)
        .eq("workspace_id", ctx.workspaceId)
        .gte("started_at", selector.periodStart)
        .lte("started_at", selector.periodEnd)
        .order("started_at", { ascending: false })
        .limit(HIRING_PROCESSES_QUERY_LIMIT),

      ctx.supabase
        .from("candidate_hiring_processes")
        .select(processColumns)
        .eq("workspace_id", ctx.workspaceId)
        .not("closed_at", "is", null)
        .gte("closed_at", selector.periodStart)
        .lte("closed_at", selector.periodEnd)
        .order("closed_at", { ascending: false })
        .limit(HIRING_PROCESSES_QUERY_LIMIT),
    ])

    if (startedAtResult.error) {
      throw new Error(`Lecture des processus de recrutement (started_at) impossible : ${startedAtResult.error.message}`)
    }
    if (closedAtResult.error) {
      throw new Error(`Lecture des processus de recrutement (closed_at) impossible : ${closedAtResult.error.message}`)
    }

    const startedAtRows = startedAtResult.data ?? []
    if (startedAtRows.length === HIRING_PROCESSES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("candidate_hiring_processes", "Processus de recrutement (started_at)", HIRING_PROCESSES_QUERY_LIMIT),
      )
    }

    const closedAtRows = closedAtResult.data ?? []
    if (closedAtRows.length === HIRING_PROCESSES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("candidate_hiring_processes", "Processus de recrutement (closed_at)", HIRING_PROCESSES_QUERY_LIMIT),
      )
    }

    // Déduplication par ID de processus
    const processMap = new Map<string, (typeof startedAtRows)[number]>()
    for (const p of [...startedAtRows, ...closedAtRows]) {
      if (p.id && !processMap.has(p.id)) processMap.set(p.id, p)
    }

    const selectedProcesses = Array.from(processMap.values())
    const selectedProcessIds = selectedProcesses.map((p) => p.id)

    if (selectedProcessIds.length === 0) {
      return { items, exclusions }
    }

    const candidateIds = Array.from(
      new Set(selectedProcesses.map((p) => p.candidate_id).filter((id): id is string => Boolean(id))),
    )

    const jobProfileIds = Array.from(
      new Set(selectedProcesses.map((p) => p.job_profile_id).filter((id): id is string => Boolean(id))),
    )

    const oppCandidateIds = Array.from(
      new Set(selectedProcesses.map((p) => p.opportunity_candidate_id).filter((id): id is string => Boolean(id))),
    )

    // ── 2. REQUÊTES EN PARALLÈLE POUR LES EXPANSIONS ─────────────────────────
    const [milestonesResult, candidatesResult, jobProfilesResult, oppCandidatesResult] =
      await Promise.all([
        ctx.supabase
          .from("candidate_hiring_milestones")
          .select("id, hiring_process_id, step, result, completed_at, scheduled_at, created_at, notes")
          .eq("workspace_id", ctx.workspaceId)
          .in("hiring_process_id", selectedProcessIds)
          .limit(HIRING_MILESTONES_QUERY_LIMIT),

        candidateIds.length > 0
          ? ctx.supabase
              .from("candidates")
              .select("id, person_id, job_profile_id, practice_id, status, expected_daily_rate, experience_years, created_at")
              .eq("workspace_id", ctx.workspaceId)
              .in("id", candidateIds)
              .limit(HIRING_CANDIDATES_QUERY_LIMIT)
          : Promise.resolve({ data: [], error: null }),

        jobProfileIds.length > 0
          ? ctx.supabase
              .from("job_profiles")
              .select("id, title, practice_id, main_mission")
              .eq("workspace_id", ctx.workspaceId)
              .in("id", jobProfileIds)
          : Promise.resolve({ data: [], error: null }),

        oppCandidateIds.length > 0
          ? ctx.supabase
              .from("opportunity_candidates")
              .select("id, opportunity_id, candidate_id, status, sent_to_client_at, status_changed_at, client_feedback, comment, updated_at")
              .eq("workspace_id", ctx.workspaceId)
              .in("id", oppCandidateIds)
              .limit(HIRING_OPPORTUNITY_CANDIDATES_QUERY_LIMIT)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (milestonesResult.error) {
      throw new Error(`Lecture des jalons de recrutement impossible : ${milestonesResult.error.message}`)
    }
    if (candidatesResult.error) {
      throw new Error(`Lecture des candidats de recrutement impossible : ${candidatesResult.error.message}`)
    }
    if (jobProfilesResult.error) {
      throw new Error(`Lecture des profils recherchés impossible : ${jobProfilesResult.error.message}`)
    }
    if (oppCandidatesResult.error) {
      throw new Error(`Lecture des présentations client de recrutement impossible : ${oppCandidatesResult.error.message}`)
    }

    const milestoneRows = milestonesResult.data ?? []
    if (milestoneRows.length === HIRING_MILESTONES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("candidate_hiring_milestones", "Jalons de recrutement", HIRING_MILESTONES_QUERY_LIMIT),
      )
    }

    const candidateRows = candidatesResult.data ?? []
    if (candidateRows.length === HIRING_CANDIDATES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("candidates", "Candidats", HIRING_CANDIDATES_QUERY_LIMIT),
      )
    }

    const jobProfileRows = jobProfilesResult.data ?? []
    const oppCandidateRows = oppCandidatesResult.data ?? []
    if (oppCandidateRows.length === HIRING_OPPORTUNITY_CANDIDATES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("opportunity_candidates", "Présentations client", HIRING_OPPORTUNITY_CANDIDATES_QUERY_LIMIT),
      )
    }

    // Résolution des noms de personnes (candidats)
    const personIds = Array.from(
      new Set(
        candidateRows
          .map((c) => c.person_id)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    const personNameById = new Map<string, string>()
    if (personIds.length > 0) {
      const { data: personRows, error: personError } = await ctx.supabase
        .from("persons")
        .select("id, full_name")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", personIds)

      if (personError) {
        throw new Error(`Lecture des noms de personnes candidats impossible : ${personError.message}`)
      }

      for (const p of personRows ?? []) {
        if (p.id && p.full_name) personNameById.set(p.id, p.full_name)
      }
    }

    const candidateNameById = new Map<string, string>()
    const candidateJobProfileIdById = new Map<string, string | null>()
    const candidatePracticeById = new Map<string, string | null>()
    const candidateRateById = new Map<string, number | null>()
    const candidateExperienceById = new Map<string, number | null>()
    const candidateStatusById = new Map<string, string | null>()

    for (const c of candidateRows) {
      if (!c.id) continue
      const name = c.person_id ? personNameById.get(c.person_id) : null
      if (name) candidateNameById.set(c.id, name)
      candidateJobProfileIdById.set(c.id, c.job_profile_id)
      candidatePracticeById.set(c.id, c.practice_id)
      candidateRateById.set(c.id, c.expected_daily_rate)
      candidateExperienceById.set(c.id, c.experience_years)
      candidateStatusById.set(c.id, c.status)
    }

    const jobProfileTitleById = new Map<string, string>()
    for (const jp of jobProfileRows) {
      if (jp.id && jp.title) jobProfileTitleById.set(jp.id, jp.title)
    }

    // ── 3. HYDRATATION DES PROCESSUS DE RECRUTEMENT ──────────────────────────
    for (const process of selectedProcesses) {
      if (!process.id) continue

      const candidateName = candidateNameById.get(process.candidate_id) ?? "Candidat non renseigné"
      const profileTitle = process.job_profile_id
        ? jobProfileTitleById.get(process.job_profile_id)
        : candidateJobProfileIdById.get(process.candidate_id)
        ? jobProfileTitleById.get(candidateJobProfileIdById.get(process.candidate_id)!)
        : null

      const content = compose([
        line("Candidat", candidateName),
        line("Profil / Poste recherché", profileTitle),
        line("Étape courante du process", process.current_step),
        line("Statut du process", process.status),
        line("Date de démarrage", process.started_at ? process.started_at.slice(0, 10) : null),
        line("Date de clôture", process.closed_at ? process.closed_at.slice(0, 10) : null),
        line("Motif de clôture", process.close_reason),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "hiring_period", table: "candidate_hiring_processes", id: process.id },
        title: `Processus recrutement · ${candidateName} · ${profileTitle ?? "Poste"}`,
        date: process.started_at ?? process.created_at,
        provenance: "candidate_hiring_processes",
        content,
        chars: content.length,
      })
    }

    // ── 4. HYDRATATION DES JALONS DE RECRUTEMENT AVEC DÉLAIS DÉTERMINISTES ───
    // Groupement par process et tri par date
    const milestonesByProcess = new Map<string, typeof milestoneRows>()
    for (const m of milestoneRows) {
      if (!m.hiring_process_id) continue
      const list = milestonesByProcess.get(m.hiring_process_id) ?? []
      list.push(m)
      milestonesByProcess.set(m.hiring_process_id, list)
    }

    for (const [processId, msList] of milestonesByProcess.entries()) {
      const process = processMap.get(processId)
      const candidateName = process ? candidateNameById.get(process.candidate_id) ?? "Candidat" : "Candidat"

      // Tri chronologique des jalons
      msList.sort((a, b) => getMilestoneTimestamp(a) - getMilestoneTimestamp(b))

      for (let i = 0; i < msList.length; i++) {
        const milestone = msList[i]
        if (!milestone.id) continue

        const currentDateStr = milestone.completed_at ?? milestone.scheduled_at ?? milestone.created_at
        let delayNote: string | null = null

        if (i > 0) {
          const prevMilestone = msList[i - 1]
          const prevDateStr = prevMilestone.completed_at ?? prevMilestone.scheduled_at ?? prevMilestone.created_at
          if (prevDateStr && currentDateStr) {
            const prevTime = new Date(prevDateStr).getTime()
            const currTime = new Date(currentDateStr).getTime()
            if (!Number.isNaN(prevTime) && !Number.isNaN(currTime) && currTime >= prevTime) {
              const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24))
              delayNote = `${diffDays} jour(s) depuis l'étape précédente (${prevMilestone.step})`
            }
          }
        }

        const content = compose([
          line("Candidat", candidateName),
          line("Étape du jalon", milestone.step),
          line("Résultat du jalon", milestone.result),
          line("Date d'exécution / réalisation", currentDateStr ? currentDateStr.slice(0, 10) : null),
          line("Délai pré-calculé entre étapes", delayNote),
          line("Notes / Commentaires", milestone.notes),
        ])

        if (!content) continue

        items.push({
          ref: { kind: "hiring_period", table: "candidate_hiring_milestones", id: milestone.id },
          title: `Jalon · ${candidateName} · ${milestone.step}`,
          date: currentDateStr,
          provenance: "candidate_hiring_milestones",
          content,
          chars: content.length,
        })
      }
    }

    // ── 5. HYDRATATION DES CANDIDATS (RÉFÉRENTIEL) ───────────────────────────
    for (const candidate of candidateRows) {
      if (!candidate.id) continue
      const candidateName = candidateNameById.get(candidate.id) ?? "Candidat"
      const profileTitle = candidate.job_profile_id ? jobProfileTitleById.get(candidate.job_profile_id) : null

      const content = compose([
        line("Nom du candidat", candidateName),
        line("Profil recherché", profileTitle),
        line("Practice", candidate.practice_id),
        line("Statut candidat", candidate.status),
        line("TJM attendu", formatRate(candidate.expected_daily_rate)),
        line("Années d'expérience", candidate.experience_years),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "hiring_period", table: "candidates", id: candidate.id },
        title: `Candidat · ${candidateName}`,
        date: candidate.created_at,
        provenance: "candidates",
        content,
        chars: content.length,
      })
    }

    // ── 6. HYDRATATION DES PRÉSENTATIONS CLIENT (OPPORTUNITY_CANDIDATES) ─────
    for (const oppCand of oppCandidateRows) {
      if (!oppCand.id) continue
      const candidateName = oppCand.candidate_id ? candidateNameById.get(oppCand.candidate_id) ?? "Candidat" : "Candidat"

      const content = compose([
        line("Candidat", candidateName),
        line("Statut de présentation", oppCand.status),
        line("Date d'envoi au client", oppCand.sent_to_client_at ? oppCand.sent_to_client_at.slice(0, 10) : null),
        line("Dernier changement de statut", oppCand.status_changed_at ? oppCand.status_changed_at.slice(0, 10) : null),
        line("Retour client", oppCand.client_feedback),
        line("Commentaires", oppCand.comment),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "hiring_period", table: "opportunity_candidates", id: oppCand.id },
        title: `Présentation client · ${candidateName}`,
        date: oppCand.status_changed_at ?? oppCand.sent_to_client_at ?? oppCand.updated_at,
        provenance: "opportunity_candidates",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
