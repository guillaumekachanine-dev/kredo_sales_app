import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import type { RunJournalRow } from "@/lib/automations/automations-data"

vi.mock("@/components/ui/AppDialog", () => ({
  AppDialog: ({ open, title, footer, children }: { open: boolean; title: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }) => {
    if (!open) return null
    return createElement("div", { "data-testid": "app-dialog" }, title, children, footer)
  },
}))

function makeMockRun(overrides: Partial<RunJournalRow> = {}): RunJournalRow {
  return {
    id: "run-test-1",
    runType: "intel-010-refresh",
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
    config: { n8nExecutionId: "12345", n8nWorkflowId: "wf-abc" },
    ...overrides,
  }
}

describe("RunDrillDownDialog layout contracts", () => {
  it("renders workflow title, technical name, and status pill in header without 'Déclenchée par'", () => {
    const markup = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeMockRun(),
        open: true,
        onOpenChange: () => undefined,
      })
    )

    expect(markup).toContain("Scan rapide compte")
    expect(markup).toContain("intel-010-refresh")
    expect(markup).toContain("Succès")
    expect(markup).not.toContain("Déclenchée par")
    expect(markup).toContain("Coût estimé")
    expect(markup).toContain("Durée")
    expect(markup).toContain("Fermer")
  })

  it("hides cost estimate, duration and retry button for failed runs", () => {
    const markup = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeMockRun({
          status: "failed",
          errorMessage: "Timeout connecting to provider",
        }),
        open: true,
        onOpenChange: () => undefined,
      })
    )

    expect(markup).toContain("Échec")
    expect(markup).toContain("Message d&#x27;erreur")
    expect(markup).toContain("Timeout connecting to provider")
    expect(markup).not.toContain("Coût estimé")
    expect(markup).not.toContain("Durée")
    expect(markup).not.toContain("Relancer")
    expect(markup).toContain("Fermer")
  })
})
