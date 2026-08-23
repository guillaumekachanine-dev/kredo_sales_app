import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

const workspace = read("src/features/business-intelligence/playbooks/BattleWorkspace.tsx")
const revisionMobile = read("src/features/business-intelligence/playbooks/BattleRevisionMobile.tsx")
const situation = read("src/features/business-intelligence/playbooks/BattleSituationView.tsx")
const result = read("src/features/business-intelligence/playbooks/BattlePitchResult.tsx")

describe("Lot 6 — contrat Adaptive Mobile Battle", () => {
  it("distribue une Révision mobile dédiée sans monter BattleCardContent sur la branche mobile", () => {
    const mobileBranch = workspace.slice(workspace.indexOf("if (isMobile)"), workspace.indexOf("const desktopZone"))

    expect(mobileBranch).toContain("<BattleRevisionMobile actor={actor} />")
    expect(mobileBranch).not.toContain("<BattleCardContent")
    expect(workspace.slice(workspace.indexOf("const desktopZone"))).toContain("<BattleCardContent actor={actor} />")
    expect(workspace).toContain('dynamic(() =>\n  import("./BattleRevisionMobile")')
    expect(workspace).toContain('dynamic(() =>\n  import("./BattleCardsSection")')
  })

  it("n'introduit ni grille Desktop ni masquage CSS dans la Révision mobile", () => {
    expect(revisionMobile).not.toMatch(/grid-cols|md:hidden|hidden md:/)
    expect(revisionMobile).toContain("Diagnostic détaillé")
    expect(revisionMobile).toContain("min-h-11")
  })

  it("garde les quatre décisions prioritaires ouvertes et replie les options secondaires", () => {
    const primaryEnd = situation.indexOf("Options secondaires")
    const primary = situation.slice(situation.indexOf('label="Interlocuteur"'), primaryEnd)

    expect(primary).toContain('label="Interlocuteur"')
    expect(primary).toContain('label="Enjeu"')
    expect(primary).toContain('label="Angle d’approche"')
    expect(primary).toContain('label="Offre"')
    expect(situation).toContain("<details")
    expect(situation).toContain("<BattleSituationSecondaryOptions")
    expect(situation).toContain('isMobile && "sticky bottom-0 z-10')
    expect(situation).toContain('isMobile && "line-clamp-2"')
    expect(situation).toContain('className={cn("flex flex-row gap-2"')
  })

  it("maintient les CTA résultat mobile à au moins 44 px", () => {
    const mobileResult = result.slice(result.indexOf("if (isMobile)"), result.indexOf("RENDU DESKTOP"))

    expect(mobileResult).toContain("Copier")
    expect(mobileResult).toContain("Ouvrir dans Rapports")
    expect(mobileResult).toContain("Nouvelle situation")
    expect(mobileResult).toContain("Revenir à la révision")
    expect(mobileResult.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(5)
    expect(mobileResult).not.toContain("min-h-8")
  })

  it("conserve les sorties évidentes du workspace mobile", () => {
    expect(workspace).toContain("Compte actif")
    expect(workspace).toContain("<BattleModeSwitcher value={tab} onChange={setTab} isMobile />")
    expect(workspace).toContain("← Revenir au Playbook")
    expect(workspace).toContain("overscroll-contain")
  })
})
