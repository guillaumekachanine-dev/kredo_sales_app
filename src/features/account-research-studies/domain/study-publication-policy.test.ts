import { describe, expect, it } from "vitest"

import { arkopharmaAccountIntelligenceFixture, arkopharmaSourceCorpusFixture } from "../fixtures/work"
import { validateStudyPublicationPolicy } from "./study-publication-policy"
import { adaptWorkStudyToKnowledge } from "./work-study-adapter"
import { parseWorkAccountIntelligence, parseWorkSourceCorpus } from "./work-study-parser"

const STUDY_ID = "22222222-3333-4444-8555-666666666666"
const COMPANY_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"
const COMPANY_NAME = "Arkopharma"

function getAdaptedArkopharma() {
  const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
  const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
  if (!parsedAi.ok || !parsedCorpus.ok) throw new Error("Fixtures invalides")

  return adaptWorkStudyToKnowledge({
    accountIntelligence: parsedAi.data,
    sourceCorpus: parsedCorpus.data,
    context: {
      studyId: STUDY_ID,
      companyId: COMPANY_ID,
      companyName: COMPANY_NAME,
      title: "Étude Arkopharma",
      fileName: "arkopharma.json",
      segmentSlug: "pharma-sante",
      segmentName: "Pharmacie & Santé",
    },
  })
}

describe("Politique de publication d'étude (validateStudyPublicationPolicy)", () => {
  it("bloque la publication si l'étude n'est pas au statut ready", () => {
    const { knowledge, registry } = getAdaptedArkopharma()
    const result = validateStudyPublicationPolicy({
      producer: "chatgpt_work",
      status: "converting",
      publishedAt: null,
      knowledgeJson: knowledge,
      sourcesRegistryJson: registry,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("convertie")
    }
  })

  it("bloque la publication si l'étude est déjà publiée", () => {
    const { knowledge, registry } = getAdaptedArkopharma()
    const result = validateStudyPublicationPolicy({
      producer: "chatgpt_work",
      status: "ready",
      publishedAt: "2026-09-13T00:00:00.000Z",
      knowledgeJson: knowledge,
      sourcesRegistryJson: registry,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("non encore publiée")
    }
  })

  describe("ChatGPT Work (chatgpt_work)", () => {
    it("autorise la publication même si coverage.registry.importable est false", () => {
      const { knowledge, registry } = getAdaptedArkopharma()
      // Vérification que le registre E3 de la fixture est effectivement non importable
      expect(knowledge.coverage.registry.importable).toBe(false)

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_work",
        status: "ready",
        publishedAt: null,
        knowledgeJson: knowledge,
        sourcesRegistryJson: registry,
      })

      expect(result.ok).toBe(true)
    })

    it("bloque la publication si le texte n'est pas intègre", () => {
      const { knowledge, registry } = getAdaptedArkopharma()
      const corruptedKnowledge = JSON.parse(JSON.stringify(knowledge))
      corruptedKnowledge.coverage.text.identical = false

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_work",
        status: "ready",
        publishedAt: null,
        knowledgeJson: corruptedKnowledge,
        sourcesRegistryJson: registry,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain("l’intégrité du texte source")
      }
    })

    it("bloque la publication s'il y a des références sources orphelines", () => {
      const { knowledge, registry } = getAdaptedArkopharma()
      const corruptedKnowledge = JSON.parse(JSON.stringify(knowledge))
      corruptedKnowledge.coverage.statements.unresolved_source_refs = 2

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_work",
        status: "ready",
        publishedAt: null,
        knowledgeJson: corruptedKnowledge,
        sourcesRegistryJson: registry,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain("orpheline(s)")
      }
    })

    it("bloque la publication en cas d'incohérence entre producer row et knowledge", () => {
      const { knowledge, registry } = getAdaptedArkopharma()
      const modifiedKnowledge = JSON.parse(JSON.stringify(knowledge))
      modifiedKnowledge.study.producer = "chatgpt_deep_research"

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_work",
        status: "ready",
        publishedAt: null,
        knowledgeJson: modifiedKnowledge,
        sourcesRegistryJson: registry,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain("incohérence de producteur")
      }
    })

    it("bloque la publication si le registre de sources est absent", () => {
      const { knowledge } = getAdaptedArkopharma()
      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_work",
        status: "ready",
        publishedAt: null,
        knowledgeJson: knowledge,
        sourcesRegistryJson: null,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain("registre de sources absent")
      }
    })
  })

  describe("ChatGPT Deep Research (chatgpt_deep_research)", () => {
    it("bloque la publication si registry.importable est false pour Deep Research", () => {
      const { knowledge, registry } = getAdaptedArkopharma()
      const deepKnowledge = JSON.parse(JSON.stringify(knowledge))
      deepKnowledge.study.producer = "chatgpt_deep_research"
      deepKnowledge.coverage.registry.importable = false

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_deep_research",
        status: "ready",
        publishedAt: null,
        knowledgeJson: deepKnowledge,
        sourcesRegistryJson: registry,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toContain("registre de sources E3 n’est pas importable")
      }
    })

    it("autorise la publication Deep Research si registry.importable est true et le schéma E3 est valide", () => {
      const { knowledge } = getAdaptedArkopharma()
      const deepKnowledge = JSON.parse(JSON.stringify(knowledge))
      deepKnowledge.study.producer = "chatgpt_deep_research"
      deepKnowledge.coverage.registry.importable = true

      const ids = Array.from({ length: 8 }, (_, i) => `SRC-${String(i + 1).padStart(3, "0")}`)
      const validE3Registry = {
        meta: {
          segment_slug: "pharma-sante",
          secteur: "Pharmacie",
          geographie: "France",
          date_snapshot: "2026-09-13",
          version: "1.1",
          validation_status: "pending",
        },
        besoins_information: [],
        familles_sectorielles_obligatoires: {
          presse_professionnelle: ids[4],
          federation: ids[5],
          regulateur: ids[6],
        },
        sources: ids.map((src_id, index) => ({
          src_id,
          publisher: `Publisher ${src_id}`,
          domain: `publisher${index}.example`,
          url: `https://publisher${index}.example/`,
          tier: 1,
          primary_role: "proof",
          utility_score: 80,
          utility_score_detail: {
            pertinence_sectorielle: 15,
            couverture_besoins: 15,
            valeur_commerciale: 10,
            fraicheur: 10,
            autorite_editoriale: 20,
            automation_access: 10,
          },
          automation_fit: "high",
          collection_url: null,
          search_domain: `publisher${index}.example`,
          content_temporality: "periodic",
          usage_scopes: ["study"],
          pack: index < 4 ? "minimal" : "enrichi",
          atteste: "Fait attesté",
          familles_couvertes: ["identite_juridique"],
          consulted_at: "2026-09-13",
          validation_status: "verified",
        })),
        pack_minimal: ids.slice(0, 4),
        pack_enrichi: ids.slice(4),
        matrice_couverture: [],
        gaps: [],
        compteurs: { sources: 8, pack_minimal: 4, pack_enrichi: 4, requetes: 0 },
      }

      const result = validateStudyPublicationPolicy({
        producer: "chatgpt_deep_research",
        status: "ready",
        publishedAt: null,
        knowledgeJson: deepKnowledge,
        sourcesRegistryJson: validE3Registry,
      })

      expect(result.ok).toBe(true)
    })
  })
})
