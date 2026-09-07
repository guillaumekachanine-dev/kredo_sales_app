import { describe, expect, it } from "vitest"
import {
  buildQualitySummary,
  isPlaceholderText,
  type Claim,
} from "./intelligence-common-contracts"
import {
  isAccountKnowledgeV2,
  isAccountKnowledgeV3,
  isAccountKnowledgeV4,
  parseAccountKnowledgeArtifact,
  validateAccountKnowledgeClaimV3,
  validateAccountKnowledgeV1,
  validateAccountKnowledgeV2,
  validateAccountKnowledgeV3,
  validateAccountKnowledgeV4,
  validateAccountKnowledgeVerificationResultV3,
  validateClaim,
  validateDeterministicIndicator,
  validateQualitySummary,
  validateSectorArtifactBinding,
  validateSectorIntelligenceV1,
} from "./intelligence-validators"
import {
  ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER,
  ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER,
  collectAccountKnowledgeV3Claims,
  type AccountKnowledgeClaimV3,
  type AccountKnowledgeContentV3,
  type AccountKnowledgeVerificationResultV3,
} from "./account-intelligence-contracts"

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

// ─── AccountKnowledge V3 (Lot 2) ─────────────────────────────────────────────
// Le contrat V3 impose que chaque claim publié soit :
//   1. correctement sourcé (règle héritée de V2) ;
//   2. porteur d'une `attribution` explicite ;
//   3. accompagné d'un et un seul `verification_results` confirmé.
// Les fixtures ci-dessous respectent ces trois invariants pour rester
// représentatives d'un artefact réel — les tests de rejet mutent une copie
// pour isoler chaque cas.

const SIGNAL_A = "77777777-7777-4777-8777-777777777777"
const SIGNAL_B = "88888888-8888-4888-8888-888888888888"
const SIGNAL_C = "99999999-9999-4999-8999-999999999999"

function v3Claim(overrides: Partial<AccountKnowledgeClaimV3> = {}): AccountKnowledgeClaimV3 {
  return {
    text: "L'entreprise a livré un site industriel à Grasse en 2025.",
    nature: "fact",
    source_refs: [SOURCE_A],
    confidence: 0.8,
    verified_at: null,
    attribution: "independent",
    ...overrides,
  }
}

function verification(
  claimPath: string,
  overrides: Partial<AccountKnowledgeVerificationResultV3> = {},
): AccountKnowledgeVerificationResultV3 {
  return {
    claim_path: claimPath,
    verdict: "confirmed",
    checked_at: "2026-08-05T10:00:00Z",
    supporting_source_refs: [SOURCE_B],
    contradicting_source_refs: [],
    rationale: null,
    ...overrides,
  }
}

/** Artefact V3 valide, aussi vide que possible mais toutes sections présentes. */
function accountKnowledgeV3Minimal(): AccountKnowledgeContentV3 {
  return {
    schema_version: 3,
    account_summary: null,
    identity: {
      company_name: null,
      legal_name: null,
      primary_activity: null,
      headquarters: null,
      sector: null,
      business_segment: null,
      revenue: null,
      employee_count: null,
      geographic_reach: [],
      dynamic: null,
    },
    market_positioning: {
      account_positioning: null,
      competitive_environment: null,
      direct_competitors: [],
      competitive_advantages: [],
      opportunities: [],
      threats: [],
      policy_and_ambitions: {
        purpose: null,
        philosophy: null,
        culture: [],
        public_statements: [],
        ambitions: [],
        strategic_axes: [],
        leadership_posture: [],
        claimed_identity: null,
      },
    },
    offers_and_customers: {
      core_business: null,
      offers: [],
      covered_domains: [],
      services: [],
      service_models: [],
      complementary_activities: [],
      uncovered_activities: [],
      customer_profile: null,
      customer_segments: [],
      segment_weights: [],
      behavioral_trends: [],
      unmet_needs: [],
    },
    value_chain: {
      description: null,
      value_proposition: null,
      key_links: [],
      critical_partners_or_suppliers: [],
      dependencies: [],
      vulnerabilities: [],
      end_customer_relationship: null,
    },
    regulatory_environment: {
      current_regulations: [],
      required_certifications: [],
      compliance_risks: [],
    },
    trends_and_news: {
      analysis: null,
      significant_signal_ids: [],
    },
    verification_results: [],
    source_coverage: qualitySummary(),
    generated_at: "2026-08-05T10:00:00Z",
  }
}

