import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getAccountSectorPerspective } from "./get-account-sector-perspective"
import * as readModelModule from "./get-sector-knowledge-read-model"
import * as competitiveMapModule from "@/features/competitive-map/data/get-competitive-map-citation"

describe("getAccountSectorPerspective — garde anti-lecture-directe (§4.1)", () => {
  it("ne lit jamais les tables brutes sectorielles, uniquement read models et tables autorisées", () => {
    const sourceCode = readFileSync(
      join(process.cwd(), "src/features/master-study/data/get-account-sector-perspective.ts"),
      "utf8",
    )

    // Interdits absolus
    expect(sourceCode).not.toContain('.from("sector_intelligence")')
    expect(sourceCode).not.toContain('.from("sector_pain_points")')
    expect(sourceCode).not.toContain('.from("sector_events")')
    expect(sourceCode).not.toContain('.from("sector_news")')
    expect(sourceCode).not.toContain('.from("sector_regulatory_items")')

    // Tables légitimes autorisées
    expect(sourceCode).toContain('.from("companies")')
    expect(sourceCode).toContain('.from("value_chain_nodes")')
    expect(sourceCode).toContain('.from("intelligence_documents")')
  })
})

describe("getAccountSectorPerspective — tests fonctionnels (§4.2 à §4.7)", () => {
  const COMPANY_ID = "67b346ff-68c8-4f36-a510-13024955856f"
  const SEGMENT_ID = "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6"
  const RUN_ID = "522cfe06-f241-4620-a820-a0806a902571"
  const DOCUMENT_ID = "c8e7aa8b-8ecd-4af4-9e9e-5b04884d1b35"

  function mockPilotReadModel(overrides: Partial<readModelModule.SectorKnowledgeReadModel> = {}): readModelModule.SectorKnowledgeReadModel {
    return {
      segmentId: SEGMENT_ID,
      segmentName: "Compositions & ingrédients B2B",
      segmentSlug: "seg-parfumerie-compositions-b2b",
      segmentStatus: "active",
      macroId: "e3950aea-5e32-40df-8565-3366ec8a5cc6",
      macroName: "Parfumerie, Arômes & Cosmétique",
      macroSlug: "parfumerie-aromes-cosmetique",
      macroStatus: "active",
      description: "Création, fabrication et vente B2B de compositions parfumantes.",
      descriptionLevel: "segment",
      attractivenessScore: 4.8,
      attractivenessScoreLevel: "segment",
      marketSizeEurBn: null,
      marketSizeEurBnLevel: "locked",
      marketGrowthPct: null,
      marketGrowthPctLevel: "locked",
      playbook: {
        market_thesis: [
          { id: 1, these: "Thèse 1", src_ids: [1, 2], donc_commercialement: "DONC 1" },
          { id: 2, these: "Thèse 2", src_ids: [3], donc_commercialement: "DONC 2" },
          { id: 3, these: "Thèse 3", src_ids: [4], donc_commercialement: "DONC 3" },
          { id: 4, these: "Thèse 4", src_ids: [5], donc_commercialement: "DONC 4" },
          { id: 5, these: "Thèse 5", src_ids: [6], donc_commercialement: "DONC 5" },
        ],
        tech_fronts: [
          { nom: "Front 1", etat: "Etat 1", zone_de_transition: true, donc_commercialement: "DONC tech 1", src_ids: [10] },
          { nom: "Front 2", etat: "Etat 2", zone_de_transition: true, donc_commercialement: "DONC tech 2", src_ids: [11] },
          { nom: "Front 3", etat: "Etat 3", zone_de_transition: false, donc_commercialement: "DONC tech 3", src_ids: [12] },
          { nom: "Front 4", etat: "Etat 4", zone_de_transition: true, donc_commercialement: "DONC tech 4", src_ids: [13] },
          { nom: "Front 5", etat: "Etat 5", zone_de_transition: false, donc_commercialement: "DONC tech 5", src_ids: [14] },
        ],
        dependances_critiques: [
          { nom: "Dep 1", criticite: "haute", risque: "Risque 1", situation: "Situation 1", practice_kredo: "data_ai", prestation_ouverte: "Prestation 1", donc_commercialement: "DONC dep 1", src_ids: [20] },
          { nom: "Dep 2", criticite: "haute", risque: "Risque 2", situation: "Situation 2", practice_kredo: "data_ai", prestation_ouverte: "Prestation 2", donc_commercialement: "DONC dep 2", src_ids: [21] },
          { nom: "Dep 3", criticite: "haute", risque: "Risque 3", situation: "Situation 3", practice_kredo: "quality_engineering", prestation_ouverte: "Prestation 3", donc_commercialement: "DONC dep 3", src_ids: [22] },
          { nom: "Dep 4", criticite: "moyenne", risque: "Risque 4", situation: "Situation 4", practice_kredo: "cyber", prestation_ouverte: "Prestation 4", donc_commercialement: "DONC dep 4", src_ids: [23] },
          { nom: "Dep 5", criticite: "moyenne", risque: "Risque 5", situation: "Situation 5", practice_kredo: "cloud", prestation_ouverte: "Prestation 5", donc_commercialement: "DONC dep 5", src_ids: [24] },
          { nom: "Dep 6", criticite: "moyenne", risque: "Risque 6", situation: "Situation 6", practice_kredo: "digital_experience", prestation_ouverte: "Prestation 6", donc_commercialement: "DONC dep 6", src_ids: [25] },
        ],
      },
      playbookLevel: "segment",
      practicesFit: { data_ai: 5 },
      practicesFitLevel: "segment",
      keyPlayersPaca: [],
      keyPlayersNational: [],
      hasSegmentKnowledge: true,
      digitalMaturity: "advanced",
      avgTjmMin: 800,
      avgTjmMax: 1000,
      caveats: null,
      sourceRunId: RUN_ID,
      studySnapshotDate: "2026-08-14",
      effectiveStatus: "active",
      items: { painPoints: [], events: [], news: [], regulatory: [] },
      painPoints: [],
      events: [
        {
          id: "ev-1",
          title: "Événement à venir",
          description: "Description upcoming",
          eventType: "conference",
          eventDate: "2026-11-15",
          eventStatus: "confirmed",
          sourceUrl: null,
          commercialOpportunity: "Opportunité",
          resolvedLevel: "segment",
          createdAt: "2026-08-14T00:00:00Z",
          updatedAt: "2026-08-14T00:00:00Z",
        },
        {
          id: "ev-2",
          title: "Événement récent",
          description: "Description recent",
          eventType: "publication",
          eventDate: "2026-06-22",
          eventStatus: "done",
          sourceUrl: null,
          commercialOpportunity: null,
          resolvedLevel: "segment",
          createdAt: "2026-08-14T00:00:00Z",
          updatedAt: "2026-08-14T00:00:00Z",
        },
      ],
      news: [],
      regulatory: [
        {
          id: "reg-1",
          name: "Réglementation future",
          authority: "IFRA",
          description: "Amendement IFRA 52",
          deadlineDate: "2026-11-30",
          urgency: "high",
          kredoPractice: "data_ai",
          commercialAngle: "Impact portefeuille",
          isCommercialWindow: true,
          sourceUrl: "https://ifrafragrance.org",
          resolvedLevel: "segment",
          createdAt: "2026-08-14T00:00:00Z",
          updatedAt: "2026-08-14T00:00:00Z",
        },
        {
          id: "reg-2",
          name: "Réglementation expirée",
          authority: "UE",
          description: "Directive ancienne",
          deadlineDate: "2025-01-01",
          urgency: "normal",
          kredoPractice: null,
          commercialAngle: null,
          isCommercialWindow: false,
          sourceUrl: null,
          resolvedLevel: "segment",
          createdAt: "2026-08-14T00:00:00Z",
          updatedAt: "2026-08-14T00:00:00Z",
        },
      ],
      ...overrides,
    }
  }

  function mockPilotVcnRows() {
    return [
      { id: "vcn-1", couche: "metier", maillon: 1, rang: 1, label: "Sourcing et qualification", description: "Maillon 1", capture_valeur: null, capture_justification: null, confiance: "haute" },
      { id: "vcn-2", couche: "metier", maillon: 2, rang: 1, label: "Transformation", description: "Maillon 2", capture_valeur: null, capture_justification: null, confiance: "haute" },
      { id: "vcn-3", couche: "metier", maillon: 3, rang: 1, label: "Création et formulation", description: "Maillon 3", capture_valeur: null, capture_justification: null, confiance: "haute" },
      { id: "vcn-4", couche: "metier", maillon: 4, rang: 1, label: "Réglementaire et qualité", description: "Maillon 4", capture_valeur: null, capture_justification: null, confiance: "haute" },
      { id: "vcn-5", couche: "metier", maillon: 5, rang: 1, label: "Industrialisation", description: "Maillon 5", capture_valeur: null, capture_justification: null, confiance: "haute" },
      { id: "vcn-6", couche: "metier", maillon: 6, rang: 1, label: "Service client", description: "Maillon 6", capture_valeur: null, capture_justification: null, confiance: "haute" },
    ]
  }

  function mockRobertetCitation(): competitiveMapModule.CompetitiveMapCitation {
    return {
      entry: {
        category: "leader",
        categoryLabel: "Leader",
        positioning: "Leader intégré du naturel à Grasse",
        forces: "Intégration amont-aval unique",
        vulnerabilite: "Exposition au change",
        angleEntree: "Industrialisation gouvernée de l'IA de création (NaturIA)",
        empreinteMetier: 5,
        maturiteNumerique: 5,
        appetenceScore: 35,
        appetenceProvisoire: true,
        confiance: "haute",
        studySnapshotDate: "2026-08-14",
        profileJson: {
          metier_chaine_valeur: "Seul acteur du segment intégré du sourcing agricole à la composition finale.",
          maillon: "Présence sur les six maillons avec centre de gravité sur 1, 3 et 4.",
          traduction_commerciale: {
            angle: "Vous avez un outil d'IA de création qui fonctionne (NaturIA).",
            accroches: [
              "Accroche 1 : NaturIA et gouvernance de données.",
              "Accroche 2 : Notification IFRA 52 et impact portefeuille.",
            ],
            a_ne_pas_dire: "Ne pas ouvrir sur la digitalisation générique ni sur un POC IA.",
          },
        },
      },
      facts: {
        revenueEstimateMeur: 843.9,
        revenueExercice: 2025,
        revenuePerimetre: "groupe monde",
        headcountFrance: null,
      },
    }
  }

  it("2. companies.segment_id IS NULL → null", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: COMPANY_ID, segment_id: null },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective(COMPANY_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(perspective).toBeNull()
  })

  it("3. Compte introuvable → null", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective("unknown-id", {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(perspective).toBeNull()
  })

  it("4. Compte avec segment mais sans ligne competitive_map_entries → competitivePosition: null et perspective peuplée", async () => {
    vi.spyOn(readModelModule, "getSectorKnowledgeReadModel").mockResolvedValue(mockPilotReadModel())
    vi.spyOn(competitiveMapModule, "getCompetitiveMapCitation").mockResolvedValue({
      entry: null,
      facts: { revenueEstimateMeur: null, revenueExercice: null, revenuePerimetre: null, headcountFrance: null },
    })

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "non-mapped-account", segment_id: SEGMENT_ID },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "value_chain_nodes") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({
                    data: mockPilotVcnRows(),
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === "intelligence_documents") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: { id: DOCUMENT_ID },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective("non-mapped-account", {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
      now: new Date("2026-08-20T00:00:00Z"),
    })

    expect(perspective).not.toBeNull()
    expect(perspective?.competitivePosition).toBeNull()
    expect(perspective?.accountInterpretation).toEqual({
      positioning: null,
      angleEntree: null,
      metierChaineValeur: null,
      maillonNarrative: null,
      commercialAngle: null,
      commercialHooks: [],
      doNotSay: null,
    })
    expect(perspective?.segment.id).toBe(SEGMENT_ID)
    expect(perspective?.essentialContext.keyTheses).toHaveLength(5)
    expect(perspective?.valueChainPosition.segmentNodes).toHaveLength(6)
  })

  it("5. Test contre le fixture réel du run pilote (5 thèses, 5 fronts, 6 dépendances, 6 nœuds capture_valeur null, 2 accroches Robertet)", async () => {
    vi.spyOn(readModelModule, "getSectorKnowledgeReadModel").mockResolvedValue(mockPilotReadModel())
    vi.spyOn(competitiveMapModule, "getCompetitiveMapCitation").mockResolvedValue(mockRobertetCitation())

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: COMPANY_ID, segment_id: SEGMENT_ID },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "value_chain_nodes") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({
                    data: mockPilotVcnRows(),
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === "intelligence_documents") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: { id: DOCUMENT_ID },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective(COMPANY_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
      now: new Date("2026-08-20T00:00:00Z"),
    })

    expect(perspective).not.toBeNull()
    if (!perspective) return

    // Segment & Provenance
    expect(perspective.segment.id).toBe(SEGMENT_ID)
    expect(perspective.segment.status).toBe("active")
    expect(perspective.provenance.runId).toBe(RUN_ID)
    expect(perspective.provenance.documentId).toBe(DOCUMENT_ID)
    expect(perspective.provenance.snapshotDate).toBe("2026-08-14")

    // Essential Context
    expect(perspective.essentialContext.keyTheses).toHaveLength(5)
    expect(perspective.essentialContext.keyTheses[0].id).toBe(1)
    expect(perspective.essentialContext.keyTheses[0].these).toBe("Thèse 1")
    expect(perspective.essentialContext.keyTheses[0].doncCommercialement).toBe("DONC 1")
    expect(perspective.essentialContext.keyTheses[0].srcIds).toEqual([1, 2])

    // Why Now
    expect(perspective.whyNow.relevantTechFronts).toHaveLength(5)
    expect(perspective.whyNow.relevantTechFronts[0].nom).toBe("Front 1")
    expect(perspective.whyNow.relevantTechFronts[0].zoneDeTransition).toBe(true)

    // Value Chain Position (6 maillons avec captureValeur null)
    expect(perspective.valueChainPosition.segmentNodes).toHaveLength(6)
    expect(perspective.valueChainPosition.segmentNodes.every((n) => n.captureValeur === null)).toBe(true)
    expect(perspective.valueChainPosition.dependencies).toHaveLength(6)
    expect(perspective.valueChainPosition.dependencies[0].nom).toBe("Dep 1")
    expect(perspective.valueChainPosition.dependencies[0].practiceKredo).toBe("data_ai")

    // Competitive Position & Account Interpretation
    expect(perspective.competitivePosition).not.toBeNull()
    expect(perspective.competitivePosition?.category).toBe("leader")
    expect(perspective.accountInterpretation.commercialHooks).toHaveLength(2)
    expect(perspective.accountInterpretation.commercialHooks[0]).toBe("Accroche 1 : NaturIA et gouvernance de données.")
    expect(perspective.accountInterpretation.commercialAngle).toBe("Vous avez un outil d'IA de création qui fonctionne (NaturIA).")
    expect(perspective.accountInterpretation.metierChaineValeur).toBe("Seul acteur du segment intégré du sourcing agricole à la composition finale.")
    expect(perspective.accountInterpretation.maillonNarrative).toBe("Présence sur les six maillons avec centre de gravité sur 1, 3 et 4.")
    expect(perspective.accountInterpretation.doNotSay).toBe("Ne pas ouvrir sur la digitalisation générique ni sur un POC IA.")
  })

  it("6. Provenance : SectorKnowledgeReadModel renvoie descriptionLevel: 'macro' → essentialContext.definitionLevel: 'macro'", async () => {
    vi.spyOn(readModelModule, "getSectorKnowledgeReadModel").mockResolvedValue(
      mockPilotReadModel({
        description: "Description héritée du macro",
        descriptionLevel: "macro",
      }),
    )
    vi.spyOn(competitiveMapModule, "getCompetitiveMapCitation").mockResolvedValue(mockRobertetCitation())

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: COMPANY_ID, segment_id: SEGMENT_ID },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "value_chain_nodes") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === "intelligence_documents") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: null,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective(COMPANY_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
    })

    expect(perspective).not.toBeNull()
    expect(perspective?.essentialContext.definition).toBe("Description héritée du macro")
    expect(perspective?.essentialContext.definitionLevel).toBe("macro")
  })

  it("7. whyNow.relevantRegulatoryItems exclut les items 'expired' et relevantDynamics place 'upcoming' avant 'recent'", async () => {
    const fixedNow = new Date("2026-08-20T00:00:00Z")
    vi.spyOn(readModelModule, "getSectorKnowledgeReadModel").mockResolvedValue(
      mockPilotReadModel({
        regulatory: [
          {
            id: "reg-expired",
            name: "Règlement 2024 (expiré)",
            authority: "UE",
            description: null,
            deadlineDate: "2024-01-01",
            urgency: "normal",
            kredoPractice: null,
            commercialAngle: null,
            isCommercialWindow: false,
            sourceUrl: null,
            resolvedLevel: "segment",
            createdAt: null,
            updatedAt: null,
          },
          {
            id: "reg-future",
            name: "Règlement 2027 (futur)",
            authority: "UE",
            description: null,
            deadlineDate: "2027-06-01",
            urgency: "high",
            kredoPractice: null,
            commercialAngle: null,
            isCommercialWindow: true,
            sourceUrl: null,
            resolvedLevel: "segment",
            createdAt: null,
            updatedAt: null,
          },
          {
            id: "reg-imminent",
            name: "Règlement IFRA 52 (imminent)",
            authority: "IFRA",
            description: null,
            deadlineDate: "2026-10-15",
            urgency: "high",
            kredoPractice: null,
            commercialAngle: null,
            isCommercialWindow: true,
            sourceUrl: null,
            resolvedLevel: "segment",
            createdAt: null,
            updatedAt: null,
          },
        ],
        events: [
          {
            id: "ev-recent",
            title: "Publication passée",
            description: null,
            eventType: "presse",
            eventDate: "2026-06-01",
            eventStatus: "done",
            sourceUrl: null,
            commercialOpportunity: null,
            resolvedLevel: "segment",
            createdAt: null,
            updatedAt: null,
          },
          {
            id: "ev-upcoming",
            title: "Congrès futur",
            description: null,
            eventType: "salon",
            eventDate: "2026-11-20",
            eventStatus: "confirmed",
            sourceUrl: null,
            commercialOpportunity: null,
            resolvedLevel: "segment",
            createdAt: null,
            updatedAt: null,
          },
        ],
      }),
    )

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: COMPANY_ID, segment_id: SEGMENT_ID },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "value_chain_nodes") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === "intelligence_documents") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: null,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const perspective = await getAccountSectorPerspective(COMPANY_ID, {
      supabase: mockSupabase as unknown as SupabaseClient<Database>,
      now: fixedNow,
    })

    expect(perspective).not.toBeNull()

    // 1. Regulatory items : l'expiré est filtré, les 2 futurs sont ordonnés par date
    expect(perspective?.whyNow.relevantRegulatoryItems).toHaveLength(2)
    expect(perspective?.whyNow.relevantRegulatoryItems.map((r) => r.id)).toEqual([
      "reg-imminent",
      "reg-future",
    ])

    // 2. Dynamics : upcoming avant recent
    expect(perspective?.whyNow.relevantDynamics).toHaveLength(2)
    expect(perspective?.whyNow.relevantDynamics[0].id).toBe("ev-upcoming")
    expect(perspective?.whyNow.relevantDynamics[1].id).toBe("ev-recent")
  })
})
