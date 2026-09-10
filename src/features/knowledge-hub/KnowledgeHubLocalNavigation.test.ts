import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildKnowledgeHubRailProps,
  EXPERTISE_CHAPTERS,
  getKnowledgeHubActiveLabel,
  getKnowledgeHubDefaultSection,
  getKnowledgeHubDomainChapters,
  KnowledgeHubLocalNavigation,
  TALENTS_CHAPTERS,
  type KnowledgeHubLocalNavigationProps,
} from "./KnowledgeHubLocalNavigation"
import { domains } from "./knowledge-hub-shell-data"

const root = process.cwd()

function renderNavigation(options?: Partial<KnowledgeHubLocalNavigationProps>) {
  return renderToStaticMarkup(
    React.createElement(KnowledgeHubLocalNavigation, {
      activeView: options?.activeView ?? { type: "categories" },
      onChangeView: options?.onChangeView ?? (() => {}),
      onOpenModal: options?.onOpenModal,
      activeModal: options?.activeModal,
    }),
  )
}

describe("KnowledgeHubLocalNavigation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/features/knowledge-hub/KnowledgeHubDesktop.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/features/knowledge-hub/KnowledgeHubLocalNavigation.tsx"),
    "utf8",
  )

  it("utilise le SectionRail canonique avec la largeur 11.5rem et le chapeau Knowledge Hub", () => {
    const html = renderNavigation()

    expect(navigationSource).toContain("<SectionRail")
    expect(navigationSource).not.toContain("w-[12.5rem]")
    expect(navigationSource).not.toContain("<nav")
    expect(html).toContain('aria-label="Navigation Knowledge Hub"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("Knowledge Hub")
    expect(html).not.toContain("Catégories</span></button>")
    expect(html).toContain(">Chapitres<")
  })

  it("ramène le clic logique du chapeau à la racine { type: 'categories' }", () => {
    const onChangeView = vi.fn()
    const model = buildKnowledgeHubRailProps({
      activeView: { type: "domain", domainId: "expertise-kredo", sectionId: "practices" },
      onChangeView,
    })

    expect(model.title).toBe("Knowledge Hub")
    model.home.onSelect?.()

    expect(onChangeView).toHaveBeenCalledOnce()
    expect(onChangeView).toHaveBeenCalledWith({ type: "categories" })
  })

  it("à la racine : présente l'ensemble des 6 domaines dans chapters dans le bon ordre avec leurs libellés et icônes cibles", () => {
    const model = buildKnowledgeHubRailProps({
      activeView: { type: "categories" },
      onChangeView: () => {},
    })

    expect(model.chapters).toHaveLength(domains.length)
    expect(model.chapters.map((c) => ({ key: c.key, label: c.label }))).toEqual([
      { key: "clients-markets", label: "Clients & Marchés" },
      { key: "expertise-kredo", label: "Expertises KREDO" },
      { key: "talents", label: "Talents" },
      { key: "delivery-feedback", label: "Delivery & REX" },
      { key: "ao-proposals", label: "AO & Propositions" },
      { key: "internal-resources", label: "Ressources admin" },
    ])
    expect(model.chapters.every((c) => Boolean(c.icon))).toBe(true)

    const html = renderNavigation({ activeView: { type: "categories" } })
    for (const domain of domains) {
      expect(html).toContain(domain.title.replace(/&/g, "&amp;"))
    }
  })

  it("vérifie les IDs et libellés du référentiel Mobile synchronisé", async () => {
    const { mobileDomains } = await import("./knowledge-hub-mobile-shell-data")
    expect(mobileDomains.map((d) => ({ id: d.id, title: d.title }))).toEqual([
      { id: "clients-markets", title: "Clients & Marchés" },
      { id: "expertise-kredo", title: "Expertises KREDO" },
      { id: "talents", title: "Talents" },
      { id: "delivery-rex", title: "Delivery & REX" },
      { id: "ao-proposals", title: "AO & Propositions" },
      { id: "internal-resources", title: "Ressources admin" },
    ])
  })

  it("sélection d'un domaine à la racine applique la section par défaut appropriée", () => {
    const onChangeView = vi.fn()
    const model = buildKnowledgeHubRailProps({
      activeView: { type: "categories" },
      onChangeView,
    })

    const expertiseChapter = model.chapters.find((c) => c.key === "expertise-kredo")
    expertiseChapter?.onSelect?.()
    expect(onChangeView).toHaveBeenCalledWith({
      type: "domain",
      domainId: "expertise-kredo",
      sectionId: "practices",
    })

    const talentsChapter = model.chapters.find((c) => c.key === "talents")
    talentsChapter?.onSelect?.()
    expect(onChangeView).toHaveBeenCalledWith({
      type: "domain",
      domainId: "talents",
      sectionId: "team",
    })

    const clientMarketsChapter = model.chapters.find((c) => c.key === "clients-markets")
    clientMarketsChapter?.onSelect?.()
    expect(onChangeView).toHaveBeenCalledWith({
      type: "domain",
      domainId: "clients-markets",
      sectionId: undefined,
    })
  })

  it("dans Expertises KREDO : chapters devient uniquement les 4 sections exactes d'expertise", () => {
    expect(EXPERTISE_CHAPTERS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "practices", label: "Practices" },
      { id: "jobs", label: "Métiers" },
      { id: "skills", label: "Compétences" },
      { id: "techs", label: "Technologies" },
    ])

    const model = buildKnowledgeHubRailProps({
      activeView: { type: "domain", domainId: "expertise-kredo", sectionId: "practices" },
      onChangeView: () => {},
    })

    expect(model.chapters.map((c) => ({ key: c.key, label: c.label }))).toEqual([
      { key: "practices", label: "Practices" },
      { key: "jobs", label: "Métiers" },
      { key: "skills", label: "Compétences" },
      { key: "techs", label: "Technologies" },
    ])
  })

  it("dans Talents : chapters devient uniquement les 4 sections exactes de talents", () => {
    expect(TALENTS_CHAPTERS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "team", label: "Équipe" },
      { id: "alumni", label: "Alumni" },
      { id: "candidates", label: "Vivier candidats" },
      { id: "skills", label: "Cartographie" },
    ])

    const model = buildKnowledgeHubRailProps({
      activeView: { type: "domain", domainId: "talents", sectionId: "team" },
      onChangeView: () => {},
    })

    expect(model.chapters.map((c) => ({ key: c.key, label: c.label }))).toEqual([
      { key: "team", label: "Équipe" },
      { key: "alumni", label: "Alumni" },
      { key: "candidates", label: "Vivier candidats" },
      { key: "skills", label: "Cartographie" },
    ])
  })

  it("pour les autres domaines : dérive les sections depuis subItems", () => {
    const clientMarketsDomain = domains.find((d) => d.id === "clients-markets")!
    const chapters = getKnowledgeHubDomainChapters("clients-markets")

    expect(chapters).toHaveLength(clientMarketsDomain.subItems.length)
    expect(chapters.map((c) => c.label)).toEqual(clientMarketsDomain.subItems)

    const model = buildKnowledgeHubRailProps({
      activeView: { type: "domain", domainId: "clients-markets" },
      onChangeView: () => {},
    })
    expect(model.chapters.map((c) => c.label)).toEqual(clientMarketsDomain.subItems)
  })

  it("reflète la section active par aria-current='page'", () => {
    const htmlExpertise = renderNavigation({
      activeView: { type: "domain", domainId: "expertise-kredo", sectionId: "jobs" },
    })
    expect(htmlExpertise).toMatch(/aria-current="page"[^>]*><span[^>]*>Métiers<\/span>/)

    const htmlTalents = renderNavigation({
      activeView: { type: "domain", domainId: "talents", sectionId: "alumni" },
    })
    expect(htmlTalents).toMatch(/aria-current="page"[^>]*><span[^>]*>Alumni<\/span>/)
  })

  it("résout le titre exact pour le header principal selon le contexte", () => {
    // Racine
    expect(getKnowledgeHubActiveLabel({ type: "categories" })).toBe("Catégories")

    // Expertise
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "expertise-kredo",
        sectionId: "practices",
      }),
    ).toBe("Practices")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "expertise-kredo",
        sectionId: "jobs",
      }),
    ).toBe("Métiers")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "expertise-kredo",
        sectionId: "skills",
      }),
    ).toBe("Compétences")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "expertise-kredo",
        sectionId: "techs",
      }),
    ).toBe("Technologies")

    // Talents
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "talents",
        sectionId: "team",
      }),
    ).toBe("Équipe")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "talents",
        sectionId: "alumni",
      }),
    ).toBe("Alumni")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "talents",
        sectionId: "candidates",
      }),
    ).toBe("Vivier candidats")
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "talents",
        sectionId: "skills",
      }),
    ).toBe("Cartographie")

    // Domaine sans sectionId
    expect(
      getKnowledgeHubActiveLabel({
        type: "domain",
        domainId: "clients-markets",
      }),
    ).toBe("Clients & Marchés")

    // Intégration dans le Desktop
    expect(desktopSource).toContain("const activeChapterTitle = getKnowledgeHubActiveLabel(activeView)")
    expect(desktopSource).toContain("{activeChapterTitle}")
  })

  it("gère les modules contextuels uniquement lorsque onOpenModal est fourni, sans bouton mort", () => {
    // Sans onOpenModal : contextualModules est undefined
    const modelWithoutModal = buildKnowledgeHubRailProps({
      activeView: { type: "categories" },
      onChangeView: () => {},
    })
    expect(modelWithoutModal.contextualModules).toBeUndefined()

    const htmlWithoutModal = renderNavigation({
      activeView: { type: "categories" },
    })
    expect(htmlWithoutModal).not.toContain(">Modules<")
    expect(htmlWithoutModal).not.toContain("Ateliers")
    expect(htmlWithoutModal).not.toContain("Interroger")

    // Avec onOpenModal : seul le module réellement disponible est présent
    const onOpenModal = vi.fn()
    const modelWithModal = buildKnowledgeHubRailProps({
      activeView: { type: "categories" },
      onChangeView: () => {},
      onOpenModal,
      activeModal: "workshop",
    })

    expect(modelWithModal.contextualModules).toHaveLength(1)
    expect(modelWithModal.contextualModules?.map((m) => ({ key: m.key, label: m.label }))).toEqual([
      { key: "workshop", label: "Ateliers" },
    ])

    // Vérification de l'état actif conforme à activeModal
    expect(modelWithModal.contextualModules?.find((m) => m.key === "workshop")?.active).toBe(true)

    modelWithModal.contextualModules?.find((m) => m.key === "workshop")?.onSelect?.()
    expect(onOpenModal).toHaveBeenCalledWith("workshop")

    const htmlWithModal = renderNavigation({
      activeView: { type: "categories" },
      onOpenModal,
      activeModal: "workshop",
    })
    expect(htmlWithModal).toContain(">Modules<")
    expect(htmlWithModal).toContain("Ateliers")
    expect(htmlWithModal).not.toContain("Interroger")
    expect(htmlWithModal).toMatch(/aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Ateliers<\/span>/)
  })

  it("helpers purs : getKnowledgeHubDefaultSection gère tous les cas", () => {
    expect(getKnowledgeHubDefaultSection("expertise-kredo")).toBe("practices")
    expect(getKnowledgeHubDefaultSection("talents")).toBe("team")
    expect(getKnowledgeHubDefaultSection("clients-markets")).toBeUndefined()
    expect(getKnowledgeHubDefaultSection("unknown")).toBeUndefined()
  })

  it("préserve le contrat partagé KnowledgeView sans dépendance inversée", () => {
    expect(navigationSource).not.toContain('from "./KnowledgeHubDesktop"')
    expect(navigationSource).toContain('from "./knowledge-hub.types"')
    expect(desktopSource).toContain('from "./knowledge-hub.types"')
  })

  it("vérifie le contrat d'URLisation de KnowledgeHubDesktop", () => {
    expect(desktopSource).not.toContain("useState<KnowledgeView>")
    expect(desktopSource).toContain("useSearchParams()")
    expect(desktopSource).toContain("parseKnowledgeHubView")
    expect(desktopSource).toContain("buildKnowledgeHubViewHref")
    expect(desktopSource).toContain("router.push")
    expect(desktopSource).toContain("onChangeView={navigateView}")
    expect(desktopSource).toContain("handleSelectDomain")
    expect(desktopSource).toContain("navigateView({ type: \"domain\", domainId, sectionId: defaultSection })")
    expect(desktopSource).toContain('useState<"workshop" | "ask" | null>(null)')
  })
})