/** Artefact V3 dense — plusieurs claims dans chacune des sept sections. */
function accountKnowledgeV3Dense(): AccountKnowledgeContentV3 {
  const base = accountKnowledgeV3Minimal()
  const analysisClaim = v3Claim({ nature: "analysis" })
  const institutionalClaim = v3Claim({ attribution: "institutional" })

  return {
    ...base,
    account_summary: analysisClaim,
    identity: {
      ...base.identity,
      company_name: v3Claim(),
      primary_activity: v3Claim(),
      revenue: v3Claim(),
      geographic_reach: [v3Claim(), v3Claim()],
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
    market_positioning: {
      ...base.market_positioning,
      account_positioning: v3Claim(),
      competitive_environment: analysisClaim,
      direct_competitors: [v3Claim()],
      competitive_advantages: [analysisClaim],
      opportunities: [analysisClaim],
      threats: [analysisClaim],
      policy_and_ambitions: {
        ...base.market_positioning.policy_and_ambitions,
        purpose: institutionalClaim,
        philosophy: institutionalClaim,
        public_statements: [institutionalClaim, institutionalClaim],
        ambitions: [institutionalClaim],
        strategic_axes: [institutionalClaim],
        claimed_identity: institutionalClaim,
      },
    },
    offers_and_customers: {
      ...base.offers_and_customers,
      core_business: v3Claim(),
      offers: [v3Claim(), v3Claim()],
      services: [v3Claim()],
      uncovered_activities: [analysisClaim],
      customer_profile: v3Claim(),
      customer_segments: [v3Claim()],
      behavioral_trends: [analysisClaim],
      unmet_needs: [analysisClaim],
    },
    value_chain: {
      ...base.value_chain,
      description: analysisClaim,
      value_proposition: v3Claim(),
      key_links: [v3Claim(), v3Claim()],
      critical_partners_or_suppliers: [v3Claim()],
      dependencies: [analysisClaim],
      vulnerabilities: [analysisClaim],
      end_customer_relationship: analysisClaim,
    },
    regulatory_environment: {
      current_regulations: [v3Claim(), v3Claim()],
      required_certifications: [v3Claim()],
      compliance_risks: [analysisClaim],
    },
    trends_and_news: {
      analysis: analysisClaim,
      significant_signal_ids: [SIGNAL_A, SIGNAL_B, SIGNAL_C],
    },
    verification_results: [],
  }
}

/**
 * Complète un artefact V3 en produisant un `verification_results` confirmé
 * pour chaque claim réellement présent. Isole les tests des évolutions du
 * contenu : un ajout de claim est automatiquement couvert.
 */
function withVerifications(content: AccountKnowledgeContentV3): AccountKnowledgeContentV3 {
  const entries = collectAccountKnowledgeV3Claims(content)
  return {
    ...content,
    verification_results: entries.map((entry) => verification(entry.path)),
  }
}

describe("AccountKnowledgeClaimV3 — attribution", () => {
  it("accepte un fait indépendant correctement sourcé", () => {
    expect(validateAccountKnowledgeClaimV3(v3Claim(), "$.x").valid).toBe(true)
  })

  it("accepte une déclaration institutionnelle en tant que fait", () => {
    const claim = v3Claim({ attribution: "institutional", nature: "fact" })
    expect(validateAccountKnowledgeClaimV3(claim, "$.x").valid).toBe(true)
  })

  it("refuse une analyse portée par une attribution institutionnelle", () => {
    const claim = v3Claim({ attribution: "institutional", nature: "analysis" })
    const result = validateAccountKnowledgeClaimV3(claim, "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.x.attribution")
    expect(result.issues.find((i) => i.path === "$.x.attribution")?.message).toContain(
      "incompatible avec une analyse",
    )
  })

  it("refuse une attribution absente ou inconnue", () => {
    const missing = { ...v3Claim() } as Record<string, unknown>
    delete missing.attribution
    expect(validateAccountKnowledgeClaimV3(missing, "$.x").valid).toBe(false)

    const invalid = v3Claim({ attribution: "official" as never })
    expect(validateAccountKnowledgeClaimV3(invalid, "$.x").valid).toBe(false)
  })

  it("refuse un UUID de source invalide (règle héritée de Claim)", () => {
    const result = validateAccountKnowledgeClaimV3(
      v3Claim({ source_refs: ["source-x"] }),
      "$.x",
    )
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.x.source_refs[0]")
  })

  it("refuse un marqueur d'absence comme texte", () => {
    const result = validateAccountKnowledgeClaimV3(v3Claim({ text: "Non trouvé" }), "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toContain("Marqueur d'absence")
  })

  it("refuse une clé inconnue sur le claim", () => {
    const extra = { ...v3Claim(), attribution_source: "site officiel" }
    const result = validateAccountKnowledgeClaimV3(extra, "$.x")
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.x.attribution_source")
  })
})

describe("AccountKnowledgeVerificationResultV3", () => {
  it("valide un résultat confirmé complet", () => {
    expect(
      validateAccountKnowledgeVerificationResultV3(verification("$.account_summary"), "$.v").valid,
    ).toBe(true)
  })

  it("refuse un verdict inconnu", () => {
    const result = validateAccountKnowledgeVerificationResultV3(
      verification("$.account_summary", { verdict: "maybe" as never }),
      "$.v",
    )
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.v.verdict")
  })

  it("refuse un UUID invalide dans les sources supportantes", () => {
    const result = validateAccountKnowledgeVerificationResultV3(
      verification("$.x", { supporting_source_refs: ["oups"] }),
      "$.v",
    )
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.v.supporting_source_refs[0]")
  })
})

describe("AccountKnowledge V3 — artefact complet", () => {
  it("valide un artefact minimal (toutes sections vides mais présentes)", () => {
    const result = validateAccountKnowledgeV3(accountKnowledgeV3Minimal())
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("valide un artefact dense couvrant les sept sections", () => {
    const result = validateAccountKnowledgeV3(withVerifications(accountKnowledgeV3Dense()))
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
  })

  it("refuse un claim non sourcé profondément niché, avec son chemin", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.market_positioning.direct_competitors = [v3Claim({ source_refs: [] })]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain(
      "$.market_positioning.direct_competitors[0].source_refs",
    )
  })

  it("refuse un placeholder textuel", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.identity.company_name = v3Claim({ text: "Non renseigné" })
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.path === "$.identity.company_name.text")).toBe(true)
  })

  it("refuse une clé inconnue au niveau racine", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense()) as unknown as Record<
      string,
      unknown
    >
    artifact.unknown_root_section = { anything: true }
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.unknown_root_section")
  })

  it("refuse la rubrique upcoming_regulations dans regulatory_environment", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense()) as unknown as Record<
      string,
      unknown
    >
    ;(artifact.regulatory_environment as Record<string, unknown>).upcoming_regulations = [v3Claim()]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain(
      "$.regulatory_environment.upcoming_regulations",
    )
  })

  it("refuse les anciens blocs V2 organisation / commercial_relationship / operational_activities", () => {
    for (const forbidden of [
      "organisation",
      "commercial_relationship",
      "operational_activities",
    ] as const) {
      const artifact = withVerifications(accountKnowledgeV3Dense()) as unknown as Record<
      string,
      unknown
    >
      artifact[forbidden] = {}
      const result = validateAccountKnowledgeV3(artifact)
      expect(result.valid).toBe(false)
      expect(result.issues.map((i) => i.path)).toContain(`$.${forbidden}`)
    }
  })

  it("refuse plus de trois signaux significatifs", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.trends_and_news.significant_signal_ids = [
      SIGNAL_A,
      SIGNAL_B,
      SIGNAL_C,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain("$.trends_and_news.significant_signal_ids")
  })

  it("refuse des signaux dupliqués", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.trends_and_news.significant_signal_ids = [SIGNAL_A, SIGNAL_A]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.path)).toContain(
      "$.trends_and_news.significant_signal_ids[1]",
    )
  })

  it("refuse un claim publié sans résultat de vérification associé", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.verification_results = artifact.verification_results.filter(
      (result) => result.claim_path !== "$.account_summary",
    )
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.message.includes("$.account_summary"))).toBe(true)
  })

  it("refuse deux résultats visant le même claim (doublon)", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.verification_results = [
      ...artifact.verification_results,
      verification("$.account_summary"),
    ]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.message.includes("en double"))).toBe(true)
  })

  it("refuse un résultat qui vise un chemin de claim inexistant", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.verification_results = [
      ...artifact.verification_results,
      verification("$.identity.employee_count"),
    ]
    const result = validateAccountKnowledgeV3(artifact)
    expect(result.valid).toBe(false)
    expect(
      result.issues.some((i) => i.message.includes("Chemin sans claim correspondant")),
    ).toBe(true)
  })

  it("refuse un verdict contradicted ou insufficient_evidence sur un claim publié", () => {
    for (const badVerdict of ["contradicted", "insufficient_evidence"] as const) {
      const artifact = withVerifications(accountKnowledgeV3Dense())
      artifact.verification_results = artifact.verification_results.map((result) =>
        result.claim_path === "$.account_summary"
          ? { ...result, verdict: badVerdict, supporting_source_refs: [] }
          : result,
      )
      const validation = validateAccountKnowledgeV3(artifact)
      expect(validation.valid).toBe(false)
      expect(validation.issues.some((i) => i.message.includes("doit être confirmé"))).toBe(true)
    }
  })

  it("refuse un verdict confirmé sans source de confirmation", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.verification_results = artifact.verification_results.map((result) =>
      result.claim_path === "$.account_summary"
        ? { ...result, supporting_source_refs: [] }
        : result,
    )
    const validation = validateAccountKnowledgeV3(artifact)
    expect(validation.valid).toBe(false)
    expect(
      validation.issues.some((i) => i.message.includes("source de confirmation")),
    ).toBe(true)
  })

  it("refuse un verdict confirmé accompagné de sources contradictoires", () => {
    const artifact = withVerifications(accountKnowledgeV3Dense())
    artifact.verification_results = artifact.verification_results.map((result) =>
      result.claim_path === "$.account_summary"
        ? { ...result, contradicting_source_refs: [SOURCE_A] }
        : result,
    )
    const validation = validateAccountKnowledgeV3(artifact)
    expect(validation.valid).toBe(false)
    expect(
      validation.issues.some((i) => i.message.includes("sources contredisant")),
    ).toBe(true)
  })
})

