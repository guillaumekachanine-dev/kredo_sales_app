import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildProspectionRailProps,
  getProspectionDesktopChapterLabel,
  PROSPECTION_DESKTOP_CHAPTERS,
  ProspectionIntelligenceLocalNavigation,
  type PiTabKey,
} from "./ProspectionIntelligenceLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: PiTabKey
  onChange?: (tab: PiTabKey) => void
}) {
  return renderToStaticMarkup(
    React.createElement(ProspectionIntelligenceLocalNavigation, {
      active: options?.active ?? "strategy",
      onChange: options?.onChange ?? (() => {}),
    }),
  )
}

describe("ProspectionIntelligenceLocalNavigation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/features/prospection-intelligence/desktop/ProspectionIntelligenceDesktop.tsx"),
    "utf8",
  )
  const headerSource = readFileSync(
    resolve(root, "src/features/prospection-intelligence/desktop/ProspectionIntelligenceHeader.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/features/prospection-intelligence/desktop/ProspectionIntelligenceLocalNavigation.tsx"),
    "utf8",
  )

  it("utilise le SectionRail canonique avec la largeur 11.5rem et le chapeau Prospection", () => {
    const html = renderNavigation()

    expect(navigationSource).toContain("<SectionRail")
    expect(navigationSource).not.toContain("w-[15rem]")
    expect(html).toContain('aria-label="Navigation locale Prospection"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("Prospection")
    expect(html).toContain(">Chapitres<")
  })

  it("préserve les quatre chapitres dans le bon ordre avec leurs clés exactes", () => {
    expect(PROSPECTION_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "strategy", label: "Brief" },
      { key: "chapter_1", label: "Fenêtres d'opportunités" },
      { key: "chapter_2", label: "Approches commerciales" },
      { key: "chapter_3", label: "Playbooks" },
    ])

    const model = buildProspectionRailProps({ active: "strategy", onChange: () => {} })
    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "strategy", label: "Brief" },
      { key: "chapter_1", label: "Fenêtres d'opportunités" },
      { key: "chapter_2", label: "Approches commerciales" },
      { key: "chapter_3", label: "Playbooks" },
    ])
  })

  it("conserve les icônes de chaque chapitre", () => {
    const model = buildProspectionRailProps({ active: "strategy", onChange: () => {} })
    expect(model.chapters.every((chapter) => Boolean(chapter.icon))).toBe(true)
  })

  it("reflète l'état actif par aria-current='page'", () => {
    const modelStrategy = buildProspectionRailProps({ active: "strategy", onChange: () => {} })
    expect(modelStrategy.chapters.find((c) => c.key === "strategy")?.active).toBe(true)
    expect(modelStrategy.chapters.find((c) => c.key === "chapter_1")?.active).toBe(false)

    const htmlStrategy = renderNavigation({ active: "strategy" })
    expect(htmlStrategy).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Brief<\/span>/,
    )

    const modelChapter1 = buildProspectionRailProps({ active: "chapter_1", onChange: () => {} })
    expect(modelChapter1.chapters.find((c) => c.key === "chapter_1")?.active).toBe(true)

    const htmlChapter1 = renderNavigation({ active: "chapter_1" })
    expect(htmlChapter1).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Fenêtres d&#x27;opportunités<\/span>/,
    )

    const modelChapter2 = buildProspectionRailProps({ active: "chapter_2", onChange: () => {} })
    expect(modelChapter2.chapters.find((c) => c.key === "chapter_2")?.active).toBe(true)

    const htmlChapter2 = renderNavigation({ active: "chapter_2" })
    expect(htmlChapter2).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Approches commerciales<\/span>/,
    )

    const modelChapter3 = buildProspectionRailProps({ active: "chapter_3", onChange: () => {} })
    expect(modelChapter3.chapters.find((c) => c.key === "chapter_3")?.active).toBe(true)

    const htmlChapter3 = renderNavigation({ active: "chapter_3" })
    expect(htmlChapter3).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Playbooks<\/span>/,
    )
  })

  it("ramène le clic logique du chapeau à strategy", () => {
    const onChange = vi.fn()
    const model = buildProspectionRailProps({ active: "chapter_3", onChange })

    model.home.onSelect?.()

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("strategy")
  })

  it("dérive le libellé exact pour le header principal selon le chapitre actif", () => {
    expect(getProspectionDesktopChapterLabel("strategy")).toBe("Brief")
    expect(getProspectionDesktopChapterLabel("chapter_1")).toBe("Fenêtres d'opportunités")
    expect(getProspectionDesktopChapterLabel("chapter_2")).toBe("Approches commerciales")
    expect(getProspectionDesktopChapterLabel("chapter_3")).toBe("Playbooks")

    expect(desktopSource).toContain("const activeChapterTitle = getProspectionDesktopChapterLabel(activeTab)")
    expect(desktopSource).toContain("<ProspectionIntelligenceHeader title={activeChapterTitle} />")
    expect(headerSource).toContain("title ?? (activeTab ? getProspectionDesktopChapterLabel(activeTab) : \"Brief\")")
  })

  it("maintient Playbooks comme un chapitre métier et non un module", () => {
    expect(PROSPECTION_DESKTOP_CHAPTERS.some((c) => c.key === "chapter_3" && c.label === "Playbooks")).toBe(true)
    const model = buildProspectionRailProps({ active: "strategy", onChange: () => {} })
    expect(model.chapters.some((c) => c.key === "chapter_3")).toBe(true)
  })

  it("omet la section Modules et ne contient aucune action transverse dans le rail", () => {
    const model = buildProspectionRailProps({ active: "strategy", onChange: () => {} })
    const html = renderNavigation()

    expect(model.contextualModules).toBeUndefined()
    expect(html).not.toContain(">Modules<")
    expect(html).not.toContain("CRM Launcher")
    expect(navigationSource).not.toContain("CRM Launcher")
    expect(navigationSource).not.toContain("useCrmAccountLauncherStore")
  })

  it("préserve intégralement la logique métier existante de ProspectionIntelligenceDesktop", () => {
    expect(desktopSource).toContain("const [period, setPeriod] = useState<30 | 90 | 180>(30)")
    expect(desktopSource).toContain("const [selectedSector, setSelectedSector] = useState<string | \"all\">(\"all\")")
    expect(desktopSource).toContain("const [searchQuery, setSearchQuery] = useState(\"\")")
    expect(desktopSource).toContain("const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)")
    expect(desktopSource).toContain("<StrategicBrief")
    expect(desktopSource).toContain("<IntelligenceKpiStrip")
    expect(desktopSource).toContain("<AccountPriorityBoard")
    expect(desktopSource).toContain("<PotentialReachMatrix")
    expect(desktopSource).toContain("<AccountAttackPanel")
    expect(desktopSource).toContain("<PriorityAccountsModal")
  })

  it("vérifie l'absence de useState pour la navigation et la dérivation depuis useSearchParams", () => {
    expect(desktopSource).not.toContain("useState<PiTabKey>")
    expect(desktopSource).toContain("const activeTab = parseProspectionSection(searchParams.get(\"section\"))")
    expect(desktopSource).toContain("router.push(")
    expect(desktopSource).toContain("buildProspectionSectionHref(pathname, searchParams, next)")
  })
})
