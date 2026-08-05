import { describe, expect, it } from "vitest"

import {
  buildAccountKnowledgeV3VerificationIndex,
  collectAccountKnowledgeV3Claims,
  type AccountKnowledgeClaimV3,
  type AccountKnowledgeContentV3,
  type AccountKnowledgeVerificationResultV3,
} from "./account-intelligence-contracts"

// ─── buildAccountKnowledgeV3VerificationIndex (revue Lot 4, Contrôle 4) ─────
// Le raccordement claim ↔ vérification ne repose QUE sur `claim_path` — jamais
// sur une position dans un tableau. Ces tests le prouvent en construisant des
// artefacts où l'ordre des `verification_results` diverge délibérément de
// l'ordre de parcours de `collectAccountKnowledgeV3Claims`.

const SOURCE_A = "11111111-1111-4111-8111-111111111111"
const SOURCE_B = "22222222-2222-4222-8222-222222222222"

function v3Claim(overrides: Partial<AccountKnowledgeClaimV3> = {}): AccountKnowledgeClaimV3 {
  return {
    text: "Le groupe exploite quatre sites industriels en France.",
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
    trends_and_news: { analysis: null, significant_signal_ids: [] },
    verification_results: [],
    source_coverage: {
      displayed_claims: 0,
      sourced_claims: 0,
      coverage_rate: 1,
      missing_source_paths: [],
      stale_source_paths: [],
      contradiction_paths: [],
      passed: true,
    },
    generated_at: "2026-08-05T10:00:00.000Z",
  }
}

