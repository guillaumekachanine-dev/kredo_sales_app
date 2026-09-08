import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  getMobileTabsForPath,
  mainMenuItems,
} from "@/lib/navigation/main-menu.config"
import { resolveWeeklyManagerEntityHref } from "@/lib/reports/weekly-manager/entity-links"

describe("Lot 10 — Dépréciation de la route /recruitment", () => {
  it("la page legacy /recruitment applique une redirection permanente vers /consultants?section=candidats", () => {
    const pagePath = resolve(process.cwd(), "src/app/(app)/recruitment/page.tsx")
    const content = readFileSync(pagePath, "utf-8")

    expect(content).toContain('import { permanentRedirect } from "next/navigation"')
    expect(content).toContain('permanentRedirect("/consultants?section=candidats")')
  })

  it("la page legacy /recruitment n'exécute aucun loader ni composant Recruitment", () => {
    const pagePath = resolve(process.cwd(), "src/app/(app)/recruitment/page.tsx")
    const content = readFileSync(pagePath, "utf-8")

    expect(content).not.toContain("getRecruitmentWorkspace")
    expect(content).not.toContain("RecruitmentWorkspace")
    expect(content).not.toContain("getDashboardDevice")
    expect(content).not.toContain("DashboardSkeleton")
  })

  it("le contrat mobile getMobileTabsForPath pointe canoniquement vers /consultants?section=candidats (C-13)", () => {
    const tabs = getMobileTabsForPath("/missions/opps")
    const recruitmentTab = tabs.find((t) => t.label === "Recrutement" || t.shortLabel === "Recrutement")

    expect(recruitmentTab).toBeDefined()
    expect(recruitmentTab?.href).toBe("/consultants?section=candidats")
  })

  it("le menu principal pointe l'entrée Recrutement vers /consultants?section=candidats", () => {
    const ressources = mainMenuItems.find((section) => section.label === "Ressources")
    const recruitmentItem = ressources?.items?.find((item) => item.label === "Recrutement")

    expect(recruitmentItem).toBeDefined()
    expect(recruitmentItem?.href).toBe("/consultants?section=candidats")
  })

  it("les liens d'entités candidat du brief hebdomadaire pointent vers /consultants?section=candidats", () => {
    const href = resolveWeeklyManagerEntityHref("candidate", "cand-123")
    expect(href).toBe("/consultants?section=candidats&candidateId=cand-123")
  })
})
