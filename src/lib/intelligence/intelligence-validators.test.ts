import { describe, expect, it } from "vitest"
import {
  buildQualitySummary,
  isPlaceholderText,
  type Claim,
} from "./intelligence-common-contracts"
import {
  isAccountKnowledgeV2,
  parseAccountKnowledgeArtifact,
  validateAccountKnowledgeV1,
  validateAccountKnowledgeV2,
  validateClaim,
  validateDeterministicIndicator,
  validateQualitySummary,
  validateSectorArtifactBinding,
  validateSectorIntelligenceV1,
} from "./intelligence-validators"

// UUID v4 valides, réutilisés comme identifiants de sources/contacts/secteurs.
const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"
const CONTACT_A = "33333333-3333-4333-8333-333333333333"
const SECTOR_A = "44444444-4444-4444-8444-444444444444"
const PAIN_POINT_A = "55555555-5555-4555-8555-555555555555"
const WINDOW_A = "66666666-6666-4666-8666-666666666666"

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    text: "Le groupe a ouvert un site industriel à Grasse.",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.8,
    verified_at: null,
    ...overrides,
  }
}

function qualitySummary() {
  return {
    displayed_claims: 3,
    sourced_claims: 3,
    coverage_rate: 1,
    missing_source_paths: [],
    stale_source_paths: [],
    contradiction_paths: [],
    passed: true,
  }
}

describe("Claim", () => {
  it("accepte un fait correctement sourcé", () => {
    const result = validateClaim(claim(), "$.x")
    expect(result.valid).toBe(true)
  })

  it("refuse un fait sans source", () => {
    const result = validateClaim(claim({ source_refs: [] }), "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({
      path: "$.x.source_refs",
      message: "Fait non sourcé : au moins une source requise.",
    })
  })

  it("refuse une analyse sans chaîne de sources", () => {
    const result = validateClaim(claim({ nature: "analysis", source_refs: [] }), "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toContain("Analyse sans chaîne de sources")
  })

  it("refuse un UUID de source invalide", () => {
    const result = validateClaim(claim({ source_refs: ["source-presse-01"] }), "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({
      path: "$.x.source_refs[0]",
      message: "UUID de source invalide.",
    })
  })

  it("refuse une confidence hors bornes", () => {
    expect(validateClaim(claim({ confidence: 1.4 }), "$.x").valid).toBe(false)
    expect(validateClaim(claim({ confidence: -0.1 }), "$.x").valid).toBe(false)
    expect(validateClaim(claim({ confidence: 0 }), "$.x").valid).toBe(true)
    expect(validateClaim(claim({ confidence: 1 }), "$.x").valid).toBe(true)
  })

  it("refuse un marqueur d'absence comme contenu métier", () => {
    const result = validateClaim(claim({ text: "Non trouvé" }), "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toContain("Marqueur d'absence interdit")
  })

  it("accepte un texte qui COMMENCE par « Non trouvé » mais reste informatif", () => {
    // Piège rencontré lors du backfill des signaux : un filtre par sous-chaîne
    // supprimerait à tort des valeurs FOLIO réelles et porteuses de sens.
    const result = validateClaim(
      claim({ text: "Non trouvé - contexte de PSE suggérant une absence de recrutement" }),
      "$.x",
    )
    expect(result.valid).toBe(true)
  })

  it("refuse une date de vérification non ISO", () => {
    expect(validateClaim(claim({ verified_at: "hier" }), "$.x").valid).toBe(false)
    expect(validateClaim(claim({ verified_at: "2026-08-04T10:00:00Z" }), "$.x").valid).toBe(true)
  })
})

describe("isPlaceholderText", () => {
  it("détecte les marqueurs, accents et casse compris", () => {
    for (const value of ["Non trouvé", "NON TROUVE", " non  trouvé ", "N/A", "-", ""]) {
      expect(isPlaceholderText(value)).toBe(true)
    }
  })

  it("laisse passer du contenu réel", () => {
    expect(isPlaceholderText("Non trouvé sur le registre, confirmé par la presse")).toBe(false)
    expect(isPlaceholderText("1 700 employés")).toBe(false)
  })
})

