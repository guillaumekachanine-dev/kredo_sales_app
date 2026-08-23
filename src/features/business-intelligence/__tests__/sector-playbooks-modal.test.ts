import { describe, expect, it } from "vitest"
import type { CompetitiveMapActor } from "@/features/competitive-map/data/competitive-map-workspace-types"
import {
  parsePlaybookPersonas,
  parsePlaybookObjections,
  parsePlaybookEntryPoints,
  parsePlaybookRoiArguments,
} from "../models/sector-playbook-parser"
import {
  BATTLE_CARD_RICHNESS_AXES,
  BATTLE_FLIP_HALF_MS,
  BATTLE_FLIP_REDUCED_HALF_MS,
  BATTLE_MAIN_TINT_IMAGE,
  BATTLE_SIDE_TINT_IMAGE,
  PLAYBOOK_SECTION_KEYS,
  assessBattleCardRichness,
  classifyBattleCardRichness,
  flipDirectionFor,
  flipOpacity,
  flipRotation,
  isBattleModeAvailable,
  resolveBattleActor,
} from "../playbooks/battle-workspace-model"

function createMockActor(overrides: Partial<CompetitiveMapActor> = {}): CompetitiveMapActor {
  return {
    id: "cme-1",
    companyId: "comp-1",
    name: "Robertet",
    category: "leader",
    categoryLabel: "Leader",
    confidence: "haute",
    businessFootprintScore: 4,
    digitalMaturityScore: 3,
    appetenceScore: 35,
    accessibilityScore: 5,
    appetenceProvisoire: false,
    isPositioned: true,
    isBenchmarkAccount: true,
    revenueEstimateMeur: 843.9,
    revenueExercice: 2025,
    revenuePerimetre: "groupe",
    headcountFrance: "2500+",
    positioning: "Premier acteur intégré du naturel",
    forces: "Intégration amont-aval et R&D",
    vulnerability: "Exposition au change",
    angleEntree: "Industrialisation gouvernée de NaturIA",
    details: {
      propositionValeur: "Formulation et ingrédients naturels d'excellence",
      differenciateurs: ["Maîtrise du naturel de la plante au concentré"],
      dependances: ["Outils IFRA"],
      chaineValeur: ["Sourcing", "Extraction", "Formulation", "Qualité"],
      chantiersTechnologiques: ["IA de création", "Gouvernance de données"],
      triggers: ["Publication CA semestriel 444 M€", "Intervention DSI aux IA Dates"],
      lignesRouges: ["Ne pas proposer un POC IA basique", "Ne pas parler de restructuration"],
      trous: ["Modèle d'achat IT non formalisé publiquement"],
      metierChaineValeur: "Transformation et formulation",
      maillon: "Maillon 1 & 3",
      contratsMajeurs: ["Regroupement industriel Seveso"],
      grilles: ["CA 843.9 M€", "Marge EBITDA 20.6%"],
      coucheEsn: ["DSI Global identifié publiquement", "Achat centralisé à Grasse"],
      traductionCommerciale: ["Vous avez un outil d'IA qui tourne, parlons gouvernance et MLOps"],
      iaAnnonceVsDeploye: "Outil NaturIA en production",
    },
    ...overrides,
  }
}

const pilotPlaybook = {
  personas: [
    { fonction: "DSI / responsable SI", repond_de: "Fiabilité du SI", ce_qui_le_reveille: "Interfaces fragiles" },
    { fonction: "Direction industrielle", repond_de: "Capacité et qualité", ce_qui_le_reveille: "Montée en cadence" },
    { fonction: "Affaires réglementaires", repond_de: "Conformité formules", ce_qui_le_reveille: "Notification IFRA 52" },
    { fonction: "R&D / innovation", repond_de: "Vitesse formulation", ce_qui_le_reveille: "IA non industrialisable" },
    { fonction: "Achats / supply chain", repond_de: "Disponibilité matière", ce_qui_le_reveille: "Rupture fournisseur" },
  ],
  objections: [
    { objection: "« IFRA n'est pas un sujet SI »", reponse: "« Le sujet SI est le temps de propagation. »" },
    { objection: "« PLM / ERP groupe déjà présent »", reponse: "« Il faut qualifier l'intégration locale. »" },
    { objection: "« IA déjà testée »", reponse: "« Le seuil est l'industrialisation. »" },
    { objection: "« Usine déjà automatisée »", reponse: "« Ce qui compte est la fiabilité bout en bout. »" },
    { objection: "« Achats IT gérés par le groupe »", reponse: "« Séparer le standard du besoin local. »" },
  ],
  entry_points: [
    { signal: "Notification IFRA 52", angle: "Mesurer l'impact", interlocuteur: "Réglementaire", src_ids: [6] },
    { signal: "Nouveau site", angle: "Fiabilité OT/IT", interlocuteur: "Directeur industriel", src_ids: [18, 25] },
    { signal: "IA appliquée", angle: "Industrialisation", interlocuteur: "R&D + Data", src_ids: [22, 23] },
    { signal: "Tension matières", angle: "Traçabilité", interlocuteur: "Achats", src_ids: [20, 21] },
    { signal: "Filiale intégrée", angle: "Rollout", interlocuteur: "Opérations locales", src_ids: [10, 21, 22] },
  ],
  roi_arguments: [
    { argument: "IFRA 52 : réduire le temps de qualification", src_ids: [6] },
    { argument: "Payan Bertrand 12 M€ d'investissement", src_ids: [18] },
    { argument: "MANE BI & Analytics Platform", src_ids: [12] },
    { argument: "Givaudan / dsm-firmenich Supplier Hub", src_ids: [10, 21] },
  ],
}

