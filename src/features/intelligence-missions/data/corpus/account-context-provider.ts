import "server-only"

/**
 * Provider de corpus `account_context` — ADR-0020 §5.1 et M-5.
 *
 * ── POURQUOI `user_rls` ET NON `service_role` ────────────────────────────────────
 * Le handoff L1 annonçait ce provider en service-role, via
 * `public.get_account_knowledge_context`. Contrôle live du 2026-08-18 (`pg_proc` +
 * `has_function_privilege`) : cette RPC est `security invoker`, `EXECUTE` révoqué à
 * `anon`/`authenticated`, accordé au seul `service_role`. Appelée en service-role elle
 * s'exécute donc SANS AUCUNE RLS et ne se protège que par son paramètre
 * `p_workspace_id` — exactement le schéma de la faille `get_manager_summary_facts`
 * corrigée le 2026-08-18.
 *
 * La consigne était de vérifier d'abord qu'un chemin sous RLS utilisateur suffit. Il
 * suffit : `companies`, `v_active_account_signals` (`security_invoker`), `contacts` et
 * `persons` portent toutes le motif RLS workspace standard
 * (`workspace_id = current_workspace_id()`, vérifié live). Ce provider lit donc ces
 * quatre relations avec le client de l'utilisateur et **n'appelle aucune RPC**. Le
 * service-role n'apparaît nulle part dans ce fichier : il n'y a pas de garde à
 * contourner parce qu'il n'y a pas de contournement de RLS.
 *
 * Bénéfice secondaire, non accessoire : la RPC rend un unique blob JSON, donc un seul
 * `CorpusItem` et une seule référence citable. La lecture ligne à ligne donne au LLM un
 * identifiant réel par signal et par contact — ce dont L3 a besoin pour reconstituer un
 * `SourceRef` (contrainte inter-lots de la trace).
 *
 * ── LA GARDE DE WORKSPACE ────────────────────────────────────────────────────────
 * La RLS reste la protection principale. Le `.eq("workspace_id", ctx.workspaceId)` posé
 * sur CHAQUE lecture en est la seconde serrure, et la lecture du compte est un VERROU
 * D'ENTRÉE : tant que la company n'a pas été retrouvée dans le workspace de l'appelant,
 * aucune autre requête n'est émise et rien n'est rendu. `ctx.workspaceId` vient de
 * `profiles.workspace_id` résolu depuis la session (cf. `/api/n8n/trigger`), jamais du
 * corps de la requête. Retirer ce verrou fait échouer
 * `__tests__/account-context-provider.test.ts`.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

export const ACCOUNT_CONTEXT_WEIGHT = 90

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const ACCOUNT_SIGNAL_QUERY_LIMIT = 200
export const ACCOUNT_CONTACT_QUERY_LIMIT = 200

function line(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? `${label} : ${text}` : null
}

function compose(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n")
}

export const accountContextProvider: CorpusProvider<{
  kind: "account_context"
  companyId: string
}> = {
  kind: "account_context",
  execution: "user_rls",
  weight: ACCOUNT_CONTEXT_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    // ── VERROU D'ENTRÉE ─────────────────────────────────────────────────────────
    const { data: company, error: companyError } = await ctx.supabase
      .from("companies")
      .select(
        "id, name, legal_name, description, sector, segment, website, lifecycle_status, relation_type, priority, employee_count, size_band, hq_location, siren, naf_code, classification_note, updated_at",
      )
      .eq("id", selector.companyId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle()

    if (companyError) {
      throw new Error(`Lecture du compte impossible : ${companyError.message}`)
    }

    if (!company) {
      // Compte inexistant OU hors du workspace de l'appelant : indistinguable de
      // l'extérieur, et c'est voulu. Aucune autre lecture n'est tentée.
      return {
        items,
        exclusions: [
          {
            ref: { kind: "account_context", table: "companies", id: selector.companyId },
            title: "Compte introuvable dans ce workspace",
            provenance: "companies",
            reason: "not_found",
          },
        ],
      }
    }

    const identity = compose([
      line("Raison sociale", company.legal_name),
      line("Secteur", company.sector),
      line("Segment", company.segment),
      line("Statut de relation", company.relation_type),
      line("Cycle de vie", company.lifecycle_status),
      line("Priorité", company.priority),
      line("Effectif", company.employee_count),
      line("Tranche d'effectif", company.size_band),
      line("Implantation", company.hq_location),
      line("SIREN", company.siren),
      line("Code NAF", company.naf_code),
      line("Site", company.website),
      line("Description", company.description),
      line("Note de classification", company.classification_note),
    ])

    if (identity) {
      items.push({
        ref: { kind: "account_context", table: "companies", id: company.id },
        title: company.name,
        date: company.updated_at,
        provenance: "companies",
        content: identity,
        chars: identity.length,
      })
    }

    const [signalsResult, contactsResult] = await Promise.all([
      // La vue porte déjà l'exclusion des signaux archivés/écartés et la fenêtre
      // calendaire de 2 mois : on ne réimplémente pas cette règle en TypeScript.
      ctx.supabase
        .from("v_active_account_signals")
        .select(
          "id, title, summary, recommended_action, signal_category, signal_type, detected_at, urgency_score, confidence_score",
        )
        .eq("workspace_id", ctx.workspaceId)
        .eq("company_id", company.id)
        .order("urgency_score", { ascending: false })
        .order("detected_at", { ascending: false })
        .order("detected_at", { ascending: false })
        .limit(ACCOUNT_SIGNAL_QUERY_LIMIT),
      ctx.supabase
        .from("contacts")
        .select(
          "id, person_id, job_title, department, relationship_role, decision_power, relationship_level, is_priority, updated_at",
        )
        .eq("workspace_id", ctx.workspaceId)
        .eq("company_id", company.id)
        .order("id", { ascending: true })
        .limit(ACCOUNT_CONTACT_QUERY_LIMIT),
    ])

    if (signalsResult.error) {
      throw new Error(`Lecture des signaux du compte impossible : ${signalsResult.error.message}`)
    }
    if (contactsResult.error) {
      throw new Error(`Lecture des contacts du compte impossible : ${contactsResult.error.message}`)
    }

    const signals = signalsResult.data ?? []
    if (signals.length === ACCOUNT_SIGNAL_QUERY_LIMIT) {
      exclusions.push({
        ref: { kind: "account_context", table: "account_signals", id: "__query_limit__" },
        title: `Signaux du compte : borne de requête atteinte (${ACCOUNT_SIGNAL_QUERY_LIMIT})`,
        provenance: "v_active_account_signals",
        reason: "provider_limit",
      })
    }

    for (const signal of signals) {
      if (!signal.id) continue
      const content = compose([
        line("Catégorie", signal.signal_category),
        line("Type", signal.signal_type),
        line("Urgence", signal.urgency_score),
        line("Confiance", signal.confidence_score),
        line("Résumé", signal.summary),
        line("Action recommandée", signal.recommended_action),
      ])
      if (!content) continue
      items.push({
        // La référence pointe la TABLE résolvable ; la vue n'est que le chemin de
        // lecture, elle porte les mêmes identifiants.
        ref: { kind: "account_context", table: "account_signals", id: signal.id },
        title: signal.title ?? "Signal sans titre",
        date: signal.detected_at,
        provenance: "v_active_account_signals",
        content,
        chars: content.length,
      })
    }

    const contacts = contactsResult.data ?? []
    if (contacts.length === ACCOUNT_CONTACT_QUERY_LIMIT) {
      exclusions.push({
        ref: { kind: "account_context", table: "contacts", id: "__query_limit__" },
        title: `Contacts du compte : borne de requête atteinte (${ACCOUNT_CONTACT_QUERY_LIMIT})`,
        provenance: "contacts",
        reason: "provider_limit",
      })
    }

    // Le nom vit dans `persons` (party model) : seconde requête plutôt qu'un embed,
    // filtrée elle aussi sur le workspace.
    const personIds = Array.from(
      new Set(contacts.map((contact) => contact.person_id).filter((id): id is string => Boolean(id))),
    )
    const nameByPersonId = new Map<string, string>()
    if (personIds.length > 0) {
      const { data: persons, error: personsError } = await ctx.supabase
        .from("persons")
        .select("id, full_name")
        .eq("workspace_id", ctx.workspaceId)
        .in("id", personIds)

      if (personsError) {
        throw new Error(`Lecture des personnes impossible : ${personsError.message}`)
      }
      for (const person of persons ?? []) {
        if (person.full_name) nameByPersonId.set(person.id, person.full_name)
      }
    }

    for (const contact of contacts) {
      const content = compose([
        line("Fonction", contact.job_title),
        line("Direction", contact.department),
        line("Rôle dans la relation", contact.relationship_role),
        line("Pouvoir de décision", contact.decision_power),
        line("Niveau de relation", contact.relationship_level),
        contact.is_priority ? "Contact prioritaire : oui" : null,
      ])
      if (!content) continue
      const name = contact.person_id ? nameByPersonId.get(contact.person_id) : undefined
      items.push({
        ref: { kind: "account_context", table: "contacts", id: contact.id },
        title: name ?? contact.job_title ?? "Contact",
        date: contact.updated_at,
        provenance: "contacts",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
