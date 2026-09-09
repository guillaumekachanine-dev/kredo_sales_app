import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Consultants Page — distribution serveur et invariants (Lot 12 / C-31)", () => {
  const pageSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/page.tsx"),
    "utf8",
  )

  it("importe getProductionLeave et ProductionLeaveMobile", () => {
    expect(pageSource).toContain('import { getProductionLeave }')
    expect(pageSource).toContain('import { ProductionLeaveMobile }')
  })

  it("résout la dette PRODUCT-4 : Mobile activite-conges rend ProductionLeaveMobile", () => {
    expect(pageSource).toContain('activeSection === "activite-conges"')
    expect(pageSource).toContain("if (isMobile)")
    expect(pageSource).toContain("<ProductionLeaveMobile vm={vm} />")
  })

  it("Desktop activite-conges conserve ActivityDashboard", () => {
    expect(pageSource).toContain("<ActivityDashboard data={data} />")
  })

  it("lazy-loade getProductionLeave sur Desktop uniquement si le module production-conges est demandé (ADR-0006)", () => {
    expect(pageSource).toContain('!isMobile && activeModule === "production-conges"')
    expect(pageSource).toContain("await getProductionLeave()")
  })

  it("ne charge jamais les deux loaders (activity + production-leave) pour le même device sur activite-conges", () => {
    // Si isMobile est vrai, il fait un return précoce avec ProductionLeaveMobile
    // et n'atteint jamais getConsultantsActivity()
    const activiteCongesBlock = pageSource.split('activeSection === "activite-conges"')[1]?.split("if (activeSection === ")[0]
    expect(activiteCongesBlock).toBeDefined()
    expect(activiteCongesBlock).toContain("if (isMobile)")
    expect(activiteCongesBlock).toContain("return (")
    expect(activiteCongesBlock).toContain("getConsultantsActivity()")
  })

  it("passe l'état Desktop résolu et productionLeaveVm à ConsultantsDesktopShell", () => {
    expect(pageSource).toContain("activeModule={desktopEntry.module}")
    expect(pageSource).toContain("productionLeaveVm={productionLeaveVm}")
  })

  it("importe getProfileMatching et ProfileMatchingMobile (Lot 13 / C-32)", () => {
    expect(pageSource).toContain('import { getProfileMatching }')
    expect(pageSource).toContain('import { ProfileMatchingMobile }')
  })

  it("lazy-loade getProfileMatching sur Desktop uniquement si le module matching-profil est demandé (ADR-0006)", () => {
    expect(pageSource).toContain('!isMobile && activeModule === "matching-profil"')
    expect(pageSource).toContain("await getProfileMatching()")
  })

  it("branche Mobile contextuelle pour matching-profil sans charger les données de section", () => {
    expect(pageSource).toContain('if (isMobile && activeModule === "matching-profil")')
    expect(pageSource).toContain("<ProfileMatchingMobile")
  })

  it("passe profileMatchingVm et initialPersonId à ConsultantsDesktopShell", () => {
    expect(pageSource).toContain("profileMatchingVm={profileMatchingVm}")
    expect(pageSource).toContain("initialPersonId={personId}")
  })

  // ── Phase 7.2 : module Desktop « Pool de compétences » ──────────────────────

  it("importe getConsultantsSkills, PoolCompetencesMap et le résolveur Desktop pur", () => {
    expect(pageSource).toContain("import { getConsultantsSkills }")
    expect(pageSource).toContain("import { PoolCompetencesMap }")
    expect(pageSource).toContain("resolveConsultantsDesktopEntry")
  })

  it("lazy-loade getConsultantsSkills sur Desktop uniquement si le module pool-competences est demandé (ADR-0006)", () => {
    expect(pageSource).toContain('!isMobile && activeModule === "pool-competences"')
    expect(pageSource).toContain("await getConsultantsSkills()")
  })

  it("passe poolSkillsData à ConsultantsDesktopShell", () => {
    expect(pageSource).toContain("poolSkillsData={poolSkillsData}")
  })

  it("le Mobile rend la scène Pool historique sans wrapper Desktop", () => {
    expect(pageSource).toContain('if (isMobile && activeSection === "pool-competences")')
    expect(pageSource).toContain("<PoolCompetencesMap dataset={dataset} collaborators={collaborators} />")
    expect(pageSource).not.toContain("PoolCompetencesDesktop")
  })

  it("Desktop distingue requestedSection / requestedModule / device via une fonction pure", () => {
    expect(pageSource).toContain("const desktopEntry = resolveConsultantsDesktopEntry(")
    expect(pageSource).toContain("desktopEntry.chapter")
    expect(pageSource).toContain("desktopEntry.module")
  })
})
