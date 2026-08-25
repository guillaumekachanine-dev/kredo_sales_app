import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { AccountScanOutput } from "@/lib/n8n/types"
import { AccountScanDesktopResults } from "../AccountScanDesktopResults"
import { AccountScanMobileResults } from "../AccountScanMobileResults"
import { resolveAccountScanApplyOutcome } from "../account-scan-apply-outcome"

const applied = (proposalId: string) => ({ proposal_id: proposalId, status: "applied" })
const conflicting = (proposalId: string) => ({ proposal_id: proposalId, status: "conflicting" })

describe("resolveAccountScanApplyOutcome", () => {
  it("treats 2 selected and 2 applied as a complete success", () => {
    const outcome = resolveAccountScanApplyOutcome(["p1", "p2"], [applied("p1"), applied("p2")])

    expect(outcome.kind).toBe("complete")
    expect(outcome.completedApplyCount).toBe(2)
    expect(Array.from(outcome.remainingSelectedIds)).toEqual([])
  })

  it("keeps only the conflicting proposal selected after a partial success", () => {
    const outcome = resolveAccountScanApplyOutcome(["p1", "p2"], [applied("p1"), conflicting("p2")])

    expect(outcome.kind).toBe("partial")
    expect(outcome.completedApplyCount).toBeNull()
    expect(Array.from(outcome.remainingSelectedIds)).toEqual(["p2"])
  })

  it("keeps the full selection when no proposal was applied", () => {
    const outcome = resolveAccountScanApplyOutcome(["p1", "p2"], [conflicting("p1"), conflicting("p2")])

    expect(outcome.kind).toBe("failure")
    expect(outcome.completedApplyCount).toBeNull()
    expect(Array.from(outcome.remainingSelectedIds)).toEqual(["p1", "p2"])
  })
})

describe("Apply button success state", () => {
  it("does not show success after applying changes from true to false without a complete business success", () => {
    const output = { sources: [], warnings: [] } as unknown as AccountScanOutput
    const commonProps = {
      output,
      proposalRows: [],
      selectedIds: new Set<string>(),
      onToggleSelect: () => undefined,
      onApplySelected: () => undefined,
      applying: false,
      completedApplyCount: null,
      bilanByProposalId: new Map(),
    }

    const desktopProps = {
      ...commonProps,
      onToggleSelectAll: () => undefined,
      setupMode: "find" as const,
    }
    const desktopApplying = renderToStaticMarkup(createElement(AccountScanDesktopResults, { ...desktopProps, applying: true }))
    const mobileApplying = renderToStaticMarkup(createElement(AccountScanMobileResults, { ...commonProps, applying: true }))
    const desktop = renderToStaticMarkup(createElement(AccountScanDesktopResults, desktopProps))
    const mobile = renderToStaticMarkup(createElement(AccountScanMobileResults, commonProps))

    expect(desktopApplying).toContain("Application…")
    expect(mobileApplying).toContain("Application…")
    expect(desktop).not.toContain("Appliqué")
    expect(mobile).not.toContain("Appliqué")
  })
})
