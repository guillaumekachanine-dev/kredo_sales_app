import "server-only"

/**
 * Provider de corpus `pipeline_period` — ADR-0020 §5.1 et roadmap L7.5.
 *
 * Hydrate le pipe commercial clos (opportunités gagnées, perdues ou abandonnées)
 * sur un trimestre calendaire, ainsi que l'historique d'interactions rattaché, les profils
 * présentés et leur issue, les compétences requises et les comptes clients concernés.
 *
 * ── POURQUOI CETTE PROFONDEUR ───────────────────────────────────────────────────
 * C'est la première mission du catalogue à granularité trimestrielle. Elle permet de
 * dresser le post-mortem commercial des affaires closes sur un trimestre complet afin
 * d'en extraire les motifs récurrents de succès ou d'échec.
 *
 * ── MODE D'EXÉCUTION : `user_rls` ET CONFIDENTIALITÉ ─────────────────────────────
 * Les 5 sources interrogées sont accessibles en `user_rls` (`security_invoker = true`).
 * Le `.eq("workspace_id", ctx.workspaceId)` est appliqué systématiquement sur chaque
 * relation portant cette colonne comme seconde serrure.
 *
 * 🔴 RÈGLE DE CONFIDENTIALITÉ NON NÉGOCIABLE :
 * Les données de rémunération individuelle ou de prétentions salariales (candidates)
 * n'entrent JAMAIS dans les requêtes de ce provider. Seuls les statuts de présentation,
 * les retours clients et les compétences sont retenus.
 *
 * ── TRAITEMENT DE LA DATE DE CLÔTURE ─────────────────────────────────────────────
 * La colonne prioritaire de clôture d'une affaire est `closed_at`. Si `closed_at` n'est pas
 * renseignée (valeur `null`), le provider utilise la colonne de repli `updated_at` et le
 * précise explicitement dans le contenu de l'item.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — affaires closes et pipeline commercial. */
export const PIPELINE_PERIOD_WEIGHT = 80

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const PIPELINE_OPPORTUNITIES_QUERY_LIMIT = 100
export const PIPELINE_INTERACTION_QUERY_LIMIT = 200
export const PIPELINE_CANDIDATES_QUERY_LIMIT = 200
export const PIPELINE_SKILLS_QUERY_LIMIT = 200
export const PIPELINE_COMPANIES_QUERY_LIMIT = 100

