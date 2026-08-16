import { describe, expect, it } from "vitest"
import {
  CANONICAL_ACTIVE_WORKFLOWS,
  isLegacyWorkflow,
  workflowLabelForRunType,
  workflowNomenclatureForRunType,
} from "./workflow-labels"

describe("workflow labels and nomenclature", () => {
  it("maps veille hebdomadaire correctly across aliases", () => {
    expect(workflowLabelForRunType("veille-hebdomadaire-kredo")).toBe("Veille hebdomadaire IA & Marché")
    expect(workflowLabelForRunType("global-watch")).toBe("Veille hebdomadaire IA & Marché")
    expect(workflowLabelForRunType("global_watch")).toBe("Veille hebdomadaire IA & Marché")
    expect(workflowLabelForRunType("KREDO — Veille Hebdomadaire IA & Marché")).toBe("Veille hebdomadaire IA & Marché")

    expect(workflowNomenclatureForRunType("veille-hebdomadaire-kredo")).toBe("VEILLE-001 - Veille hebdomadaire IA & Marché")
    expect(workflowNomenclatureForRunType("global-watch")).toBe("VEILLE-001 - Veille hebdomadaire IA & Marché")
  })

  it("maps all canonical active workflows to readable labels and nomenclature", () => {
    for (const item of CANONICAL_ACTIVE_WORKFLOWS) {
      expect(workflowLabelForRunType(item.runType)).toBe(item.label)
      expect(workflowNomenclatureForRunType(item.runType)).toBe(item.nomenclature)
      expect(isLegacyWorkflow(item.runType)).toBe(false)
    }
  })

  it("identifies legacy and obsolete workflows", () => {
    expect(isLegacyWorkflow("intel-020-pitch-mail")).toBe(true)
    expect(isLegacyWorkflow("process_diagnostic")).toBe(true)
    expect(isLegacyWorkflow("process_diagnostic_import")).toBe(true)
    expect(isLegacyWorkflow("full_prospection_analysis")).toBe(true)
    expect(isLegacyWorkflow("activity_commercial")).toBe(true)
    expect(isLegacyWorkflow("activity_recruitment")).toBe(true)
    expect(isLegacyWorkflow("folio_legacy")).toBe(true)
    expect(isLegacyWorkflow("agent_ia_business_analyst")).toBe(true)
    expect(isLegacyWorkflow("some_legacy_job")).toBe(true)

    expect(isLegacyWorkflow("intel-010-refresh")).toBe(false)
    expect(isLegacyWorkflow("intel-030-account-knowledge")).toBe(false)
    expect(isLegacyWorkflow("veille-hebdomadaire-kredo")).toBe(false)
    expect(isLegacyWorkflow(null)).toBe(false)
    expect(isLegacyWorkflow(undefined)).toBe(false)
  })
})