describe("Playbook & Battle Cards mono-segment", () => {
  it("projette les informations concurrentielles opérationnelles dans une Battle Card", () => {
    const actor = createMockActor()

    expect(actor.name).toBe("Robertet")
    expect(actor.isBenchmarkAccount).toBe(true)
    expect(actor.appetenceScore).toBe(35)
    expect(actor.accessibilityScore).toBe(5)
    expect(actor.details.triggers).toHaveLength(2)
    expect(actor.details.lignesRouges[0]).toContain("POC IA")
    expect(actor.details.coucheEsn[0]).toContain("DSI Global")
  })

  it("gère l'absence de données avec un empty state explicite sans fallback ni LLM", () => {
    const emptyActors: CompetitiveMapActor[] = []
    expect(emptyActors).toHaveLength(0)
  })

  describe("Lot 12 — Vérification de parité des 4 domaines sur le pilote", () => {
    it("restitue exactement 5 personas sans perte ni placeholder", () => {
      const personas = parsePlaybookPersonas(pilotPlaybook)
      expect(personas).toHaveLength(5)
      expect(personas[0].role).toBe("DSI / responsable SI")
      expect(personas[0].accountability).toBe("Fiabilité du SI")
      expect(personas[0].trigger).toBe("Interfaces fragiles")
    })

    it("restitue exactement 5 objections et leurs réponses", () => {
      const objections = parsePlaybookObjections(pilotPlaybook)
      expect(objections).toHaveLength(5)
      expect(objections[0].objection).toContain("IFRA")
      expect(objections[0].response).toContain("propagation")
    })

    it("restitue exactement 5 points d'entrée avec signal, angle, interlocuteur et src_ids", () => {
      const entryPoints = parsePlaybookEntryPoints(pilotPlaybook)
      expect(entryPoints).toHaveLength(5)
      expect(entryPoints[0].signal).toBe("Notification IFRA 52")
      expect(entryPoints[0].srcIds).toEqual([6])
      expect(entryPoints[1].srcIds).toEqual([18, 25])
    })

    it("restitue exactement 4 arguments ROI avec argument et src_ids", () => {
      const roiArgs = parsePlaybookRoiArguments(pilotPlaybook)
      expect(roiArgs).toHaveLength(4)
      expect(roiArgs[0].srcIds).toEqual([6])
      expect(roiArgs[3].srcIds).toEqual([10, 21])
    })
  })
})

