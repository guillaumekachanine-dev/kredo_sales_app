import { describe, expect, it } from "vitest"
import {
  deriveProspectionWindow,
  PROSPECTION_SIGNALS_QUERY_LIMIT,
  prospectionWindowProvider,
} from "../data/corpus/prospection-window-provider"
import { createFakeSupabase } from "./fake-supabase"

const WS_ID = "workspace-test-123"

describe("deriveProspectionWindow", () => {
  it("dérive une fenêtre de 30 jours calendaires avant periodStart", () => {
    const { windowStart, windowEnd } = deriveProspectionWindow("2026-08-01", "2026-08-31")
    expect(windowStart).toBe("2026-07-02")
    expect(windowEnd).toBe("2026-08-31")
  })
})

describe("prospectionWindowProvider — résolveur de corpus", () => {
  it("hydrate les signaux, comptes, contacts et enjeux sans AUCUNE agrégation de score par compte", async () => {
    const companyId = "company-1-uuid"
    const dataset = {
      v_active_account_signals: [
        {
          id: "signal-1",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Levée de fonds IA",
          summary: "Annonce d'un tour de table de 10M€.",
          recommended_action: "Proposer un accompagnement Data.",
          signal_category: "financement",
          signal_type: "levee_fonds",
          detected_at: "2026-08-10",
          urgency_score: 8,
          relevance_score: 9,
          potential_value_score: 7,
          score_justification: "Signaux de croissance très élevés.",
        },
        {
          id: "signal-2",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Nomination DSI",
          summary: "Nouveau DSI nommé le mois dernier.",
          recommended_action: "Prendre RDV de courtoisie.",
          signal_category: "mouvement",
          signal_type: "nomination",
          detected_at: "2026-08-12",
          urgency_score: 9,
          relevance_score: 8,
          potential_value_score: 8,
          score_justification: "Changement de gouvernance.",
        },
        {
          id: "signal-3",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Appel d'offres Cloud",
          summary: "Publication d'un cahier des charges.",
          recommended_action: "Positionner nos consultants Cloud.",
          signal_category: "projet",
          signal_type: "ao_public",
          detected_at: "2026-08-15",
          urgency_score: 10,
          relevance_score: 10,
          potential_value_score: 9,
          score_justification: "Projet stratégique.",
        },
        {
          id: "signal-4",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Ouverture nouveau centre R&D",
          summary: "Nouveau site à Lyon.",
          recommended_action: "Proposer un renfort staffing local.",
          signal_category: "expansion",
          signal_type: "site_opening",
          detected_at: "2026-08-18",
          urgency_score: 7,
          relevance_score: 7,
          potential_value_score: 8,
          score_justification: "Besoins en recrutement.",
        },
        {
          id: "signal-5",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Partenariat stratégique",
          summary: "Signature avec un acteur majeur.",
          recommended_action: "Évaluer les synergies.",
          signal_category: "partenariat",
          signal_type: "partnership",
          detected_at: "2026-08-20",
          urgency_score: 6,
          relevance_score: 8,
          potential_value_score: 6,
          score_justification: "Synergies d'offres.",
        },
      ],
      companies: [
        {
          id: companyId,
          workspace_id: WS_ID,
          name: "Acme Corp",
          segment_id: "segment-tech-esn",
          relation_type: "prospect",
          lifecycle_status: "prospect",
          classification_confiance: "elevee",
        },
      ],
      interactions: [
        {
          id: "inter-1",
          workspace_id: WS_ID,
          company_id: companyId,
          type: "email",
          occurred_at: "2026-08-15",
          summary: "Prise de contact initiale",
          sentiment: "neutre",
        },
      ],
      contacts: [
        {
          id: "contact-1",
          workspace_id: WS_ID,
          company_id: companyId,
          person_id: "person-1",
          job_title: "Directeur Technique",
          department: "DSI",
          relationship_role: "decideur",
          decision_power: "fort",
          updated_at: "2026-08-01",
        },
      ],
      persons: [
        {
          id: "person-1",
          workspace_id: WS_ID,
          full_name: "Jean Dupont",
        },
      ],
      account_issues: [
        {
          id: "issue-1",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Migration Cloud AWS",
          category: "cloud",
          criticality: "haute",
          business_impact: "Mise à niveau infrastructure",
          status: "open",
          updated_at: "2026-08-05",
        },
      ],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await prospectionWindowProvider.resolve(
      { workspaceId: WS_ID, supabase },
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    )

    expect(result.exclusions).toHaveLength(0)
    expect(result.items.length).toBeGreaterThan(0)

    // Vérification de la garde d'anti-agrégation (HEAD 5744983e):
    // Aucun item ne contient de score cumulé, sommé ou moyenné par compte !
    for (const item of result.items) {
      expect(item.content).not.toMatch(/score global/i)
      expect(item.content).not.toMatch(/score total/i)
      expect(item.content).not.toMatch(/score moyen/i)
      expect(item.content).not.toMatch(/somme des scores/i)
      expect(item.content).not.toMatch(/score de priorite/i)
      expect(item.content).not.toMatch(/note globale/i)
    }

    // Chaque signal conserve ses propres scores isolés
    const signalItems = result.items.filter((item) => item.ref.table === "v_active_account_signals")
    expect(signalItems).toHaveLength(5)
    expect(signalItems[0]?.content).toContain("Score urgence : 8") // signal-1
    expect(signalItems[2]?.content).toContain("Score urgence : 10") // signal-3
  })

  it("génère l'item synthétique explicite lorsqu'un compte touché n'a aucune interaction", async () => {
    const companyId = "company-no-inter-uuid"
    const dataset = {
      v_active_account_signals: [
        {
          id: "signal-101",
          workspace_id: WS_ID,
          company_id: companyId,
          title: "Recrutement massif DevOps",
          summary: "Publication de 5 offres DevOps.",
          recommended_action: "Proposer notre practice Cloud.",
          signal_category: "recrutement",
          signal_type: "job_postings",
          detected_at: "2026-08-14",
          urgency_score: 9,
          relevance_score: 8,
          potential_value_score: 9,
          score_justification: "Besoins pressants.",
        },
      ],
      companies: [
        {
          id: companyId,
          workspace_id: WS_ID,
          name: "Dormant Corp",
          segment_id: "segment-cloud",
          relation_type: "prospect",
          lifecycle_status: "prospect",
          classification_confiance: "moyenne",
        },
      ],
      interactions: [], // Aucune interaction
      contacts: [],
      account_issues: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await prospectionWindowProvider.resolve(
      { workspaceId: WS_ID, supabase },
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    )

    const interactionItem = result.items.find((item) => item.ref.table === "interactions")
    expect(interactionItem).toBeDefined()
    expect(interactionItem?.ref.id).toBe(`${companyId}:no_interaction`)
    expect(interactionItem?.title).toBe("Dernière interaction · Dormant Corp")
    expect(interactionItem?.content).toContain("Statut : aucune interaction depuis l'ouverture du compte")
  })

  it("trace une exclusion provider_limit à la saturation d'une borne de requête", async () => {
    // Créer un tableau de signaux saturant la borne
    const signals = Array.from({ length: PROSPECTION_SIGNALS_QUERY_LIMIT }, (_, i) => ({
      id: `sig-${i}`,
      workspace_id: WS_ID,
      company_id: "comp-1",
      title: `Signal ${i}`,
      detected_at: "2026-08-10",
    }))

    const dataset = {
      v_active_account_signals: signals,
      companies: [{ id: "comp-1", workspace_id: WS_ID, name: "Comp 1" }],
      interactions: [],
      contacts: [],
      account_issues: [],
    }

    const { supabase } = createFakeSupabase(dataset)
    const result = await prospectionWindowProvider.resolve(
      { workspaceId: WS_ID, supabase },
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    )

    expect(result.exclusions).toContainEqual({
      ref: { kind: "prospection_window", table: "v_active_account_signals", id: "__query_limit__" },
      title: `Signaux d'achat actifs : borne de requête atteinte (${PROSPECTION_SIGNALS_QUERY_LIMIT})`,
      provenance: "v_active_account_signals",
      reason: "provider_limit",
    })
  })

  it("filtre strictement sur le workspaceId (seconde serrure)", async () => {
    const dataset = {
      v_active_account_signals: [
        {
          id: "sig-other-ws",
          workspace_id: "other-workspace",
          company_id: "comp-other",
          title: "Signal un autre workspace",
          detected_at: "2026-08-10",
        },
      ],
      companies: [],
      interactions: [],
      contacts: [],
      account_issues: [],
    }

    const { supabase, calls } = createFakeSupabase(dataset)
    const result = await prospectionWindowProvider.resolve(
      { workspaceId: WS_ID, supabase },
      { kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    )

    expect(result.items).toHaveLength(0)
    // Vérifier que la requête sur les signaux contient le filtre workspace_id
    const signalCall = calls.find((c) => c.table === "v_active_account_signals")
    expect(signalCall).toBeDefined()
    expect(signalCall?.eq).toContainEqual(["workspace_id", WS_ID])
  })
})
