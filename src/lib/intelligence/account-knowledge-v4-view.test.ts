import { describe, expect, it } from "vitest"

import type { AccountKnowledgeContentV4 } from "./account-intelligence-contracts"
import {
  buildAccountKnowledgeV4Banner,
  buildAccountKnowledgeV4View,
  collectAccountKnowledgeV4LookupSourceIds,
  countStatementsByMode,
  formatAccountKnowledgeV4Coverage,
  formatSiren,
  selectStatementsForMode,
} from "./account-knowledge-v4-view"

// Extrait fidèle de l'artefact de production `ea552448…` (SOS Oxygène, run
// `ee94337d…`, canal LLM externe, 11/09/2026) : ids de sources libres, pas de
// `content_text`, une section vide portée par sa seule lacune.
function sosOxygeneArtifact(): AccountKnowledgeContentV4 {
  return {
    schema_version: 4,
    entity_resolution: {
      decision: "resolved",
      method: "external_research",
      siren: "384122099",
      legal_name: "SOS OXYGENE",
      naf_code: "77.29Z",
      hq_location: "Nice (06200)",
      reasons: ["Fiche Pappers consultée le 11/09/2026."],
    },
    sources: [
      { id: "s1", url: "https://www.pappers.fr/entreprise/sos-oxygene-384122099", label: "Pappers — SOS OXYGENE", source_type: "regulatory_filing", consulted_at: "2026-09-11" },
      { id: "s2", url: "https://sosoxygene.com/notre-entreprise/", label: "Notre entreprise — SOS Oxygène", source_type: "company_official", consulted_at: "2026-09-11" },
      { id: "s19", url: "https://www.societe.com/societe/sos-oxygene-participations-443571443.html", label: "Societe.com — SOS OXYGENE PARTICIPATIONS", source_type: "regulatory_filing", consulted_at: "2026-09-11" },
    ],
    sections: [
      // Ordre physique volontairement différent de l'ordre canonique.
      {
        key: "identity",
        title: "Identité",
        narrative: ["Le code APE principal de l'entité est 77.29Z."],
        statements: [
          { text: "Présidence assurée par la holding.", qualification: "established", source_refs: ["s19"], confidence: 0.85 },
          { text: "Bénéficiaires effectifs non établis.", qualification: "hypothesis", source_refs: [], confidence: 0.3 },
        ],
        source_refs: ["s1", "s19"],
      },
      {
        key: "synthesis",
        title: "Synthèse",
        narrative: ["SOS Oxygène est un PSAD.", "  ", "Situation financière stable."],
        statements: [
          { text: "SIREN 384 122 099, SAS depuis 2023.", qualification: "established", source_refs: ["s1"], confidence: 0.9 },
          { text: "Catalogue élargi à 9 domaines.", qualification: "declared", source_refs: ["s2", "s1"], confidence: 0.8 },
          { text: "Comptes non extrapolables au groupe.", qualification: "inferred", source_refs: ["s1", "s19"], confidence: 0.7 },
        ],
        source_refs: ["s1"],
      },
      { key: "implications_for_kredo", title: "Implications pour KREDO", narrative: [], statements: [], source_refs: [] },
      { key: "customers_and_market", title: "Clients et marché", narrative: [], statements: [], source_refs: [] },
    ],
    knowledge_gaps: [
      { section_key: "identity", reason: "Répartition du capital non consultable." },
      { section_key: "implications_for_kredo", reason: "Recherche externe pure : elle ne connaît pas l'historique CRM KREDO." },
      { section_key: "history_ambitions_and_news", reason: "  " },
    ],
    coverage: {
      sections_written: 3,
      statements_by_qualification: { established: 2, declared: 1, inferred: 1, hypothesis: 1 },
      external_pages_fetched: 3,
    },
    anchoring: {
      external_documents_used: 3,
      statements_total: 5,
      statements_externally_anchored: 4,
      anchoring_ratio: 0.8,
      research_status: "nominal",
    },
    generated_at: "2026-09-11T00:00:00.000Z",
  }
}

