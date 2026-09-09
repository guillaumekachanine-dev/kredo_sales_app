import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  getMobileTabsForPath,
  mainMenuItems,
} from "@/lib/navigation/main-menu.config"
import { resolveWeeklyManagerEntityHref } from "@/lib/reports/weekly-manager/entity-links"

function getFilesRecursively(dir: string, extension: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, extension))
    } else if (entry.isFile() && fullPath.endsWith(extension)) {
      files.push(fullPath)
    }
  }
  return files
}

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

  it("le menu principal ne comporte plus d'entrée Recrutement autonome (Lot 14 / NAV-3)", () => {
    const allItems = mainMenuItems.flatMap((section) => [
      ...(section.items ?? []),
      section,
    ])
    const recruitmentItem = allItems.find((item) => item.label === "Recrutement")
    expect(recruitmentItem).toBeUndefined()
  })

  it("les liens d'entités candidat du brief hebdomadaire pointent vers /consultants?section=candidats", () => {
    const href = resolveWeeklyManagerEntityHref("candidate", "cand-123")
    expect(href).toBe("/consultants?section=candidats&candidateId=cand-123")
  })
})

describe("Lot 15 — Suppression définitive du legacy Recruitment et clôture technique", () => {
  it("prouve la suppression définitive des composants legacy du workspace Recruitment", () => {
    const root = process.cwd()
    expect(existsSync(resolve(root, "src/components/recruitment"))).toBe(false)
    expect(existsSync(resolve(root, "src/components/recruitment/RecruitmentWorkspace.tsx"))).toBe(false)
    expect(existsSync(resolve(root, "src/components/recruitment/RecruitmentListView.tsx"))).toBe(false)
    expect(existsSync(resolve(root, "src/components/recruitment/RecruitmentPlanningView.tsx"))).toBe(false)
    expect(existsSync(resolve(root, "src/components/recruitment/dashboard/RecruitmentDesktopDashboard.tsx"))).toBe(false)
    expect(existsSync(resolve(root, "src/components/recruitment/dashboard/RecruitmentMobileDashboard.tsx"))).toBe(false)
  })

  it("prouve la suppression définitive des _data et _actions legacy de la route /recruitment", () => {
    const root = process.cwd()
    expect(existsSync(resolve(root, "src/app/(app)/recruitment/_data"))).toBe(false)
    expect(existsSync(resolve(root, "src/app/(app)/recruitment/_actions"))).toBe(false)
    expect(existsSync(resolve(root, "src/app/(app)/recruitment/_data/get-recruitment-workspace.ts"))).toBe(false)
    expect(existsSync(resolve(root, "src/app/(app)/recruitment/_actions/update-recruitment-status.ts"))).toBe(false)
  })

  it("prouve la présence des composants candidats actifs sous features/consultants/candidates/components", () => {
    const componentsDir = resolve(process.cwd(), "src/features/consultants/candidates/components")
    expect(existsSync(join(componentsDir, "CandidateDrawer.tsx"))).toBe(true)
    expect(existsSync(join(componentsDir, "CandidateProfileEditor.tsx"))).toBe(true)
    expect(existsSync(join(componentsDir, "CandidateReferenceProfile.tsx"))).toBe(true)
    expect(existsSync(join(componentsDir, "HiringProcessStepper.tsx"))).toBe(true)
    expect(existsSync(join(componentsDir, "NewCandidateDrawer.tsx"))).toBe(true)
  })

  it("prouve la présence des Server Actions actives sous features/consultants/candidates/actions", () => {
    const actionsDir = resolve(process.cwd(), "src/features/consultants/candidates/actions")
    expect(existsSync(join(actionsDir, "create-candidate.ts"))).toBe(true)
    expect(existsSync(join(actionsDir, "update-candidate-profile.ts"))).toBe(true)
    expect(existsSync(join(actionsDir, "update-candidate-status.ts"))).toBe(true)
    expect(existsSync(join(actionsDir, "update-hiring-step.ts"))).toBe(true)
  })

  it("garantit 0 import depuis @/components/recruitment dans tout le code source", () => {
    const srcDir = resolve(process.cwd(), "src")
    const tsFiles = [
      ...getFilesRecursively(srcDir, ".ts"),
      ...getFilesRecursively(srcDir, ".tsx"),
    ].filter((file) => !file.endsWith("recruitment-deprecation.test.ts"))

    for (const file of tsFiles) {
      const content = readFileSync(file, "utf-8")
      expect(content).not.toContain("@/components/recruitment")
    }
  })

  it("garantit 0 import depuis @/app/(app)/recruitment dans features/consultants", () => {
    const consultantsDir = resolve(process.cwd(), "src/features/consultants")
    const tsFiles = [
      ...getFilesRecursively(consultantsDir, ".ts"),
      ...getFilesRecursively(consultantsDir, ".tsx"),
    ].filter((file) => !file.endsWith("recruitment-deprecation.test.ts"))

    for (const file of tsFiles) {
      const content = readFileSync(file, "utf-8")
      expect(content).not.toContain("@/app/(app)/recruitment")
    }
  })
})