describe("buildAccountKnowledgeV3VerificationIndex", () => {
  it("index nominal : chaque claim_path résout son propre résultat", () => {
    const content = accountKnowledgeV3Minimal()
    content.account_summary = v3Claim({ text: "Compte industriel." })
    content.identity.primary_activity = v3Claim({ text: "Métallurgie." })
    content.verification_results = [
      verification("$.account_summary", { rationale: "Vu sur le site officiel." }),
      verification("$.identity.primary_activity", { rationale: "Vu au registre." }),
    ]

    const index = buildAccountKnowledgeV3VerificationIndex(content)

    expect(index.size).toBe(2)
    expect(index.get("$.account_summary")?.rationale).toBe("Vu sur le site officiel.")
    expect(index.get("$.identity.primary_activity")?.rationale).toBe("Vu au registre.")
  })

  it("refuse un chemin dupliqué plutôt que d'écraser silencieusement le premier résultat", () => {
    const content = accountKnowledgeV3Minimal()
    content.account_summary = v3Claim()
    content.verification_results = [
      verification("$.account_summary", { rationale: "Premier verdict." }),
      verification("$.account_summary", { rationale: "Second verdict." }),
    ]

    expect(() => buildAccountKnowledgeV3VerificationIndex(content)).toThrow(/double/)
  })

  it("refuse un résultat orphelin (chemin sans claim publié)", () => {
    const content = accountKnowledgeV3Minimal()
    content.account_summary = v3Claim()
    content.verification_results = [
      verification("$.account_summary"),
      // Aucun claim n'existe à ce chemin dans cet artefact.
      verification("$.identity.revenue"),
    ]

    expect(() => buildAccountKnowledgeV3VerificationIndex(content)).toThrow(/orphelin/)
  })

  it("laisse l'appelant détecter un claim sans résultat, sans lever d'erreur", () => {
    const content = accountKnowledgeV3Minimal()
    content.account_summary = v3Claim()
    content.identity.primary_activity = v3Claim({ text: "Métallurgie." })
    // Un seul des deux claims a son résultat de vérification.
    content.verification_results = [verification("$.account_summary")]

    const index = buildAccountKnowledgeV3VerificationIndex(content)

    expect(index.has("$.account_summary")).toBe(true)
    expect(index.has("$.identity.primary_activity")).toBe(false)
    expect(index.get("$.identity.primary_activity")).toBeUndefined()
  })

  it("apparie correctement même quand l'ordre des résultats diffère de l'ordre de parcours des claims", () => {
    const content = accountKnowledgeV3Minimal()
    content.account_summary = v3Claim({ text: "Résumé." })
    content.identity.primary_activity = v3Claim({ text: "Activité." })
    content.identity.headquarters = v3Claim({ text: "Siège." })

    // Ordre de collecte réel : account_summary, puis identity.primary_activity,
    // puis identity.headquarters (cf. collectAccountKnowledgeV3Claims). Les
    // résultats sont volontairement fournis dans l'ordre INVERSE.
    const collected = collectAccountKnowledgeV3Claims(content).map((entry) => entry.path)
    expect(collected).toEqual(["$.account_summary", "$.identity.primary_activity", "$.identity.headquarters"])

    content.verification_results = [
      verification("$.identity.headquarters", { rationale: "Troisième dans le parcours." }),
      verification("$.account_summary", { rationale: "Premier dans le parcours." }),
      verification("$.identity.primary_activity", { rationale: "Deuxième dans le parcours." }),
    ]

    const index = buildAccountKnowledgeV3VerificationIndex(content)

    expect(index.get("$.account_summary")?.rationale).toBe("Premier dans le parcours.")
    expect(index.get("$.identity.primary_activity")?.rationale).toBe("Deuxième dans le parcours.")
    expect(index.get("$.identity.headquarters")?.rationale).toBe("Troisième dans le parcours.")
  })

  it("apparie correctement des claims répétés dans un même tableau (plusieurs indices)", () => {
    const content = accountKnowledgeV3Minimal()
    content.identity.geographic_reach = [
      v3Claim({ text: "Présence en France." }),
      v3Claim({ text: "Présence en Belgique." }),
      v3Claim({ text: "Présence en Suisse." }),
    ]

    content.verification_results = [
      verification("$.identity.geographic_reach[2]", { rationale: "Suisse confirmée." }),
      verification("$.identity.geographic_reach[0]", { rationale: "France confirmée." }),
      verification("$.identity.geographic_reach[1]", { rationale: "Belgique confirmée." }),
    ]

    const index = buildAccountKnowledgeV3VerificationIndex(content)

    expect(index.get("$.identity.geographic_reach[0]")?.rationale).toBe("France confirmée.")
    expect(index.get("$.identity.geographic_reach[1]")?.rationale).toBe("Belgique confirmée.")
    expect(index.get("$.identity.geographic_reach[2]")?.rationale).toBe("Suisse confirmée.")
  })

  it("n'apparie jamais par position : décaler un seul résultat ne contamine pas ses voisins", () => {
    // Piège positionnel : si l'implémentation appariait par index de tableau
    // plutôt que par claim_path, ce test échouerait — un résultat manquant en
    // tête décalerait tous les suivants d'un cran.
    const content = accountKnowledgeV3Minimal()
    content.identity.geographic_reach = [
      v3Claim({ text: "Présence en France." }),
      v3Claim({ text: "Présence en Belgique." }),
    ]
    content.identity.primary_activity = v3Claim({ text: "Activité." })

    // Le résultat du DEUXIÈME claim du tableau est fourni EN PREMIER, suivi du
    // résultat d'un claim scalaire, puis du résultat du PREMIER claim du
    // tableau : aucune correspondance positionnelle possible.
    content.verification_results = [
      verification("$.identity.geographic_reach[1]", { rationale: "Belgique." }),
      verification("$.identity.primary_activity", { rationale: "Activité." }),
      verification("$.identity.geographic_reach[0]", { rationale: "France." }),
    ]

    const index = buildAccountKnowledgeV3VerificationIndex(content)

    expect(index.get("$.identity.geographic_reach[0]")?.rationale).toBe("France.")
    expect(index.get("$.identity.geographic_reach[1]")?.rationale).toBe("Belgique.")
    expect(index.get("$.identity.primary_activity")?.rationale).toBe("Activité.")
  })
})