// Reproduction du run `e8dd6f22…` (Tournaire, 10/09/2026) : INTEL-030, seaux
// internes cités par des statements `declared`, un seul document externe.
function tournaireInternalOnlyArtifact(): AccountKnowledgeContentV4 {
  return {
    schema_version: 4,
    entity_resolution: {
      decision: "resolved",
      method: "registry_match",
      siren: "415550110",
      legal_name: "TOURNAIRE SA",
      naf_code: "25.92Z",
      hq_commune: "GRASSE",
      hq_postal_code: "06130",
      reasons: ["Appariement net."],
    },
    sources: [
      { id: "internal:folio:cde3d719", label: "Études FOLIO historiques", source_type: "folio_legacy", url: null, consulted_at: "2026-09-10T23:20:50Z" },
      { id: "internal:facts:cde3d719", label: "Faits compte KREDO", source_type: "internal_crm", url: null, consulted_at: "2026-09-10T23:20:50Z" },
      { id: "f1687863-7f2b-4986-89e6-f94d9e90f741", label: "Annuaire des entreprises — TOURNAIRE SA", source_type: "regulatory_filing", url: "https://annuaire-entreprises.data.gouv.fr/entreprise/415550110", consulted_at: "2026-09-10T23:20:51Z" },
    ],
    sections: [
      {
        key: "synthesis",
        title: "Synthèse",
        narrative: ["Tournaire est une ETI industrielle française fondée en 1833."],
        statements: [
          { text: "SIREN 415550110.", qualification: "established", source_refs: ["f1687863-7f2b-4986-89e6-f94d9e90f741"], confidence: 0.95 },
          { text: "Objectif de 80 M€.", qualification: "declared", source_refs: ["internal:folio:cde3d719"], confidence: 0.6 },
          { text: "Leader de niche.", qualification: "established", source_refs: ["internal:facts:cde3d719", "internal:signals:ghost"], confidence: 0.6 },
        ],
        source_refs: ["internal:folio:cde3d719"],
      },
    ],
    knowledge_gaps: [],
    coverage: {
      sections_written: 1,
      statements_by_qualification: { established: 2, declared: 1, inferred: 0, hypothesis: 0 },
      external_pages_fetched: 0,
    },
    anchoring: {
      external_documents_used: 1,
      statements_total: 3,
      statements_externally_anchored: 1,
      anchoring_ratio: 0.3333,
      research_status: "internal_only",
    },
    generated_at: "2026-09-10T23:22:30.074Z",
  }
}

