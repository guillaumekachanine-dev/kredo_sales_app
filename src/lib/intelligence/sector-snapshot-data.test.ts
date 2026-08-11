import { describe, expect, it, vi, beforeEach } from "vitest"

// Lot 0 — résolution sectorielle héritée.
//
// Périmètre de ce fichier : la moitié TypeScript du contrat (mapping des deux
// vues vers `ClientIntelligenceSectorView`, propagation de la provenance, repli
// de la liste de pairs, état vide explicite, statut effectif).
//
// La moitié SQL — fusion du playbook clé par clé et union des items — vit dans
// `v_sector_knowledge_resolved` / `v_sector_knowledge_items` (migration 069) et
// n'est pas exécutable sous Vitest. Ses invariants sont assertés par
// `supabase/tests/069_sector_knowledge_resolution.assertions.sql`, à rejouer
// contre la base. Ce fichier suppose ces vues correctes et vérifie que rien
// n'est perdu entre elles et l'écran.

type Row = Record<string, unknown>

const state = vi.hoisted(() => ({
  resolved: null as Row | null,
  items: [] as Row[],
  companiesBySegment: [] as Row[],
  companiesByMacro: [] as Row[],
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      let eqColumn: string | null = null
      const resolveResult = () => {
        if (table === "v_sector_knowledge_items") return { data: state.items, error: null }
        if (table === "companies") {
          return {
            data: eqColumn === "segment_id" ? state.companiesBySegment : state.companiesByMacro,
            error: null,
          }
        }
        return { data: state.resolved, error: null }
      }
      const builder = {
        select: () => builder,
        eq: (column: string) => {
          eqColumn = column
          return builder
        },
        order: () => builder,
        maybeSingle: async () => resolveResult(),
        then: (onOk: (value: unknown) => unknown, onErr?: (reason: unknown) => unknown) =>
          Promise.resolve(resolveResult()).then(onOk, onErr),
      }
      return builder
    },
  })),
}))

import { getSectorSnapshot, PEER_SEGMENT_MIN } from "./sector-snapshot-data"

const SEGMENT_ID = "11111111-1111-1111-1111-111111111111"
const MACRO_ID = "22222222-2222-2222-2222-222222222222"

function resolvedRow(overrides: Row = {}): Row {
  return {
    segment_id: SEGMENT_ID,
    segment_name: "5.1 Spatial, défense & systèmes critiques",
    segment_slug: "spatial-defense-systemes-critiques",
    segment_status: "development",
    macro_id: MACRO_ID,
    macro_name: "Aéronautique, Spatial & Défense",
    macro_slug: "aeronautique-spatial-defense",
    macro_status: "active",
    description: "Description héritée du macro",
    attractiveness_score: 4.2,
    market_size_eur_bn: 30,
    market_growth_pct: 3.5,
    key_players_paca: [],
    key_players_national: [],
    description_level: "macro",
    playbook_level: "macro",
    has_segment_knowledge: false,
    ...overrides,
  }
}

function regulatoryItem(id: string, level: "segment" | "macro"): Row {
  return {
    item_kind: "regulatory",
    item_id: id,
    resolved_level: level,
    title: `Réglementation ${id}`,
    description: null,
    source_url: null,
    authority: "DGA",
    kredo_practice: null,
    commercial_angle: null,
    is_commercial_window: false,
    deadline_date: "2027-01-01",
    urgency: "medium",
    event_type: null,
    event_date: null,
    commercial_opportunity: null,
    frequency_count: null,
    source_company_ids: null,
  }
}

function painPointItem(id: string, level: "segment" | "macro", frequency: number): Row {
  return {
    ...regulatoryItem(id, level),
    item_kind: "pain_point",
    title: `Pain point ${id}`,
    authority: null,
    deadline_date: null,
    urgency: null,
    frequency_count: frequency,
    source_company_ids: [],
  }
}

function company(id: string): Row {
  return { id, name: `Compte ${id}`, legal_name: null, segment: null, metadata: {} }
}

const OPTIONS = { currentCompanyId: "company-current", currentSectorAnalysis: null }

beforeEach(() => {
  state.resolved = resolvedRow()
  state.items = []
  state.companiesBySegment = []
  state.companiesByMacro = []
})

