import "server-only"

/**
 * Provider de corpus `prospection_window` — ADR-0020 §5.1, handoff L6 et roadmap L7.1.
 *
 * Hydrate les signaux d'achat actifs, les comptes touchés, la dernière interaction
 * connue par compte (ou item synthétique explicite si aucune), les contacts qualifiés
 * et les enjeux ouverts sur une fenêtre temporelle glissante (ex. 30 jours).
 *
 * ── FENÊTRE DE PROSPECTION ──────────────────────────────────────────────────────
 * La fenêtre de 30 jours glissants est dérivée côté serveur par le provider et n'est
 * jamais transmise par le navigateur (garde contre l'extension non contrôlée du corpus).
 *
 * ── MODE D'EXÉCUTION : `user_rls` ───────────────────────────────────────────────
 * Les 5 sources sont interrogées avec le client de l'utilisateur sous RLS (`authenticated`).
 * Le `.eq("workspace_id", ctx.workspaceId)` est appliqué systématiquement sur chaque
 * relation portant cette colonne comme seconde serrure.
 *
 * 🔴 RÈGLE NON NÉGOCIABLE — NEUTRALISATION DES SCORES GLOBAUX (COMMIT 5744983e) :
 * Ce provider ne somme, ne moyenne, ne pondère et ne calcule AUCUN score global par compte
 * à partir des signaux. Chaque `urgency_score`, `relevance_score` et `potential_value_score`
 * reste un fait attaché à son propre signal. Le classement du portefeuille est un jugement
 * argumenté produit par le LLM dans le rapport, jamais un ordre pré-calculé par le provider.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — signaux et opportunités de prospection. */
export const PROSPECTION_WINDOW_WEIGHT = 85

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const PROSPECTION_SIGNALS_QUERY_LIMIT = 200
export const PROSPECTION_COMPANIES_QUERY_LIMIT = 100
export const PROSPECTION_INTERACTIONS_QUERY_LIMIT = 200
export const PROSPECTION_CONTACTS_QUERY_LIMIT = 200
export const PROSPECTION_ISSUES_QUERY_LIMIT = 200

/**
 * Dérive la fenêtre d'hydratation de 30 jours glissants :
 * 30 jours calendaires avant `periodStart` jusqu'à `periodEnd`.
 */
