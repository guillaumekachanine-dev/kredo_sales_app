import { describe, expect, it } from "vitest"
import {
  computeCanonicalAppetenceScore,
  normalizeConfiance,
  parseCompetitiveMapOutput,
  parseStudySnapshotDate,
} from "./competitive-map-output"

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
    expect(result.warnings.some((w) => w.includes("écarté(s) par l'étude"))).toBe(true)
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

  it("conserve le total déclaré par l'étude à côté du score canonique", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")
    // Le livrable BTP annonce 19 ; la formule canonique donne 24. Les deux
    // restent lisibles, seul le canonique est persisté (cf. bloc Lot 1).
    expect(result.data.comptes[0].appetence?.totalDeclare).toBe(19)
    expect(result.data.comptes[0].appetenceScore).toBe(24)
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

/**
 * BI « Environnement concurrentiel » Lot 1 — l'extension du contrat est
 * rétrocompatible : ces tests cadrent uniquement ce que le lot ajoute
 * (accessibilité, score canonique /35, profile_json, compte étalon) et le fait
 * qu'un export V1 continue de passer sans retouche.
 */
describe("parseCompetitiveMapOutput — extension Lot 1 (BI environnement concurrentiel)", () => {
  it("accepte toujours un JSON V1 : ni appetence détaillée, ni profil_compte, ni accessibilité", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        meta: { compte_etalon: null },
        comptes: [
          {
            nom: "Colas",
            categorie: "leader",
            ca_meur: 16800,
            exercice: 2024,
            empreinte_metier: 5,
            maturite_numerique: 4,
            appetence: { total: 21 },
            confiance: "haute",
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")

    const compte = result.data.comptes[0]
    expect(compte.nom).toBe("Colas")
    // Composantes incomplètes -> canonique incalculable -> le total déclaré survit.
    expect(compte.appetence?.totalCanonique).toBeNull()
    expect(compte.appetenceScore).toBe(21)
    expect(compte.accessibiliteScore).toBeNull()
    expect(compte.estCompteEtalon).toBe(false)
    expect(compte.profil).toEqual({})
  })

  it("parse la composante accessibilité comme axe autonome", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")

    // Eiffage : accessibilite 2 dans le bloc appetence du livrable réel.
    expect(result.data.comptes[0].accessibiliteScore).toBe(2)
    expect(result.data.comptes[0].appetence?.accessibilite).toBe(2)
    // Demathieu Bard : bloc appetence réduit à `total`, pas d'accessibilité.
    expect(result.data.comptes[1].accessibiliteScore).toBeNull()
  })

  it("calcule le score canonique /35 = capacité + IT + 2×moment + 2×accessibilité + fit", () => {
    expect(
      computeCanonicalAppetenceScore({
        capaciteAPayer: 5,
        intensiteIt: 5,
        moment: 3,
        accessibilite: 2,
        fitOffre: 4,
      }),
    ).toBe(24)

    // Le maximum de la grille est bien 35, borne du CHECK SQL.
    expect(
      computeCanonicalAppetenceScore({
        capaciteAPayer: 5,
        intensiteIt: 5,
        moment: 5,
        accessibilite: 5,
        fitOffre: 5,
      }),
    ).toBe(35)

    // Une composante manquante ne produit jamais une somme partielle.
    expect(
      computeCanonicalAppetenceScore({
        capaciteAPayer: 5,
        intensiteIt: 5,
        moment: 3,
        accessibilite: null,
        fitOffre: 4,
      }),
    ).toBeNull()
  })

  it("émet un warning quand appetence.total diverge du canonique, et persiste le canonique", () => {
    const result = parseCompetitiveMapOutput(btpFixture())
    if (!("data" in result)) throw new Error("expected data")

    const mismatch = result.warnings.find((w) => w.includes("Eiffage") && w.includes("canonique"))
    expect(mismatch).toBeDefined()
    expect(mismatch).toContain("19")
    expect(mismatch).toContain("24")
    expect(result.data.comptes[0].appetenceScore).toBe(24)
  })

  it("n'émet aucun warning de divergence quand le total déclaré est juste", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          {
            nom: "Eiffage",
            categorie: "leader",
            appetence: {
              capacite_a_payer: 5,
              intensite_it: 5,
              moment: 3,
              accessibilite: 2,
              fit_offre: 4,
              total: 24,
            },
            confiance: "moyenne",
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.warnings.some((w) => w.includes("canonique"))).toBe(false)
    expect(result.data.comptes[0].appetenceScore).toBe(24)
  })

  it("agrège le bloc profil_compte et les champs narratifs V1 dans profil", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          {
            nom: "Eiffage",
            categorie: "leader",
            confiance: "moyenne",
            // Champs déjà présents au niveau du compte dans les exports V1.
            trigger_events: [{ date: "2026-T1", fait: "Carnet de commandes record", source: "communiqué" }],
            a_ne_pas_dire: "Discours d'évangélisation sur l'IA",
            trous: ["effectif France"],
            sources: [{ url: "https://exemple.test", atteste: "CA 2025", tier: 2 }],
            // Bloc optionnel introduit par le Lot 1.
            profil_compte: {
              proposition_valeur: "Bout en bout travaux + concessions",
              dependances_cles: ["Commande publique"],
              differenciateurs: ["Modèle concessions"],
              modele_economique: "Travaux + concessions",
              chaine_valeur: { position: "intégrateur" },
              priorites_strategiques: ["Datacenters hyperscale"],
              chantiers_technologiques: ["Passage à l'échelle de l'IA"],
              // Clés vides : ne doivent pas polluer profile_json.
              trous_supplementaires: [],
            },
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")

    const profil = result.data.comptes[0].profil
    expect(profil.proposition_valeur).toBe("Bout en bout travaux + concessions")
    expect(profil.modele_economique).toBe("Travaux + concessions")
    expect(profil.chaine_valeur).toEqual({ position: "intégrateur" })
    expect(profil.dependances_cles).toEqual(["Commande publique"])
    expect(profil.differenciateurs).toEqual(["Modèle concessions"])
    expect(profil.priorites_strategiques).toEqual(["Datacenters hyperscale"])
    expect(profil.chantiers_technologiques).toEqual(["Passage à l'échelle de l'IA"])
    // Champs V1 remontés tels quels.
    expect(profil.a_ne_pas_dire).toBe("Discours d'évangélisation sur l'IA")
    expect(profil.trous).toEqual(["effectif France"])
    expect(Array.isArray(profil.trigger_events)).toBe(true)
    expect(Array.isArray(profil.sources)).toBe(true)
    // Aucun fait chiffré sourcé ne transite par profile_json (ADR-0019 D-4).
    expect(profil).not.toHaveProperty("ca_meur")
    expect(profil).not.toHaveProperty("effectif_france")
    // Une clé hors liste ou vide n'entre pas.
    expect(profil).not.toHaveProperty("trous_supplementaires")
  })

  it("extrait l'intégralité des 6 blocs V1.1 de profil_compte (couche ESN, grilles, traduction commerciale...)", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          {
            nom: "Airbus Defence and Space",
            categorie: "leader",
            confiance: "haute",
            profil_compte: {
              metier_chaine_valeur: "Constructeur & intégrateur spatial",
              maillon: "Maître d'œuvre",
              contrats_majeurs: [{ intitule: "EPR2", montant: "200M€" }],
              grilles: {
                financiere: "CA 12M€",
                ia_annonce_vs_deploye: "Discours IA générative fort, mais seuls 2 POCs déployés en production",
              },
              couche_esn: {
                organisation_si: "DSI centrale 200 personnes",
                decideur_si: "CTO / Directeur Innovation",
                voie_entree_probable: "Tierce maintenance applicative sur le socle Data",
              },
              traduction_commerciale: {
                angle: "Industrialisation de la chaîne IA",
                accroches: ["Votre POC IA stagne ?", "Sécurisez vos déploiements"],
                a_ne_pas_dire: "Ne pas proposer d'assistance technique régie",
              },
            },
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")

    const profil = result.data.comptes[0].profil
    expect(profil.metier_chaine_valeur).toBe("Constructeur & intégrateur spatial")
    expect(profil.maillon).toBe("Maître d'œuvre")
    expect(profil.contrats_majeurs).toEqual([{ intitule: "EPR2", montant: "200M€" }])
    expect(profil.grilles).toEqual({
      financiere: "CA 12M€",
      ia_annonce_vs_deploye: "Discours IA générative fort, mais seuls 2 POCs déployés en production",
    })
    expect(profil.couche_esn).toEqual({
      organisation_si: "DSI centrale 200 personnes",
      decideur_si: "CTO / Directeur Innovation",
      voie_entree_probable: "Tierce maintenance applicative sur le socle Data",
    })
    expect(profil.traduction_commerciale).toEqual({
      angle: "Industrialisation de la chaîne IA",
      accroches: ["Votre POC IA stagne ?", "Sécurisez vos déploiements"],
      a_ne_pas_dire: "Ne pas proposer d'assistance technique régie",
    })
  })

  it("recalcule le score quand l'étude a sommé naïvement les 5 composantes (/25 legacy)", () => {
    // Cas réel : les 14 comptes du livrable BTP d'août 2026 somment sans
    // pondérer. 5+5+3+2+4 = 19 au lieu de 5+5+2×3+2×2+4 = 24.
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          {
            nom: "Eiffage",
            categorie: "leader",
            confiance: "moyenne",
            appetence: {
              capacite_a_payer: 5,
              intensite_it: 5,
              moment: 3,
              accessibilite: 2,
              fit_offre: 4,
              total: 19,
            },
          },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")

    // L'import passe, le fichier n'est pas rejeté.
    expect(result.data.comptes).toHaveLength(1)
    // La valeur persistée est le canonique, jamais la somme naïve.
    expect(result.data.comptes[0].appetenceScore).toBe(24)
    expect(result.data.comptes[0].appetence?.totalDeclare).toBe(19)
    expect(result.warnings.some((w) => w.includes("Eiffage") && w.includes("canonique"))).toBe(true)
  })

  it("marque le compte étalon désigné par meta.compte_etalon, accents et casse ignorés", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        meta: { compte_etalon: "EIFFAGE" },
        comptes: [
          { nom: "Eiffage", categorie: "leader", confiance: "moyenne" },
          { nom: "Demathieu Bard", categorie: "mid-market", confiance: "faible" },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].estCompteEtalon).toBe(true)
    expect(result.data.comptes[1].estCompteEtalon).toBe(false)
  })

  it("reconnaît le compte étalon malgré accents, casse et ponctuation divergents", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        meta: { compte_etalon: "FAYAT - RAZEL BEC" },
        comptes: [
          { nom: "Fayat — Razel-Bec", categorie: "challenger", confiance: "moyenne" },
          { nom: "Léon Grosse", categorie: "mid-market", confiance: "faible" },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].estCompteEtalon).toBe(true)
    expect(result.data.comptes[1].estCompteEtalon).toBe(false)
  })

  it("reconnaît un compte étalon accentué désigné sans accent", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        meta: { compte_etalon: "leon grosse" },
        comptes: [{ nom: "Léon Grosse", categorie: "mid-market", confiance: "faible" }],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].estCompteEtalon).toBe(true)
  })

  it("avertit sans rejeter quand meta.compte_etalon ne correspond à aucun compte", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        meta: { compte_etalon: "Bouygues" },
        comptes: [{ nom: "Eiffage", categorie: "leader", confiance: "moyenne" }],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes.every((c) => !c.estCompteEtalon)).toBe(true)
    expect(result.warnings.some((w) => w.includes("Bouygues") && w.includes("introuvable"))).toBe(true)
  })
})

