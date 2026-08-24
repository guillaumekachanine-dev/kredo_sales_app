import { describe, expect, it } from "vitest"
import {
  corpusSelectorKey,
  MAX_DOCUMENT_IDS_PER_SELECTOR,
  parseCorpusSelector,
  parseCorpusSelectors,
} from "../domain/mission-selectors"

const UUID_A = "11111111-1111-1111-1111-111111111111"
const UUID_B = "22222222-2222-2222-2222-222222222222"

describe("parseCorpusSelector — veille_period", () => {
  it("accepte un intervalle de dates calendaires valide", () => {
    expect(
      parseCorpusSelector({ kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }),
    ).toEqual({ kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" })
  })

  it("refuse une date qui n'existe pas, malgré une forme correcte", () => {
    expect(
      parseCorpusSelector({ kind: "veille_period", periodStart: "2026-02-31", periodEnd: "2026-03-01" }),
    ).toBeNull()
  })

  it("refuse un horodatage, une date partielle et un intervalle inversé", () => {
    expect(
      parseCorpusSelector({ kind: "veille_period", periodStart: "2026-07-01T00:00:00Z", periodEnd: "2026-07-31" }),
    ).toBeNull()
    expect(parseCorpusSelector({ kind: "veille_period", periodStart: "2026-07", periodEnd: "2026-07-31" })).toBeNull()
    expect(
      parseCorpusSelector({ kind: "veille_period", periodStart: "2026-07-31", periodEnd: "2026-07-01" }),
    ).toBeNull()
  })
})

describe("parseCorpusSelector — delivery_period", () => {
  it("accepte un intervalle de dates calendaires valide", () => {
    expect(
      parseCorpusSelector({ kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }),
    ).toEqual({ kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" })
  })

  it("refuse une date qui n'existe pas, malgré une forme correcte", () => {
    expect(
      parseCorpusSelector({ kind: "delivery_period", periodStart: "2026-02-31", periodEnd: "2026-03-01" }),
    ).toBeNull()
  })

  it("refuse un horodatage, une date partielle et un intervalle inversé", () => {
    expect(
      parseCorpusSelector({ kind: "delivery_period", periodStart: "2026-07-01T00:00:00Z", periodEnd: "2026-07-31" }),
    ).toBeNull()
    expect(parseCorpusSelector({ kind: "delivery_period", periodStart: "2026-07", periodEnd: "2026-07-31" })).toBeNull()
    expect(
      parseCorpusSelector({ kind: "delivery_period", periodStart: "2026-07-31", periodEnd: "2026-07-01" }),
    ).toBeNull()
  })
})

describe("parseCorpusSelector — prospection_window", () => {
  it("accepte un intervalle de dates calendaires valide", () => {
    expect(
      parseCorpusSelector({ kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" }),
    ).toEqual({ kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" })
  })

  it("refuse une date qui n'existe pas, malgré une forme correcte", () => {
    expect(
      parseCorpusSelector({ kind: "prospection_window", periodStart: "2026-02-31", periodEnd: "2026-03-01" }),
    ).toBeNull()
  })

  it("refuse un horodatage, une date partielle et un intervalle inversé", () => {
    expect(
      parseCorpusSelector({ kind: "prospection_window", periodStart: "2026-08-01T00:00:00Z", periodEnd: "2026-08-31" }),
    ).toBeNull()
    expect(parseCorpusSelector({ kind: "prospection_window", periodStart: "2026-08", periodEnd: "2026-08-31" })).toBeNull()
    expect(
      parseCorpusSelector({ kind: "prospection_window", periodStart: "2026-08-31", periodEnd: "2026-08-01" }),
    ).toBeNull()
  })
})

describe("parseCorpusSelector — intelligence_document", () => {
  it("accepte des uuid et les déduplique", () => {
    expect(parseCorpusSelector({ kind: "intelligence_document", ids: [UUID_A, UUID_A, UUID_B] })).toEqual({
      kind: "intelligence_document",
      ids: [UUID_A, UUID_B],
    })
  })

  it("refuse une liste vide, un non-uuid et une liste trop longue", () => {
    expect(parseCorpusSelector({ kind: "intelligence_document", ids: [] })).toBeNull()
    expect(parseCorpusSelector({ kind: "intelligence_document", ids: ["' or 1=1 --"] })).toBeNull()
    expect(
      parseCorpusSelector({
        kind: "intelligence_document",
        ids: Array.from({ length: MAX_DOCUMENT_IDS_PER_SELECTOR + 1 }, () => UUID_A),
      }),
    ).toBeNull()
  })
})

describe("parseCorpusSelector — formes hostiles", () => {
  it("refuse tout ce qui n'est pas un sélecteur connu", () => {
    for (const hostile of [
      null,
      undefined,
      "veille_period",
      42,
      [],
      {},
      { kind: "rpc_context", rpc: "get_manager_summary_facts" },
      { kind: "account_context" },
      { kind: "account_context", companyId: 12 },
      { kind: "content_collection", id: UUID_A },
    ]) {
      expect(parseCorpusSelector(hostile)).toBeNull()
    }
  })

  it("ne conserve aucune clé inconnue du sélecteur rendu", () => {
    const parsed = parseCorpusSelector({
      kind: "account_context",
      companyId: UUID_A,
      workspaceId: "workspace-de-l-attaquant",
      resultType: "account_issues_map",
    })
    expect(parsed).toEqual({ kind: "account_context", companyId: UUID_A })
  })
})

describe("parseCorpusSelectors", () => {
  it("accepte l'absence de sélecteurs comme une liste vide", () => {
    expect(parseCorpusSelectors(undefined)).toEqual({ selectors: [] })
    expect(parseCorpusSelectors(null)).toEqual({ selectors: [] })
  })

  it("échoue en désignant l'index fautif, sans rien accepter partiellement", () => {
    const result = parseCorpusSelectors([
      { kind: "account_context", companyId: UUID_A },
      { kind: "account_context", companyId: "pas-un-uuid" },
    ])
    expect(result).toEqual({ error: "Sélecteur de corpus invalide à l'index 1." })
  })

  it("refuse tout le lot si un sélecteur delivery_period est invalide", () => {
    const result = parseCorpusSelectors([
      { kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" },
      { kind: "delivery_period", periodStart: "2026-07-31", periodEnd: "2026-07-01" },
    ])
    expect(result).toEqual({ error: "Sélecteur de corpus invalide à l'index 1." })
  })

  it("refuse autre chose qu'un tableau", () => {
    expect(parseCorpusSelectors({ kind: "account_context", companyId: UUID_A })).toEqual({
      error: "`selectors` doit être un tableau.",
    })
  })
})

describe("corpusSelectorKey", () => {
  it("rend la même clé pour deux listes d'ids équivalentes", () => {
    expect(corpusSelectorKey({ kind: "intelligence_document", ids: [UUID_A, UUID_B] })).toBe(
      corpusSelectorKey({ kind: "intelligence_document", ids: [UUID_B, UUID_A] }),
    )
  })

  it("distingue deux périodes différentes", () => {
    expect(corpusSelectorKey({ kind: "veille_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" })).not.toBe(
      corpusSelectorKey({ kind: "veille_period", periodStart: "2026-08-01", periodEnd: "2026-08-31" }),
    )
  })

  it("rend la clé attendue pour un sélecteur delivery_period", () => {
    expect(
      corpusSelectorKey({ kind: "delivery_period", periodStart: "2026-07-01", periodEnd: "2026-07-31" }),
    ).toBe("delivery_period:2026-07-01:2026-07-31")
  })

  it("rend la clé attendue pour un sélecteur prospection_window", () => {
    expect(
      corpusSelectorKey({ kind: "prospection_window", periodStart: "2026-08-01", periodEnd: "2026-08-31" }),
    ).toBe("prospection_window:2026-08-01:2026-08-31")
  })
})
