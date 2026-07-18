import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  buildClientIntelligenceSectorView,
  classifyActorStatus,
  matchKredoAccountsToActors,
  normalizeCommercialWindows,
  normalizeSectorMarket,
  positionSectorActors,
  sortSectorPainPoints,
  sortSectorRegulatoryItems,
  type ClientIntelligenceSectorSource,
  type SectorRegulatoryView,
} from "./client-intelligence-sector"

const NOW = new Date("2026-07-18T12:00:00.000Z")

function source(overrides: Partial<ClientIntelligenceSectorSource> = {}): ClientIntelligenceSectorSource {
  return {
    sector: {
      id: "sector-1",
      name: "Parfumerie",
      slug: "parfumerie",
      description: "Synthèse KREDO",
      status: "active",
      attractivenessScore: 4.8,
      marketSizeEurBn: 80,
      marketGrowthPct: 5.2,
      keyPlayersPaca: [],
      keyPlayersNational: [],
    },
    currentCompanyId: "company-current",
    currentSectorAnalysis: {
      synthese_sectorielle: "Synthèse FOLIO",
      volume_marche: {
        taille_marche_france: "1,5 à 2 Md€",
        taille_marche_europe: "8 à 12 Md€",
        taux_croissance_annuel: "4 à 6 % par an",
        tendances_macro: ["Traçabilité accrue"],
        facteurs_croissance: ["Demande pour le naturel"],
        freins_identifies: ["Volatilité des matières premières"],
      },
      acteurs_cles: {
        leaders: [{ nom: "Robertet SA", description: "Leader mondial du naturel" }],
        challengers: [{ nom: "Mane", description: "Couverture mondiale" }],
        emergents: [{ nom: "Biotech X", description: "Startup de niche" }],
      },
    },
    companies: [
      { id: "company-current", name: "Robertet", legalName: "Robertet SA", segment: "Arômes", metadata: {} },
      { id: "company-other", name: "Compte sans preuve", legalName: "Compte sans preuve SAS", segment: "Cosmétiques", metadata: {} },
    ],
    painPoints: [],
    regulatoryItems: [],
    events: [],
    now: NOW,
    ...overrides,
  }
}

describe("marché FOLIO", () => {
  it("préserve les textes approximatifs sans les convertir en nombres exacts", () => {
    const market = normalizeSectorMarket(source().currentSectorAnalysis)
    expect(market).toEqual({
      globalVolume: null,
      franceVolume: "1,5 à 2 Md€",
      europeVolume: "8 à 12 Md€",
      growth: "4 à 6 % par an",
      trends: ["Traçabilité accrue"],
      growthDrivers: ["Demande pour le naturel"],
      threats: ["Volatilité des matières premières"],
    })
  })
})

describe("classification et positionnement des acteurs", () => {
  it.each([
    ["Leader", "leader"],
    ["challengers", "challenger"],
    ["Spécialiste de niche", "specialist"],
    ["acteur émergent", "outsider"],
    ["acteur régional", "unclassified"],
  ] as const)("classe %s en %s", (input, expected) => {
    expect(classifyActorStatus(input)).toBe(expected)
  })

  it("produit exactement les mêmes coordonnées à chaque calcul", () => {
    const actor = {
      id: "actor-a",
      name: "Acteur A",
      status: "challenger" as const,
      description: "Couverture mondiale",
      role: null,
      coverage: null,
      segment: null,
      source: "folio" as const,
      isKredoAccount: false,
      isCurrentAccount: false,
      companyIds: [],
    }
    expect(positionSectorActors([actor])).toEqual(positionSectorActors([actor]))
  })

  it("n'utilise aucune source aléatoire", () => {
    const code = readFileSync(join(process.cwd(), "src/lib/intelligence/client-intelligence-sector.ts"), "utf8")
    expect(code).not.toContain("Math.random")
    expect(code).not.toContain("crypto.randomUUID")
  })
})

