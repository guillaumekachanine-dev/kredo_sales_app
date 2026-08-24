import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SRC_ROOT = join(process.cwd(), "src")
const GENERATED_TYPES_PATH = join(SRC_ROOT, "types/database.generated.ts")
const FORBIDDEN_SNAKE_CASE = ["legacy", "folio", "score"].join("_")
const FORBIDDEN_CAMEL_CASE = ["legacy", "Folio", "Score"].join("")

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe("contrat v_crm_account_list post Lot 2", () => {
  it("ne conserve aucune référence à l'ancien champ FOLIO dans src", () => {
    const occurrences = sourceFiles(SRC_ROOT).filter((path) => {
      const source = readFileSync(path, "utf8")
      return source.includes(FORBIDDEN_SNAKE_CASE) || source.includes(FORBIDDEN_CAMEL_CASE)
    })

    expect(occurrences).toEqual([])
  })

  it("aligne le type généré sur le fait explicite exposé par la vue", () => {
    const generatedTypes = readFileSync(
      GENERATED_TYPES_PATH,
      "utf8",
    )
    const viewContract = generatedTypes.slice(
      generatedTypes.indexOf("v_crm_account_list: {"),
      generatedTypes.indexOf("v_financial_model_activity_rates: {"),
    )

    expect(viewContract).toContain("open_opportunities_count: number | null")
    expect(viewContract).not.toContain(FORBIDDEN_SNAKE_CASE)
    expect(generatedTypes).not.toContain(FORBIDDEN_SNAKE_CASE)
  })

  it("ne détourne pas le compteur d'opportunités dans les loaders sans besoin métier", () => {
    const accountListLoader = readFileSync(
      join(SRC_ROOT, "lib/accounts-contacts/accounts-contacts-data.ts"),
      "utf8",
    )
    const launcherRoute = readFileSync(
      join(SRC_ROOT, "app/api/prospection/accounts/launcher/route.ts"),
      "utf8",
    )

    expect(accountListLoader).not.toContain("open_opportunities_count")
    expect(launcherRoute).not.toContain("open_opportunities_count")
  })

  it("supprime aussi le contrat et le placeholder de score générique du launcher", () => {
    const launcher = readFileSync(
      join(SRC_ROOT, "components/crm/launcher/CrmAccountLauncher.tsx"),
      "utf8",
    )
    const accountCard = readFileSync(
      join(SRC_ROOT, "components/crm/launcher/CrmLauncherAccountCard.tsx"),
      "utf8",
    )

    expect(launcher).not.toContain("score: number | null")
    expect(accountCard).not.toContain("account.score")
  })
})
