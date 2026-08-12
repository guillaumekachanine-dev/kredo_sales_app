import { describe, expect, it } from "vitest"
import type { AccountScanOutput, AccountScanSource } from "@/lib/n8n/types"
import {
  AUTO_APPLY_CONFIDENCE_THRESHOLD,
  AUTO_SELECT_CONFIDENCE_THRESHOLD,
  bilanCategoryFromOperation,
  buildAccountScanInput,
  buildAccountScanContactsInput,
  candidateCanBeSelected,
  candidateShouldBeDefaultSelected,
  clampMaxContacts,
  formatConfidencePercent,
  formatProposalValue,
  getAttributeLabel,
  getConfidenceTone,
  isAutoApplyEligible,
  mergeProposalRows,
  type EnrichmentProposalDbRow,
} from "../account-scan-utils"
import type { AccountScanContactCandidate } from "@/lib/n8n/types"

function registrySource(overrides: Partial<AccountScanSource> = {}): AccountScanSource {
  return {
    schemaVersion: 1,
    sourceKey: "account_scan:registry:123456789",
    sourceType: "regulatory_filing",
    sourceName: "Recherche d'entreprises",
    collectedAt: "2026-07-12T00:00:00.000Z",
    reliabilityScore: 0.97,
    collectionMethod: "api",
    ...overrides,
  }
}

describe("buildAccountScanInput", () => {
  it("builds a find-mode payload with contactMode always none", () => {
    const input = buildAccountScanInput(
      { informationMode: "find", requestedFields: [], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
      { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
    )
    expect(input.informationMode).toBe("find")
    expect(input.contactMode).toBe("none")
    expect(input.selectedSiren).toBeNull()
  })

  it("always includes operation: \"account_scan\" (find mode)", () => {
    const input = buildAccountScanInput(
      { informationMode: "find", requestedFields: [], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
      { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
    )
    expect(input.operation).toBe("account_scan")
    expect(input).toMatchObject({
      schemaVersion: 1,
      operation: "account_scan",
      informationMode: "find",
      contactMode: "none",
    })
  })

  it("always includes operation: \"account_scan\" (verify mode)", () => {
    const input = buildAccountScanInput(
      { informationMode: "verify", requestedFields: [], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
      { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
    )
    expect(input.operation).toBe("account_scan")
    expect(input).toMatchObject({
      schemaVersion: 1,
      operation: "account_scan",
      informationMode: "verify",
      contactMode: "none",
    })
  })

  it("builds a verify-mode payload carrying hints and selectedSiren", () => {
    const input = buildAccountScanInput(
      {
        informationMode: "verify",
        requestedFields: [],
        requestedFacts: [],
        requestClassification: false,
        customSources: [],
        websiteHint: "https://acme.example",
        locationHint: "Paris",
        selectedSiren: "123456789",
      },
      { name: "Acme", legalName: "ACME SAS", website: null, siren: null, nafCode: null, sectorId: null },
    )
    expect(input.informationMode).toBe("verify")
    expect(input.websiteHint).toBe("https://acme.example")
    expect(input.locationHint).toBe("Paris")
    expect(input.selectedSiren).toBe("123456789")
    expect(input.knownCompany.legalName).toBe("ACME SAS")
  })

  it("normalizes empty-string hints to null", () => {
    const input = buildAccountScanInput(
      { informationMode: "find", requestedFields: [], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: "  ", locationHint: "" },
      { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
    )
    expect(input.websiteHint).toBeNull()
    expect(input.locationHint).toBeNull()
  })

  describe("Non-regression: NAF code is an output, never an input requirement for identity resolution", () => {
    it("1. Account with only name: scan starts without NAF code or SIREN", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: ["legal_name", "siren", "naf_code"], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
        { name: "SNCF", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
      )
      expect(input.knownCompany.name).toBe("SNCF")
      expect(input.selectedSiren).toBeNull()
      expect(input.knownCompany.nafCode).toBeNull()
      expect(input.requestedFields).toContain("naf_code")
    })

    it("2. Account with name + hq_location: resolution possible without NAF", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: ["siren", "naf_code"], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: "Paris" },
        { name: "TotalEnergies", legalName: "TOTALENERGIES SE", website: null, siren: null, nafCode: null, sectorId: null },
      )
      expect(input.locationHint).toBe("Paris")
      expect(input.selectedSiren).toBeNull()
      expect(input.knownCompany.nafCode).toBeNull()
    })

    it("3. Account with SIREN but without NAF: direct resolution via SIREN, NAF is in requestedFields output", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: ["naf_code", "employee_count"], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null, selectedSiren: "552037805" },
        { name: "SNCF", legalName: null, website: null, siren: "552037805", nafCode: null, sectorId: null },
      )
      expect(input.selectedSiren).toBe("552037805")
      expect(input.knownCompany.nafCode).toBeNull()
      expect(input.requestedFields).toContain("naf_code")
    })

    it("4. Account without SIREN and without NAF: search by name, NAF is NOT required to trigger", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: ["siren", "naf_code"], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
        { name: "Acme Corp", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
      )
      expect(input.selectedSiren).toBeNull()
      expect(input.knownCompany.nafCode).toBeNull()
    })

    it("5. Ambiguous account without NAF: returns candidates, without requesting NAF from user", () => {
      const candidates = [
        { siren: "123456789", legalName: "ACME FRANCE", matchScore: 0.9, nafCode: "6202A", hqLocation: "Paris" },
        { siren: "987654321", legalName: "ACME LOGISTICS", matchScore: 0.85, nafCode: null, hqLocation: "Lyon" },
      ]
      expect(candidates[0].siren).toBe("123456789")
      expect(candidates[1].nafCode).toBeNull()
    })

    it("6. Manual selection of candidate by selectedSiren: re-launches with selectedSiren and retrieves NAF", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: ["naf_code"], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null, selectedSiren: "123456789" },
        { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
      )
      expect(input.selectedSiren).toBe("123456789")
      expect(input.requestedFields).toContain("naf_code")
    })

    it("7. naf_code = NULL never blocks scan payload construction", () => {
      const input = buildAccountScanInput(
        { informationMode: "find", requestedFields: [], requestedFacts: [], requestClassification: false, customSources: [], websiteHint: null, locationHint: null },
        { name: "Acme", legalName: null, website: null, siren: null, nafCode: null, sectorId: null },
      )
      expect(input.knownCompany.nafCode).toBeNull()
      expect(input.operation).toBe("account_scan")
    })
  })
})

