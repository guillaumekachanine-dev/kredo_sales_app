import { describe, expect, it } from "vitest"
import { extractAccountStudySnapshot, hasAccountStudySnapshotContent } from "./account-study-snapshot"

// Textes réels tirés de docs/MASTER-STUDY/registre/2026-08-parfumerie-compositions-b2b/05-comptes.json
// et .../2026-08-aero-spatial-defense/05-comptes.json — verrouillent le comportement
// sur le canevas E5 "fournisseurs amont → valeur propre → clients" tel qu'il est
// réellement produit, pas une prose imaginée.

const ROBERTET_METIER =
  "Seul acteur du segment integre du sourcing agricole a la composition finale : achat et transformation de matieres naturelles, production d'ingredients, formulation parfumerie et aromes, documentation reglementaire et service client B2B. Fournisseurs amont : filieres agricoles contractualisees et producteurs d'extraits. Valeur propre : maitrise du naturel, de l'extraction a la formule. Clients : marques de parfumerie fine, cosmetique, agroalimentaire et Health & Beauty. Autres metiers du groupe cites sans etre analyses : nutraceutique et actifs sante-beaute."

const THALES_METIER =
  "Architecte-integrateur spatial europeen dual : architecture de mission, plateformes, charges utiles radar et optiques, segments sol, science, exploration, servicing. Discontinuite assumee sur le lancement et, selon les programmes, sur la relation de service final."

describe("extractAccountStudySnapshot — métier & chaîne de valeur", () => {
  it("extrait intro / valeur propre / clients par label, pas par position", () => {
    const snapshot = extractAccountStudySnapshot({ metier_chaine_valeur: ROBERTET_METIER })

    expect(snapshot.metier?.intro).toBe(
      "Seul acteur du segment integre du sourcing agricole a la composition finale : achat et transformation de matieres naturelles, production d'ingredients, formulation parfumerie et aromes, documentation reglementaire et service client B2B"
    )
    expect(snapshot.metier?.valeurPropre).toBe("maitrise du naturel, de l'extraction a la formule")
    // "Clients :" n'est pas la dernière phrase du paragraphe (une phrase "Autres
    // métiers…" suit) — une seule phrase est capturée après le label, jamais
    // jusqu'à la fin du texte.
    expect(snapshot.metier?.clients).toBe("marques de parfumerie fine, cosmetique, agroalimentaire et Health & Beauty")
  })

  it("retombe sur la 1ère phrase quand le canevas à labels est absent", () => {
    const snapshot = extractAccountStudySnapshot({ metier_chaine_valeur: THALES_METIER })

    expect(snapshot.metier?.intro).toBe(
      "Architecte-integrateur spatial europeen dual : architecture de mission, plateformes, charges utiles radar et optiques, segments sol, science, exploration, servicing"
    )
    expect(snapshot.metier?.valeurPropre).toBeNull()
    expect(snapshot.metier?.clients).toBeNull()
  })

  it("n'embarque pas la phrase annexe qui suit parfois Clients, même sans marqueur reconnaissable", () => {
    // Cas réel (Bontoux, aucun marqueur "Autres" ni ":" dans la phrase annexe) —
    // seule une capture "1 phrase après le label" évite ce piège de façon fiable.
    const text =
      "Production d'huiles essentielles depuis 1898. Fournisseurs amont : plantes a parfum. Valeur propre : distillation et extraction. Clients : maisons de composition et industriels de la parfumerie. Filiale de distribution aux Etats-Unis citee sans etre analysee."
    const snapshot = extractAccountStudySnapshot({ metier_chaine_valeur: text })
    expect(snapshot.metier?.clients).toBe("maisons de composition et industriels de la parfumerie")
  })

  it("retourne null si le champ est absent ou vide", () => {
    expect(extractAccountStudySnapshot({}).metier).toBeNull()
    expect(extractAccountStudySnapshot({ metier_chaine_valeur: "   " }).metier).toBeNull()
    expect(extractAccountStudySnapshot(null).metier).toBeNull()
  })
})

