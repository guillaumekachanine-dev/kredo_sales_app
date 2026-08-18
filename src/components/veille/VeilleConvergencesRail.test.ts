import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import type { VeilleArticle } from "@/app/(app)/veille/_data/veille-data"
import { parseVeilleArticleConvergences } from "@/features/veille/convergences/domain/parse-veille-convergences"
import type { VeilleArticleConvergences } from "@/features/veille/convergences/domain/veille-convergences-contracts"

const root = process.cwd()
const railSource = readFileSync(
  resolve(root, "src/components/veille/VeilleConvergencesRail.tsx"),
  "utf8"
)

function makeMockArticle(convergences: unknown): VeilleArticle {
  return {
    id: "art-test-1",
    workspace_id: "ws-1",
    digest_id: "digest-1",
    company_id: null,
    source_catalog_id: null,
    titre_fr: "Test Article Title",
    resume: "Test Article Summary",
    url: "https://example.com/art",
    url_hash: "hash123",
    published_at: "2026-08-18T10:00:00Z",
    source_name: "Test Source",
    categorie: "Tech & Innovation",
    secteur_principal: "Aéronautique",
    secteur_secondaire: "Spatial",
    tags: ["ia", "aero"],
    selection_rank: 1,
    analyse_kredo: "Kredo analysis sample",
    action_commerciale: "Action commercial sample",
    convergences: convergences as VeilleArticle["convergences"],
    superseded_at: null,
    created_at: "2026-08-18T10:00:00Z",
    updated_at: "2026-08-18T10:00:00Z",
  }
}

