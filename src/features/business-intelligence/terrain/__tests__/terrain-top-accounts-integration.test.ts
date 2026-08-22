import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { TerrainHomeDashboardMobile } from "../TerrainHomeDashboardMobile"
import { TerrainTopAccountsMobile } from "../TerrainTopAccountsMobile"
import { buildTerrainTopAccounts } from "../terrain-top-accounts-model"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import type { BusinessIntelligenceSegmentWorkspace } from "../../data/business-intelligence-workspace-types"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

function makeActor(overrides: Partial<CompetitiveMapActor>): CompetitiveMapActor {
  return {
    id: overrides.id ?? "actor-1",
    companyId: overrides.companyId ?? "company-1",
    name: overrides.name ?? "Test Company",
    category: overrides.category ?? "leader",
    categoryLabel: overrides.categoryLabel ?? "Leader",
    confidence: overrides.confidence ?? "haute",
    businessFootprintScore: overrides.businessFootprintScore ?? 80,
    digitalMaturityScore: overrides.digitalMaturityScore ?? 70,
    appetenceScore: overrides.appetenceScore ?? 25,
    accessibilityScore: overrides.accessibilityScore ?? 80,
    appetenceProvisoire: overrides.appetenceProvisoire ?? false,
    isPositioned: overrides.isPositioned ?? true,
    isBenchmarkAccount: overrides.isBenchmarkAccount ?? false,
    revenueEstimateMeur: overrides.revenueEstimateMeur ?? 100,
    revenueExercice: overrides.revenueExercice ?? 2025,
    revenuePerimetre: overrides.revenuePerimetre ?? "France",
    headcountFrance: overrides.headcountFrance ?? "250",
    positioning: overrides.positioning ?? "Positioning",
    forces: overrides.forces ?? "Forces",
    vulnerability: overrides.vulnerability ?? "Vulnerability",
    angleEntree: overrides.angleEntree ?? "Angle d'entrée long d'au moins deux lignes pour tester le line-clamp visuel.",
    lifecycleStatus: overrides.lifecycleStatus ?? null,
    relationType: overrides.relationType ?? null,
    details: overrides.details ?? {
      propositionValeur: null,
      differenciateurs: [],
      dependances: [],
      chaineValeur: [],
      chantiersTechnologiques: [],
      triggers: [],
      lignesRouges: [],
      trous: [],
      metierChaineValeur: null,
      maillon: null,
      contratsMajeurs: [],
      grilles: [],
      coucheEsn: [],
      traductionCommerciale: [],
      iaAnnonceVsDeploye: null,
    },
  }
}

const PILOTE_ACTORS: CompetitiveMapActor[] = [
  makeActor({
    id: "robertet",
    companyId: "c-robertet",
    name: "Robertet",
    category: "leader",
    categoryLabel: "Leader",
    appetenceScore: 35,
    isBenchmarkAccount: true,
    relationType: "client",
    lifecycleStatus: "client",
    angleEntree: "Thèse sur la naturalité et les ingrédients renouvelables.",
  }),
  makeActor({
    id: "mane",
    companyId: "c-mane",
    name: "V. Mane Fils (MANE)",
    category: "leader",
    categoryLabel: "Leader",
    appetenceScore: 27,
    isBenchmarkAccount: false,
    relationType: "prospect",
    lifecycleStatus: "prospect",
    angleEntree: "Développement des capacités d'extraction et formulation durable.",
  }),
  makeActor({
    id: "technicoflor",
    companyId: "c-technicoflor",
    name: "TechnicoFlor",
    category: "mid_market",
    categoryLabel: "Mid-market",
    appetenceScore: 27,
    isBenchmarkAccount: false,
    relationType: "prospect",
    lifecycleStatus: "prospect",
    angleEntree: "Positionnement éco-conception et chimie verte.",
  }),
  makeActor({
    id: "payan",
    companyId: "c-payan",
    name: "Payan Bertrand",
    category: "outsider_emergent",
    categoryLabel: "Outsider émergent",
    appetenceScore: 27,
    isBenchmarkAccount: false,
    relationType: "prospect",
    lifecycleStatus: "prospect",
    angleEntree: "Spécialiste extraits naturels Grasse.",
  }),
  makeActor({
    id: "aromatech",
    companyId: "c-aromatech",
    name: "Aromatech Group",
    category: "outsider_niche",
    categoryLabel: "Outsider niche",
    appetenceScore: 21,
    isBenchmarkAccount: false,
    relationType: "prospect",
    lifecycleStatus: "prospect",
    angleEntree: "Arômes alimentaires et parfumerie de niche.",
  }),
]