describe("DeterministicIndicator", () => {
  const base = {
    label: "Pression réglementaire",
    score: 0.62,
    period_start: "2026-01-01T00:00:00Z",
    period_end: "2026-06-30T00:00:00Z",
    evidence_count: 4,
    method_version: "reg-pressure-v1",
    source_refs: [SOURCE_A],
  }

  it("accepte un indicateur complet", () => {
    expect(validateDeterministicIndicator(base, "$.i").valid).toBe(true)
  })

  it("accepte un score null (non calculable) sans source", () => {
    const result = validateDeterministicIndicator(
      { ...base, score: null, evidence_count: 0, source_refs: [] },
      "$.i",
    )
    expect(result.valid).toBe(true)
  })

  it("refuse un score chiffré sans aucune source", () => {
    const result = validateDeterministicIndicator({ ...base, source_refs: [] }, "$.i")
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toContain("score non justifiable")
  })

  it("refuse une période inversée", () => {
    const result = validateDeterministicIndicator(
      { ...base, period_start: "2026-06-30T00:00:00Z", period_end: "2026-01-01T00:00:00Z" },
      "$.i",
    )
    expect(result.valid).toBe(false)
  })
})

describe("QualitySummary", () => {
  it("accepte un résumé cohérent", () => {
    expect(validateQualitySummary(qualitySummary(), "$.q").valid).toBe(true)
  })

  it("refuse plus de claims sourcés que de claims affichés", () => {
    const result = validateQualitySummary(
      { ...qualitySummary(), displayed_claims: 2, sourced_claims: 3 },
      "$.q",
    )
    expect(result.valid).toBe(false)
  })

  it("refuse un taux de couverture hors bornes", () => {
    expect(validateQualitySummary({ ...qualitySummary(), coverage_rate: 1.2 }, "$.q").valid).toBe(false)
  })
})

describe("buildQualitySummary", () => {
  it("localise les claims non sourcés et invalide le lot", () => {
    const summary = buildQualitySummary({
      claims: [
        { claim: claim(), path: "$.identity.revenue" },
        { claim: claim({ source_refs: [] }), path: "$.identity.headquarters" },
      ],
    })
    expect(summary.displayed_claims).toBe(2)
    expect(summary.sourced_claims).toBe(1)
    expect(summary.coverage_rate).toBe(0.5)
    expect(summary.missing_source_paths).toEqual(["$.identity.headquarters"])
    expect(summary.passed).toBe(false)
  })

  it("traite un artefact vide comme couvert plutôt que défaillant", () => {
    const summary = buildQualitySummary({ claims: [] })
    expect(summary.coverage_rate).toBe(1)
    expect(summary.passed).toBe(true)
  })

  it("ne bloque pas sur une source périmée mais la signale", () => {
    const summary = buildQualitySummary({
      claims: [{ claim: claim(), path: "$.a" }],
      stalePaths: ["$.a"],
    })
    expect(summary.stale_source_paths).toEqual(["$.a"])
    expect(summary.passed).toBe(true)
  })
})

// ─── AccountKnowledge ───────────────────────────────────────────────────────

function accountKnowledgeV1() {
  return {
    schema_version: 1,
    identity_positioning: [{ text: "ETI industrielle", provenance: "relational" }],
    commercial_relationship: [],
    key_contacts: [{ contact_id: CONTACT_A, role_summary: "DSI", provenance: "relational" }],
    organisation_observed: [],
    frictions_and_signals: [],
    open_questions: [],
    generated_at: "2026-07-07T10:00:00Z",
  }
}