describe("buildAccountScanContactsInput", () => {
  const knownCompany = { name: "Acme", legalName: "ACME SAS", website: "https://acme.example", siren: "123456789", nafCode: "6202A", sectorId: "sector-1" }

  it("builds a contact identify payload and reuses the resolved SIREN", () => {
    const input = buildAccountScanContactsInput(
      { contactMode: "identify", requestedRoles: ["DSI / Direction IT", "  Data / IA  "], maxContacts: 5, recentHireOnly: false, searchVectors: ["public_web"] },
      knownCompany,
      { selectedSiren: "987654321", websiteHint: "https://resolved.example", locationHint: "Paris" },
    )

    expect(input.operation).toBe("account_scan")
    expect(input.informationMode).toBe("verify")
    expect(input.contactMode).toBe("identify")
    expect(input.selectedSiren).toBe("987654321")
    expect(input.websiteHint).toBe("https://resolved.example")
    expect(input.requestedRoles).toEqual(["DSI / Direction IT", "Data / IA"])
    expect(input.maxContacts).toBe(5)
  })

  it("builds a contact confirm payload", () => {
    const input = buildAccountScanContactsInput(
      { contactMode: "confirm", requestedRoles: ["Achats"], maxContacts: 3, recentHireOnly: false, searchVectors: ["public_web"] },
      knownCompany,
    )

    expect(input.contactMode).toBe("confirm")
    expect(input.selectedSiren).toBe("123456789")
    expect(input.requestedRoles).toEqual(["Achats"])
  })

  it("clamps maxContacts to the 1-10 range", () => {
    expect(clampMaxContacts(0)).toBe(1)
    expect(clampMaxContacts(11)).toBe(10)
    expect(clampMaxContacts(Number.NaN)).toBe(5)
  })
})

describe("candidateCanBeSelected — checkbox enablement (weak rule)", () => {
  const base: AccountScanContactCandidate = {
    candidateKey: "c1",
    firstName: "A",
    lastName: "B",
    fullName: "A B",
    jobTitle: "DSI",
    department: "IT",
    relationshipRole: "DSI",
    email: "a@example.com",
    emailStatus: "public",
    phone: null,
    linkedinUrl: null,
    confidenceScore: 0.8,
    sourceKeys: ["s1"],
    evidence: null,
    existingPersonId: null,
    existingContactId: null,
    suggestedAction: "create",
  }

  it("allows manual selection of an inferred-email candidate (the RPC never imports the email itself)", () => {
    expect(candidateCanBeSelected({ ...base, emailStatus: "inferred" })).toBe(true)
  })

  it("allows manual selection of a low-confidence candidate", () => {
    expect(candidateCanBeSelected({ ...base, confidenceScore: 0.1 })).toBe(true)
  })

  it("allows manual selection of an update-action candidate", () => {
    expect(candidateCanBeSelected({ ...base, suggestedAction: "update" })).toBe(true)
  })

  it("never allows selecting an ignored candidate", () => {
    expect(candidateCanBeSelected({ ...base, suggestedAction: "ignore" })).toBe(false)
  })
})

