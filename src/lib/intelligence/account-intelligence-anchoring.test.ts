import { describe, expect, it } from "vitest"
import {
  isInternalAggregateSourceId,
  resolveAccountKnowledgeAnchoring,
  type AccountKnowledgeContentV4,
} from "./account-intelligence-contracts"
import {
  ACCOUNT_INTELLIGENCE_MODULES,
  modulesForLevel,
  isAccountIntelligenceModule,
  requiresExternalResearch,
  NON_DISABLEABLE_MODULES,
} from "./account-intelligence-modules"
import {
  countUnreachable,
  modulesLeftWithoutMaterial,
  selectUsableEntries,
  type AccountSourcePlanContent,
  type AccountSourcePlanEntry,
} from "./account-source-plan-contracts"

// Reproduction fidèle du run de production `a7bdbeb7-b1c4-4288-babf-9f918e3a31a8`
// (Tournaire, 07/09/2026) : 6 sources dont 5 seaux internes, external_pages_fetched = 0,
// 21 statements. C'est l'artefact qui a motivé tout le Lot 0 — il sert ici de fixture.
function tournaireLegacyArtifact(): AccountKnowledgeContentV4 {
  return {
    schema_version: 4,
    entity_resolution: { siren: "415550110", score: 0.95 } as never,
    sources: [
      { id: "internal:company:cde3d719", label: "Fiche compte KREDO", source_type: "internal_crm", url: null, consulted_at: "2026-09-07T08:53:17.890Z" },
      { id: "internal:facts:cde3d719", label: "Faits compte KREDO", source_type: "internal_crm", url: null, consulted_at: "2026-09-07T08:53:17.890Z" },
      { id: "internal:signals:cde3d719", label: "Signaux compte KREDO", source_type: "internal_crm", url: null, consulted_at: "2026-09-07T08:53:17.890Z" },
      { id: "internal:sector:cde3d719", label: "Connaissance sectorielle", source_type: "internal_knowledge", url: null, consulted_at: "2026-09-07T08:53:17.890Z" },
      { id: "internal:folio:cde3d719", label: "Études FOLIO historiques", source_type: "folio_legacy", url: null, consulted_at: "2026-09-07T08:53:17.890Z" },
      { id: "f1687863-7f2b-4986-89e6-f94d9e90f741", label: "Annuaire des entreprises", source_type: "regulatory_filing", url: "https://annuaire-entreprises.data.gouv.fr/entreprise/415550110", consulted_at: "2026-09-07T08:58:40.354Z" },
    ],
    sections: [
      {
        key: "identity",
        title: "Identité",
        narrative: ["Tournaire SA est enregistrée sous le SIREN 415550110…"],
        source_refs: ["f1687863-7f2b-4986-89e6-f94d9e90f741"],
        statements: [
          // Les 4 `established` citent le registre — seul ancrage externe réel.
          { text: "SIREN 415550110, NAF 25.92Z", qualification: "established", source_refs: ["f1687863-7f2b-4986-89e6-f94d9e90f741"], confidence: 0.95 },
          // Les `declared` citent un SEAU : c'est le blanchiment que INV-2 interdit.
          { text: "Motion Equity Partners est entré au capital", qualification: "declared", source_refs: ["internal:folio:cde3d719"], confidence: 0.7 },
          { text: "Objectif de 80 M€ visé pour 2025", qualification: "declared", source_refs: ["internal:folio:cde3d719"], confidence: 0.6 },
          { text: "Croissance soutenue par la premiumisation", qualification: "hypothesis", source_refs: [], confidence: 0.4 },
        ],
      },
    ],
    knowledge_gaps: [],
    coverage: {
      sections_written: 8,
      statements_by_qualification: { established: 4, declared: 10, inferred: 4, hypothesis: 3 },
      external_pages_fetched: 0,
    },
    generated_at: "2026-09-07T09:00:00.000Z",
  }
}