function accountKnowledgeV2() {
  return {
    schema_version: 2,
    identity: {
      primary_activity: claim(),
      headquarters: claim(),
      revenue: null,
      employee_count: null,
      // Indicateur déterministe injecté hors LLM (account-dynamic-v1), pas un Claim.
      dynamic: {
        label: "Activité détectée modérée",
        score: 42,
        period_start: "2026-01-08T00:00:00.000Z",
        period_end: "2026-07-07T00:00:00.000Z",
        evidence_count: 3,
        method_version: "account-dynamic-v1",
        source_refs: [SOURCE_A],
      },
    },
    account_summary: claim({ nature: "analysis" }),
    market_positioning: {
      positioning: claim(),
      direct_competitors: [claim()],
      customer_segments: [],
      differentiators: [],
      uncovered_scope: [],
      claimed_identity: null,
      threats: [],
      opportunities: [],
    },
    company_value_chain: {
      description: claim(),
      value_proposition: null,
      key_links: [],
      dependencies: [],
      vulnerabilities: [],
      customer_base: [],
    },
    organisation: {
      departments: [],
      strategic_weight: null,
      key_contacts: [{ contact_id: CONTACT_A, role_summary: claim() }],
      process_observations: [],
    },
    open_questions: [{ question: "Qui arbitre le budget cloud ?" }],
    source_coverage: qualitySummary(),
    generated_at: "2026-08-04T10:00:00Z",
  }
}

