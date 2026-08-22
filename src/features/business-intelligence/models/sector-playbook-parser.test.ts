import { describe, expect, it } from "vitest"
import {
  parsePlaybookPersonas,
  parsePlaybookObjections,
  parsePlaybookEntryPoints,
  parsePlaybookRoiArguments,
  parseSectorPlaybook,
} from "./sector-playbook-parser"

describe("Sector Playbook Parser — Lot 12 Parity Verification", () => {
  describe("Personas", () => {
    it("lit les champs fonction, repond_de et ce_qui_le_reveille sans placeholder", () => {
      const raw = {
        personas: [
          {
            fonction: "DSI / responsable SI",
            repond_de: "Fiabilité du SI et des intégrations.",
            ce_qui_le_reveille: "Un ramp-up industriel qui dépend d'interfaces fragiles.",
          },
        ],
      }
      const parsed = parsePlaybookPersonas(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        role: "DSI / responsable SI",
        accountability: "Fiabilité du SI et des intégrations.",
        trigger: "Un ramp-up industriel qui dépend d'interfaces fragiles.",
      })
    })

    it("supporte les aliases legacy role, enjeu, peur et accountability, trigger", () => {
      const raw = {
        personas: [
          {
            role: "Directeur Achats",
            enjeu: "Maîtrise des coûts",
            peur: "Rupture approvisionnement",
          },
        ],
      }
      const parsed = parsePlaybookPersonas(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        role: "Directeur Achats",
        accountability: "Maîtrise des coûts",
        trigger: "Rupture approvisionnement",
      })
    })

    it("ignore les entrées sans rôle/fonction et retourne null pour les champs absents sans inventer", () => {
      const raw = {
        personas: [
          { repond_de: "Inconnu sans role" },
          { fonction: "Chef de projet" },
        ],
      }
      const parsed = parsePlaybookPersonas(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        role: "Chef de projet",
        accountability: null,
        trigger: null,
      })
    })
  })

  describe("Objections", () => {
    it("lit objection et reponse intactes", () => {
      const raw = {
        objections: [
          {
            objection: "« IFRA, c'est le métier du réglementaire, pas du SI. »",
            reponse: "« Justement : la règle n'est pas le sujet SI. »",
          },
        ],
      }
      const parsed = parsePlaybookObjections(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        objection: "« IFRA, c'est le métier du réglementaire, pas du SI. »",
        response: "« Justement : la règle n'est pas le sujet SI. »",
      })
    })

    it("supporte l'alias legacy argument et gère l'absence de réponse sans inventer", () => {
      const raw = {
        objections: [
          { objection: "Trop cher", argument: "Réponse via argument legacy" },
          { objection: "Pas le moment" },
        ],
      }
      const parsed = parsePlaybookObjections(raw)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].response).toBe("Réponse via argument legacy")
      expect(parsed[1].response).toBeNull()
    })

    it("ignore une entrée sans objection", () => {
      const raw = {
        objections: [{ reponse: "Réponse orpheline" }],
      }
      const parsed = parsePlaybookObjections(raw)
      expect(parsed).toHaveLength(0)
    })
  })

  describe("Entry points", () => {
    it("lit signal, angle, interlocuteur et src_ids normalisés", () => {
      const raw = {
        entry_points: [
          {
            signal: "Notification IFRA 52 attendue fin 2026",
            angle: "Être capable de mesurer l'impact portefeuille",
            interlocuteur: "Affaires réglementaires + DSI",
            src_ids: [6, 18],
          },
        ],
      }
      const parsed = parsePlaybookEntryPoints(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        signal: "Notification IFRA 52 attendue fin 2026",
        angle: "Être capable de mesurer l'impact portefeuille",
        interlocuteur: "Affaires réglementaires + DSI",
        srcIds: [6, 18],
      })
    })

    it("accepte une entrée sans signal mais avec angle, ou avec une simple chaîne", () => {
      const raw = {
        entry_points: [
          { angle: "Angle direct sans signal", src_ids: ["10"] },
          "Point d'entrée sous forme de chaîne simple",
        ],
      }
      const parsed = parsePlaybookEntryPoints(raw)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({
        signal: null,
        angle: "Angle direct sans signal",
        interlocuteur: null,
        srcIds: [10],
      })
      expect(parsed[1]).toEqual({
        signal: null,
        angle: "Point d'entrée sous forme de chaîne simple",
        interlocuteur: null,
        srcIds: [],
      })
    })

    it("ignore une entrée sans signal ni angle", () => {
      const raw = {
        entry_points: [{ interlocuteur: "DSI" }, ""],
      }
      const parsed = parsePlaybookEntryPoints(raw)
      expect(parsed).toHaveLength(0)
    })
  })

  describe("ROI arguments", () => {
    it("lit l'argument et préserve src_ids", () => {
      const raw = {
        roi_arguments: [
          {
            argument: "IFRA notifie l'amendement 52 fin novembre 2026",
            src_ids: [6],
          },
        ],
      }
      const parsed = parsePlaybookRoiArguments(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toEqual({
        argument: "IFRA notifie l'amendement 52 fin novembre 2026",
        srcIds: [6],
      })
    })

    it("supporte les chaînes simples et les alias legacy titre/valeur", () => {
      const raw = {
        roi_arguments: [
          "Argument ROI en chaîne brute",
          { titre: "Titre legacy ROI", src_ids: [12] },
        ],
      }
      const parsed = parsePlaybookRoiArguments(raw)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({ argument: "Argument ROI en chaîne brute", srcIds: [] })
      expect(parsed[1]).toEqual({ argument: "Titre legacy ROI", srcIds: [12] })
    })

    it("ignore les arguments vides", () => {
      const raw = {
        roi_arguments: [{ argument: "  " }, ""],
      }
      const parsed = parsePlaybookRoiArguments(raw)
      expect(parsed).toHaveLength(0)
    })
  })

  describe("parseSectorPlaybook", () => {
    it("parse les 4 domaines d'un coup", () => {
      const raw = {
        personas: [{ fonction: "DSI" }],
        objections: [{ objection: "Pas d'argent", reponse: "Rentabilité rapide" }],
        entry_points: [{ angle: "Migration cloud", src_ids: [1] }],
        roi_arguments: [{ argument: "Économie de 20%", src_ids: [2] }],
      }
      const parsed = parseSectorPlaybook(raw)
      expect(parsed.personas).toHaveLength(1)
      expect(parsed.objections).toHaveLength(1)
      expect(parsed.entryPoints).toHaveLength(1)
      expect(parsed.roiArguments).toHaveLength(1)
    })
  })
})
