import { describe, expect, it } from "vitest"
import { parseCompetitiveMapOutput, parseStudySnapshotDate } from "./competitive-map-output"

/** Fixture trimmée du livrable réel — docs/FEATURES/sector_intelligence/livrables_etudes/2026-08-btp-travaux-publics/export.json */
function btpFixture(overrides: { meta?: Record<string, unknown>; comptes?: unknown[] } = {}) {
  return {
    meta: {
      secteur: "Construction (BTP)",
      segment: "Travaux publics et construction d'envergure",
      geographie: "France entière",
      date_snapshot: "08/08/2026",
      compte_etalon: "Eiffage",
      ...overrides.meta,
    },
    comptes: overrides.comptes ?? [
      {
        nom: "Eiffage",
        categorie: "leader",
        justification_categorie: "Membre du cœur du groupement EPR2",
        ca_meur: 25300,
        exercice: 2025,
        perimetre_ca: "groupe monde",
        effectif_france: null,
        empreinte_metier: 5,
        maturite_numerique: 5,
        appetence: { capacite_a_payer: 5, intensite_it: 5, moment: 3, accessibilite: 2, fit_offre: 4, total: 19 },
        angle_entree: "Passage à l'échelle de l'IA",
        confiance: "moyenne",
        trous: ["effectif France"],
      },
      {
        nom: "Demathieu Bard",
        categorie: "mid-market",
        ca_meur: 2080,
        exercice: 2024,
        perimetre_ca: "groupe",
        effectif_france: null,
        empreinte_metier: 3,
        maturite_numerique: 2.5,
        appetence: { total: 16 },
        confiance: "faible",
      },
    ],
    ecartes: [{ nom: "Eurovia", motif: "Doublon" }],
  }
}

describe("parseStudySnapshotDate", () => {
  it("convertit le format français JJ/MM/AAAA en ISO", () => {
    expect(parseStudySnapshotDate("08/08/2026")).toBe("2026-08-08")
  })

  it("laisse passer un format déjà ISO", () => {
    expect(parseStudySnapshotDate("2026-08-08")).toBe("2026-08-08")
  })

  it("rejette un format inconnu", () => {
    expect(parseStudySnapshotDate("8 août 2026")).toBeNull()
    expect(parseStudySnapshotDate(null)).toBeNull()
  })
})

describe("parseCompetitiveMapOutput", () => {
  it("parse le livrable BTP réel (fixture trimmée) sans erreur", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    expect("data" in result).toBe(true)
    if (!("data" in result)) throw new Error("expected data")

    expect(result.data.secteur).toBe("Construction (BTP)")
    expect(result.data.dateSnapshot).toBe("2026-08-08")
    expect(result.data.comptes).toHaveLength(2)
    expect(result.warnings).toHaveLength(1)
  })

  it("normalise une catégorie à tiret (mid-market) vers l'underscore attendu par la base", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[1].categorie).toBe("mid_market")
  })

  it("arrondit les demi-points empreinte_metier/maturite_numerique (colonnes smallint)", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[1].maturiteNumerique).toBe(3)
  })

  it("lit appetence.total comme appetenceScore", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].appetenceScore).toBe(19)
  })

  it("tolère ca_meur/effectif_france absents (Néolithe dans le livrable réel)", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          {
            nom: "Néolithe",
            categorie: "outsider_emergent",
            ca_meur: null,
            effectif_france: null,
            confiance: "faible",
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].caMeur).toBeNull()
    expect(result.data.comptes[0].effectifFrance).toBeNull()
  })

  it("rejette un fichier sans bloc meta", () => {
    const result = parseCompetitiveMapOutput({ comptes: [] })
    expect("errors" in result).toBe(true)
  })

  it("rejette une catégorie hors domaine", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({ comptes: [{ nom: "X", categorie: "inconnu", confiance: "haute" }] }),
    )
    expect("errors" in result).toBe(true)
    if (!("errors" in result)) throw new Error("expected errors")
    expect(result.errors[0].path).toContain("categorie")
  })

  it("rejette une date de snapshot invalide", () => {
    const result = parseCompetitiveMapOutput(btpFixture({ meta: { date_snapshot: "pas une date" } }))
    expect("errors" in result).toBe(true)
  })

  it("rejette un tableau comptes vide", () => {
    const result = parseCompetitiveMapOutput(btpFixture({ comptes: [] }))
    expect("errors" in result).toBe(true)
  })
})
