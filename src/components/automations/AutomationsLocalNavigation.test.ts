import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  AUTOMATIONS_DESKTOP_CHAPTERS,
  AutomationsLocalNavigation,
  buildAutomationsRailProps,
  getAutomationsDesktopChapterLabel,
  type AutomationsTabKey,
} from "./AutomationsLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  activeTab?: AutomationsTabKey
  onTabChange?: (tab: AutomationsTabKey) => void
}) {
  return renderToStaticMarkup(
    React.createElement(AutomationsLocalNavigation, {
      activeTab: options?.activeTab ?? "journal",
      onTabChange: options?.onTabChange ?? (() => {}),
    }),
  )
}

describe("AutomationsLocalNavigation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/components/automations/AutomationsDesktopDashboard.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/components/automations/AutomationsLocalNavigation.tsx"),
    "utf8",
  )

  it("utilise le SectionRail canonique avec le chapeau Automatisations", () => {
    const html = renderNavigation()

    expect(navigationSource).toContain("<SectionRail")
    expect(html).toContain('aria-label="Navigation locale Automatisations"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("Automatisations")
    expect(html).toContain(">Chapitres<")
  })

  it("préserve les trois chapitres dans le bon ordre avec les clés journal, sante et couts", () => {
    expect(AUTOMATIONS_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "journal", label: "Journal d'exécution" },
      { key: "sante", label: "Santé des workflows" },
      { key: "couts", label: "Coûts" },
    ])

    const model = buildAutomationsRailProps({ activeTab: "journal", onTabChange: () => {} })
    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "journal", label: "Journal d'exécution" },
      { key: "sante", label: "Santé des workflows" },
      { key: "couts", label: "Coûts" },
    ])
  })

  it("conserve les icônes de chaque chapitre", () => {
    const model = buildAutomationsRailProps({ activeTab: "journal", onTabChange: () => {} })
    expect(model.chapters.every((chapter) => Boolean(chapter.icon))).toBe(true)
  })

  it("reflète correctement l'état actif", () => {
    const modelJournal = buildAutomationsRailProps({
      activeTab: "journal",
      onTabChange: () => {},
    })
    expect(modelJournal.chapters.find((c) => c.key === "journal")?.active).toBe(true)
    expect(modelJournal.chapters.find((c) => c.key === "sante")?.active).toBe(false)
    expect(modelJournal.chapters.find((c) => c.key === "couts")?.active).toBe(false)

    const htmlJournal = renderNavigation({ activeTab: "journal" })
    expect(htmlJournal).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Journal d&#x27;exécution<\/span>/,
    )

    const modelSante = buildAutomationsRailProps({
      activeTab: "sante",
      onTabChange: () => {},
    })
    expect(modelSante.chapters.find((c) => c.key === "sante")?.active).toBe(true)
    expect(modelSante.chapters.find((c) => c.key === "journal")?.active).toBe(false)

    const htmlSante = renderNavigation({ activeTab: "sante" })
    expect(htmlSante).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Santé des workflows<\/span>/,
    )

    const modelCouts = buildAutomationsRailProps({
      activeTab: "couts",
      onTabChange: () => {},
    })
    expect(modelCouts.chapters.find((c) => c.key === "couts")?.active).toBe(true)

    const htmlCouts = renderNavigation({ activeTab: "couts" })
    expect(htmlCouts).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Coûts<\/span>/,
    )
  })

  it("ramène le clic logique du chapeau à la section racine journal uniquement", () => {
    const onTabChange = vi.fn()
    const model = buildAutomationsRailProps({ activeTab: "couts", onTabChange })

    model.home.onSelect?.()

    expect(onTabChange).toHaveBeenCalledOnce()
    expect(onTabChange).toHaveBeenCalledWith("journal")
  })

  it("dérive le libellé exact du chapitre actif pour le header principal", () => {
    expect(getAutomationsDesktopChapterLabel("journal")).toBe("Journal d'exécution")
    expect(getAutomationsDesktopChapterLabel("sante")).toBe("Santé des workflows")
    expect(getAutomationsDesktopChapterLabel("couts")).toBe("Coûts")

    expect(desktopSource).toContain("const activeChapterTitle = getAutomationsDesktopChapterLabel(activeTab)")
    expect(desktopSource).toContain("<span>{activeChapterTitle}</span>")
    expect(desktopSource).toContain("Live Telemetry")
  })

  it("omet la section Modules et ne contient aucun module artificiel", () => {
    const model = buildAutomationsRailProps({ activeTab: "journal", onTabChange: () => {} })
    const html = renderNavigation()

    expect(model.contextualModules).toBeUndefined()
    expect(html).not.toContain(">Modules<")
  })

  it("supprime les sémantiques locales role='tab' et aria-selected au profit du contrat canonique", () => {
    const html = renderNavigation()

    expect(html).not.toContain('role="tab"')
    expect(html).not.toContain("aria-selected")
    expect(navigationSource).not.toContain('role="tab"')
    expect(navigationSource).not.toContain("aria-selected")
  })

  it("préserve strictement le comportement deep-link initialRunId", () => {
    expect(desktopSource).toContain("export function AutomationsDesktopDashboard({ data, initialRunId }:")
    expect(desktopSource).toContain("const initialRun = initialRunId ? data.journal.find((run) => run.id === initialRunId) ?? null : null")
    expect(desktopSource).toContain("const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRun?.id ?? null)")
    expect(desktopSource).toContain("const [dialogOpen, setDialogOpen] = useState(Boolean(initialRun))")
  })
})