describe("Lot 1 — Battle Cards devient un mode, plus une section", () => {
  it("retire battle_cards de la navigation des sections du Playbook", () => {
    expect(PLAYBOOK_SECTION_KEYS).toHaveLength(6)
    expect(PLAYBOOK_SECTION_KEYS).not.toContain("battle_cards")
    expect(PLAYBOOK_SECTION_KEYS).toEqual([
      "enjeux",
      "personas",
      "angles",
      "objections",
      "roi",
      "pourquoi_maintenant",
    ])
  })

  it("n'ouvre le mode Battle que si le segment porte au moins un acteur", () => {
    expect(isBattleModeAvailable([])).toBe(false)
    expect(isBattleModeAvailable([createMockActor()])).toBe(true)
  })

  describe("Sélection du compte — portée au-dessus du retournement", () => {
    const robertet = createMockActor({ id: "cme-1", companyId: "comp-1", name: "Robertet" })
    const exail = createMockActor({ id: "cme-2", companyId: "comp-2", name: "Exail Robotics" })

    it("retourne null quand aucun acteur n'est cartographié", () => {
      expect(resolveBattleActor([], null)).toBeNull()
      expect(resolveBattleActor([], "cme-1")).toBeNull()
    })

    it("sélectionne le premier acteur en l'absence de choix explicite", () => {
      expect(resolveBattleActor([robertet, exail], null)?.id).toBe("cme-1")
    })

    it("conserve le compte choisi — critère de non-régression du retournement", () => {
      const selected = resolveBattleActor([robertet, exail], "cme-2")
      expect(selected?.id).toBe("cme-2")
      expect(selected?.companyId).toBe("comp-2")
      expect(selected?.name).toBe("Exail Robotics")
    })

    it("expose companyId et les détails projetés de profile_json", () => {
      const selected = resolveBattleActor([robertet], "cme-1")
      expect(selected?.companyId).toBe("comp-1")
      expect(selected?.details.triggers).toHaveLength(2)
      expect(selected?.angleEntree).toContain("NaturIA")
    })

    it("se replie sur le premier acteur si l'identifiant n'appartient plus au segment", () => {
      expect(resolveBattleActor([robertet, exail], "cme-hors-segment")?.id).toBe("cme-1")
    })
  })

  describe("Machine à états du retournement", () => {
    it("tient dans la cible 280–340 ms de la note de cadrage", () => {
      expect(BATTLE_FLIP_HALF_MS * 2).toBeGreaterThanOrEqual(280)
      expect(BATTLE_FLIP_HALF_MS * 2).toBeLessThanOrEqual(340)
    })

    it("raccourcit le repli reduced-motion", () => {
      expect(BATTLE_FLIP_REDUCED_HALF_MS).toBeLessThan(BATTLE_FLIP_HALF_MS)
    })

    it("dérive la direction depuis le mode visé", () => {
      expect(flipDirectionFor("battle")).toBe("forward")
      expect(flipDirectionFor("playbook")).toBe("backward")
    })

    it("fait sortir la face courante puis entrer la suivante par le côté opposé", () => {
      expect(flipRotation("leaving", "forward")).toBe(90)
      expect(flipRotation("entering", "forward")).toBe(-90)
      expect(flipRotation("leaving", "backward")).toBe(-90)
      expect(flipRotation("entering", "backward")).toBe(90)
    })

    it("remet la face à plat au repos, quelle que soit la direction", () => {
      expect(flipRotation("idle", "forward")).toBe(0)
      expect(flipRotation("idle", "backward")).toBe(0)
    })

    it("ne rend le contenu visible qu'à plat", () => {
      expect(flipOpacity("idle")).toBe(1)
      expect(flipOpacity("leaving")).toBe(0)
      expect(flipOpacity("entering")).toBe(0)
    })
  })
})