describe("getSectorSnapshot — union des items", () => {
  it("cumule les items du segment et ceux du macro sans qu'aucun n'en masque un autre", async () => {
    state.items = [
      regulatoryItem("seg-1", "segment"),
      ...["mac-1", "mac-2", "mac-3", "mac-4", "mac-5"].map((id) => regulatoryItem(id, "macro")),
    ]
    state.companiesBySegment = [company("a"), company("b"), company("c")]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view).not.toBeNull()
    expect(view!.regulatoryItems).toHaveLength(6)
    expect(view!.regulatoryItems.filter((item) => item.resolvedLevel === "segment")).toHaveLength(1)
    expect(view!.regulatoryItems.filter((item) => item.resolvedLevel === "macro")).toHaveLength(5)
  })

  it("porte la provenance sur chaque pain point et la conserve après tri", async () => {
    state.items = [
      painPointItem("seg-low", "segment", 1),
      painPointItem("mac-high", "macro", 9),
    ]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.painPoints.map((item) => [item.id, item.resolvedLevel])).toEqual([
      ["mac-high", "macro"],
      ["seg-low", "segment"],
    ])
  })

  it("propage la provenance jusqu'aux fenêtres commerciales ouvertes", async () => {
    state.items = [
      { ...regulatoryItem("window", "macro"), is_commercial_window: true, deadline_date: "2099-01-01" },
    ]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.openCommercialWindows).toHaveLength(1)
    expect(view!.openCommercialWindows[0].resolvedLevel).toBe("macro")
  })
})

describe("getSectorSnapshot — identité et provenance des champs résolus", () => {
  it("nomme le segment, expose son macro parent et dit d'où vient la description", async () => {
    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.segmentId).toBe(SEGMENT_ID)
    expect(view!.sectorId).toBe(SEGMENT_ID)
    expect(view!.name).toBe("5.1 Spatial, défense & systèmes critiques")
    expect(view!.macroId).toBe(MACRO_ID)
    expect(view!.macroName).toBe("Aéronautique, Spatial & Défense")
    expect(view!.descriptionLevel).toBe("macro")
    expect(view!.playbookLevel).toBe("macro")
    expect(view!.hasSegmentKnowledge).toBe(false)
  })

  it("retient le statut de la fiche qui porte réellement le playbook, pas celui du segment", async () => {
    // Les 36 segments issus du seed sont en `development` : lire leur statut
    // brut éteindrait le drapeau « playbook structuré » de tout le parc.
    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)
    expect(view!.status).toBe("active")

    state.resolved = resolvedRow({ playbook_level: "segment", segment_status: "watch" })
    const own = await getSectorSnapshot(SEGMENT_ID, OPTIONS)
    expect(own!.status).toBe("watch")
  })

  it("renvoie null quand le segment est introuvable", async () => {
    state.resolved = null
    expect(await getSectorSnapshot(SEGMENT_ID, OPTIONS)).toBeNull()
  })
})

describe("getSectorSnapshot — maille de la liste de pairs", () => {
  it(`reste au segment dès ${PEER_SEGMENT_MIN} comptes`, async () => {
    state.companiesBySegment = [company("a"), company("b"), company("c")]
    state.companiesByMacro = [company("a"), company("b"), company("c"), company("d"), company("e")]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.peersLevel).toBe("segment")
    expect(view!.exposedAccountsCount).toBe(3)
  })

  it("se replie sur le macro quand le segment compte trop peu d'entreprises", async () => {
    state.companiesBySegment = [company("a"), company("b")]
    state.companiesByMacro = [company("a"), company("b"), company("d"), company("e")]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.peersLevel).toBe("macro")
    expect(view!.exposedAccountsCount).toBe(4)
  })

  it("garde la maille segment si le macro n'apporte aucun compte", async () => {
    state.companiesBySegment = [company("a")]
    state.companiesByMacro = []

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.peersLevel).toBe("segment")
    expect(view!.exposedAccountsCount).toBe(1)
  })
})

describe("getSectorSnapshot — état vide explicite", () => {
  it("renvoie un snapshot non nul et un drapeau explicite pour un compte de macro vide", async () => {
    // Les 19 comptes des 3 macros sans aucune connaissance : l'onglet doit
    // afficher « rien de disponible », pas un écran muet.
    state.resolved = resolvedRow({ description: null, description_level: "macro" })
    state.items = []
    state.companiesBySegment = [company("a")]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view).not.toBeNull()
    expect(view!.hasAnyKnowledge).toBe(false)
    expect(view!.painPoints).toHaveLength(0)
    expect(view!.regulatoryItems).toHaveLength(0)
    expect(view!.events).toHaveLength(0)
  })

  it("considère la connaissance présente dès qu'un item est hérité du macro", async () => {
    state.resolved = resolvedRow({ description: null })
    state.items = [regulatoryItem("mac-1", "macro")]

    const view = await getSectorSnapshot(SEGMENT_ID, OPTIONS)

    expect(view!.hasAnyKnowledge).toBe(true)
  })
})
