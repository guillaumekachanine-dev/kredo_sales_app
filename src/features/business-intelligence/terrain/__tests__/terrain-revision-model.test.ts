import { describe, expect, it } from "vitest"
import { buildTerrainRevisionCards } from "../terrain-revision-model"

describe("terrain-revision-model", () => {
  const pilotPlaybook = {
    objections: [
      {
        objection: "« IFRA, c'est le métier du réglementaire, pas du SI. »",
        reponse:
          "« Justement : la règle n'est pas le sujet SI. Le sujet SI est le temps nécessaire pour relier la règle aux matières, formules, usages, clients et documents, puis tracer ce qui a été décidé. »",
      },
      {
        objection: "« Nous avons déjà un PLM / ERP groupe. »",
        reponse:
          "« L'objectif n'est pas de le remplacer. Il faut qualifier ce qui manque entre la plateforme groupe, le laboratoire, la qualité, le site et les workflows de changement locaux. »",
      },
      {
        objection: "« Nous avons déjà testé l'IA. »",
        reponse:
          "« Le sujet n'est plus le test. Le vrai seuil est l'industrialisation : données autorisées, propriété intellectuelle, évaluation, traçabilité et retour sécurisé vers la formulation. »",
      },
      {
        objection: "« Notre usine est déjà automatisée. »",
        reponse:
          "« L'automatisation n'est pas le point de départ ; ce qui nous intéresse est la fiabilité du chemin complet équipement–donnée–qualité–ERP pendant le ramp-up. »",
      },
      {
        objection: "« Les achats IT sont gérés par le groupe. »",
        reponse:
          "« Alors le premier travail est précisément de séparer ce qui relève du standard groupe de ce qui reste achetable localement : intégration, rollout, données, qualité, support ou change. »",
      },
    ],
  }

  it("builds 5 revision cards from pilot playbook preserving exact order and content", () => {
    const cards = buildTerrainRevisionCards(pilotPlaybook)

    expect(cards).toHaveLength(5)

    expect(cards[0]).toEqual({
      id: "revision-card-1",
      objection: "« IFRA, c'est le métier du réglementaire, pas du SI. »",
      response:
        "« Justement : la règle n'est pas le sujet SI. Le sujet SI est le temps nécessaire pour relier la règle aux matières, formules, usages, clients et documents, puis tracer ce qui a été décidé. »",
    })

    expect(cards[1]).toEqual({
      id: "revision-card-2",
      objection: "« Nous avons déjà un PLM / ERP groupe. »",
      response:
        "« L'objectif n'est pas de le remplacer. Il faut qualifier ce qui manque entre la plateforme groupe, le laboratoire, la qualité, le site et les workflows de changement locaux. »",
    })

    expect(cards[2]).toEqual({
      id: "revision-card-3",
      objection: "« Nous avons déjà testé l'IA. »",
      response:
        "« Le sujet n'est plus le test. Le vrai seuil est l'industrialisation : données autorisées, propriété intellectuelle, évaluation, traçabilité et retour sécurisé vers la formulation. »",
    })

    expect(cards[3]).toEqual({
      id: "revision-card-4",
      objection: "« Notre usine est déjà automatisée. »",
      response:
        "« L'automatisation n'est pas le point de départ ; ce qui nous intéresse est la fiabilité du chemin complet équipement–donnée–qualité–ERP pendant le ramp-up. »",
    })

    expect(cards[4]).toEqual({
      id: "revision-card-5",
      objection: "« Les achats IT sont gérés par le groupe. »",
      response:
        "« Alors le premier travail est précisément de séparer ce qui relève du standard groupe de ce qui reste achetable localement : intégration, rollout, données, qualité, support ou change. »",
    })
  })

  it("handles null / missing response gracefully while keeping objection", () => {
    const playbook = {
      objections: [
        {
          objection: "Objection sans réponse formulée",
        },
      ],
    }

    const cards = buildTerrainRevisionCards(playbook)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toEqual({
      id: "revision-card-1",
      objection: "Objection sans réponse formulée",
      response: null,
    })
  })

  it("filters out invalid entries without objection text", () => {
    const playbook = {
      objections: [
        { objection: "" },
        { reponse: "Réponse sans objection" },
        null,
        "texte brut invalide",
        { objection: "Objection valide", response: "Réponse valide" },
      ],
    }

    const cards = buildTerrainRevisionCards(playbook)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toEqual({
      id: "revision-card-1",
      objection: "Objection valide",
      response: "Réponse valide",
    })
  })

  it("returns empty array for empty or non-object playbook inputs", () => {
    expect(buildTerrainRevisionCards(null)).toEqual([])
    expect(buildTerrainRevisionCards(undefined)).toEqual([])
    expect(buildTerrainRevisionCards("")).toEqual([])
    expect(buildTerrainRevisionCards(123)).toEqual([])
    expect(buildTerrainRevisionCards({})).toEqual([])
    expect(buildTerrainRevisionCards({ objections: [] })).toEqual([])
  })
})