export function formatCurrency(val: number | null | undefined): string | null {
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
  return `${formatted} €`
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
    ref: { kind: "pipeline_period", table, id: "__query_limit__" },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

export const pipelinePeriodProvider: CorpusProvider<{
  kind: "pipeline_period"
  periodStart: string
  periodEnd: string
}> = {
  kind: "pipeline_period",
  execution: "user_rls",
  weight: PIPELINE_PERIOD_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    // ── 1. OPPORTUNITÉS CLOSES ────────────────────────────────────────────────
    // Filtrage de la fenêtre appliqué CÔTÉ REQUÊTE, avant toute borne — jamais l'inverse.
    // Une affaire dont `closed_at` tombe dans la fenêtre ne doit jamais pouvoir être
    // évincée par des affaires plus récemment mises à jour mais hors fenêtre : la
    // borne dure (`PIPELINE_OPPORTUNITIES_QUERY_LIMIT`) ne doit tronquer QUE dans la
    // fenêtre, pas sur l'ensemble de l'historique. Deux requêtes en parallèle
    // reproduisent le OR (closed_at dans la fenêtre) OU (closed_at absent ET updated_at
    // dans la fenêtre) qu'un simple `.gte()/.lte()` ne peut pas exprimer sur une colonne
    // nullable avec repli.
    const oppSelectColumns =
      "id, title, stage, opportunity_type, estimated_gain, weighted_gain, acv, target_daily_rate, duration_days, practice, seniority, closed_at, updated_at, loss_reason, win_reason, company_id, created_at, need_summary"

    const [closedAtResult, fallbackUpdatedAtResult] = await Promise.all([
      ctx.supabase
        .from("opportunities")
        .select(oppSelectColumns)
        .eq("workspace_id", ctx.workspaceId)
        .in("stage", ["gagne", "perdu", "abandonne"])
        .gte("closed_at", selector.periodStart)
        .lte("closed_at", selector.periodEnd)
        .order("closed_at", { ascending: false })
        .limit(PIPELINE_OPPORTUNITIES_QUERY_LIMIT),

      ctx.supabase
        .from("opportunities")
        .select(oppSelectColumns)
        .eq("workspace_id", ctx.workspaceId)
        .in("stage", ["gagne", "perdu", "abandonne"])
        .is("closed_at", null)
        .gte("updated_at", selector.periodStart)
        .lte("updated_at", selector.periodEnd)
        .order("updated_at", { ascending: false })
        .limit(PIPELINE_OPPORTUNITIES_QUERY_LIMIT),
    ])

    if (closedAtResult.error) {
      throw new Error(`Lecture des opportunités closes impossible : ${closedAtResult.error.message}`)
    }
    if (fallbackUpdatedAtResult.error) {
      throw new Error(`Lecture des opportunités closes (repli) impossible : ${fallbackUpdatedAtResult.error.message}`)
    }

    const closedAtRows = closedAtResult.data ?? []
    if (closedAtRows.length === PIPELINE_OPPORTUNITIES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("opportunities", "Opportunités closes (closed_at)", PIPELINE_OPPORTUNITIES_QUERY_LIMIT),
      )
    }

    const fallbackRows = fallbackUpdatedAtResult.data ?? []
    if (fallbackRows.length === PIPELINE_OPPORTUNITIES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("opportunities", "Opportunités closes (repli updated_at)", PIPELINE_OPPORTUNITIES_QUERY_LIMIT),
      )
    }

    // Les deux branches sont mutuellement exclusives (`closed_at` posé vs absent) :
    // simple concaténation, pas de déduplication nécessaire.
    const selectedOpps = [...closedAtRows, ...fallbackRows]

    const selectedOppIds = selectedOpps.map((o) => o.id).filter((id): id is string => Boolean(id))
    const selectedCompanyIds = Array.from(
      new Set(selectedOpps.map((o) => o.company_id).filter((id): id is string => Boolean(id))),
    )

    if (selectedOppIds.length === 0) {
      return { items, exclusions }
    }

    // ── 2. REQUÊTES EN PARALLÈLE POUR LES SOURCES LIÉES ───────────────────────
    const [interactionsResult, candidatesResult, skillsResult, companiesResult] =
      await Promise.all([
        ctx.supabase
          .from("interactions")
          .select("id, opportunity_id, company_id, type, occurred_at, summary, sentiment")
          .eq("workspace_id", ctx.workspaceId)
          .in("opportunity_id", selectedOppIds)
          .order("occurred_at", { ascending: false })
          .limit(PIPELINE_INTERACTION_QUERY_LIMIT),

        ctx.supabase
          .from("opportunity_candidates")
          .select(
            "id, opportunity_id, candidate_id, status, sent_to_client_at, status_changed_at, client_feedback, comment, next_action, updated_at",
          )
          .eq("workspace_id", ctx.workspaceId)
          .in("opportunity_id", selectedOppIds)
          .limit(PIPELINE_CANDIDATES_QUERY_LIMIT),

        ctx.supabase
          .from("opportunity_skills")
          .select("id, opportunity_id, skill_id, importance, min_level, min_years, weight, comment, created_at")
          .eq("workspace_id", ctx.workspaceId)
          .in("opportunity_id", selectedOppIds)
          .limit(PIPELINE_SKILLS_QUERY_LIMIT),

        selectedCompanyIds.length > 0
          ? ctx.supabase
              .from("companies")
              .select("id, name, segment_id, relation_type, lifecycle_status, classification_confiance")
              .eq("workspace_id", ctx.workspaceId)
              .in("id", selectedCompanyIds)
              .limit(PIPELINE_COMPANIES_QUERY_LIMIT)
          : Promise.resolve({ data: [], error: null }),
      ])

    if (interactionsResult.error) {
      throw new Error(`Lecture des interactions d'opportunités impossible : ${interactionsResult.error.message}`)
    }
    if (candidatesResult.error) {
      throw new Error(`Lecture des candidats d'opportunités impossible : ${candidatesResult.error.message}`)
    }
    if (skillsResult.error) {
      throw new Error(`Lecture des compétences requises impossible : ${skillsResult.error.message}`)
    }
    if (companiesResult.error) {
      throw new Error(`Lecture des comptes d'opportunités impossible : ${companiesResult.error.message}`)
    }

    const interactionRows = interactionsResult.data ?? []
    if (interactionRows.length === PIPELINE_INTERACTION_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("interactions", "Interactions opportunités", PIPELINE_INTERACTION_QUERY_LIMIT),
      )
    }

    const candidateRows = candidatesResult.data ?? []
    if (candidateRows.length === PIPELINE_CANDIDATES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "opportunity_candidates",
          "Profils présentés",
          PIPELINE_CANDIDATES_QUERY_LIMIT,
        ),
      )
    }

    const oppSkillRows = skillsResult.data ?? []
    if (oppSkillRows.length === PIPELINE_SKILLS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("opportunity_skills", "Compétences requises", PIPELINE_SKILLS_QUERY_LIMIT),
      )
    }

    const companyRows = companiesResult.data ?? []
    if (companyRows.length === PIPELINE_COMPANIES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("companies", "Comptes opportunités", PIPELINE_COMPANIES_QUERY_LIMIT),
      )
    }

    // Maps de résolution de noms
    const companyNameById = new Map<string, string>()
    for (const c of companyRows) {
      if (c.id && c.name) companyNameById.set(c.id, c.name)
    }

    const oppTitleById = new Map<string, string>()
    for (const o of selectedOpps) {
      if (o.id && o.title) oppTitleById.set(o.id, o.title)
    }

    // Résolution des noms de candidats via candidate_id -> candidates -> persons
    const candidateIds = Array.from(
      new Set(candidateRows.map((cr) => cr.candidate_id).filter((id): id is string => Boolean(id))),
    )
    const personNameByCandidateId = new Map<string, string>()
    if (candidateIds.length > 0) {
      const { data: candRows, error: candError } = await ctx.supabase
        .from("candidates")
        .select("id, person_id")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", candidateIds)

      if (candError) {
        throw new Error(`Lecture du référentiel des candidats impossible : ${candError.message}`)
      }

      const personIds = Array.from(
        new Set(
          (candRows ?? [])
            .map((cr) => cr.person_id)
            .filter((id): id is string => Boolean(id)),
        ),
      )

      if (personIds.length > 0) {
        const { data: personRows, error: personError } = await ctx.supabase
          .from("persons")
          .select("id, full_name")
          .eq("workspace_id", ctx.workspaceId)
          .in("id", personIds)

        if (personError) {
          throw new Error(`Lecture du nom des personnes candidats impossible : ${personError.message}`)
        }

        const personNameById = new Map<string, string>()
        for (const p of personRows ?? []) {
          if (p.id && p.full_name) personNameById.set(p.id, p.full_name)
        }

        for (const c of candRows ?? []) {
          if (c.id && c.person_id) {
            const name = personNameById.get(c.person_id)
            if (name) personNameByCandidateId.set(c.id, name)
          }
        }
      }
    }

    // Résolution des noms de compétences via skill_id -> skills
    const skillIds = Array.from(
      new Set(oppSkillRows.map((sr) => sr.skill_id).filter((id): id is string => Boolean(id))),
    )
    const skillNameById = new Map<string, string>()
    if (skillIds.length > 0) {
      const { data: skillRows, error: skillsLookupError } = await ctx.supabase
        .from("skills")
        .select("id, name")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", skillIds)

      if (skillsLookupError) {
        throw new Error(`Lecture des libellés de compétences impossible : ${skillsLookupError.message}`)
      }

      for (const s of skillRows ?? []) {
        if (s.id && s.name) skillNameById.set(s.id, s.name)
      }
    }

    // ── 3. HYDRATATION DES OPPORTUNITÉS CLOSES ─────────────────────────────
    for (const opp of selectedOpps) {
      if (!opp.id) continue
      const compName = (opp.company_id ? companyNameById.get(opp.company_id) : null) ?? "Compte inconnu"
      const closingDate = opp.closed_at ?? opp.updated_at
      const usedFallbackDate = !opp.closed_at && Boolean(opp.updated_at)

      const closingDateNote = closingDate
        ? usedFallbackDate
          ? `${closingDate.slice(0, 10)} (repli sur updated_at, closed_at non renseigné)`
          : closingDate.slice(0, 10)
        : "Non renseignée"

      const content = compose([
        line("Affaire", opp.title),
        line("Compte", compName),
        line("Statut / Issue", opp.stage),
        line("Date de clôture", closingDateNote),
        line("Type d'opportunité", opp.opportunity_type),
        line("Practice", opp.practice),
        line("Séniorité", opp.seniority),
        line("Montant estimé (Gain)", formatCurrency(opp.estimated_gain)),
        line("Gain pondéré", formatCurrency(opp.weighted_gain)),
        line("Valeur annuelle (ACV)", formatCurrency(opp.acv)),
        line("TJM cible", formatCurrency(opp.target_daily_rate)),
        line("Durée (jours)", opp.duration_days),
        line("Motif de gain", opp.win_reason),
        line("Motif de perte / abandon", opp.loss_reason),
        line("Résumé du besoin", opp.need_summary),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "pipeline_period", table: "opportunities", id: opp.id },
        title: `Affaire · ${compName} · ${opp.title}`,
        date: closingDate,
        provenance: "opportunities",
        content,
        chars: content.length,
      })
    }

    // ── 4. HYDRATATION DES INTERACTIONS ──────────────────────────────────────
    for (const interaction of interactionRows) {
      if (!interaction.id) continue
      const oppTitle = (interaction.opportunity_id ? oppTitleById.get(interaction.opportunity_id) : null) ?? "Affaire"
      const compName = (interaction.company_id ? companyNameById.get(interaction.company_id) : null) ?? "Compte"

      const content = compose([
        line("Affaire", oppTitle),
        line("Compte", compName),
        line("Type d'interaction", interaction.type),
        line("Date", interaction.occurred_at),
        line("Résumé", interaction.summary),
        line("Sentiment", interaction.sentiment),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "pipeline_period", table: "interactions", id: interaction.id },
        title: `Interaction · ${oppTitle} · ${interaction.type ?? "Echange"}`,
        date: interaction.occurred_at,
        provenance: "interactions",
        content,
        chars: content.length,
      })
    }

    // ── 5. HYDRATATION DES PROFILS PRÉSENTÉS ─────────────────────────────────
    for (const cand of candidateRows) {
      if (!cand.id) continue
      const oppTitle = (cand.opportunity_id ? oppTitleById.get(cand.opportunity_id) : null) ?? "Affaire"
      const candidateName = cand.candidate_id ? personNameByCandidateId.get(cand.candidate_id) : null

      const content = compose([
        line("Affaire", oppTitle),
        line("Candidat / Consultant", candidateName ?? cand.candidate_id),
        line("Statut de présentation", cand.status),
        line("Date d'envoi au client", cand.sent_to_client_at),
        line("Dernier changement de statut", cand.status_changed_at),
        line("Retour client", cand.client_feedback),
        line("Commentaires", cand.comment),
        line("Prochaine action", cand.next_action),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "pipeline_period", table: "opportunity_candidates", id: cand.id },
        title: `Profil présenté · ${oppTitle} · ${candidateName ?? "Candidat"}`,
        date: cand.status_changed_at ?? cand.sent_to_client_at ?? cand.updated_at,
        provenance: "opportunity_candidates",
        content,
        chars: content.length,
      })
    }

    // ── 6. HYDRATATION DES COMPÉTENCES REQUISE ──────────────────────────────
    for (const skill of oppSkillRows) {
      if (!skill.id) continue
      const oppTitle = (skill.opportunity_id ? oppTitleById.get(skill.opportunity_id) : null) ?? "Affaire"
      const skillName = skill.skill_id ? skillNameById.get(skill.skill_id) : null

      const content = compose([
        line("Affaire", oppTitle),
        line("Compétence", skillName ?? skill.skill_id),
        line("Importance", skill.importance),
        line("Niveau minimum", skill.min_level),
        line("Années d'expérience min", skill.min_years),
        line("Poids", skill.weight),
        line("Commentaire", skill.comment),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "pipeline_period", table: "opportunity_skills", id: skill.id },
        title: `Compétence requise · ${oppTitle} · ${skillName ?? "Compétence"}`,
        date: skill.created_at,
        provenance: "opportunity_skills",
        content,
        chars: content.length,
      })
    }

    // ── 7. HYDRATATION DES COMPTES ───────────────────────────────────────────
    for (const comp of companyRows) {
      if (!comp.id) continue

      const content = compose([
        line("Nom du compte", comp.name),
        line("Segment ID", comp.segment_id),
        line("Statut de relation", comp.relation_type),
        line("Cycle de vie", comp.lifecycle_status),
        line("Confiance classification", comp.classification_confiance),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "pipeline_period", table: "companies", id: comp.id },
        title: `Compte · ${comp.name}`,
        date: null,
        provenance: "companies",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