describe("extractAccountStudySnapshot — grilles", () => {
  it("lit trajectoire, avantages et vulnérabilité principale", () => {
    const snapshot = extractAccountStudySnapshot({
      grilles: {
        trajectoire: "Expansion Asie et diversification santé-beauté.",
        avantages: "Intégration amont unique sur le segment.",
        vulnerabilite_principale: "Dépendance aux filières agricoles contractualisées.",
      },
    })

    expect(snapshot.trajectoire).toBe("Expansion Asie et diversification santé-beauté.")
    expect(snapshot.avantages).toBe("Intégration amont unique sur le segment.")
    expect(snapshot.vulnerabilitePrincipale).toBe("Dépendance aux filières agricoles contractualisées.")
  })

  it("retourne null pour les champs absents, sans planter sur grilles manquant", () => {
    const snapshot = extractAccountStudySnapshot({})
    expect(snapshot.trajectoire).toBeNull()
    expect(snapshot.avantages).toBeNull()
    expect(snapshot.vulnerabilitePrincipale).toBeNull()
  })
})

describe("extractAccountStudySnapshot — contrats majeurs", () => {
  it("garde la forme réelle (objet, date, montant, source) et écarte les entrées sans objet", () => {
    const snapshot = extractAccountStudySnapshot({
      contrats_majeurs: [
        {
          objet: "Regroupement des établissements sur Grasse.",
          date: "2025-02",
          montant: "non publié",
          source: "https://example.com/a",
        },
        { date: "2025-12", source: "https://example.com/b" }, // pas d'objet → écarté
      ],
    })

    expect(snapshot.contratsMajeurs).toEqual([
      {
        objet: "Regroupement des établissements sur Grasse.",
        date: "2025-02",
        montant: "non publié",
        source: "https://example.com/a",
      },
    ])
  })

  it("retourne un tableau vide si absent ou mal formé", () => {
    expect(extractAccountStudySnapshot({}).contratsMajeurs).toEqual([])
    expect(extractAccountStudySnapshot({ contrats_majeurs: "pas un tableau" }).contratsMajeurs).toEqual([])
  })
})

describe("extractAccountStudySnapshot — traduction commerciale", () => {
  it("lit angle, accroches et à ne pas dire", () => {
    const snapshot = extractAccountStudySnapshot({
      traduction_commerciale: {
        angle: "Sécuriser la chaîne amont face à la volatilité des matières premières.",
        accroches: ["Accroche 1", "Accroche 2"],
        a_ne_pas_dire: "Ne pas évoquer le rachat récent d'un concurrent.",
      },
    })

    expect(snapshot.traductionCommerciale).toEqual({
      angle: "Sécuriser la chaîne amont face à la volatilité des matières premières.",
      accroches: ["Accroche 1", "Accroche 2"],
      aNePasDire: "Ne pas évoquer le rachat récent d'un concurrent.",
    })
  })

  it("retourne null si l'objet est totalement vide", () => {
    expect(extractAccountStudySnapshot({ traduction_commerciale: {} }).traductionCommerciale).toBeNull()
    expect(extractAccountStudySnapshot({}).traductionCommerciale).toBeNull()
  })
})

describe("extractAccountStudySnapshot — trigger events", () => {
  it("lit date, fait et source, écarte les entrées sans fait", () => {
    const snapshot = extractAccountStudySnapshot({
      trigger_events: [
        { date: "2026-02", fait: "Ouverture d'une nouvelle usine.", source: "https://example.com" },
        { date: "2026-03", source: "https://example.com/no-fait" },
      ],
    })

    expect(snapshot.triggerEvents).toEqual([
      { date: "2026-02", fait: "Ouverture d'une nouvelle usine.", source: "https://example.com" },
    ])
  })
})

describe("hasAccountStudySnapshotContent", () => {
  it("est false quand aucun bloc n'a de contenu", () => {
    expect(hasAccountStudySnapshotContent(extractAccountStudySnapshot(null))).toBe(false)
    expect(hasAccountStudySnapshotContent(extractAccountStudySnapshot({}))).toBe(false)
  })

  it("est true dès qu'un seul bloc a du contenu", () => {
    expect(
      hasAccountStudySnapshotContent(extractAccountStudySnapshot({ grilles: { trajectoire: "Croissance." } }))
    ).toBe(true)
  })
})