/**
 * Contrat `confiance` — le domaine canonique KREDO reste `haute | moyenne |
 * faible` (CHECK SQL inchangé). Le kit de génération écrivait `elevee` : les
 * exports antérieurs doivent rester importables, sans que la valeur legacy
 * n'atteigne jamais la base.
 */
describe("normalizeConfiance", () => {
  it.each([
    ["haute", "haute"],
    ["elevee", "haute"],
    ["élevée", "haute"],
    ["Élevée", "haute"],
    ["ÉLEVÉE", "haute"],
    ["  Haute  ", "haute"],
    ["moyenne", "moyenne"],
    ["Moyenne", "moyenne"],
    ["faible", "faible"],
  ])("normalise « %s » en « %s »", (input, expected) => {
    expect(normalizeConfiance(input)).toBe(expected)
  })

  it.each([["elevé"], ["forte"], ["high"], ["élevé"], [""], [null], [3]])(
    "rejette la valeur hors domaine %s",
    (input) => {
      expect(normalizeConfiance(input)).toBeNull()
    },
  )
})

describe("parseCompetitiveMapOutput — contrat confiance", () => {
  it("accepte un export legacy « elevee » et le persiste en « haute »", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({ comptes: [{ nom: "Eiffage", categorie: "leader", confiance: "elevee" }] }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes[0].confiance).toBe("haute")
  })

  it("accepte « élevée » accentué et avertit une seule fois pour tout le fichier", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({
        comptes: [
          { nom: "Eiffage", categorie: "leader", confiance: "élevée" },
          { nom: "Colas", categorie: "leader", confiance: "Élevée" },
          { nom: "NGE", categorie: "challenger", confiance: "moyenne" },
        ],
      }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.data.comptes.map((c) => c.confiance)).toEqual(["haute", "haute", "moyenne"])

    const legacyWarnings = result.warnings.filter((w) => w.startsWith("Confiance :"))
    expect(legacyWarnings).toHaveLength(1)
  })

  it("n'avertit pas quand l'export utilise déjà le domaine canonique", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({ comptes: [{ nom: "Eiffage", categorie: "leader", confiance: "haute" }] }),
    )
    if (!("data" in result)) throw new Error("expected data")
    expect(result.warnings.some((w) => w.startsWith("Confiance :"))).toBe(false)
  })

  it("rejette le fichier entier sur une confiance hors domaine", () => {
    const result = parseCompetitiveMapOutput(
      btpFixture({ comptes: [{ nom: "Eiffage", categorie: "leader", confiance: "forte" }] }),
    )
    expect("errors" in result).toBe(true)
    if (!("errors" in result)) throw new Error("expected errors")
    expect(result.errors[0].path).toContain("confiance")
  })
})