describe("resolveAccountKnowledgeAnchoring", () => {
  it("classe `degraded` un artefact legacy n'ayant lu aucune page", () => {
    const anchoring = resolveAccountKnowledgeAnchoring(tournaireLegacyArtifact())
    expect(anchoring.research_status).toBe("degraded")
  })

  it("ne compte comme ancré que ce qui cite une source externe, pas un seau interne", () => {
    const anchoring = resolveAccountKnowledgeAnchoring(tournaireLegacyArtifact())
    // 4 statements, un seul cite le registre. Les deux `declared` citent `internal:folio:`
    // et ne doivent PAS être comptés comme ancrés, malgré leur source_refs non vide.
    expect(anchoring.statements_total).toBe(4)
    expect(anchoring.statements_externally_anchored).toBe(1)
    expect(anchoring.external_documents_used).toBe(1)
    expect(anchoring.anchoring_ratio).toBeCloseTo(0.25)
  })

  it("préfère le champ `anchoring` de l'artefact quand il existe", () => {
    const artifact = tournaireLegacyArtifact()
    artifact.anchoring = {
      external_documents_used: 7,
      statements_total: 21,
      statements_externally_anchored: 14,
      anchoring_ratio: 0.67,
      research_status: "nominal",
    }
    expect(resolveAccountKnowledgeAnchoring(artifact).research_status).toBe("nominal")
    expect(resolveAccountKnowledgeAnchoring(artifact).external_documents_used).toBe(7)
  })

  it("classe `nominal` dès qu'une page externe a été lue", () => {
    const artifact = tournaireLegacyArtifact()
    artifact.coverage.external_pages_fetched = 3
    expect(resolveAccountKnowledgeAnchoring(artifact).research_status).toBe("nominal")
  })

  it("ne divise jamais par zéro sur un artefact sans statement", () => {
    const artifact = tournaireLegacyArtifact()
    artifact.sections = []
    const anchoring = resolveAccountKnowledgeAnchoring(artifact)
    expect(anchoring.statements_total).toBe(0)
    expect(anchoring.anchoring_ratio).toBe(0)
  })

  it("ne traite pas une source externe SANS url comme ancrable", () => {
    const artifact = tournaireLegacyArtifact()
    // Une source non-interne mais sans url (URL sélectionnée, jamais lue) ne prouve rien.
    artifact.sources = artifact.sources.map((source) =>
      source.id.startsWith("internal:") ? source : { ...source, url: null }
    )
    expect(resolveAccountKnowledgeAnchoring(artifact).statements_externally_anchored).toBe(0)
  })
})

describe("isInternalAggregateSourceId", () => {
  it("reconnaît les seaux internes et laisse passer les uuid de documents", () => {
    expect(isInternalAggregateSourceId("internal:folio:abc")).toBe(true)
    expect(isInternalAggregateSourceId("internal:facts:abc")).toBe(true)
    expect(isInternalAggregateSourceId("f1687863-7f2b-4986-89e6-f94d9e90f741")).toBe(false)
  })
})