describe("collectAccountKnowledgeV3Claims — ordre canonique", () => {
  it("renvoie tous les paths dans l'ordre des sept sections", () => {
    const artifact = accountKnowledgeV3Dense()
    const paths = collectAccountKnowledgeV3Claims(artifact).map((entry) => entry.path)
    // Doit commencer par account_summary (section 1) puis identity (2), etc.
    const firstOfEach: Record<string, string> = {}
    for (const path of paths) {
      const key = path.split(".")[1]?.replace(/\[.*/, "") ?? ""
      if (!(key in firstOfEach)) firstOfEach[key] = path
    }
    const seenOrder = Object.keys(firstOfEach)
    // L'ordre observé doit être un sous-ensemble strictement croissant de
    // ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER — sections vides sautées, jamais réordonnées.
    let lastIndex = -1
    for (const section of seenOrder) {
      const rank = ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER.indexOf(
        section as (typeof ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER)[number],
      )
      expect(rank).toBeGreaterThanOrEqual(0)
      expect(rank).toBeGreaterThan(lastIndex)
      lastIndex = rank
    }
  })

  it("saute proprement les sections vides (aucun path fantôme)", () => {
    const minimal = accountKnowledgeV3Minimal()
    expect(collectAccountKnowledgeV3Claims(minimal)).toEqual([])
  })

  it("ignore identity.dynamic (indicateur, pas un Claim)", () => {
    const artifact = accountKnowledgeV3Minimal()
    artifact.identity.dynamic = {
      label: "x",
      score: 0.5,
      period_start: "2026-01-01T00:00:00Z",
      period_end: "2026-06-30T00:00:00Z",
      evidence_count: 1,
      method_version: "v1",
      source_refs: [SOURCE_A],
    }
    expect(collectAccountKnowledgeV3Claims(artifact)).toEqual([])
  })
})

describe("parseAccountKnowledgeArtifact — V3", () => {
  it("route un V3 valide vers le validateur V3", () => {
    const parsed = parseAccountKnowledgeArtifact(withVerifications(accountKnowledgeV3Dense()))
    expect(parsed.version).toBe(3)
    if (parsed.version === 3) {
      expect(isAccountKnowledgeV3(parsed.content)).toBe(true)
      expect(isAccountKnowledgeV2(parsed.content)).toBe(false)
    }
  })

  it("ne convertit JAMAIS un V1 en V3 (compat stricte)", () => {
    // Le versionneur doit renvoyer version=1 sur un V1, jamais promu.
    const parsed = parseAccountKnowledgeArtifact(accountKnowledgeV1())
    expect(parsed.version).toBe(1)
    if (parsed.version === 1) {
      // Un V1 n'a pas les sections V3 (identity, market_positioning, etc.)
      expect((parsed.content as unknown as Record<string, unknown>).market_positioning).toBeUndefined()
    }
  })

  it("ne convertit JAMAIS un V2 en V3 (compat stricte)", () => {
    const parsed = parseAccountKnowledgeArtifact(accountKnowledgeV2())
    expect(parsed.version).toBe(2)
    if (parsed.version === 2) {
      expect(isAccountKnowledgeV3(parsed.content)).toBe(false)
      // Un V2 conserve ses sections propres, non présentes en V3.
      expect(parsed.content.company_value_chain).toBeDefined()
      expect(parsed.content.organisation).toBeDefined()
    }
  })

  it("V1 et V2 restent valides sans être durcis par les règles V3", () => {
    // Les fixtures historiques doivent continuer à passer telles quelles.
    expect(validateAccountKnowledgeV1(accountKnowledgeV1()).valid).toBe(true)
    expect(validateAccountKnowledgeV2(accountKnowledgeV2()).valid).toBe(true)
  })

  it("rejette un V3 invalide sans le réparer avec des valeurs par défaut", () => {
    const truncated = { schema_version: 3, generated_at: "2026-08-05T10:00:00Z" }
    const parsed = parseAccountKnowledgeArtifact(truncated)
    expect(parsed.version).toBeNull()
    expect(parsed.content).toBeNull()
  })
})

// ─── Account Knowledge V4 — prose + qualification épistémique ─────────────

function entityResolutionV4() {
  return {
    decision: "resolved",
    method: "registry_match",
    siren: "415550110",
    legal_name: "TOURNAIRE SA",
    naf_code: "25.92Z",
    naf_section: "C",
    hq_commune: "GRASSE",
    hq_postal_code: "06130",
    score: 6.68,
    margin: 2.08,
    reasons: ["Appariement net."],
    blockers: [],
    signals: [{ key: "name", value: 1, detail: "Raison sociale concordante." }],
    candidates: [{ siren: "415550110", legal_name: "TOURNAIRE SA", commune: "GRASSE", naf_code: "25.92Z", score: 6.68 }],
    needs_human_confirmation: false,
    can_propose_canonical_writes: true,
  }
}

function accountKnowledgeV4Dense() {
  return {
    schema_version: 4,
    entity_resolution: entityResolutionV4(),
    sections: ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER.map((key) => ({
      key,
      title: key,
      narrative: [`Lecture analytique de ${key}.`],
      statements: [{
        text: key === "implications_for_kredo"
          ? "Une approche progressive semble cohérente avec le contexte connu."
          : `Élément établi pour ${key}.`,
        qualification: key === "implications_for_kredo" ? "hypothesis" : "established",
        source_refs: key === "implications_for_kredo" ? [] : ["crm:company"],
        confidence: 0.8,
      }],
      source_refs: key === "implications_for_kredo" ? [] : ["crm:company"],
    })),
    sources: [{
      id: "crm:company",
      label: "Fiche CRM Tournaire",
      source_type: "internal_crm",
      url: null,
      consulted_at: null,
    }],
    knowledge_gaps: [],
    coverage: {
      sections_written: 8,
      statements_by_qualification: { established: 7, declared: 0, inferred: 0, hypothesis: 1 },
      external_pages_fetched: 0,
    },
    generated_at: "2026-09-07T00:00:00.000Z",
  }
}

function accountKnowledgeV4Partial() {
  return {
    schema_version: 4,
    entity_resolution: entityResolutionV4(),
    sections: ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER.map((key) => ({
      key,
      title: key,
      narrative: [],
      statements: [],
      source_refs: [],
    })),
    sources: [],
    knowledge_gaps: ACCOUNT_KNOWLEDGE_V4_SECTION_ORDER.map((section_key) => ({
      section_key,
      reason: "Aucune matière suffisamment spécifique au compte dans le dossier.",
    })),
    coverage: {
      sections_written: 0,
      statements_by_qualification: { established: 0, declared: 0, inferred: 0, hypothesis: 0 },
      external_pages_fetched: 0,
    },
    generated_at: "2026-09-07T00:00:00.000Z",
  }
}

describe("AccountKnowledge V4", () => {
  it("accepte un artefact dense : prose, structure et quatre niveaux coexistent", () => {
    const result = validateAccountKnowledgeV4(accountKnowledgeV4Dense())
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.value.sections).toHaveLength(8)
      expect(result.value.coverage.statements_by_qualification.hypothesis).toBe(1)
    }
  })

  it("accepte un artefact honnêtement partiel lorsque chaque section vide a sa lacune", () => {
    expect(validateAccountKnowledgeV4(accountKnowledgeV4Partial()).valid).toBe(true)
  })

  it("rejette une hypothèse chiffrée", () => {
    const artifact = accountKnowledgeV4Dense()
    artifact.sections[7].statements[0].text = "Une hausse de 20 % semble plausible."
    const result = validateAccountKnowledgeV4(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.path.endsWith(".text") && issue.message.includes("hypothèse"))).toBe(true)
  })

  it("rejette une assertion établie sans source", () => {
    const artifact = accountKnowledgeV4Dense()
    artifact.sections[0].statements[0].source_refs = []
    const result = validateAccountKnowledgeV4(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.path.endsWith("source_refs") && issue.message.includes("doit citer"))).toBe(true)
  })

  it("rejette une section vide sans knowledge_gap", () => {
    const artifact = accountKnowledgeV4Partial()
    artifact.knowledge_gaps = artifact.knowledge_gaps.slice(1)
    const result = validateAccountKnowledgeV4(artifact)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.message.includes("section vide exige"))).toBe(true)
  })

  it("parse explicitement V4 sans promouvoir un artefact antérieur", () => {
    const parsed = parseAccountKnowledgeArtifact(accountKnowledgeV4Dense())
    expect(parsed.version).toBe(4)
    if (parsed.version === 4) {
      expect(isAccountKnowledgeV4(parsed.content)).toBe(true)
      expect(isAccountKnowledgeV3(parsed.content)).toBe(false)
    }
  })
})
