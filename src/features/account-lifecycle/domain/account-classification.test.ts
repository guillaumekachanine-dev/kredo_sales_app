import { describe, expect, it } from "vitest"
import {
  CLASSIFICATION_AXES,
  MANDATORY_CLASSIFICATION_AXES,
  defaultAcceptedAxes,
  validateClassificationProposal,
  type AccountClassificationProposal,
  type ClassificationAxis,
} from "./account-classification"

function proposal(
  overrides: Partial<AccountClassificationProposal> = {},
): AccountClassificationProposal {
  return {
    schemaVersion: 1,
    activiteDominante: "Compose et vend des ingrédients parfumants aux marques",
    segmentSlug: "seg-compositions-ingredients",
    macroSlug: "parfumerie-aromes-cosmetique",
    tests: { concurrence: true, acheteurs: true, contraintes: true, offres: true },
    regimeAchat: "regule",
    modeleEco: "industriel",
    tier: "eti",
    verticalClient: ["parfumerie"],
    relationType: "prospect",
    moment: null,
    momentPreuve: null,
    classificationConfiance: "haute",
    classificationNote: null,
    alternativesEcartees: [],
    ...overrides,
  }
}

const ALL_AXES = [...CLASSIFICATION_AXES] as ClassificationAxis[]

describe("validateClassificationProposal — contrôles §10", () => {
  it("une proposition conforme ne produit aucune violation", () => {
    expect(validateClassificationProposal(proposal(), ALL_AXES.filter((a) => a !== "moment"))).toEqual([])
  })

  it("§10.3 — un axe obligatoire écarté sur un compte neuf est bloquant", () => {
    const violations = validateClassificationProposal(proposal(), ["segment", "regime_achat", "modele_eco"])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ rule: "§10.3", axis: "relation_type" })
  })

  it("§10.3 — le même axe écarté passe si la fiche le porte déjà (rescan d'un compte classé)", () => {
    const violations = validateClassificationProposal(
      proposal(),
      ["segment", "regime_achat", "modele_eco"],
      { segmentId: "seg-1", regimeAchat: "regule", modeleEco: "industriel", relationType: "client" },
    )
    expect(violations).toEqual([])
  })

  it("§10.3 — un axe écarté ET vide en base reste bloquant", () => {
    const violations = validateClassificationProposal(
      proposal(),
      ["segment", "regime_achat", "modele_eco"],
      { segmentId: "seg-1", regimeAchat: "regule", modeleEco: "industriel", relationType: null },
    )
    expect(violations.map((v) => v.axis)).toEqual(["relation_type"])
  })

  it("§10.4 — confiance non haute sans note est bloquant", () => {
    const violations = validateClassificationProposal(
      proposal({
        classificationConfiance: "moyenne",
        classificationNote: null,
        tests: { concurrence: true, acheteurs: true, contraintes: false, offres: true },
      }),
      MANDATORY_CLASSIFICATION_AXES,
    )
    expect(violations.map((v) => v.rule)).toContain("§10.4")
  })

  it("§10.4 — la même proposition avec sa note passe", () => {
    const violations = validateClassificationProposal(
      proposal({
        classificationConfiance: "moyenne",
        classificationNote: "À cheval sur deux segments, vérifier la répartition du CA.",
        tests: { concurrence: true, acheteurs: true, contraintes: false, offres: true },
      }),
      MANDATORY_CLASSIFICATION_AXES,
    )
    expect(violations).toEqual([])
  })

  it("§12.8 — confiance « haute » avec un test en échec est refusée", () => {
    const violations = validateClassificationProposal(
      proposal({ tests: { concurrence: true, acheteurs: false, contraintes: true, offres: true } }),
      MANDATORY_CLASSIFICATION_AXES,
    )
    expect(violations.map((v) => v.rule)).toContain("§12.8")
  })

  it("§10.6 / §12.5 — un `moment` sans preuve datée est bloquant", () => {
    const violations = validateClassificationProposal(
      proposal({ moment: "croissance_forte", momentPreuve: null }),
      [...MANDATORY_CLASSIFICATION_AXES, "moment"],
    )
    expect(violations.map((v) => v.rule)).toContain("§10.6")
  })

  it("§10.6 — le même `moment` avec sa preuve passe", () => {
    const violations = validateClassificationProposal(
      proposal({
        moment: "croissance_forte",
        momentPreuve: "Plan de croissance annoncé le 12/03/2026 (communiqué officiel).",
      }),
      [...MANDATORY_CLASSIFICATION_AXES, "moment"],
    )
    expect(violations).toEqual([])
  })

  it("un `moment` écarté ne déclenche pas le contrôle de preuve", () => {
    const violations = validateClassificationProposal(
      proposal({ moment: "croissance_forte", momentPreuve: null }),
      MANDATORY_CLASSIFICATION_AXES,
    )
    expect(violations).toEqual([])
  })

  it("rejette une valeur hors domaine sur un axe normatif", () => {
    const violations = validateClassificationProposal(
      proposal({ regimeAchat: "public" as never }),
      MANDATORY_CLASSIFICATION_AXES,
    )
    expect(violations.map((v) => v.axis)).toContain("regime_achat")
  })
})

describe("defaultAcceptedAxes", () => {
  it("pré-coche les 4 axes obligatoires plus les facultatifs renseignés", () => {
    expect(defaultAcceptedAxes(proposal())).toEqual([
      "segment",
      "regime_achat",
      "modele_eco",
      "tier",
      "vertical_client",
      "relation_type",
    ])
  })

  it("§5.6 — un `tier` NULL est une réponse valide, simplement pas pré-cochée", () => {
    expect(defaultAcceptedAxes(proposal({ tier: null }))).not.toContain("tier")
  })

  it("§12.5 — un `moment` sans preuve n'est jamais pré-coché", () => {
    expect(defaultAcceptedAxes(proposal({ moment: "retournement", momentPreuve: null }))).not.toContain("moment")
  })

  it("un `moment` prouvé est pré-coché", () => {
    expect(
      defaultAcceptedAxes(
        proposal({ moment: "retournement", momentPreuve: "Plan de réduction de coûts annoncé le 04/2026." }),
      ),
    ).toContain("moment")
  })

  it("la sortie suit toujours l'ordre canonique des axes", () => {
    const axes = defaultAcceptedAxes(
      proposal({ moment: "stable", momentPreuve: "Aucun des cinq déclencheurs vérifié au 08/2026." }),
    )
    expect(axes).toEqual([...CLASSIFICATION_AXES])
  })
})
