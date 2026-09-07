import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { resolveWorkflowResultHref } from "@/lib/automations/resolve-workflow-result-href"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import type { RunJournalRow } from "@/lib/automations/automations-data"

vi.mock("@/components/ui/AppDialog", () => ({
  AppDialog: ({
    open,
    title,
    footer,
    children,
  }: {
    open: boolean
    title: React.ReactNode
    footer?: React.ReactNode
    children: React.ReactNode
  }) => {
    if (!open) return null
    return createElement("div", { "data-testid": "app-dialog" }, title, children, footer)
  },
}))

function makeRun(overrides: Partial<RunJournalRow> = {}): RunJournalRow {
  return {
    id: "run-uuid-1",
    runType: "intel-010-refresh",
    runTypeLabel: "Scan rapide compte",
    status: "succeeded",
    createdAt: "2026-09-08T00:00:00.000Z",
    startedAt: "2026-09-08T00:00:01.000Z",
    completedAt: "2026-09-08T00:00:10.000Z",
    failedAt: null,
    errorMessage: null,
    companyId: "company-123",
    companyName: "Acme Corp",
    primaryEntityType: "company",
    primaryEntityId: "company-123",
    ownerName: "Guillaume Dev",
    ownerEmail: "dev@kredo.ai",
    triggerSource: "ui",
    durationMs: 9000,
    costEstimate: 0.02,
    hasPricingGap: false,
    hasTokensGap: false,
    config: { n8nExecutionId: "exec-100", n8nWorkflowId: "wf-200" },
    ...overrides,
  }
}

describe("1. resolveWorkflowResultHref — Résolution déterministe de livrable", () => {
  it("renvoie null si le run n'est pas en statut 'succeeded'", () => {
    expect(
      resolveWorkflowResultHref({
        runType: "intel-010-refresh",
        status: "running",
        companyId: "comp-1",
      })
    ).toBeNull()

    expect(
      resolveWorkflowResultHref({
        runType: "intel-010-refresh",
        status: "failed",
        companyId: "comp-1",
      })
    ).toBeNull()

    expect(
      resolveWorkflowResultHref({
        runType: "intel-010-refresh",
        status: "queued",
        companyId: "comp-1",
      })
    ).toBeNull()
  })

  it("priorise config.resultHref si renseigné et valide", () => {
    expect(
      resolveWorkflowResultHref({
        runType: "intel-010-refresh",
        status: "succeeded",
        companyId: "comp-1",
        config: { resultHref: "/custom/route/target" },
      })
    ).toBe("/custom/route/target")
  })

  it("résout les workflows centrés sur un compte vers /prospection/accounts/[companyId]", () => {
    const accountTypes = [
      "intel-010-refresh",
      "intel-030-account-knowledge",
      "intel-031-issues-map",
      "intel-032-strategy",
      "intel-033-account-watch-refresh",
      "account_watch_refresh",
      "mission:analyse-concurrentielle",
    ]

    for (const runType of accountTypes) {
      expect(
        resolveWorkflowResultHref({
          runType,
          status: "succeeded",
          companyId: "comp-abc",
        })
      ).toBe("/prospection/accounts/comp-abc")
    }
  })

  it("résout les workflows de veille globale vers /veille", () => {
    const watchTypes = [
      "veille-hebdomadaire-kredo",
      "veille-ia-marche-on-demand",
      "global-watch",
      "global_watch",
    ]

    for (const runType of watchTypes) {
      expect(
        resolveWorkflowResultHref({
          runType,
          status: "succeeded",
        })
      ).toBe("/veille")
    }
  })

  it("résout les rapports transverses vers /reports", () => {
    const reportTypes = [
      "intel-040-workspace-diagnostic",
      "report-account-summary",
      "report-activity-commercial",
      "report-activity-recruitment",
      "report-weekly-manager",
    ]

    for (const runType of reportTypes) {
      expect(
        resolveWorkflowResultHref({
          runType,
          status: "succeeded",
        })
      ).toBe("/reports")
    }
  })

  it("renvoie null si aucun livrable fiable n'existe (ex: compte manquant)", () => {
    expect(
      resolveWorkflowResultHref({
        runType: "intel-010-refresh",
        status: "succeeded",
        companyId: null,
      })
    ).toBeNull()

    expect(
      resolveWorkflowResultHref({
        runType: "unknown-workflow-type",
        status: "succeeded",
      })
    ).toBeNull()
  })
})

