// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — concept normalisé « échéance d'opportunité » (Lot 8)
//
//  Chantier : docs/FEATURES/opportunities_workspace/ (§ 9.6, § 12).
//
//  Il n'existe qu'**un seul** builder d'échéances dans le chantier
//  (`build-opportunity-deadlines.ts`), réutilisé par la Synthèse (§ 9.6, tableau
//  « 5 prochaines échéances ») ET le Planning (Lot 9). OPP-10.
//
//  Décision actée à ce lot (DATA-03 → OPP-28) — règle d'arbitrage figée :
//   pour une opportunité **ouverte** (étape non terminale), parmi les dates
//   **futures ou du jour**, on retient UNE seule échéance, par priorité :
//     1. `opportunities.next_action_at`         (prochaine action commerciale)
//     2. prochain `calendar_events.starts_at`   (hors évènements `cancelled`)
//     3. `opportunities.target_close_date`      (date de closing visée)
//   `opportunities.start_date` n'est **jamais** une échéance (exclu par défaut).
//   Les jalons `opportunity_candidates` (`sent_to_client_at`…) sont des dates
//   **passées** de suivi, pas des échéances → hors périmètre V1.
// ─────────────────────────────────────────────────────────────────────────────

/** Source retenue par l'arbitrage pour une échéance donnée. */
export type OpportunityDeadlineSource = "next_action" | "calendar_event" | "target_close"

export interface OpportunityDeadline {
  opportunityId: string
  opportunityTitle: string
  /** Libellé client (`companies.name`) — `null` si non rattaché. */
  client: string | null
  source: OpportunityDeadlineSource
  /** Libellé lisible de l'échéance (action, type d'évènement agenda, ou « closing visé »). */
  label: string
  /** ISO 8601. */
  dueAt: string
  /** `calendar_events.event_type` quand `source === "calendar_event"`, sinon `null`. */
  calendarEventType: string | null
}

// ── Lignes brutes attendues par le builder (forme, pas la requête) ────────────

export interface RawDeadlineOpportunity {
  id: string
  title: string
  /** Étape commerciale brute — le builder filtre les étapes terminales. */
  stage: string
  company_name: string | null
  next_action_at: string | null
  next_action_label: string | null
  target_close_date: string | null
}

export interface RawDeadlineCalendarEvent {
  opportunity_id: string
  event_type: string
  /** `scheduled` · `completed` · `cancelled` — les `cancelled` sont ignorés. */
  status: string | null
  starts_at: string
}

export interface BuildOpportunityDeadlinesInput {
  referenceDate: Date
  /** Toutes les opportunités du workspace — le builder ne garde que les ouvertes. */
  opportunities: RawDeadlineOpportunity[]
  /** Évènements agenda rattachés à une opportunité (le loader peut pré-filtrer le futur). */
  calendarEvents: RawDeadlineCalendarEvent[]
}
