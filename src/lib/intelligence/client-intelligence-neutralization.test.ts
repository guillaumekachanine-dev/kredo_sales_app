import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Client Intelligence Read Model - neutralisation FOLIO", () => {
  it("neutralise les signaux dans parseAnalyseClient et lit v_active_account_signals", () => {
    const source = readFileSync("src/lib/intelligence/intelligence-data.ts", "utf8")

    // Vérifie que parseAnalyseClient renvoie des signaux vides
    expect(source).toContain("signaux: {\n      actualitesRecentes: [],\n      tendanceCroissance: \"\",\n      recrutementsRecents: \"\",\n      maturiteDigitale: \"\",\n    }")

    // Vérifie que getClientIntelligence lit v_active_account_signals
    expect(source).toContain('.from("v_active_account_signals")')
  })

  it("garantit que CompanyIdentityDrawer ne consomme plus analysis_data.signaux", () => {
    const source = readFileSync("src/components/accounts-contacts/CompanyIdentityDrawer.tsx", "utf8")

    expect(source).not.toContain("signaux.actualites_recentes")
    expect(source).not.toContain("signaux.tendance_croissance")
    expect(source).not.toContain("signaux.recrutements_recents")
    expect(source).not.toContain("signaux.indices_maturite_digitale")
    expect(source).not.toContain("analysisData.signaux")
  })
})
