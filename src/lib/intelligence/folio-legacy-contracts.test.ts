import { describe, expect, it } from "vitest"
import {
  parseFolioAccountAnalysis,
  parseFolioLegacyPayload,
  parseFolioSectorAnalysis,
} from "./folio-legacy-contracts"

// Échantillon calqué sur la structure RÉELLE observée en base (identique sur
// les 93 comptes porteurs) : 5 sections, `dirigeants` /
// `concurrents_identifies` / `actualites_recentes` en tableaux, le reste en
// chaînes, et « Non trouvé » utilisé comme valeur de champ.
const REAL_SHAPE_ANALYSIS_DATA = {
  identite: {
    nom_complet: "Régie Ligne d'Azur",
    forme_juridique: "EPIC (Établissement Public Industriel et Commercial)",
    code_naf: "4931Z (Transports urbains et suburbains de voyageurs)",
    siege_social: "2 boulevard Henri Sappia, 06100 Nice",
    date_creation: "Non trouvé",
    effectif_estime: "1 700 employés",
    ca_estime: "Non trouvé",
    dirigeants: ["Gaël Nofri (Président)", "Julie Réti (Directrice générale)"],
  },
  positionnement: {
    activite_principale: "Exploitation des lignes de transport en commun",
    proposition_valeur: "Réseau urbain complet et multimodal",
    clients_types: "Usagers de la Métropole Nice Côte d'Azur",
    zone_geographique: "Métropole Nice Côte d'Azur",
  },
  signaux: {
    actualites_recentes: ["Adaptation de plusieurs lignes", "Modifications du réseau"],
    tendance_croissance: "Réseau en évolution continue",
    recrutements_recents: "Non trouvé",
    indices_maturite_digitale: "Niveau avancé : application mobile dédiée",
  },
  contexte_sectoriel: {
    secteur: "Transport public urbain",
    concurrents_identifies: ["Non trouvé (opérateur public en monopole)"],
    tendances_sectorielles: "Digitalisation des services de mobilité",
  },
  synthese_consultant: "Opérateur public de transport de la Métropole.",
}

describe("parseFolioAccountAnalysis — Phase 1", () => {
  it("lit la structure réelle et conserve les tableaux", () => {
    const parsed = parseFolioAccountAnalysis(REAL_SHAPE_ANALYSIS_DATA)
    expect(parsed).not.toBeNull()
    expect(parsed?.identite?.nom_complet).toBe("Régie Ligne d'Azur")
    expect(parsed?.identite?.dirigeants).toHaveLength(2)
    expect(parsed?.signaux?.actualites_recentes).toHaveLength(2)
    expect(parsed?.synthese_consultant).toContain("Opérateur public")
  })

  it("écarte les champs valant exactement « Non trouvé »", () => {
    const parsed = parseFolioAccountAnalysis(REAL_SHAPE_ANALYSIS_DATA)
    expect(parsed?.identite?.date_creation).toBeUndefined()
    expect(parsed?.identite?.ca_estime).toBeUndefined()
    expect(parsed?.signaux?.recrutements_recents).toBeUndefined()
  })

  it("conserve une valeur qui commence par « Non trouvé » mais reste informative", () => {
    // Sans ce comportement, on perdrait des constats réels de la base.
    const parsed = parseFolioAccountAnalysis(REAL_SHAPE_ANALYSIS_DATA)
    expect(parsed?.contexte_sectoriel?.concurrents_identifies).toEqual([
      "Non trouvé (opérateur public en monopole)",
    ])
  })

  it("retourne null pour un compte sans FOLIO", () => {
    expect(parseFolioAccountAnalysis(null)).toBeNull()
    expect(parseFolioAccountAnalysis(undefined)).toBeNull()
    expect(parseFolioAccountAnalysis({})).toBeNull()
  })

  it("retourne null quand tout le contenu est un marqueur d'absence", () => {
    const empty = {
      identite: { ca_estime: "Non trouvé", date_creation: "N/A" },
      synthese_consultant: "",
    }
    expect(parseFolioAccountAnalysis(empty)).toBeNull()
  })

  it("ignore un type inattendu sans lever", () => {
    expect(parseFolioAccountAnalysis("chaîne")).toBeNull()
    expect(parseFolioAccountAnalysis([1, 2, 3])).toBeNull()
    const partial = parseFolioAccountAnalysis({ identite: { dirigeants: "pas un tableau" } })
    expect(partial).toBeNull()
  })
})

describe("parseFolioSectorAnalysis — Phase 2", () => {
  it("laisse passer une étude sectorielle substantielle", () => {
    const parsed = parseFolioSectorAnalysis({
      synthese_sectorielle: "Marché de la parfumerie en consolidation.",
      volume_marche: { taille_marche_france: "5 Md€" },
    })
    expect(parsed?.synthese_sectorielle).toContain("parfumerie")
  })

  it("retourne null pour une coquille vide", () => {
    expect(parseFolioSectorAnalysis(null)).toBeNull()
    expect(parseFolioSectorAnalysis({})).toBeNull()
    expect(parseFolioSectorAnalysis({ synthese_sectorielle: "Non trouvé" })).toBeNull()
  })
})

describe("parseFolioLegacyPayload", () => {
  it("étiquette systématiquement la provenance comme legacy", () => {
    const payload = parseFolioLegacyPayload({ analysis_data: REAL_SHAPE_ANALYSIS_DATA })
    expect(payload.provenance).toBe("folio_legacy")
    expect(payload.accountAnalysis).not.toBeNull()
    expect(payload.sectorAnalysis).toBeNull()
  })

  it("sépare Phase 1 et Phase 2 sans les fusionner", () => {
    const payload = parseFolioLegacyPayload({
      analysis_data: REAL_SHAPE_ANALYSIS_DATA,
      sector_analysis: { synthese_sectorielle: "Transport public régional." },
    })
    expect(payload.accountAnalysis?.identite?.nom_complet).toBe("Régie Ligne d'Azur")
    expect(payload.sectorAnalysis?.synthese_sectorielle).toBe("Transport public régional.")
  })

  it("reste exploitable pour un compte totalement dépourvu de FOLIO", () => {
    const payload = parseFolioLegacyPayload({})
    expect(payload).toEqual({
      provenance: "folio_legacy",
      accountAnalysis: null,
      sectorAnalysis: null,
    })
  })

  it("n'expose aucune conversion vers Claim", async () => {
    // Garde-fou d'architecture : si quelqu'un ajoute un jour un
    // `folioFactToClaim()`, ce test échoue et force la discussion — du FOLIO
    // ne peut pas devenir un fait sourcé, il n'a pas de sources.
    const moduleExports = await import("./folio-legacy-contracts")
    const suspicious = Object.keys(moduleExports).filter((key) => /claim/i.test(key))
    expect(suspicious).toEqual([])
  })
})