describe("Lot 2 — identité visuelle Battle et richesse des Battle Cards", () => {
  describe("Teinte Battle — uniquement des tokens KREDO", () => {
    const HEX_OR_RGB = /#[0-9a-fA-F]{3,8}\b|rgba?\(/i

    it("ne contient aucune couleur HEX/RGB en dur", () => {
      expect(BATTLE_SIDE_TINT_IMAGE).not.toMatch(HEX_OR_RGB)
      expect(BATTLE_MAIN_TINT_IMAGE).not.toMatch(HEX_OR_RGB)
    })

    it("construit le dégradé exclusivement depuis les tokens cobalt du cockpit", () => {
      for (const image of [BATTLE_SIDE_TINT_IMAGE, BATTLE_MAIN_TINT_IMAGE]) {
        expect(image).toContain("color-mix(in srgb")
        expect(image).toMatch(/var\(--color-cockpit-cobalt(-deep)?\)/)
      }
    })

    it("distingue le rail (side) de la zone principale (main)", () => {
      expect(BATTLE_SIDE_TINT_IMAGE).not.toBe(BATTLE_MAIN_TINT_IMAGE)
    })
  })

  describe("classifyBattleCardRichness", () => {
    it("classe vide quand aucun axe et aucune inconnue identifiée", () => {
      expect(classifyBattleCardRichness(0, false)).toBe("empty")
    })

    it("classe éparse quand aucun axe mais des inconnues identifiées", () => {
      expect(classifyBattleCardRichness(0, true)).toBe("sparse")
    })

    it("classe riche dès qu'au moins un axe est renseigné, quelles que soient les inconnues", () => {
      expect(classifyBattleCardRichness(1, false)).toBe("rich")
      expect(classifyBattleCardRichness(BATTLE_CARD_RICHNESS_AXES, true)).toBe("rich")
    })
  })

  describe("assessBattleCardRichness — sur de vraies formes d'acteur", () => {
    it("compte 6/6 axes sur un profil complet (fixture pilote)", () => {
      const assessment = assessBattleCardRichness(createMockActor())
      expect(assessment.richness).toBe("rich")
      expect(assessment.totalAxisCount).toBe(BATTLE_CARD_RICHNESS_AXES)
      expect(assessment.filledAxisCount).toBe(6)
      expect(assessment.hasKnownGaps).toBe(true)
    })

    it("classe vide un acteur dont profile_json est réellement vide (cas mesuré Lot 0 §10.4)", () => {
      const blankActor = createMockActor({
        angleEntree: null,
        forces: null,
        vulnerability: null,
        details: {
          propositionValeur: null,
          differenciateurs: [],
          dependances: [],
          chaineValeur: [],
          chantiersTechnologiques: [],
          triggers: [],
          lignesRouges: [],
          trous: [],
          metierChaineValeur: null,
          maillon: null,
          contratsMajeurs: [],
          grilles: [],
          coucheEsn: [],
          traductionCommerciale: [],
          iaAnnonceVsDeploye: null,
        },
      })
      const assessment = assessBattleCardRichness(blankActor)
      expect(assessment.richness).toBe("empty")
      expect(assessment.filledAxisCount).toBe(0)
      expect(assessment.hasKnownGaps).toBe(false)
    })

    it("classe éparse un acteur sans axe rempli mais avec des trous identifiés", () => {
      const gapsOnlyActor = createMockActor({
        angleEntree: null,
        forces: null,
        vulnerability: null,
        details: {
          propositionValeur: null,
          differenciateurs: [],
          dependances: [],
          chaineValeur: [],
          chantiersTechnologiques: [],
          triggers: [],
          lignesRouges: [],
          trous: ["Modèle d'achat IT non formalisé publiquement"],
          metierChaineValeur: null,
          maillon: null,
          contratsMajeurs: [],
          grilles: [],
          coucheEsn: [],
          traductionCommerciale: [],
          iaAnnonceVsDeploye: null,
        },
      })
      const assessment = assessBattleCardRichness(gapsOnlyActor)
      expect(assessment.richness).toBe("sparse")
      expect(assessment.filledAxisCount).toBe(0)
      expect(assessment.hasKnownGaps).toBe(true)
    })

    it("compte un seul axe rempli comme riche, sans arrondir à zéro", () => {
      const partialActor = createMockActor({
        angleEntree: null,
        forces: null,
        vulnerability: null,
        details: {
          propositionValeur: null,
          differenciateurs: [],
          dependances: [],
          chaineValeur: [],
          chantiersTechnologiques: [],
          triggers: ["Publication CA semestriel 444 M€"],
          lignesRouges: [],
          trous: [],
          metierChaineValeur: null,
          maillon: null,
          contratsMajeurs: [],
          grilles: [],
          coucheEsn: [],
          traductionCommerciale: [],
          iaAnnonceVsDeploye: null,
        },
      })
      const assessment = assessBattleCardRichness(partialActor)
      expect(assessment.richness).toBe("rich")
      expect(assessment.filledAxisCount).toBe(1)
    })

    it("n'accorde jamais à trous la valeur d'un axe rempli", () => {
      // Un acteur dont SEUL `trous` est renseigné ne doit jamais atteindre
      // `filledAxisCount > 0` : lister des inconnues n'est pas une donnée
      // exploitable, sans quoi une fiche vide serait présentée comme riche.
      const onlyGaps = createMockActor({
        angleEntree: null,
        forces: null,
        vulnerability: null,
        details: {
          propositionValeur: null,
          differenciateurs: [],
          dependances: [],
          chaineValeur: [],
          chantiersTechnologiques: [],
          triggers: [],
          lignesRouges: [],
          trous: ["Inconnue A", "Inconnue B"],
          metierChaineValeur: null,
          maillon: null,
          contratsMajeurs: [],
          grilles: [],
          coucheEsn: [],
          traductionCommerciale: [],
          iaAnnonceVsDeploye: null,
        },
      })
      expect(assessBattleCardRichness(onlyGaps).filledAxisCount).toBe(0)
    })
  })
})