describe("VeilleConvergencesRail — LOT 4 Test Suite", () => {
  it("Cas 1 — V1 historique : parse correctement, sans relatedOpportunities, rail rendu sans erreur", () => {
    const v1Data: VeilleArticleConvergences = {
      schemaVersion: 1,
      synthesis: "Convergence forte V1 identifiée sur la transition énergétique aéronautique.",
      confidence: "high",
      matchedIssues: [
        {
          issueId: "issue-1",
          companyId: "comp-airbus",
          companyName: "Airbus",
          issueTitle: "Décarbonation des sites",
          rationale: "Alignement sur les enjeux d'efficience énergétique.",
        },
      ],
      relatedAccounts: [
        {
          companyId: "comp-airbus",
          companyName: "Airbus",
          rationale: "Compte majeur du secteur concerné.",
        },
      ],
      relatedOpportunities: [],
      playbookSuggestion: null,
      recommendedActions: [
        {
          label: "Contacter le DSI d'Airbus",
          rationale: "Prise de contact rapide conseillée.",
        },
      ],
      evidenceRefs: [
        { type: "company", id: "comp-airbus", label: "Fiche Compte Airbus" },
        { type: "article", id: "art-100", label: "Article Transition" },
      ],
    }

    const article = makeMockArticle(v1Data)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed).not.toBeNull()
    expect(parsed?.schemaVersion).toBe(1)
    expect(parsed?.synthesis).toContain("V1")
    expect(parsed?.confidence).toBe("high")
    expect(parsed?.relatedAccounts).toHaveLength(1)
    expect(parsed?.matchedIssues).toHaveLength(1)
    expect(parsed?.relatedOpportunities).toHaveLength(0)
  })

  it("Cas 2 — V2 riche : fixture réaliste (EURECOM, account_fact, account_signal, relatedOpportunity, 2 recommendedActions)", () => {
    const v2RichData: VeilleArticleConvergences = {
      schemaVersion: 2,
      synthesis: "L'ouverture du nouvel AI Center d'EURECOM recoupe nos offres de gouvernance IA et de cyber.",
      confidence: "high",
      matchedIssues: [
        {
          issueId: "issue-eurecom-1",
          companyId: "comp-eurecom",
          companyName: "EURECOM",
          issueTitle: "Mise en conformité IA & Cyber",
          rationale: "Création d'un laboratoire IA nécessitant un cadrage gouvernance.",
        },
      ],
      relatedAccounts: [
        {
          companyId: "comp-eurecom",
          companyName: "EURECOM",
          rationale: "Établissement académique et de recherche partenaire.",
        },
      ],
      relatedOpportunities: [
        {
          opportunityId: "opp-eurecom-1",
          companyId: "comp-eurecom",
          companyName: "EURECOM",
          opportunityTitle: "Audit Gouvernance IA EURECOM",
          stage: "qualification",
          rationale: "Besoin identifié d'accompagnement sur la charte éthique IA.",
        },
      ],
      playbookSuggestion: {
        sectorId: "sec-education",
        sectorName: "Enseignement Supérieur & Recherche",
        targetSection: "Pistes d'action AI Governance",
        proposedArgument: "Valoriser l'expérience KREDO sur l'audit de maturité IA.",
        rationale: "Pertinence directe avec les actualités du secteur.",
      },
      recommendedActions: [
        {
          label: "Proposer un atelier de cadrage gouvernance",
          rationale: "Sensibiliser la direction de la recherche EURECOM.",
        },
        {
          label: "Partager le livre blanc Cyber & IA",
          rationale: "Nourrir la relation avant l'appel d'offres.",
        },
      ],
      evidenceRefs: [
        { type: "account_fact", id: "fact-ai-center", label: "EURECOM AI Center" },
        { type: "account_signal", id: "sig-eurecom-launch", label: "Lancement du Centre IA" },
        { type: "company", id: "comp-eurecom", label: "Fiche Compte EURECOM" },
        { type: "opportunity", id: "opp-eurecom-1", label: "Audit Gouvernance IA" },
      ],
    }

    const article = makeMockArticle(v2RichData)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed).not.toBeNull()
    expect(parsed?.schemaVersion).toBe(2)
    expect(parsed?.relatedAccounts[0].companyName).toBe("EURECOM")
    expect(parsed?.relatedOpportunities).toHaveLength(1)
    expect(parsed?.relatedOpportunities[0].stage).toBe("qualification")
    expect(parsed?.recommendedActions).toHaveLength(2)
    expect(parsed?.evidenceRefs).toHaveLength(4)
    expect(parsed?.evidenceRefs.map((e) => e.type)).toEqual([
      "account_fact",
      "account_signal",
      "company",
      "opportunity",
    ])
  })

  it("Cas 3 — V2 low sans convergence structurée : synthesis visible, confiance faible, fallback discret", () => {
    const v2LowEmptyData: VeilleArticleConvergences = {
      schemaVersion: 2,
      synthesis: "Information générale sans recoupement direct avec le portefeuille actif.",
      confidence: "low",
      matchedIssues: [],
      relatedAccounts: [],
      relatedOpportunities: [],
      playbookSuggestion: null,
      recommendedActions: [
        {
          label: "Garder en veille passive",
          rationale: "Pas d'action immédiate requise.",
        },
      ],
      evidenceRefs: [
        { type: "article", id: "art-test-1", label: "Article source" },
      ],
    }

    const article = makeMockArticle(v2LowEmptyData)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed).not.toBeNull()
    expect(parsed?.confidence).toBe("low")
    expect(parsed?.matchedIssues).toHaveLength(0)
    expect(parsed?.relatedAccounts).toHaveLength(0)
    expect(parsed?.relatedOpportunities).toHaveLength(0)
    expect(parsed?.playbookSuggestion).toBeNull()

    // Vérification du message de fallback dans le code du composant
    expect(railSource).toContain("Aucune convergence structurée forte identifiée.")
  })

  it("Cas 4 — convergences = null : fallback propre et actions opérationnelles disponibles", () => {
    const article = makeMockArticle(null)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed).toBeNull()
    expect(railSource).toContain("Analyse transverse non disponible pour cet article.")
    expect(railSource).toContain("<ExistingArticleActions")
  })

  it("Cas 5 — JSON invalide : aucun crash, fallback propre identique à null", () => {
    const invalidJson = { invalidField: true, schemaVersion: 99 }
    const article = makeMockArticle(invalidJson)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed).toBeNull()
  })

  it("Cas 6 — playbookSuggestion : suggestion visible en lecture seule sans aucune mutation automatique", () => {
    const v2WithPlaybook: VeilleArticleConvergences = {
      schemaVersion: 2,
      synthesis: "Impact sur les pratiques du secteur défense.",
      confidence: "medium",
      matchedIssues: [],
      relatedAccounts: [],
      relatedOpportunities: [],
      playbookSuggestion: {
        sectorId: "sec-defense",
        sectorName: "Défense & Sécurité",
        targetSection: "Argumentaire Systèmes Critiques",
        proposedArgument: "Aligner les audits sur le nouveau référentiel OT.",
        rationale: "Évolution réglementaire identifiée.",
      },
      recommendedActions: [],
      evidenceRefs: [],
    }

    const article = makeMockArticle(v2WithPlaybook)
    const parsed = parseVeilleArticleConvergences(article.convergences)

    expect(parsed?.playbookSuggestion).not.toBeNull()
    expect(parsed?.playbookSuggestion?.sectorName).toBe("Défense & Sécurité")

    // Le composant ne doit proposer aucun bouton de sauvegarde/mutation direct sur le playbook
    expect(railSource).toContain("Suggestion IA en lecture seule · Validation humaine requise")
    expect(railSource).not.toContain("savePlaybookSuggestion")
    expect(railSource).not.toContain("updatePlaybook")
  })

  it("Garanties architecturales et UX du composant", () => {
    // Label explicite 'Confiance de convergence'
    expect(railSource).toContain("Confiance de convergence :")

    // Navigation canonique vers les fiches comptes via drawer
    expect(railSource).toContain("/prospection/accounts?drawer=")

    // Conservation des handlers et boutons d'action opérationnels existants
    expect(railSource).toContain("Générer un pitch / mail")
    expect(railSource).toContain("Qualifier le signal")
    expect(railSource).toContain("Ajouter à la liste")
    expect(railSource).toContain("Créer une fenêtre commerciale")
    expect(railSource).toContain("Créer une note compte")
  })
})