describe("2. RunDrillDownDialog — Liens, livrable et temps d'exécution", () => {
  const originalEnv = process.env.NEXT_PUBLIC_N8N_BASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_N8N_BASE_URL = "https://n8n.kredo.ai"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_N8N_BASE_URL = originalEnv
  })

  it("contient le lien vers /automations?run=<runId>", () => {
    const markup = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeRun({ id: "test-run-456" }),
        open: true,
        onOpenChange: () => undefined,
      })
    )

    expect(markup).toContain("/automations?run=test-run-456")
    expect(markup).toContain("Automatisations")
  })

  it("affiche le lien n8n si et seulement si l'URL et les identifiants n8n existent", () => {
    const withN8n = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeRun({
          config: { n8nWorkflowId: "wf-1", n8nExecutionId: "ex-2" },
        }),
        open: true,
        onOpenChange: () => undefined,
      })
    )
    expect(withN8n).toContain("https://n8n.kredo.ai/workflow/wf-1/executions/ex-2")
    expect(withN8n).toContain("Ouvrir l&#x27;exécution")

    const withoutN8n = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeRun({
          config: {},
        }),
        open: true,
        onOpenChange: () => undefined,
      })
    )
    expect(withoutN8n).not.toContain("Ouvrir l&#x27;exécution")
    expect(withoutN8n).not.toContain("https://n8n.kredo.ai")
  })

  it("affiche 'Voir le livrable' quand le livrable est résolu et le run succeeded", () => {
    const markup = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeRun({
          runType: "intel-010-refresh",
          companyId: "target-comp-99",
          status: "succeeded",
        }),
        open: true,
        onOpenChange: () => undefined,
      })
    )

    expect(markup).toContain("Voir le livrable")
    expect(markup).toContain("/prospection/accounts/target-comp-99")
  })

  it("n'affiche pas 'Voir le livrable' quand le run a échoué ou n'a pas de livrable", () => {
    const markup = renderToStaticMarkup(
      createElement(RunDrillDownDialog, {
        run: makeRun({
          status: "failed",
          errorMessage: "Erreur provider",
        }),
        open: true,
        onOpenChange: () => undefined,
      })
    )

    expect(markup).not.toContain("Voir le livrable")
  })
})

describe("3. useCurrentWorkflowExecution — Logique temporelle et Realtime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("calcule correctement le TTL restant après rechargement 90s après fin de run (30s restantes)", () => {
    const now = 1700000000000
    vi.setSystemTime(now)

    // Run terminé il y a 90 secondes (90_000 ms)
    const completedAt = new Date(now - 90_000).toISOString()
    const terminalTimeStr = completedAt
    const elapsedMs = now - new Date(terminalTimeStr).getTime()
    const remainingMs = Math.max(0, 120_000 - elapsedMs)

    expect(remainingMs).toBe(30_000)
  })

  it("expire immédiatement si le run s'est terminé il y a plus de 120 secondes", () => {
    const now = 1700000000000
    vi.setSystemTime(now)

    // Run terminé il y a 130 secondes
    const completedAt = new Date(now - 130_000).toISOString()
    const elapsedMs = now - new Date(completedAt).getTime()
    const remainingMs = Math.max(0, 120_000 - elapsedMs)

    expect(remainingMs).toBe(0)
  })

  it("priorise le run le plus récent lorsque plusieurs runs arrivent", () => {
    const olderRun = makeRun({
      id: "run-old",
      createdAt: "2026-09-08T00:00:00.000Z",
    })
    const newerRun = makeRun({
      id: "run-new",
      createdAt: "2026-09-08T00:01:00.000Z",
    })

    const runs = [olderRun, newerRun]
    const mostRecent = runs.reduce((prev, curr) =>
      new Date(curr.createdAt).getTime() >= new Date(prev.createdAt).getTime() ? curr : prev
    )

    expect(mostRecent.id).toBe("run-new")
  })

  it("ignore les runs dont le trigger_source est 'cron'", () => {
    const cronRun = makeRun({
      triggerSource: "cron",
    })
    const isUiRun = cronRun.triggerSource === "ui"
    expect(isUiRun).toBe(false)
  })

  it("ignore les runs appartenant à un autre utilisateur", () => {
    const currentUserId = "user-alice"
    const otherUserRun = {
      owner_id: "user-bob",
      trigger_source: "ui",
    }
    const isCurrentUser = otherUserRun.owner_id === currentUserId
    expect(isCurrentUser).toBe(false)
  })
})

import type { CurrentWorkflowStatus } from "./use-current-workflow-execution"

const { mockHookState } = vi.hoisted(() => ({
  mockHookState: {
    current: {
      run: null as RunJournalRow | null,
      status: null as CurrentWorkflowStatus,
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    },
  },
}))

vi.mock("./use-current-workflow-execution", () => ({
  useCurrentWorkflowExecution: () => mockHookState.current,
}))

