import { describe, expect, it } from "vitest"
import {
  buildTerrainStories,
  formatStorySourceIds,
  stripCommercialLabel,
} from "../terrain-stories-model"

describe("terrain-stories-model", () => {
  const pilotPlaybook = {
    message_sectoriel:
      "Votre fenêtre n'est pas « faire de l'IA » : c'est être capable, dès la notification IFRA 52, de relier chaque restriction aux matières, formules, usages et certificats clients, pendant que vos nouveaux sites et vos capacités de création montent en charge.",
    market_thesis: [
      {
        id: 1,
        these:
          "La valeur commerciale du segment vient moins d'un TAM agrégé que de sa complexité opérationnelle : matières naturelles, formulation sur mesure, contraintes réglementaires et multiplicité des usages imposent une maîtrise continue du lien matière–formule–usage–client.",
        src_ids: [7, 13, 17, 20, 21],
        donc_commercialement:
          "DONC, commercialement : ouvrir sur la maîtrise matière–formule–client, la traçabilité et la capacité de changement plutôt que sur une transformation digitale générique.",
      },
      {
        id: 2,
        these:
          "Le bassin de Grasse traverse une vague visible d'investissements industriels et de montée en capacité, attestée notamment par Payan Bertrand et SFA NEROLI/Symrise, ce qui déplace le besoin vers l'intégration OT/IT, la qualité des données de production et la résilience avant ramp-up.",
        src_ids: [8, 18, 19, 25],
        donc_commercialement:
          "DONC, commercialement : un site en construction ou en montée en cadence mérite une priorité supérieure à un site stabilisé ; l'ouverture se fait avec le directeur industriel, la qualité et le SI.",
      },
      {
        id: 3,
        these:
          "IFRA 52 doit être traité comme un événement de données futur : la consultation est close et la notification est attendue vers la fin novembre 2026, mais aucune date exacte de notification ni aucune date de conformité propre à l'amendement 52 n'est publiée au snapshot.",
        src_ids: [6],
        donc_commercialement:
          "DONC, commercialement : la question utile est « serez-vous capables de mesurer l'impact sur vos matières, formules, usages et clients dès la notification ? », jamais « êtes-vous prêts pour le 30 novembre ? ».",
      },
      {
        id: 4,
        these:
          "Chez les leaders, la transformation data et IA touche déjà la création, la formulation, la gouvernance de données et les opérations ; cela invalide le pitch POC IA générique et remet au premier plan la qualité des données, les droits d'accès, la propriété intellectuelle et l'industrialisation.",
        src_ids: [12, 22, 23, 24],
        donc_commercialement:
          "DONC, commercialement : vendre un cas d'usage métier borné avec gouvernance, sécurité et MLOps, pas une démonstration d'IA détachée du patrimoine formulation.",
      },
      {
        id: 5,
        these:
          "Une « maison de composition » ne correspond pas à un modèle d'achat unique : les grands groupes publient des parcours fournisseurs et plateformes centrales structurés, alors que les maisons indépendantes exposent beaucoup moins leurs mécanismes d'achat IT.",
        src_ids: [10, 16, 20, 21, 22],
        donc_commercialement:
          "DONC, commercialement : qualifier dès le premier échange la frontière entre autonomie locale, siège, panel, plateforme centrale et budget de site ; ne jamais supposer qu'un modèle d'achat de groupe vaut pour une maison indépendante.",
      },
    ],
  }

  describe("buildTerrainStories", () => {
    it("produces 6 stories (1 message + 5 theses) for pilot playbook in exact source order", () => {
      const stories = buildTerrainStories(pilotPlaybook)
      expect(stories).toHaveLength(6)

      // Story 01: Message sectoriel
      expect(stories[0]).toEqual({
        kind: "message",
        id: "story-message",
        title: "Message sectoriel",
        text: pilotPlaybook.message_sectoriel,
        srcIds: [],
      })

      // Stories 02 to 06: Theses 1 to 5
      for (let i = 0; i < 5; i++) {
        const story = stories[i + 1]
        const sourceThesis = pilotPlaybook.market_thesis[i]
        expect(story.kind).toBe("thesis")
        if (story.kind === "thesis") {
          expect(story.id).toBe(`story-thesis-${sourceThesis.id}`)
          expect(story.title).toBe(`Thèse ${i + 1}`)
          expect(story.thesis).toBe(sourceThesis.these)
          expect(story.commercialConclusion).toBe(sourceThesis.donc_commercialement)
          expect(story.srcIds).toEqual(sourceThesis.src_ids)
        }
      }
    })

    it("starts directly with theses if message_sectoriel is absent", () => {
      const playbookWithoutMessage = {
        market_thesis: pilotPlaybook.market_thesis,
      }
      const stories = buildTerrainStories(playbookWithoutMessage)
      expect(stories).toHaveLength(5)
      expect(stories[0].kind).toBe("thesis")
      if (stories[0].kind === "thesis") {
        expect(stories[0].title).toBe("Thèse 1")
        expect(stories[0].thesis).toBe(pilotPlaybook.market_thesis[0].these)
      }
    })

    it("returns only message story if market_thesis is empty", () => {
      const playbookOnlyMessage = {
        message_sectoriel: "Message unique",
        market_thesis: [],
      }
      const stories = buildTerrainStories(playbookOnlyMessage)
      expect(stories).toHaveLength(1)
      expect(stories[0]).toEqual({
        kind: "message",
        id: "story-message",
        title: "Message sectoriel",
        text: "Message unique",
        srcIds: [],
      })
    })

    it("returns empty array when both message and theses are absent", () => {
      expect(buildTerrainStories({})).toEqual([])
      expect(buildTerrainStories(null)).toEqual([])
      expect(buildTerrainStories(undefined)).toEqual([])
      expect(buildTerrainStories({ message_sectoriel: "", market_thesis: [] })).toEqual([])
    })

    it("supports legacy 'theses' key in playbook", () => {
      const legacyPlaybook = {
        theses: [
          {
            id: 10,
            these: "Thèse legacy",
            src_ids: [1, 2],
            donc_commercialement: "Action legacy",
          },
        ],
      }
      const stories = buildTerrainStories(legacyPlaybook)
      expect(stories).toHaveLength(1)
      expect(stories[0]).toEqual({
        kind: "thesis",
        id: "story-thesis-10",
        title: "Thèse 1",
        thesis: "Thèse legacy",
        commercialConclusion: "Action legacy",
        srcIds: [1, 2],
      })
    })

    it("handles thesis without commercial conclusion gracefully", () => {
      const playbook = {
        market_thesis: [
          {
            id: 1,
            these: "Thèse sans conclusion",
            src_ids: [5],
          },
        ],
      }
      const stories = buildTerrainStories(playbook)
      expect(stories).toHaveLength(1)
      if (stories[0].kind === "thesis") {
        expect(stories[0].commercialConclusion).toBeNull()
      }
    })
  })

  describe("formatStorySourceIds", () => {
    it("formats multiple source IDs with 'Sources : S... · S...'", () => {
      expect(formatStorySourceIds([7, 13, 17, 20, 21])).toBe(
        "Sources : S7 · S13 · S17 · S20 · S21",
      )
    })

    it("formats single source ID", () => {
      expect(formatStorySourceIds([6])).toBe("Sources : S6")
    })

    it("returns null for empty or missing source IDs", () => {
      expect(formatStorySourceIds([])).toBeNull()
      expect(formatStorySourceIds(null as unknown as number[])).toBeNull()
    })
  })

  describe("stripCommercialLabel", () => {
    it("strips 'DONC, commercialement :' prefix with various cases and punctuation", () => {
      expect(
        stripCommercialLabel("DONC, commercialement : ouvrir sur la maîtrise matière"),
      ).toBe("ouvrir sur la maîtrise matière")
      expect(
        stripCommercialLabel("DONC commercialement: ouvrir sur la maîtrise matière"),
      ).toBe("ouvrir sur la maîtrise matière")
      expect(
        stripCommercialLabel("Donc, commercialement : ouvrir sur la maîtrise matière"),
      ).toBe("ouvrir sur la maîtrise matière")
    })

    it("leaves text intact if prefix is not present", () => {
      expect(stripCommercialLabel("Ouvrir sur la maîtrise")).toBe(
        "Ouvrir sur la maîtrise",
      )
    })
  })
})
