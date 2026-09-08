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

  it("passe activeModule et productionLeaveVm à ConsultantsDesktopShell", () => {
    expect(pageSource).toContain("activeModule={activeModule}")
    expect(pageSource).toContain("productionLeaveVm={productionLeaveVm}")
  })
})