describe("rapprochement des comptes KREDO", () => {
  const actor = {
    id: "actor-robertet",
    name: "Robertet SA",
    status: "leader" as const,
    description: null,
    role: null,
    coverage: null,
    segment: null,
    source: "folio" as const,
    isKredoAccount: false,
    isCurrentAccount: false,
    companyIds: [],
  }

  it("rapproche un compte via sa raison sociale normalisée exacte", () => {
    const result = matchKredoAccountsToActors([actor], source().companies.slice(0, 1), "company-current")
    expect(result[0]).toMatchObject({ isKredoAccount: true, isCurrentAccount: true, companyIds: ["company-current"] })
  })

  it("place honnêtement un compte sans correspondance dans les non classés", () => {
    const result = matchKredoAccountsToActors([actor], source().companies.slice(1), "company-current")
    expect(result).toHaveLength(2)
    expect(result[1]).toMatchObject({ name: "Compte sans preuve", status: "unclassified", isKredoAccount: true })
  })

  it("inclut tous les comptes du secteur courant", () => {
    const view = buildClientIntelligenceSectorView(source())
    const companyIds = view.actors.flatMap((item) => item.companyIds)
    expect(companyIds).toEqual(expect.arrayContaining(["company-current", "company-other"]))
    expect(view.displayedKredoAccountsCount).toBe(2)
    expect(view.unclassifiedKredoAccountsCount).toBe(1)
  })
})

describe("tris éditoriaux", () => {
  it("trie les pain points par fréquence, criticité puis alphabet", () => {
    const base = { description: null, affectedSegments: [], commercialAngle: null, kredoPractice: null }
    expect(sortSectorPainPoints([
      { ...base, id: "b", title: "B", frequency: 3, criticality: 2 },
      { ...base, id: "c", title: "C", frequency: 5, criticality: null },
      { ...base, id: "a", title: "A", frequency: 3, criticality: 4 },
    ]).map((item) => item.id)).toEqual(["c", "a", "b"])
  })

  it("ordonne futurs croissants, sans date, puis expirés décroissants", () => {
    const item = (id: string, deadlineDate: string | null, state: SectorRegulatoryView["state"]): SectorRegulatoryView => ({
      id, title: id, authority: null, description: null, deadlineDate, urgency: "medium", state,
      kredoPractice: null, commercialAngle: null, isCommercialWindow: false, sourceUrl: null,
    })
    expect(sortSectorRegulatoryItems([
      item("past-old", "2025-01-01", "expired"),
      item("future-late", "2027-01-01", "future"),
      item("undated", null, "undated"),
      item("past-recent", "2026-06-01", "expired"),
      item("future-soon", "2026-08-01", "imminent"),
    ]).map((entry) => entry.id)).toEqual(["future-soon", "future-late", "undated", "past-recent", "past-old"])
  })
})

describe("événements et fenêtres commerciales", () => {
  it("ne transforme pas automatiquement un événement commercial en fenêtre", () => {
    const view = buildClientIntelligenceSectorView(source({
      events: [{
        id: "event-1", title: "Salon", eventType: "market", description: null, eventDate: "2026-09-01",
        sourceUrl: null, commercialOpportunity: "Prendre rendez-vous",
      }],
    }))
    expect(view.events).toHaveLength(1)
    expect(view.openCommercialWindows).toHaveLength(0)
  })

  it("exclut les fenêtres réglementaires expirées", () => {
    const items: SectorRegulatoryView[] = [
      {
        id: "expired", title: "Expirée", authority: null, description: null, deadlineDate: "2026-01-01",
        urgency: "high", state: "expired", kredoPractice: null, commercialAngle: null,
        isCommercialWindow: true, sourceUrl: null,
      },
      {
        id: "open", title: "Ouverte", authority: null, description: null, deadlineDate: "2026-09-01",
        urgency: "critical", state: "imminent", kredoPractice: "data_ai", commercialAngle: "Audit flash",
        isCommercialWindow: true, sourceUrl: null,
      },
    ]
    expect(normalizeCommercialWindows(items, NOW).map((item) => item.title)).toEqual(["Ouverte"])
  })
})

describe("renderer sectoriel", () => {
  it("n'appelle aucun renderer JSON générique", () => {
    const files = [
      "ClientIntelligenceSectorTab.tsx",
      "SectorMarketSection.tsx",
      "SectorActorMap.tsx",
      "SectorPainPointsSection.tsx",
      "SectorRegulatoryTimeline.tsx",
      "SectorCommercialEventsSection.tsx",
      "SectorCommercialWindowsSection.tsx",
    ]
    const code = files.map((file) => readFileSync(join(process.cwd(), "src/components/accounts-contacts/intelligence", file), "utf8")).join("\n")
    expect(code).not.toContain("renderJsonValue")
    expect(code).not.toContain("JSON.stringify")
  })
})