describe("modulesForLevel", () => {
  it("est cumulatif : L3 contient les modules de L1 et L2", () => {
    const l1 = modulesForLevel(1)
    const l3 = modulesForLevel(3)
    for (const moduleId of l1) expect(l3).toContain(moduleId)
    expect(l3).toContain("business_and_offering") // L2
    expect(l3).toContain("competition") // L3
  })

  it("produit quatre périmètres réellement distincts et croissants", () => {
    const sizes = ([1, 2, 3, 4] as const).map((level) => modulesForLevel(level).length)
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
    expect(sizes[2]).toBeLessThan(sizes[3])
  })

  it("garde L1 volontairement léger, sans moduleId d'écosystème", () => {
    const l1 = modulesForLevel(1)
    expect(l1).not.toContain("competition")
    expect(l1).not.toContain("sector_dynamics")
    expect(l1).not.toContain("issues")
  })

  it("inclut toujours les modules non désactivables (A1)", () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (const moduleId of NON_DISABLEABLE_MODULES) {
        expect(modulesForLevel(level)).toContain(moduleId)
      }
    }
  })

  it("n'ajoute les modules optionnels que sur demande", () => {
    expect(modulesForLevel(1)).not.toContain("ownership")
    expect(modulesForLevel(1, { includeOptional: true })).toContain("ownership")
  })

  it("rend un ordre canonique stable, sans doublon", () => {
    const l4 = modulesForLevel(4, { includeOptional: true })
    expect(new Set(l4).size).toBe(l4.length)
    // L'ordre suit ACCOUNT_INTELLIGENCE_MODULES, pas l'ordre de déclaration par niveau —
    // sans quoi `ownership` (optionnel L1, couvert L2) apparaîtrait à une place instable.
    const canonicalIndexes = l4.map((moduleId) => ACCOUNT_INTELLIGENCE_MODULES.indexOf(moduleId))
    expect(canonicalIndexes).toEqual([...canonicalIndexes].sort((a, b) => a - b))
    expect(l4).toEqual(ACCOUNT_INTELLIGENCE_MODULES.filter((m) => l4.includes(m)))
  })

  it("valide les identifiants de module", () => {
    expect(isAccountIntelligenceModule("competition")).toBe(true)
    // Le vocabulaire V3 par libellé d'interface n'est plus recevable.
    expect(isAccountIntelligenceModule("Fiche d’identité")).toBe(false)
  })

  it("exempte le module purement relationnel de toute recherche externe", () => {
    expect(requiresExternalResearch("kredo_relation")).toBe(false)
    expect(requiresExternalResearch("competition")).toBe(true)
  })
})

function entry(over: Partial<AccountSourcePlanEntry>): AccountSourcePlanEntry {
  return {
    id: "doc-1",
    url: "https://example.test/a",
    canonical_url: null,
    domain: "example.test",
    kind: "press",
    title: null,
    published_at: null,
    reason: "Article de référence",
    serves_modules: ["news"],
    status: "recommended",
    origin: "discovered",
    fetched_at: "2026-09-10T10:00:00.000Z",
    content_hash: "abc123",
    extracted_chars: 8200,
    failure_reason: null,
    ...over,
  }
}

function plan(entries: AccountSourcePlanEntry[]): AccountSourcePlanContent {
  return {
    schema_version: 1,
    company_id: "cde3d719",
    entity_resolution: { siren: "415550110", score: 0.95 } as never,
    scope: { target_level: 2, modules: ["news", "competition"] },
    entries,
    corpora: [],
    coverage: { modules_with_material: [], modules_without_material: [] },
    generated_at: "2026-09-10T10:00:00.000Z",
  }
}

describe("plan de sources — exploitabilité", () => {
  it("écarte les entrées injoignables", () => {
    const p = plan([
      entry({ id: "ok" }),
      entry({ id: "ko", status: "unreachable", content_hash: null, extracted_chars: null, fetched_at: null, failure_reason: "403" }),
    ])
    expect(selectUsableEntries(p).map((e) => e.id)).toEqual(["ok"])
    expect(countUnreachable(p)).toBe(1)
  })

  it("écarte les entrées exclues par l'utilisateur, même récupérées", () => {
    const p = plan([entry({ id: "ok" }), entry({ id: "no", status: "excluded" })])
    expect(selectUsableEntries(p).map((e) => e.id)).toEqual(["ok"])
  })

  it("écarte une entrée sans hash même si son statut paraît sain", () => {
    // Défense contre un producteur bavard : un statut `approved` ne vaut pas lecture.
    const p = plan([entry({ id: "menteur", status: "approved", content_hash: null })])
    expect(selectUsableEntries(p)).toHaveLength(0)
  })

  it("signale les modules demandés que rien n'alimente (A2)", () => {
    const p = plan([entry({ serves_modules: ["news"] })])
    expect(modulesLeftWithoutMaterial(p, ["news", "competition"])).toEqual(["competition"])
  })

  it("considère tous les modules sans matière quand tout est injoignable", () => {
    const p = plan([
      entry({ status: "unreachable", content_hash: null, extracted_chars: null, fetched_at: null, failure_reason: "timeout", serves_modules: ["news"] }),
    ])
    expect(modulesLeftWithoutMaterial(p, ["news", "competition"])).toEqual(["news", "competition"])
  })
})