describe(`candidateShouldBeDefaultSelected — auto-preselection (§11 strict rule, threshold ${AUTO_SELECT_CONFIDENCE_THRESHOLD})`, () => {
  const base: AccountScanContactCandidate = {
    candidateKey: "c1",
    firstName: "A",
    lastName: "B",
    fullName: "A B",
    jobTitle: "DSI",
    department: "IT",
    relationshipRole: "DSI",
    email: "a@example.com",
    emailStatus: "public",
    phone: null,
    linkedinUrl: null,
    confidenceScore: 0.8,
    sourceKeys: ["s1"],
    evidence: null,
    existingPersonId: null,
    existingContactId: null,
    suggestedAction: "create",
  }

  it("preselects a high-confidence, sourced, create-action, non-inferred-email candidate", () => {
    expect(candidateShouldBeDefaultSelected(base)).toBe(true)
  })

  it("does not preselect inferred emails", () => {
    expect(candidateShouldBeDefaultSelected({ ...base, emailStatus: "inferred" })).toBe(false)
  })

  it("does not preselect ignored candidates", () => {
    expect(candidateShouldBeDefaultSelected({ ...base, suggestedAction: "ignore" })).toBe(false)
  })

  it("does not preselect update candidates (a CRM value would be corrected, needs human eyes)", () => {
    expect(candidateShouldBeDefaultSelected({ ...base, suggestedAction: "update" })).toBe(false)
  })

  it(`does not preselect below the ${AUTO_SELECT_CONFIDENCE_THRESHOLD} confidence threshold`, () => {
    expect(candidateShouldBeDefaultSelected({ ...base, confidenceScore: 0.69 })).toBe(false)
  })

  it("does not preselect a candidate with zero sources", () => {
    expect(candidateShouldBeDefaultSelected({ ...base, sourceKeys: [] })).toBe(false)
  })
})

describe("getAttributeLabel", () => {
  it("labels objective company fields in French", () => {
    expect(getAttributeLabel("legal_name")).toBe("Raison sociale")
    expect(getAttributeLabel("siren")).toBe("SIREN")
    expect(getAttributeLabel("employee_count")).toBe("Effectif")
  })

  it("labels interpretive facts in French", () => {
    expect(getAttributeLabel("value_proposition")).toBe("Proposition de valeur")
    expect(getAttributeLabel("growth_trend")).toBe("Tendance de croissance")
  })

  it("falls back to the raw attribute name when unknown", () => {
    expect(getAttributeLabel("something_unmapped")).toBe("something_unmapped")
  })
})

describe("isAutoApplyEligible — allowlist V1 (§11)", () => {
  const sources = [registrySource()]

  it("accepts an allowlisted field with empty current value, high confidence and an official source", () => {
    const eligible = isAutoApplyEligible(
      { attributeName: "siren", oldValue: null, confidenceScore: 0.95, sourceKeys: ["account_scan:registry:123456789"] },
      sources,
      "resolved",
    )
    expect(eligible).toBe(true)
  })

  it("rejects an interpretive fact even with perfect conditions otherwise", () => {
    const eligible = isAutoApplyEligible(
      { attributeName: "value_proposition", oldValue: null, confidenceScore: 0.99, sourceKeys: ["account_scan:registry:123456789"] },
      sources,
      "resolved",
    )
    expect(eligible).toBe(false)
  })

  it("rejects when the current CRM value is not empty (would be a correction, never auto-applied)", () => {
    const eligible = isAutoApplyEligible(
      { attributeName: "siren", oldValue: "999999999", confidenceScore: 0.99, sourceKeys: ["account_scan:registry:123456789"] },
      sources,
      "resolved",
    )
    expect(eligible).toBe(false)
  })

  it(`rejects when confidence is below the ${AUTO_APPLY_CONFIDENCE_THRESHOLD} threshold`, () => {
    const eligible = isAutoApplyEligible(
      { attributeName: "siren", oldValue: null, confidenceScore: 0.89, sourceKeys: ["account_scan:registry:123456789"] },
      sources,
      "resolved",
    )
    expect(eligible).toBe(false)
  })

  it("rejects when the primary source is not official (e.g. news media)", () => {
    const newsSources = [registrySource({ sourceKey: "account_scan:news:1", sourceType: "news_media", reliabilityScore: 0.55 })]
    const eligible = isAutoApplyEligible(
      { attributeName: "siren", oldValue: null, confidenceScore: 0.95, sourceKeys: ["account_scan:news:1"] },
      newsSources,
      "resolved",
    )
    expect(eligible).toBe(false)
  })

  it("rejects a website proposal with no backing source (a user-typed hint is not a source)", () => {
    const eligible = isAutoApplyEligible(
      { attributeName: "website", oldValue: null, confidenceScore: 0.95, sourceKeys: [] },
      sources,
      "resolved",
    )
    expect(eligible).toBe(false)
  })

  it("never auto-applies when the legal entity is ambiguous or not found", () => {
    const base = { attributeName: "siren", oldValue: null, confidenceScore: 0.99, sourceKeys: ["account_scan:registry:123456789"] }
    expect(isAutoApplyEligible(base, sources, "ambiguous")).toBe(false)
    expect(isAutoApplyEligible(base, sources, "not_found")).toBe(false)
  })
})