describe("AccountKnowledge V2", () => {
  it("valide un artefact complet", () => {
    const result = validateAccountKnowledgeV2(accountKnowledgeV2())
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("refuse une section obligatoire absente", () => {
    const artifact = accountKnowledgeV2() as Record<string, unknown>
    delete artifact.company_value_chain
    const result = validateAccountKnowledgeV2(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({
      path: "$.company_value_chain",
      message: "Section obligatoire absente.",
    })
  })

  it("refuse un claim non sourcé en profondeur, avec son chemin", () => {
    const artifact = accountKnowledgeV2()
    artifact.market_positioning.direct_competitors = [claim({ source_refs: [] })]
    const result = validateAccountKnowledgeV2(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain(
      "$.market_positioning.direct_competitors[0].source_refs",
    )
  })

  it("refuse un contact clé sans UUID valide", () => {
    const artifact = accountKnowledgeV2()
    artifact.organisation.key_contacts = [{ contact_id: "Jean Dupont", role_summary: claim() }]
    const result = validateAccountKnowledgeV2(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.organisation.key_contacts[0].contact_id")
  })

  it("refuse le mauvais schema_version", () => {
    const result = validateAccountKnowledgeV2({ ...accountKnowledgeV2(), schema_version: 1 })
    expect(result.valid).toBe(false)
    expect(result.issues[0].path).toBe("$.schema_version")
  })
})

describe("AccountKnowledge V1 — compatibilité", () => {
  it("valide encore un artefact V1 déjà généré", () => {
    const result = validateAccountKnowledgeV1(accountKnowledgeV1())
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("n'impose PAS le sourcing V2 au legacy V1", () => {
    // V1 existe en base sans source_refs : appliquer la règle V2
    // rétroactivement invaliderait des artefacts réels non re-sourçables.
    const result = validateAccountKnowledgeV1(accountKnowledgeV1())
    expect(result.valid).toBe(true)
  })

  it("refuse une section V1 manquante", () => {
    const artifact = accountKnowledgeV1() as Record<string, unknown>
    delete artifact.frictions_and_signals
    expect(validateAccountKnowledgeV1(artifact).valid).toBe(false)
  })
})

describe("parseAccountKnowledgeArtifact — versionneur", () => {
  it("route un V1 vers le validateur V1", () => {
    const parsed = parseAccountKnowledgeArtifact(accountKnowledgeV1())
    expect(parsed.version).toBe(1)
  })

  it("route un V2 vers le validateur V2", () => {
    const parsed = parseAccountKnowledgeArtifact(accountKnowledgeV2())
    expect(parsed.version).toBe(2)
    if (parsed.version === 2) expect(isAccountKnowledgeV2(parsed.content)).toBe(true)
  })

  it("rejette une version inconnue sans deviner", () => {
    const parsed = parseAccountKnowledgeArtifact({ ...accountKnowledgeV2(), schema_version: 3 })
    expect(parsed.version).toBeNull()
    expect(parsed.content).toBeNull()
  })

  it("ne confond pas un V2 tronqué avec un V1", () => {
    // Détection par version explicite, jamais par présence de champ.
    const truncated = { schema_version: 2, generated_at: "2026-08-04T10:00:00Z" }
    const parsed = parseAccountKnowledgeArtifact(truncated)
    expect(parsed.version).toBeNull()
  })
})

// ─── SectorIntelligence ─────────────────────────────────────────────────────

function sectorIntelligenceV1() {
  return {
    schema_version: 1,
    sector_id: SECTOR_A,
    sector_summary: claim({ nature: "analysis" }),
    market: {
      france_size: claim(),
      europe_size: null,
      growth: null,
      trends: [claim()],
      growth_drivers: [],
      threats: [],
    },
    structural_signals: {
      temperature: "warm",
      summary: claim({ nature: "analysis" }),
      major_signals: [claim()],
    },
    competitive_environment: {
      leaders: [{ name: "Givaudan", market_share_estimate: "~20 %", note: claim() }],
      challengers: [],
      emerging: [],
      outsiders: [],
    },
    value_chain_archetype: {
      description: claim(),
      links: [],
      dependencies: [],
      vulnerabilities: [],
    },
    regulation: {
      current_regulations: [claim()],
      certifications: [],
      compliance_risks: [],
    },
    pain_points: [{ pain_point_id: PAIN_POINT_A }],
    commercial_windows: [{ source_table: "sector_regulatory_items", id: WINDOW_A }],
    source_coverage: qualitySummary(),
    generated_at: "2026-08-04T10:00:00Z",
  }
}

describe("SectorIntelligence V1", () => {
  it("valide un artefact sectoriel complet", () => {
    const result = validateSectorIntelligenceV1(sectorIntelligenceV1())
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("refuse un sector_id absent ou non-UUID", () => {
    const result = validateSectorIntelligenceV1({ ...sectorIntelligenceV1(), sector_id: "parfumerie" })
    expect(result.valid).toBe(false)
    expect(result.issues).toContainEqual({ path: "$.sector_id", message: "UUID de secteur requis." })
  })

  it("refuse une température hors échelle", () => {
    const artifact = sectorIntelligenceV1()
    artifact.structural_signals.temperature = "bouillant"
    expect(validateSectorIntelligenceV1(artifact).valid).toBe(false)
  })

  it("refuse une fenêtre commerciale d'une table inconnue", () => {
    const artifact = sectorIntelligenceV1()
    artifact.commercial_windows = [{ source_table: "sector_news", id: WINDOW_A }]
    const result = validateSectorIntelligenceV1(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.commercial_windows[0].source_table")
  })

  it("refuse une référence de pain point non-UUID", () => {
    const artifact = sectorIntelligenceV1()
    artifact.pain_points = [{ pain_point_id: "dora" }]
    expect(validateSectorIntelligenceV1(artifact).valid).toBe(false)
  })

  it("valide des indicateurs déterministes optionnels", () => {
    const artifact = {
      ...sectorIntelligenceV1(),
      indicators: [
        {
          label: "Concentration",
          score: null,
          period_start: "2026-01-01T00:00:00Z",
          period_end: "2026-06-30T00:00:00Z",
          evidence_count: 0,
          method_version: "v1",
          source_refs: [],
        },
      ],
    }
    expect(validateSectorIntelligenceV1(artifact).valid).toBe(true)
  })
})

describe("validateSectorArtifactBinding", () => {
  const content = { sector_id: SECTOR_A }

  it("accepte un rattachement au secteur", () => {
    const result = validateSectorArtifactBinding({
      companyId: null,
      primaryEntityType: "sector",
      primaryEntityId: SECTOR_A,
      content,
    })
    expect(result.valid).toBe(true)
  })

  it("refuse un artefact sectoriel rattaché à un compte", () => {
    const result = validateSectorArtifactBinding({
      companyId: CONTACT_A,
      primaryEntityType: "sector",
      primaryEntityId: SECTOR_A,
      content,
    })
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.company_id")
  })

  it("refuse un secteur de run différent du sector_id de l'artefact", () => {
    const result = validateSectorArtifactBinding({
      companyId: null,
      primaryEntityType: "sector",
      primaryEntityId: SOURCE_B,
      content,
    })
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toContain("différent du sector_id")
  })

  it("refuse un primary_entity_type qui n'est pas « sector »", () => {
    const result = validateSectorArtifactBinding({
      companyId: null,
      primaryEntityType: "company",
      primaryEntityId: SECTOR_A,
      content,
    })
    expect(result.valid).toBe(false)
  })
})
