import { describe, expect, it } from "vitest"
import {
  COMPANY_RELATION_TYPE_VALUES,
  COMPANY_TIER_VALUES,
  normalizeCompanyRelationType,
  normalizeCompanyTier,
} from "./company-constants"

// Régression : les deux normalisations couvrent des bugs qui étaient LIVE.
// La modale « Nouveau compte » écrivait le libellé d'affichage directement dans
// la colonne, et chaque enregistrement échouait en 23514 (violation de CHECK).

describe("normalizeCompanyTier", () => {
  it("ne renvoie jamais une valeur hors du domaine de companies.tier", () => {
    const inputs = ["CAC40", "ETI", "PME", "TPE", "etablissement_public", "grand_compte", "n_importe_quoi"]
    for (const input of inputs) {
      const result = normalizeCompanyTier(input)
      if (result !== null) {
        expect(COMPANY_TIER_VALUES).toContain(result)
      }
    }
  })

  it("replie le vocabulaire d'affichage sur les trois valeurs stockées", () => {
    expect(normalizeCompanyTier("CAC40")).toBe("grand_compte")
    expect(normalizeCompanyTier("etablissement_public")).toBe("grand_compte")
    expect(normalizeCompanyTier("TPE")).toBe("pme")
    expect(normalizeCompanyTier("ETI")).toBe("eti")
  })

  it("est insensible à la casse et aux espaces", () => {
    expect(normalizeCompanyTier("  Grand_Compte ")).toBe("grand_compte")
  })

  it("renvoie null sur une valeur vide ou inconnue plutôt que de la propager", () => {
    expect(normalizeCompanyTier(null)).toBeNull()
    expect(normalizeCompanyTier("")).toBeNull()
    expect(normalizeCompanyTier("licorne")).toBeNull()
  })
})

describe("normalizeCompanyRelationType", () => {
  it("ne renvoie jamais une valeur hors du domaine de companies.relation_type", () => {
    const inputs = ["prospect", "client", "client_actif", "client_dormant", "ancien_client", "partenaire", "pair_partenaire", "cible", undefined]
    for (const input of inputs) {
      expect(COMPANY_RELATION_TYPE_VALUES).toContain(normalizeCompanyRelationType(input))
    }
  })

  it("traduit le libellé UI « partenaire » en pair_partenaire", () => {
    expect(normalizeCompanyRelationType("partenaire")).toBe("pair_partenaire")
  })

  it("laisse pair_partenaire inchangé — sans ce cas, rouvrir la modale déclassait le compte en prospect", () => {
    expect(normalizeCompanyRelationType("pair_partenaire")).toBe("pair_partenaire")
  })

  it("replie les statuts client legacy sur `client`", () => {
    expect(normalizeCompanyRelationType("client_actif")).toBe("client")
    expect(normalizeCompanyRelationType("client_dormant")).toBe("client")
  })

  it("retombe sur prospect pour toute valeur inconnue", () => {
    expect(normalizeCompanyRelationType("cible")).toBe("prospect")
    expect(normalizeCompanyRelationType(undefined)).toBe("prospect")
  })
})