describe("buildAccountKnowledgeV4View — canal externe (SOS Oxygène)", () => {
  const view = buildAccountKnowledgeV4View(sosOxygeneArtifact())

  it("ordonne les sections selon le contrat, jamais selon l'ordre physique du JSON", () => {
    expect(view.sections.map((section) => section.key)).toEqual(["synthesis", "identity", "implications_for_kredo"])
    expect(view.sections.map((section) => section.number)).toEqual([1, 2, 3])
  })

  it("retire une section vide, garde une section portée par sa seule lacune", () => {
    expect(view.sections.find((section) => section.key === "customers_and_market")).toBeUndefined()
    const implications = view.sections.find((section) => section.key === "implications_for_kredo")
    expect(implications?.narrative).toEqual([])
    expect(implications?.statements).toEqual([])
    expect(implications?.gaps).toEqual(["Recherche externe pure : elle ne connaît pas l'historique CRM KREDO."])
  })

  it("ignore une lacune vide plutôt que d'ouvrir une section fantôme", () => {
    expect(view.sections.find((section) => section.key === "history_ambitions_and_news")).toBeUndefined()
  })

  it("nettoie les paragraphes vides du récit", () => {
    expect(view.sections[0].narrative).toEqual(["SOS Oxygène est un PSAD.", "Situation financière stable."])
  })

  it("numérote les sources globalement, dans l'ordre de sources[] — un numéro = une source partout", () => {
    expect(view.bibliography.map((source) => [source.id, source.number])).toEqual([
      ["s1", 1],
      ["s2", 2],
      ["s19", 3],
    ])
    const declared = view.sections[0].statements[1]
    expect(declared.sources.map((source) => source.number)).toEqual([1, 2])
    expect(view.sections[1].sources.map((source) => source.id)).toEqual(["s1", "s19"])
  })

  it("rend les sources externes self-contained : domaine, date de consultation, aucune mise en garde", () => {
    const pappers = view.bibliography[0]
    expect(pappers.kind).toBe("external")
    expect(pappers.domain).toBe("pappers.fr")
    expect(pappers.consultedAt).toBe("2026-09-11")
    expect(pappers.sourceTypeLabel).toBe("Registre ou texte officiel")
    expect(pappers.caveat).toBeNull()
  })

  it("ancre chaque statement cité par une source externe, sans signaler d'infraction", () => {
    const statements = view.sections.flatMap((section) => section.statements)
    expect(statements.filter((statement) => statement.externallyAnchored)).toHaveLength(4)
    expect(statements.some((statement) => statement.unanchoredClaim)).toBe(false)
  })

  it("compte les qualifications réellement présentes", () => {
    expect(view.statementCounts).toEqual({ established: 2, declared: 1, inferred: 1, hypothesis: 1 })
  })

  it("signale la provenance externe et une identité lisible", () => {
    expect(view.producer.kind).toBe("external_research")
    expect(view.entity).toEqual({
      legalName: "SOS OXYGENE",
      siren: "384122099",
      nafCode: "77.29Z",
      headquarters: "Nice (06200)",
    })
  })

  it("ouvre sur un bandeau ancré au statut nominal", () => {
    expect(view.banner.status).toBe("nominal")
    expect(view.banner.tone).toBe("anchored")
    expect(view.banner.metrics).toBe("3 documents externes cités · 4/5 affirmations ancrées (80 %)")
  })
})

describe("buildAccountKnowledgeV4View — INTEL-030 internal_only (Tournaire)", () => {
  const view = buildAccountKnowledgeV4View(tournaireInternalOnlyArtifact())
  const [siren, objective, leader] = view.sections[0].statements

  it("affiche la phrase imposée par le contrat épistémique (04 §8)", () => {
    expect(view.banner.status).toBe("internal_only")
    expect(view.banner.tone).toBe("alert")
    expect(view.banner.body).toBe(
      "Analyse produite sans consultation de source externe — fondée sur les données KREDO et le registre légal.",
    )
  })

  it("marque un agrégat interne comme non-preuve (INV-2), sans le cacher", () => {
    const folio = objective.sources[0]
    expect(folio.kind).toBe("internal_aggregate")
    expect(folio.caveat).toBe("Étude historique — indice de recherche, pas une preuve.")
    const facts = leader.sources[0]
    expect(facts.kind).toBe("internal_aggregate")
    expect(facts.caveat).toContain("n'est pas une preuve")
  })

  it("signale un declared ou un established sans source externe — l'artefact enfreint le contrat", () => {
    expect(siren.unanchoredClaim).toBe(false)
    expect(objective.unanchoredClaim).toBe(true)
    expect(leader.unanchoredClaim).toBe(true)
  })

  it("rend une référence absente de sources[] sans planter, numérotée après la bibliographie", () => {
    const ghost = leader.sources.find((source) => source.id === "internal:signals:ghost")
    expect(ghost?.number).toBe(4)
    expect(ghost?.kind).toBe("internal_aggregate")
    expect(view.bibliography).toHaveLength(4)
  })

  it("reconstitue le siège depuis commune + code postal pour le résolveur interne", () => {
    expect(view.producer.kind).toBe("kredo_engine")
    expect(view.entity.headquarters).toBe("GRASSE (06130)")
  })

  it("joint l'extrait et la date de publication lus en base, sans toucher aux sources libres", () => {
    const enriched = buildAccountKnowledgeV4View(tournaireInternalOnlyArtifact(), [
      { id: "f1687863-7f2b-4986-89e6-f94d9e90f741", excerpt: "  SIREN 415 550 110 — société anonyme.  ", publishedAt: "2026-01-15T00:00:00Z" },
    ])
    const registry = enriched.bibliography.find((source) => source.kind === "external")
    expect(registry?.excerpt).toBe("SIREN 415 550 110 — société anonyme.")
    expect(registry?.publishedAt).toBe("2026-01-15T00:00:00Z")
  })
})