function createMockWorkspace(actors: CompetitiveMapActor[] = []): LoadedWorkspace {
  const ws = {
    state: "ready",
    segment: {
      id: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      name: "Compositions & ingrédients B2B",
      slug: "seg-parfumerie-compositions-b2b",
      status: "active",
      macro: {
        id: "macro-parfumerie",
        name: "Parfumerie, Arômes & Cosmétique",
        slug: "parfumerie-aromes",
      },
    },
    corpusMetadata: null,
    knowledge: {
      segmentId: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      segmentName: "Compositions & ingrédients B2B",
      segmentSlug: "seg-parfumerie-compositions-b2b",
      segmentStatus: "active",
      macroId: "macro-parfumerie",
      macroName: "Parfumerie, Arômes & Cosmétique",
      macroSlug: "parfumerie-aromes",
      macroStatus: "active",
      description: "Synthèse",
      descriptionLevel: "segment",
      attractivenessScore: 4.5,
      attractivenessScoreLevel: "segment",
      marketSizeEurBn: 2.4,
      marketSizeEurBnLevel: "segment",
      marketGrowthPct: null,
      marketGrowthPctLevel: null,
      playbook: {},
      playbookLevel: "segment",
      practicesFit: null,
      practicesFitLevel: "segment",
      keyPlayersPaca: [],
      keyPlayersNational: [],
      hasSegmentKnowledge: true,
      digitalMaturity: "medium",
      avgTjmMin: 650,
      avgTjmMax: 850,
      caveats: null,
      sourceRunId: null,
      studySnapshotDate: "2026-08-22",
      effectiveStatus: "active",
      items: { painPoints: [], events: [], news: [], regulatory: [] },
      painPoints: [],
      events: [],
      news: [],
      regulatory: [],
    },
    portfolio: {
      totalAccounts: 0,
      priorityAccounts: 0,
      accounts: [],
      scores: { byAccountId: {}, byCompanyId: {} },
    },
    competitiveMap: actors.length > 0 ? {
      segmentId: "db34f8a0-9d9e-4585-acd6-2fbbdd1baad6",
      segmentLabel: "Compositions & ingrédients B2B",
      snapshotDate: "2026-08-22",
      actors,
    } : null,
    valueChain: null,
    news: { items: [], updatedAt: null },
    coverage: {
      study: { available: true, level: "segment", updatedAt: null },
      playbook: { available: false, level: null, updatedAt: null },
      competitiveMap: { available: actors.length > 0, level: actors.length > 0 ? "segment" : null, updatedAt: null },
      valueChain: { available: false, level: null, updatedAt: null },
      regulatory: { available: false, level: null, updatedAt: null },
      news: { available: false, level: null, updatedAt: null },
    },
    sourceResolution: {},
  }
  return ws as never
}

describe("TerrainHomeDashboardMobile UI Integration with Top 3", () => {
  it("renders Top 3 button on Home dashboard when actors are available", () => {
    const ws = createMockWorkspace(PILOTE_ACTORS)
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).toContain("Top 3")
    expect(html).toContain("03")
  })

  it("hides Top 3 button on Home dashboard when no competitive map actors exist", () => {
    const ws = createMockWorkspace([])
    const html = renderToString(createElement(TerrainHomeDashboardMobile, { workspace: ws }))

    expect(html).toContain('data-terrain-surface="home"')
    expect(html).not.toContain("Top 3")
  })

  it("renders Top 3 surface when initialSurface='top-accounts'", () => {
    const ws = createMockWorkspace(PILOTE_ACTORS)
    const html = renderToString(
      createElement(TerrainHomeDashboardMobile, { workspace: ws, initialSurface: "top-accounts" }),
    )

    expect(html).toContain('data-terrain-surface="top-accounts"')
    expect(html).not.toContain('data-terrain-surface="home"')
    expect(html).toContain("Comptes à regarder")
    expect(html).toContain("Terrain")
  })
})

describe("TerrainTopAccountsMobile Pilote Live & Fallback Rendering", () => {
  it("renders Pilote live actionable mode correctly (#1 MANE, #2 TechnicoFlor, #3 Payan Bertrand, Robertet as Benchmark hors classement)", () => {
    const model = buildTerrainTopAccounts(PILOTE_ACTORS)
    const rawHtml = renderToString(createElement(TerrainTopAccountsMobile, { model, onBack: () => {} }))
    const html = rawHtml.replaceAll("<!-- -->", "")

    expect(html).toContain('data-terrain-surface="top-accounts"')
    expect(html).toContain("Comptes prospectables prioritaires par appétence")

    // Ranked list matches live expected Top 3
    expect(html).toContain("#1")
    expect(html).toContain("V. Mane Fils (MANE)")
    expect(html).toContain("#2")
    expect(html).toContain("TechnicoFlor")
    expect(html).toContain("#3")
    expect(html).toContain("Payan Bertrand")
    expect(html).not.toContain("Aromatech Group") // 4th place excluded from Top 3

    // Robertet is excluded from ranking and appears in BENCHMARK — HORS CLASSEMENT
    expect(html).toContain("BENCHMARK — HORS CLASSEMENT")
    expect(html).toContain("Robertet")
    expect(html).toContain("35 / 35")
    expect(html).toContain("Client actuel")

    // Desktop note is present
    expect(html).toContain("Analyse complète disponible sur desktop")
  })

  it("renders Fallback mode correctly when no CRM projection exists (Robertet #1, no benchmark block)", () => {
    const actorsWithoutCrm = PILOTE_ACTORS.map((actor) => ({
      ...actor,
      relationType: null,
      lifecycleStatus: null,
    }))

    const model = buildTerrainTopAccounts(actorsWithoutCrm)
    const rawHtml = renderToString(createElement(TerrainTopAccountsMobile, { model, onBack: () => {} }))
    const html = rawHtml.replaceAll("<!-- -->", "")

    expect(html).toContain('data-terrain-surface="top-accounts"')
    expect(html).toContain("Classement par appétence")

    // In strict fallback mode, Robertet stays #1 because score is 35
    expect(html).toContain("#1")
    expect(html).toContain("Robertet")
    expect(html).toContain("35 / 35")
    expect(html).toContain("#2")
    expect(html).toContain("V. Mane Fils (MANE)")
    expect(html).toContain("#3")
    expect(html).toContain("TechnicoFlor")

    // Benchmark hors classement block is NOT present in fallback mode
    expect(html).not.toContain("BENCHMARK — HORS CLASSEMENT")
  })
})
