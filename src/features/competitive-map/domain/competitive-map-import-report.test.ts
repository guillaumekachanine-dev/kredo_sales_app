import { describe, expect, it } from "vitest"
import {
  buildCompetitiveMapImportDocumentTitle,
  buildCompetitiveMapImportReportText,
  isCompetitiveMapImportReportContent,
  type CompetitiveMapImportReportContent,
} from "./competitive-map-import-report"

function baseContent(overrides: Partial<CompetitiveMapImportReportContent> = {}): CompetitiveMapImportReportContent {
  return {
    schemaVersion: 1,
    sectorName: "Tourisme & séjours",
    segmentName: "Séjours & hébergements touristiques",
    segmentSlug: "tourisme-sejours",
    studySnapshotDate: "2026-08-16",
    importedAt: "2026-08-16T16:42:00.000Z",
    sourceFileName: "cartographie-tourisme.json",
    sourceJson: { comptes: [] },
    sourceTruncated: false,
    counts: { analyzed: 14, imported: 12, rejected: 2, excluded: 1, failed: 1, created: 5, attached: 7 },
    createdAccounts: [],
    attachedAccounts: [],
    errors: [],
    ...overrides,
  }
}

describe("isCompetitiveMapImportReportContent", () => {
  it("accepte un contenu valide", () => {
    expect(isCompetitiveMapImportReportContent(baseContent())).toBe(true)
  })

  it("rejette une valeur sans schemaVersion", () => {
    expect(isCompetitiveMapImportReportContent({ sectorName: "x", counts: {} })).toBe(false)
  })

  it("rejette null et les types primitifs", () => {
    expect(isCompetitiveMapImportReportContent(null)).toBe(false)
    expect(isCompetitiveMapImportReportContent("competitive_map_import")).toBe(false)
    expect(isCompetitiveMapImportReportContent(undefined)).toBe(false)
  })
})

describe("buildCompetitiveMapImportReportText", () => {
  it("inclut le secteur, le fichier et le bilan chiffré", () => {
    const text = buildCompetitiveMapImportReportText(baseContent())
    expect(text).toContain("Secteur : Tourisme & séjours")
    expect(text).toContain("Fichier : cartographie-tourisme.json")
    expect(text).toContain("Comptes analysés : 14")
    expect(text).toContain("Comptes importés : 12")
    expect(text).toContain("Comptes rejetés : 2")
    expect(text).toContain("5 comptes créés")
    expect(text).toContain("7 comptes rattachés au CRM")
  })

  it("omet les lignes à zéro pour rester concis", () => {
    const text = buildCompetitiveMapImportReportText(
      baseContent({ counts: { analyzed: 3, imported: 3, rejected: 0, excluded: 0, failed: 0, created: 3, attached: 0 } }),
    )
    expect(text).not.toContain("comptes rattachés au CRM")
    expect(text).not.toContain("comptes exclus")
    expect(text).not.toContain("comptes en erreur")
  })
})

describe("buildCompetitiveMapImportDocumentTitle", () => {
  it("préfixe le nom du segment", () => {
    expect(buildCompetitiveMapImportDocumentTitle({ segmentName: "BTP & Construction" })).toBe(
      "05-comptes - BTP & Construction",
    )
  })
})