export function deriveProspectionWindow(
  periodStart: string,
  periodEnd: string,
): { windowStart: string; windowEnd: string } {
  const startDate = new Date(`${periodStart}T00:00:00Z`)
  startDate.setUTCDate(startDate.getUTCDate() - 30)
  const windowStart = startDate.toISOString().slice(0, 10)
  return { windowStart, windowEnd: periodEnd }
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
    ref: { kind: "prospection_window", table, id: "__query_limit__" },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

export const prospectionWindowProvider: CorpusProvider<{
  kind: "prospection_window"
  periodStart: string
  periodEnd: string
}> = {
  kind: "prospection_window",
  execution: "user_rls",
  weight: PROSPECTION_WINDOW_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    const { windowStart, windowEnd } = deriveProspectionWindow(
      selector.periodStart,
      selector.periodEnd,
    )

    // ── 1. SIGNAUX D'ACHAT ACTIFS ───────────────────────────────────────────
    const { data: signalRows, error: signalsError } = await ctx.supabase
      .from("v_active_account_signals")
      .select(
        "id, company_id, title, summary, recommended_action, signal_category, signal_type, detected_at, urgency_score, relevance_score, potential_value_score, score_justification",
      )
      .eq("workspace_id", ctx.workspaceId)
      .gte("detected_at", windowStart)
      .lte("detected_at", windowEnd)
      .order("detected_at", { ascending: false })
      .limit(PROSPECTION_SIGNALS_QUERY_LIMIT)

    if (signalsError) {
      throw new Error(`Lecture des signaux d'achat actifs impossible : ${signalsError.message}`)
    }

    const signals = signalRows ?? []
    if (signals.length === PROSPECTION_SIGNALS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "v_active_account_signals",
          "Signaux d'achat actifs",
          PROSPECTION_SIGNALS_QUERY_LIMIT,
        ),
      )
    }

    // Extraire les identifiants de comptes uniques touchés par les signaux retenus
    const touchedCompanyIds = Array.from(
      new Set(
        signals
          .map((s) => s.company_id)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    // S'il n'y a aucun compte touché, renvoyer directement sans requêter les sources liées
    if (touchedCompanyIds.length === 0) {
      return { items, exclusions }
    }

    // ── 2. REQUÊTES EN PARALLÈLE POUR LES COMPTES TOUCHÉS ───────────────────
    const [companiesResult, interactionsResult, contactsResult, issuesResult] =
      await Promise.all([
        ctx.supabase
          .from("companies")
          .select("id, name, segment_id, relation_type, lifecycle_status, classification_confiance")
          .eq("workspace_id", ctx.workspaceId)
          .in("id", touchedCompanyIds)
          .limit(PROSPECTION_COMPANIES_QUERY_LIMIT),

        ctx.supabase
          .from("interactions")
          .select("id, company_id, type, occurred_at, summary, sentiment")
          .eq("workspace_id", ctx.workspaceId)
          .in("company_id", touchedCompanyIds)
          .order("occurred_at", { ascending: false })
          .limit(PROSPECTION_INTERACTIONS_QUERY_LIMIT),

        ctx.supabase
          .from("contacts")
          .select(
            "id, company_id, person_id, job_title, department, relationship_role, decision_power, updated_at",
          )
          .eq("workspace_id", ctx.workspaceId)
          .in("company_id", touchedCompanyIds)
          .in("relationship_role", [
            "decideur",
            "prescripteur",
            "sponsor",
            "acheteur",
            "direction_metier",
            "dsi",
            "manager_technique",
            "rh",
          ])
          .limit(PROSPECTION_CONTACTS_QUERY_LIMIT),

        ctx.supabase
          .from("account_issues")
          .select("id, company_id, title, category, criticality, business_impact, status, updated_at")
          .eq("workspace_id", ctx.workspaceId)
          .in("company_id", touchedCompanyIds)
          .eq("status", "open")
          .limit(PROSPECTION_ISSUES_QUERY_LIMIT),
      ])

    if (companiesResult.error) {
      throw new Error(`Lecture des comptes touchés impossible : ${companiesResult.error.message}`)
    }
    if (interactionsResult.error) {
      throw new Error(`Lecture des interactions impossible : ${interactionsResult.error.message}`)
    }
    if (contactsResult.error) {
      throw new Error(`Lecture des contacts qualifiés impossible : ${contactsResult.error.message}`)
    }
    if (issuesResult.error) {
      throw new Error(`Lecture des enjeux ouverts impossible : ${issuesResult.error.message}`)
    }

    const companyRows = companiesResult.data ?? []
    if (companyRows.length === PROSPECTION_COMPANIES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("companies", "Comptes touchés", PROSPECTION_COMPANIES_QUERY_LIMIT),
      )
    }

    const interactionRows = interactionsResult.data ?? []
    if (interactionRows.length === PROSPECTION_INTERACTIONS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "interactions",
          "Interactions des comptes",
          PROSPECTION_INTERACTIONS_QUERY_LIMIT,
        ),
      )
    }

    const contactRows = contactsResult.data ?? []
    if (contactRows.length === PROSPECTION_CONTACTS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("contacts", "Contacts qualifiés", PROSPECTION_CONTACTS_QUERY_LIMIT),
      )
    }

    const issueRows = issuesResult.data ?? []
    if (issueRows.length === PROSPECTION_ISSUES_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("account_issues", "Enjeux ouverts", PROSPECTION_ISSUES_QUERY_LIMIT),
      )
    }

    // Map pour la résolution du nom de compte
    const companyNameById = new Map<string, string>()
    for (const company of companyRows) {
      if (company.id && company.name) {
        companyNameById.set(company.id, company.name)
      }
    }

    // Résolution des noms de personnes pour les contacts
    const personIds = Array.from(
      new Set(
        contactRows
          .map((c) => c.person_id)
          .filter((id): id is string => Boolean(id)),
      ),
    )
    const personNameById = new Map<string, string>()
    if (personIds.length > 0) {
      const { data: personRows, error: personsError } = await ctx.supabase
        .from("persons")
        .select("id, full_name")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", personIds)

      if (personsError) {
        throw new Error(`Lecture des personnes des contacts impossible : ${personsError.message}`)
      }

      for (const person of personRows ?? []) {
        if (person.id && person.full_name) {
          personNameById.set(person.id, person.full_name)
        }
      }
    }

    // ── 3. HYDRATATION DES SIGNAUX (1 ITEM PAR SIGNAL) ─────────────────────
    // 🔴 Aucun score cumulé, moyenné ou agrégé par compte.
    for (const signal of signals) {
      if (!signal.id) continue
      const compName = (signal.company_id ? companyNameById.get(signal.company_id) : null) ?? "Compte inconnu"

      const content = compose([
        line("Compte", compName),
        line("Catégorie", signal.signal_category),
        line("Type", signal.signal_type),
        line("Titre", signal.title),
        line("Score urgence", signal.urgency_score),
        line("Score pertinence", signal.relevance_score),
        line("Score valeur potentielle", signal.potential_value_score),
        line("Résumé", signal.summary),
        line("Justification score", signal.score_justification),
        line("Action recommandée", signal.recommended_action),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "prospection_window", table: "v_active_account_signals", id: signal.id },
        title: `Signal · ${compName} · ${signal.title ?? "Sans titre"}`,
        date: signal.detected_at,
        provenance: "v_active_account_signals",
        content,
        chars: content.length,
      })
    }

    // ── 4. HYDRATATION DES COMPTES TOUCHÉS (1 ITEM PAR COMPTE) ──────────────
    for (const company of companyRows) {
      if (!company.id) continue

      const content = compose([
        line("Nom", company.name),
        line("Segment ID", company.segment_id),
        line("Statut de relation", company.relation_type),
        line("Cycle de vie", company.lifecycle_status),
        line("Confiance classification", company.classification_confiance),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "prospection_window", table: "companies", id: company.id },
        title: `Compte · ${company.name}`,
        date: null,
        provenance: "companies",
        content,
        chars: content.length,
      })
    }

    // ── 5. HYDRATATION DE LA DERNIÈRE INTERACTION PAR COMPTE ────────────────
    const interactionsByCompany = new Map<string, typeof interactionRows>()
    for (const inter of interactionRows) {
      if (!inter.company_id) continue
      const list = interactionsByCompany.get(inter.company_id) ?? []
      list.push(inter)
      interactionsByCompany.set(inter.company_id, list)
    }

    for (const companyId of touchedCompanyIds) {
      const compName = companyNameById.get(companyId) ?? "Compte inconnu"
      const compInteractions = interactionsByCompany.get(companyId) ?? []

      if (compInteractions.length > 0) {
        // Prendre la dernière interaction connue
        const latest = compInteractions[0]
        if (!latest || !latest.id) continue

        const content = compose([
          line("Compte", compName),
          line("Type", latest.type),
          line("Date", latest.occurred_at),
          line("Résumé", latest.summary),
          line("Sentiment", latest.sentiment),
        ])

        if (!content) continue

        items.push({
          ref: { kind: "prospection_window", table: "interactions", id: latest.id },
          title: `Dernière interaction · ${compName}`,
          date: latest.occurred_at,
          provenance: "interactions",
          content,
          chars: content.length,
        })
      } else {
        // Item synthétique explicite : aucune interaction depuis l'ouverture
        const content = compose([
          line("Compte", compName),
          line("Statut", "aucune interaction depuis l'ouverture du compte"),
        ])

        items.push({
          ref: { kind: "prospection_window", table: "interactions", id: `${companyId}:no_interaction` },
          title: `Dernière interaction · ${compName}`,
          date: null,
          provenance: "interactions",
          content,
          chars: content.length,
        })
      }
    }

    // ── 6. HYDRATATION DES CONTACTS QUALIFIÉS ───────────────────────────────
    for (const contact of contactRows) {
      if (!contact.id) continue
      const compName = (contact.company_id ? companyNameById.get(contact.company_id) : null) ?? "Compte inconnu"
      const personName = contact.person_id ? personNameById.get(contact.person_id) : null

      const content = compose([
        line("Compte", compName),
        line("Nom", personName),
        line("Fonction", contact.job_title),
        line("Direction", contact.department),
        line("Rôle dans la relation", contact.relationship_role),
        line("Pouvoir de décision", contact.decision_power),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "prospection_window", table: "contacts", id: contact.id },
        title: `Contact qualifié · ${compName} · ${personName ?? contact.job_title ?? "Contact"}`,
        date: contact.updated_at,
        provenance: "contacts",
        content,
        chars: content.length,
      })
    }

    // ── 7. HYDRATATION DES ENJEUX OUVERTS ───────────────────────────────────
    for (const issue of issueRows) {
      if (!issue.id) continue
      const compName = (issue.company_id ? companyNameById.get(issue.company_id) : null) ?? "Compte inconnu"

      const content = compose([
        line("Compte", compName),
        line("Titre", issue.title),
        line("Catégorie", issue.category),
        line("Criticité", issue.criticality),
        line("Impact business", issue.business_impact),
        line("Statut", issue.status),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "prospection_window", table: "account_issues", id: issue.id },
        title: `Enjeu ouvert · ${compName} · ${issue.title ?? "Sans titre"}`,
        date: issue.updated_at,
        provenance: "account_issues",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
