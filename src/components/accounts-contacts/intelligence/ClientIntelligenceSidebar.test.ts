import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildClientIntelligenceRailProps,
  ClientIntelligenceSidebar,
  CLIENT_INTELLIGENCE_NAV_ITEMS,
  getClientIntelligenceDesktopTabLabel,
} from "./ClientIntelligenceSidebar"
import { AccountIntelligenceSignatureHeaderDesktop } from "./header/AccountIntelligenceSignatureHeader"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

function renderSidebar(options?: {
  activeTab?: "accueil" | "strategie"
  withModules?: boolean
}) {
  return renderToStaticMarkup(
    React.createElement(ClientIntelligenceSidebar, {
      activeTab: options?.activeTab ?? "accueil",
      onTabChange: () => {},
      onOpenContactDirectory: options?.withModules ? () => {} : undefined,
      onOpenDocuments: options?.withModules ? () => {} : undefined,
      playbookSlug: options?.withModules ? "assurance" : null,
    }),
  )
}

describe("ClientIntelligenceSidebar", () => {
  it("préserve les clés métier derrière les sept libellés Desktop", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "accueil", label: "Accueil" },
      { key: "socle", label: "Socle" },
      { key: "connaissance", label: "Entreprise" },
      { key: "secteur", label: "Secteur" },
      { key: "enjeux", label: "Enjeux" },
      { key: "strategie", label: "Stratégie" },
      { key: "roadmap", label: "Roadmap" },
    ])
  })

  it("associe un pictogramme à chaque entrée", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.every((item) => item.icon.length > 0)).toBe(true)
  })

  it("utilise le châssis SectionRail avec le chapeau Account Intelligence", () => {
    const html = renderSidebar()

    expect(html).toContain('aria-label="Navigation Account Intelligence"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain(">Account Intelligence<")
    expect(html).toContain(">Chapitres<")
  })

  it("mappe activeTab vers l'unique chapitre actif", () => {
    const model = buildClientIntelligenceRailProps({
      activeTab: "strategie",
      onTabChange: () => {},
    })

    expect(model.chapters.filter((chapter) => chapter.active).map((chapter) => chapter.key)).toEqual([
      "strategie",
    ])
    expect(renderSidebar({ activeTab: "strategie" })).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Stratégie<\/span>/,
    )
  })

  it("ramène le chapeau au chapitre racine accueil", () => {
    const onTabChange = vi.fn()
    const model = buildClientIntelligenceRailProps({
      activeTab: "strategie",
      onTabChange,
    })

    model.home.onSelect?.()

    expect(onTabChange).toHaveBeenCalledOnce()
    expect(onTabChange).toHaveBeenCalledWith("accueil")
  })

  it("dérive le libellé exact du header Desktop, y compris Accueil", () => {
    expect(CLIENT_INTELLIGENCE_NAV_ITEMS.map((item) => getClientIntelligenceDesktopTabLabel(item.key))).toEqual([
      "Accueil",
      "Socle",
      "Entreprise",
      "Secteur",
      "Enjeux",
      "Stratégie",
      "Roadmap",
    ])
  })

  it("rend Accueil dans le header principal et conserve le retour vers la liste", () => {
    const company = {
      name: "CEGEMA",
      logoPath: null,
      website: null,
    } as ClientIntelligenceData["company"]
    const html = renderToStaticMarkup(
      React.createElement(AccountIntelligenceSignatureHeaderDesktop, {
        company,
        title: getClientIntelligenceDesktopTabLabel("accueil"),
        onBackToAccounts: () => {},
      }),
    )

    expect(html).toContain(">Accueil</h1>")
    expect(html).toContain('aria-label="Retour à la liste des comptes"')
  })

  it("ne rend ni section Modules ni bouton mort lorsque les actions sont absentes", () => {
    const html = renderSidebar()

    expect(html).not.toContain(">Modules<")
    expect(html).not.toContain("Répertoire")
    expect(html).not.toContain("Bibliothèque")
    expect(html).not.toContain("Playbook")
    expect(html).not.toContain("disabled")
  })

  it("rend uniquement les trois modules contextuels réellement disponibles", () => {
    const html = renderSidebar({ withModules: true })

    expect(html).toContain(">Modules<")
    expect(html).toContain("Répertoire")
    expect(html).toContain("Bibliothèque")
    expect(html).toContain('href="/ressources/playbook/assurance"')
    expect(html).not.toContain("disabled")
  })

  it("n'inclut que chaque module dont l'action contextuelle existe", () => {
    const model = buildClientIntelligenceRailProps({
      activeTab: "accueil",
      onTabChange: () => {},
      onOpenDocuments: () => {},
    })

    expect(model.contextualModules?.map((module) => module.key)).toEqual(["documents"])
  })
})
