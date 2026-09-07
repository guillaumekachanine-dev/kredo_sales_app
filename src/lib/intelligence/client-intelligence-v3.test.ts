import { describe, it, expect, vi } from "vitest"
import { resolveEvidenceState, buildClaimVerificationIndex } from "@/components/accounts-contacts/intelligence/folio-v3/FolioStudyShared"
import { deriveAccountKnowledgeFields } from "@/lib/intelligence/account-knowledge-state"
import { collectAccountKnowledgeV3SourceIds } from "@/lib/intelligence/account-knowledge-ingest"
import type { AccountKnowledgeContentV3, AccountKnowledgeClaimV3 } from "@/lib/intelligence/account-intelligence-contracts"
import { useAccountKnowledgeRun } from "@/components/accounts-contacts/intelligence/use-account-knowledge-run"

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>()
  return {
    ...original,
    useState: (init: unknown) => {
      let val = init
      const setVal = vi.fn((newVal: unknown) => {
        val = newVal
      })
      return [val, setVal]
    },
    useRef: (init: unknown) => ({ current: init }),
    useCallback: <T>(fn: T): T => fn,
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("@/lib/n8n/use-run-tracker", () => ({
  useRunTracker: () => ({ phase: "idle" }),
}))

vi.mock("@/lib/intelligence/intelligence-validators", () => ({
  parseAccountKnowledgeArtifact: vi.fn((content: { schema_version: number }) => ({ ok: true, version: content.schema_version, content }))
}))

function accountKnowledgeV3Minimal(): AccountKnowledgeContentV3 {
  return {
    schema_version: 3,
    account_summary: null,
    identity: { company_name: null, legal_name: null, primary_activity: null, headquarters: null, sector: null, business_segment: null, revenue: null, employee_count: null, geographic_reach: [], dynamic: null },
    market_positioning: { account_positioning: null, competitive_environment: null, direct_competitors: [], competitive_advantages: [], opportunities: [], threats: [], policy_and_ambitions: { purpose: null, philosophy: null, culture: [], public_statements: [], ambitions: [], strategic_axes: [], leadership_posture: [], claimed_identity: null } },
    offers_and_customers: { core_business: null, offers: [], covered_domains: [], services: [], service_models: [], complementary_activities: [], uncovered_activities: [], customer_profile: null, customer_segments: [], segment_weights: [], behavioral_trends: [], unmet_needs: [] },
    value_chain: { description: null, value_proposition: null, key_links: [], critical_partners_or_suppliers: [], dependencies: [], vulnerabilities: [], end_customer_relationship: null },
    regulatory_environment: { current_regulations: [], required_certifications: [], compliance_risks: [] },
    trends_and_news: { analysis: null, significant_signal_ids: [] },
    verification_results: [],
    source_coverage: {
      displayed_claims: 0,
      sourced_claims: 0,
      coverage_rate: 1,
      missing_source_paths: [],
      stale_source_paths: [],
      contradiction_paths: [],
      passed: true
    },
    generated_at: "2026-08-05T10:00:00Z"
  }
}

describe("AccountKnowledge V3 - Audit Correctif", () => {
  describe("1. Raccordement canonique des preuves V3 (FolioStudyShared)", () => {
    it("mappe correctement les verdicts confirmés, contredits et insuffisants", () => {
      const content = {
        ...accountKnowledgeV3Minimal(),
        verification_results: [
          { claim_path: "$.account_summary", verdict: "confirmed", checked_at: "", supporting_source_refs: [], contradicting_source_refs: [], rationale: null },
          { claim_path: "$.identity.company_name", verdict: "contradicted", checked_at: "", supporting_source_refs: [], contradicting_source_refs: [], rationale: null },
          { claim_path: "$.identity.legal_name", verdict: "insufficient_evidence", checked_at: "", supporting_source_refs: [], contradicting_source_refs: [], rationale: null },
        ],
        account_summary: { text: "t1", source_refs: [], attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null },
        identity: {
          ...accountKnowledgeV3Minimal().identity,
          company_name: { text: "t2", source_refs: [], attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null },
          legal_name: { text: "t3", source_refs: [], attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null }
        }
      } as unknown as AccountKnowledgeContentV3

      const index = buildClaimVerificationIndex(content)

      expect(resolveEvidenceState(content.account_summary as unknown as AccountKnowledgeClaimV3, index)).toBe("confirmed")
      expect(resolveEvidenceState(content.identity.company_name as unknown as AccountKnowledgeClaimV3, index)).toBe("contradicted")
      expect(resolveEvidenceState(content.identity.legal_name as unknown as AccountKnowledgeClaimV3, index)).toBe("insufficient_evidence")
    })

    it("utilise institutional en priorité", () => {
      expect(resolveEvidenceState({ attribution: "institutional", confidence: 0.9 } as unknown as AccountKnowledgeClaimV3, new Map())).toBe("institutional")
    })
  })

  describe("2. Lecture V1, V2, V3 et connaissance disponible", () => {
    it("dérive les champs V3 correctement et nullifie accountKnowledge renderable state", () => {
      const v2Row = {
        id: "res-v2",
        content_json: { schema_version: 2, open_questions: [] },
        created_at: "2026-08-01T00:00:00Z"
      }
      const v3Row = {
        id: "res-v3",
        content_json: accountKnowledgeV3Minimal(),
        created_at: "2026-08-02T00:00:00Z"
      }

      const derived = deriveAccountKnowledgeFields([v3Row, v2Row] as unknown as import("@/lib/intelligence/account-knowledge-state").AccountKnowledgeResultRow[])
      expect(derived.accountKnowledge).toBeNull() // latest is V3, so renderable V1/V2 state is null
      expect(derived.accountKnowledgeV3?.version).toBe(3) // V3
      expect(derived.accountKnowledgeLastUpdatedAt).toBe("2026-08-02T00:00:00Z")
    })
  })

  describe("3. Extraction des sources V3", () => {
    it("extrait correctement les source_refs des claims", () => {
      const content = {
        ...accountKnowledgeV3Minimal(),
        account_summary: { source_refs: ["src-1", "src-2"], text: "t1", attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null },
        identity: {
          ...accountKnowledgeV3Minimal().identity,
          company_name: { source_refs: ["src-3"], text: "t2", attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null }
        },
        market_positioning: {
          ...accountKnowledgeV3Minimal().market_positioning,
          account_positioning: { source_refs: ["src-2"], text: "t3", attribution: "independent", confidence: 0.9, nature: "fact", verified_at: null }
        }
      } as unknown as AccountKnowledgeContentV3

      const sourceIds = collectAccountKnowledgeV3SourceIds(content)
      expect(sourceIds).toContain("src-1")
      expect(sourceIds).toContain("src-2")
      expect(sourceIds).toContain("src-3")
      expect(new Set(sourceIds).size).toBe(3)
    })
  })

  describe("4. Trigger Payload (useAccountKnowledgeRun)", () => {
    it("déclenche le workflow avec le payload V4 actif", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ runId: "run-456" }),
      } as Response)

      const { trigger } = useAccountKnowledgeRun("company-123")
      await trigger()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [, options] = fetchSpy.mock.calls[0]
      const body = JSON.parse(options?.body as string)
      const triggerInput = body.input

      expect(triggerInput).toEqual({
        accountKnowledgeSchemaVersion: 4,
      })

      fetchSpy.mockRestore()
    })
  })
})