describe("artefact V4 legacy sans champ anchoring", () => {
  it("retombe sur la reconstruction honnête : degraded, jamais nominal par défaut", () => {
    const legacy = tournaireInternalOnlyArtifact()
    delete legacy.anchoring
    const view = buildAccountKnowledgeV4View(legacy)
    expect(view.banner.status).toBe("degraded")
    expect(view.banner.title).toBe("Collecte externe en échec — analyse non ancrée")
    expect(view.anchoring.statements_externally_anchored).toBe(1)
  })
})

describe("buildAccountKnowledgeV4Banner", () => {
  it("un nominal majoritairement non ancré alerte au lieu de rassurer", () => {
    const banner = buildAccountKnowledgeV4Banner({
      external_documents_used: 1,
      statements_total: 10,
      statements_externally_anchored: 2,
      anchoring_ratio: 0.2,
      research_status: "nominal",
    })
    expect(banner.tone).toBe("alert")
    expect(banner.metrics).toBe("1 document externe cité · 2/10 affirmations ancrées (20 %)")
  })
})

describe("modes de lecture (04 §4)", () => {
  const view = buildAccountKnowledgeV4View(sosOxygeneArtifact())
  const all = view.sections.flatMap((section) => section.statements)

  it("strict : établi + déclaré ; équilibré : + déduit ; exploratoire : tout", () => {
    expect(selectStatementsForMode(all, "strict").visible.map((s) => s.qualification)).toEqual([
      "established",
      "declared",
      "established",
    ])
    expect(selectStatementsForMode(all, "balanced").hiddenCount).toBe(1)
    expect(selectStatementsForMode(all, "exploratory").hiddenCount).toBe(0)
  })

  it("le mode filtre, il ne requalifie jamais", () => {
    const { visible } = selectStatementsForMode(all, "exploratory")
    expect(visible.find((statement) => statement.text.startsWith("Bénéficiaires"))?.qualificationLabel).toBe("Hypothèse")
  })

  it("compte les statements affichés par mode pour le sélecteur", () => {
    expect(countStatementsByMode(view.statementCounts)).toEqual({ strict: 3, balanced: 4, exploratory: 5 })
  })
})

describe("collectAccountKnowledgeV4LookupSourceIds", () => {
  it("ne garde que des uuid — un id libre casserait un IN (…) sur une colonne uuid", () => {
    expect(collectAccountKnowledgeV4LookupSourceIds(sosOxygeneArtifact())).toEqual([])
    expect(collectAccountKnowledgeV4LookupSourceIds(tournaireInternalOnlyArtifact())).toEqual([
      "f1687863-7f2b-4986-89e6-f94d9e90f741",
    ])
  })
})

describe("formatAccountKnowledgeV4Coverage / formatSiren", () => {
  it("résume l'ancrage pour le bandeau de mise à jour", () => {
    expect(formatAccountKnowledgeV4Coverage(sosOxygeneArtifact())).toBe(
      "4/5 affirmations ancrées sur une source externe (80 %)",
    )
  })

  it("formate un SIREN à neuf chiffres, laisse le reste intact", () => {
    expect(formatSiren("384122099")).toBe("384 122 099")
    expect(formatSiren("ABC")).toBe("ABC")
    expect(formatSiren(null)).toBeNull()
  })
})
