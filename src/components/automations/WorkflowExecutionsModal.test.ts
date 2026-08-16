import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { WorkflowExecutionsModal } from "./WorkflowExecutionsModal"
import type { RunJournalRow } from "@/lib/automations/automations-data"

vi.mock("@/components/ui/AppDialog", () => ({
  AppDialog: ({ open, title, children }: { open: boolean; title: React.ReactNode; children: React.ReactNode }) => {
    if (!open) return null
    return createElement("div", { "data-testid": "app-dialog" }, title, children)
  },
}))

function makeMockRun(overrides: Partial<RunJournalRow> & { id: string; runType: string }): RunJournalRow {
  return {
    runTypeLabel: "Scan rapide compte",
    status: "succeeded",
    createdAt: "2026-08-16T08:00:00.000Z",
    startedAt: "2026-08-16T08:00:00.000Z",
    completedAt: "2026-08-16T08:00:12.000Z",
    failedAt: null,
    errorMessage: null,
    companyId: "comp-1",
    companyName: "Acme Corp",
    primaryEntityType: "company",
    primaryEntityId: "comp-1",
    ownerName: "Alice Martin",
    ownerEmail: "alice@kredo.ai",
    triggerSource: "ui",
    durationMs: 12000,
    costEstimate: 0.015,
    hasPricingGap: false,
    hasTokensGap: false,
    config: null,
    ...overrides,
  }
}

describe("WorkflowExecutionsModal", () => {
  it("renders workflow header with label, technical name and period", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkflowExecutionsModal, {
        open: true,
        onOpenChange: () => undefined,
        workflowId: "intel-010-refresh",
        workflowLabel: "Scan rapide compte",
        periodLabel: "30 derniers jours",
        dateRange: { from: "2026-07-16T00:00:00.000Z", to: "2026-08-16T00:00:00.000Z" },
        initialRuns: [
          makeMockRun({ id: "run-1", runType: "intel-010-refresh" }),
          makeMockRun({ id: "run-2", runType: "intel-010-refresh", status: "failed", errorMessage: "API timeout" }),
        ],
      })
    )

    expect(markup).toContain("Scan rapide compte")
    expect(markup).toContain("intel-010-refresh")
    expect(markup).toContain("30 derniers jours")
    expect(markup).toContain("Tout")
    expect(markup).toContain("Échecs")
    expect(markup).toContain("Acme Corp")
  })

  it("returns null when workflowId is null", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkflowExecutionsModal, {
        open: true,
        onOpenChange: () => undefined,
        workflowId: null,
        dateRange: { from: "2026-07-16T00:00:00.000Z", to: "2026-08-16T00:00:00.000Z" },
      })
    )

    expect(markup).toBe("")
  })
})