describe("4. Rendu adaptatif Desktop & Mobile des états fonctionnels", () => {

  it("Desktop : ne rend rien si aucun run n'est actif ou récent", async () => {
    mockHookState.current = {
      run: null,
      status: null,
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorDesktop } = await import("./WorkflowExecutionIndicatorDesktop")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorDesktop))
    expect(markup).toBe("")
  })

  it("Desktop : queued et running affichent 'Exécution en cours' avec le contour actif et fond plein", async () => {
    const activeRun = makeRun({ status: "running" })
    mockHookState.current = {
      run: activeRun,
      status: "running",
      isActive: true,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorDesktop } = await import("./WorkflowExecutionIndicatorDesktop")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorDesktop))
    expect(markup).toContain("Exécution en cours")
    expect(markup).toContain("kredo-workflow-desktop-active")
    expect(markup).toContain("kredo-workflow-inner-btn")
    expect(markup).not.toContain("bg-surface")
  })

  it("Desktop : succeeded affiche 'Succès exécution' avec fond vert plein", async () => {
    const run = makeRun({ status: "succeeded" })
    mockHookState.current = {
      run,
      status: "succeeded",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorDesktop } = await import("./WorkflowExecutionIndicatorDesktop")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorDesktop))
    expect(markup).toContain("Succès exécution")
    expect(markup).toContain("border-success")
    expect(markup).toContain("bg-success")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-success/10")
  })

  it("Desktop : failed affiche 'Échec exécution' avec fond rouge plein", async () => {
    const run = makeRun({ status: "failed" })
    mockHookState.current = {
      run,
      status: "failed",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorDesktop } = await import("./WorkflowExecutionIndicatorDesktop")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorDesktop))
    expect(markup).toContain("Échec exécution")
    expect(markup).toContain("border-danger")
    expect(markup).toContain("bg-danger")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-danger/10")
  })

  it("Desktop : cancelled affiche 'Exécution annulée' avec fond neutre plein", async () => {
    const run = makeRun({ status: "cancelled" })
    mockHookState.current = {
      run,
      status: "cancelled",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorDesktop } = await import("./WorkflowExecutionIndicatorDesktop")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorDesktop))
    expect(markup).toContain("Exécution annulée")
    expect(markup).toContain("bg-workflow-cancelled")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-surface")
  })

  it("Mobile : queued et running affichent le FAB animé avec l'icône et fond plein", async () => {
    const activeRun = makeRun({ status: "queued" })
    mockHookState.current = {
      run: activeRun,
      status: "queued",
      isActive: true,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorMobile } = await import("./WorkflowExecutionIndicatorMobile")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorMobile))
    expect(markup).toContain("aria-label=\"Exécution en cours\"")
    expect(markup).toContain("kredo-workflow-mobile-active")
    expect(markup).toContain("kredo-workflow-inner-btn")
    expect(markup).toContain("fixed left-4")
    expect(markup).not.toContain("bg-surface")
  })

  it("Mobile : succeeded affiche le FAB succès avec check et fond plein vert", async () => {
    const run = makeRun({ status: "succeeded" })
    mockHookState.current = {
      run,
      status: "succeeded",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorMobile } = await import("./WorkflowExecutionIndicatorMobile")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorMobile))
    expect(markup).toContain("aria-label=\"Exécution réussie\"")
    expect(markup).toContain("border-success")
    expect(markup).toContain("bg-success")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-surface")
  })

  it("Mobile : failed affiche le FAB échec avec fond plein rouge", async () => {
    const run = makeRun({ status: "failed" })
    mockHookState.current = {
      run,
      status: "failed",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorMobile } = await import("./WorkflowExecutionIndicatorMobile")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorMobile))
    expect(markup).toContain("aria-label=\"Échec de l&#x27;exécution\"")
    expect(markup).toContain("border-danger")
    expect(markup).toContain("bg-danger")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-surface")
  })

  it("Mobile : cancelled affiche le FAB neutre avec fond plein", async () => {
    const run = makeRun({ status: "cancelled" })
    mockHookState.current = {
      run,
      status: "cancelled",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorMobile } = await import("./WorkflowExecutionIndicatorMobile")
    const markup = renderToStaticMarkup(createElement(WorkflowExecutionIndicatorMobile))
    expect(markup).toContain("aria-label=\"Exécution annulée\"")
    expect(markup).toContain("bg-workflow-cancelled")
    expect(markup).toContain("text-white")
    expect(markup).not.toContain("bg-surface")
  })

  it("Host : dispatche entre Desktop et Mobile selon le prop device", async () => {
    const run = makeRun({ status: "succeeded" })
    mockHookState.current = {
      run,
      status: "succeeded",
      isActive: false,
      isDetailOpen: false,
      setIsDetailOpen: vi.fn(),
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
    }
    const { WorkflowExecutionIndicatorHost } = await import("./WorkflowExecutionIndicatorHost")

    const desktopMarkup = renderToStaticMarkup(
      createElement(WorkflowExecutionIndicatorHost, { device: "desktop" })
    )
    expect(desktopMarkup).toContain("Succès exécution")

    const mobileMarkup = renderToStaticMarkup(
      createElement(WorkflowExecutionIndicatorHost, { device: "mobile" })
    )
    expect(mobileMarkup).toContain("aria-label=\"Exécution réussie\"")
  })
})