describe("bilanCategoryFromOperation", () => {
  it("maps known RPC operations to bilan categories", () => {
    expect(bilanCategoryFromOperation("applied")).toBe("applied")
    expect(bilanCategoryFromOperation("already_applied")).toBe("already_applied")
    expect(bilanCategoryFromOperation("conflicting")).toBe("conflicting")
  })

  it("falls back to error for unrecognized operations", () => {
    expect(bilanCategoryFromOperation("something_unexpected")).toBe("error")
  })
})

describe("mergeProposalRows", () => {
  it("joins DB rows with content_json source keys and flags facts vs fields", () => {
    const output: AccountScanOutput = {
      schemaVersion: 1,
      runId: "run-1",
      workspaceId: "ws-1",
      companyId: "company-1",
      status: "succeeded",
      resolution: { status: "resolved", siren: "123456789", matchMethod: "name_location_match", candidates: [] },
      sources: [registrySource()],
      fieldProposals: [{
        schemaVersion: 1, targetType: "company", targetId: "company-1", attributeName: "siren",
        oldValue: null, proposedValue: "123456789", normalizedValue: "123456789",
        confidenceScore: 0.95, sourceKeys: ["account_scan:registry:123456789"], justification: "x",
      }],
      factProposals: [{
        schemaVersion: 1, targetType: "company", targetId: "company-1", attributeName: "value_proposition",
        oldValue: null, proposedValue: "text", normalizedValue: "text",
        confidenceScore: 0.6, sourceKeys: [], justification: "y",
      }],
      contactCandidates: [],
      warnings: [],
    }

    const dbRows: EnrichmentProposalDbRow[] = [
      { id: "p1", attribute_name: "siren", status: "proposed", confidence_score: 0.95, old_value: null, proposed_value: "123456789", normalized_value: "123456789", justification: "x" },
      { id: "p2", attribute_name: "value_proposition", status: "proposed", confidence_score: 0.6, old_value: null, proposed_value: "text", normalized_value: "text", justification: "y" },
    ]

    const rows = mergeProposalRows(dbRows, output)
    expect(rows).toHaveLength(2)
    const sirenRow = rows.find((r) => r.attributeName === "siren")
    expect(sirenRow?.isFact).toBe(false)
    expect(sirenRow?.sourceKeys).toEqual(["account_scan:registry:123456789"])
    const factRow = rows.find((r) => r.attributeName === "value_proposition")
    expect(factRow?.isFact).toBe(true)
  })
})

describe("formatProposalValue / formatConfidencePercent / getConfidenceTone", () => {
  it("formats empty values as an em dash", () => {
    expect(formatProposalValue(null)).toBe("—")
    expect(formatProposalValue("")).toBe("—")
  })

  it("formats plain scalars as-is", () => {
    expect(formatProposalValue("VOYAGE PRIVE SAS")).toBe("VOYAGE PRIVE SAS")
    expect(formatProposalValue(42)).toBe("42")
  })

  it("formats confidence as a rounded percentage", () => {
    expect(formatConfidencePercent(0.947)).toBe("95%")
  })

  it("buckets confidence into tones", () => {
    expect(getConfidenceTone(0.9)).toBe("high")
    expect(getConfidenceTone(0.5)).toBe("medium")
    expect(getConfidenceTone(0.2)).toBe("low")
  })
})
