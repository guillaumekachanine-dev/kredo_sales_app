import { describe, expect, it } from "vitest"

import { arkopharmaAccountIntelligenceFixture, arkopharmaSourceCorpusFixture } from "../fixtures/work"
import { checkBlocksIntegrity } from "./study-segmentation"
import { validateStudyKnowledge } from "./validate-study-knowledge"
import { adaptWorkStudyToKnowledge, projectWorkStudyBlocks } from "./work-study-adapter"
import {
  parseWorkAccountIntelligence,
  parseWorkSourceCorpus,
  validateWorkStudyBundle,
} from "./work-study-parser"

const STUDY_ID = "22222222-3333-4444-8555-666666666666"
const COMPANY_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"
const COMPANY_NAME = "Arkopharma"

describe("Parsing Work Account Intelligence", () => {
  it("accepte la fixture réelle Arkopharma et restitue sa structure", () => {
    const result = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.schema_version).toBe(4)
    expect(result.data.entity_resolution.legal_name).toContain("Laboratoires Arkopharma SAS")
    expect(result.data.entity_resolution.siren).toBe("307378489")
    expect(result.data.entity_resolution.naf_code).toBe("21.20Z")
    expect(result.data.sections).toHaveLength(8)
    expect(result.data.sources.length).toBeGreaterThan(0)
    expect(result.data.knowledge_gaps.length).toBeGreaterThan(0)
  })

  it("rejette un texte qui n'est pas un JSON valide", () => {
    const result = parseWorkAccountIntelligence("{ invalid json")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0].message).toContain("JSON valide")
  })

  it("rejette une racine qui n'est pas un objet JSON", () => {
    const result = parseWorkAccountIntelligence(["tableau"])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0].message).toContain("objet JSON")
  })

  it("rejette un objet avec des sections manquantes ou invalides", () => {
    const result = parseWorkAccountIntelligence({
      schema_version: 4,
      entity_resolution: { legal_name: "Test SAS" },
      sections: [],
      sources: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path === "sections")).toBe(true)
  })

  it("rejette une section avec une clé hors STUDY_SECTION_KEYS", () => {
    const invalid = structuredClone(arkopharmaAccountIntelligenceFixture) as Record<string, unknown>
    const sections = invalid.sections as Array<Record<string, unknown>>
    sections[0].key = "section_inventee"

    const result = parseWorkAccountIntelligence(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path === "sections[0].key")).toBe(true)
  })

  it("rejette une affirmation sans texte ou avec qualification inconnue", () => {
    const invalid = structuredClone(arkopharmaAccountIntelligenceFixture) as Record<string, unknown>
    const sections = invalid.sections as Array<{ statements: Array<Record<string, unknown>> }>
    sections[0].statements[0].qualification = "certain"

    const result = parseWorkAccountIntelligence(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path === "sections[0].statements[0].qualification")).toBe(true)
  })

  it("rejette une source sans id ou avec url malformée", () => {
    const invalid = structuredClone(arkopharmaAccountIntelligenceFixture) as Record<string, unknown>
    const sources = invalid.sources as Array<Record<string, unknown>>
    sources[0].url = "pas-une-url-http"

    const result = parseWorkAccountIntelligence(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path === "sources[0].url")).toBe(true)
  })
})

describe("Parsing Work Source Corpus", () => {
  it("accepte la fixture réelle Source Corpus", () => {
    const result = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.schema_version).toBe(1)
    expect(result.data.corpus.account_name).toBe("ARKOPHARMA")
    expect(result.data.sources).toHaveLength(16)
    const totalDocs = result.data.sources.reduce((sum, s) => sum + s.documents_used.length, 0)
    expect(totalDocs).toBe(27)
  })

  it("rejette une autorité sans domaine ou avec domaine dupliqué", () => {
    const invalid = structuredClone(arkopharmaSourceCorpusFixture) as Record<string, unknown>
    const sources = invalid.sources as Array<Record<string, unknown>>
    // On duplique le domaine de la source 0 sur la source 1
    sources[1].domain = sources[0].domain

    const result = parseWorkSourceCorpus(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path === "sources[1].domain")).toBe(true)
  })

  it("rejette un document sans source_ref ou avec source_ref dupliqué", () => {
    const invalid = structuredClone(arkopharmaSourceCorpusFixture) as Record<string, unknown>
    const sources = invalid.sources as Array<{ documents_used: Array<Record<string, unknown>> }>
    // On met le même source_ref sur deux documents
    sources[1].documents_used[0].source_ref = sources[0].documents_used[0].source_ref

    const result = parseWorkSourceCorpus(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.message.includes("dupliqué"))).toBe(true)
  })

  it("rejette un document dont l'URL n'est pas HTTP(S)", () => {
    const invalid = structuredClone(arkopharmaSourceCorpusFixture) as Record<string, unknown>
    const sources = invalid.sources as Array<{ documents_used: Array<Record<string, unknown>> }>
    sources[0].documents_used[0].url = "ftp://invalid.com/doc"

    const result = parseWorkSourceCorpus(invalid)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.path.includes("url"))).toBe(true)
  })
})

describe("Cross-validation du bundle Work", () => {
  it("valide avec succès le bundle réel Arkopharma", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    expect(parsedAi.ok).toBe(true)
    expect(parsedCorpus.ok).toBe(true)
    if (!parsedAi.ok || !parsedCorpus.ok) return

    const validation = validateWorkStudyBundle(parsedAi.data, parsedCorpus.data, {
      companyId: COMPANY_ID,
      companyName: COMPANY_NAME,
    })
    expect(validation.ok).toBe(true)
    expect(validation.issues.filter((i) => i.severity === "error")).toHaveLength(0)
  })

  it("détecte une référence de source orpheline citée par un statement", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    if (!parsedAi.ok || !parsedCorpus.ok) return

    const ai = structuredClone(parsedAi.data)
    ai.sections[0].statements[0].source_refs = ["src-inconnue-999"]

    const validation = validateWorkStudyBundle(ai, parsedCorpus.data)
    expect(validation.ok).toBe(false)
    expect(
      validation.issues.some(
        (i) => i.severity === "error" && i.message.includes("src-inconnue-999"),
      ),
    ).toBe(true)
  })

  it("détecte une source de l'Account Intelligence absente du Source Corpus", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    if (!parsedAi.ok || !parsedCorpus.ok) return

    const ai = structuredClone(parsedAi.data)
    ai.sources.push({
      id: "src-extra",
      label: "Extra",
      source_type: "press",
      url: "https://extra.com/news",
    })

    const validation = validateWorkStudyBundle(ai, parsedCorpus.data)
    expect(validation.ok).toBe(false)
    expect(
      validation.issues.some((i) => i.path.includes("src-extra") && i.severity === "error"),
    ).toBe(true)
  })

  it("détecte une incohérence majeure d'identité d'entreprise", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    if (!parsedAi.ok || !parsedCorpus.ok) return

    const corpus = structuredClone(parsedCorpus.data)
    corpus.corpus.account_name = "TotalEnergies SE"

    const validation = validateWorkStudyBundle(parsedAi.data, corpus)
    expect(validation.ok).toBe(false)
    expect(
      validation.issues.some((i) => i.path === "identity" && i.severity === "error"),
    ).toBe(true)
  })
})

describe("Adaptateur Work vers AccountStudyKnowledge", () => {
  it("projette la prose en rawContent sans aucune perte ni réécriture", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    if (!parsedAi.ok) throw new Error("Fixture AI invalide")

    const { blocks, rawContent } = projectWorkStudyBlocks(parsedAi.data)

    // Vérification de l'invariant d'intégrité
    const integrity = checkBlocksIntegrity(rawContent, blocks)
    expect(integrity.identical).toBe(true)
    expect(integrity.rawNonWsChars).toBe(integrity.blocksNonWsChars)
    expect(integrity.firstDivergenceAt).toBeNull()

    // Vérifier que chaque texte de narrative est retrouvé verbatim dans les blocs
    for (const section of parsedAi.data.sections) {
      for (const paragraph of section.narrative) {
        expect(blocks.some((b) => b.text === paragraph)).toBe(true)
      }
    }
  })

  it("adapte l'étude complète et produit un contrat valide par validateStudyKnowledge()", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    if (!parsedAi.ok || !parsedCorpus.ok) throw new Error("Fixtures invalides")

    const result = adaptWorkStudyToKnowledge({
      accountIntelligence: parsedAi.data,
      sourceCorpus: parsedCorpus.data,
      context: {
        studyId: STUDY_ID,
        companyId: COMPANY_ID,
        companyName: COMPANY_NAME,
        fileName: "arkopharma-work.json",
        importedAt: "2026-09-13T12:00:00.000Z",
        segmentSlug: "pharmacie-sante",
        segmentName: "Pharmacie & Santé naturelle",
      },
    })

    const { knowledge, registry, registryImportable, registryErrors } = result

    // 1. Structure globale
    expect(knowledge.study.producer).toBe("chatgpt_work")
    expect(knowledge.study.id).toBe(STUDY_ID)
    expect(knowledge.study.company_id).toBe(COMPANY_ID)

    // 2. Entité résolue
    expect(knowledge.entity?.legal_name).toContain("Laboratoires Arkopharma SAS")
    expect(knowledge.entity?.siren).toBe("307378489")
    expect(knowledge.entity?.naf_code).toBe("21.20Z")
    expect(knowledge.entity?.headquarters).toBe("Carros, Alpes-Maritimes, France")

    // 3. Sections et blocs
    expect(knowledge.blocks.length).toBeGreaterThan(0)
    // 8 sections dans Arkopharma
    const activeSections = new Set(knowledge.blocks.map((b) => b.section_key))
    expect(activeSections.size).toBe(8)
    expect(knowledge.coverage.blocks.by_section.appendix).toBe(0)

    // 4. Affirmations (statements)
    // Nombre total de statements attendu de la fixture
    const totalStatementsInFixture = parsedAi.data.sections.reduce(
      (sum, s) => sum + s.statements.length,
      0,
    )
    expect(knowledge.statements).toHaveLength(totalStatementsInFixture)
    expect(knowledge.coverage.statements.total).toBe(totalStatementsInFixture)
    expect(knowledge.coverage.statements.unresolved_source_refs).toBe(0)
    expect(knowledge.coverage.statements.unresolved_block_refs).toBe(0)

    // Aucune requalification
    for (const stmt of knowledge.statements) {
      expect(["established", "declared", "inferred", "hypothesis"]).toContain(stmt.qualification)
    }

    // 5. Lacunes (gaps)
    expect(knowledge.gaps).toHaveLength(parsedAi.data.knowledge_gaps.length)
    expect(knowledge.gaps[0].section_key).toBe("business_and_offering")

    // 6. Sources et cardinalité
    // 27 documents et 16 autorités/domaines
    expect(knowledge.sources).toHaveLength(27)
    expect(knowledge.coverage.sources.documents).toBe(27)
    expect(knowledge.coverage.sources.authorities).toBe(16)

    // Vérifier que 2 pages du même domaine (ex. pappers.fr) partagent la même authority_id
    const pappersDocs = knowledge.sources.filter((s) => s.domain === "pappers.fr")
    expect(pappersDocs.length).toBeGreaterThan(1)
    const pappersAuthId = pappersDocs[0].authority_id
    expect(pappersDocs.every((d) => d.authority_id === pappersAuthId)).toBe(true)

    // 7. Intégrité textuelle
    expect(knowledge.coverage.text.identical).toBe(true)
    expect(knowledge.coverage.text.raw_non_ws_chars).toBe(
      knowledge.coverage.text.blocks_non_ws_chars,
    )

    // 8. Registre E3
    expect(registry.meta).toBeDefined()
    const regMeta = registry.meta as Record<string, unknown>
    expect(regMeta.corpus_scope).toBe("account")
    expect(String(regMeta.corpus_slug)).toContain("sources-compte-arkopharma-")
    const regSources = registry.sources as Array<{ domain: string; documents: unknown[] }>
    expect(regSources).toHaveLength(16)

    // Invariant §9 : les champs E3 n'étant pas fournis dans Work,
    // aucune valeur arbitraire n'a été inventée, donc importable est false
    expect(registryImportable).toBe(false)
    expect(registryErrors.length).toBeGreaterThan(0)
    expect(knowledge.coverage.registry.importable).toBe(false)
    expect(knowledge.coverage.registry.errors.length).toBeGreaterThan(0)

    // 9. Validation du contrat canonique par validateStudyKnowledge()
    const validation = validateStudyKnowledge(knowledge)
    expect(validation.ok).toBe(true)
  })

  it("génère un registre importable si des qualifications E3 complètes sont fournies", () => {
    const parsedAi = parseWorkAccountIntelligence(arkopharmaAccountIntelligenceFixture)
    const parsedCorpus = parseWorkSourceCorpus(arkopharmaSourceCorpusFixture)
    if (!parsedAi.ok || !parsedCorpus.ok) throw new Error("Fixtures invalides")

    // Construction d'un jeu complet de qualifications E3 pour les 16 domaines
    const e3Qualifications = new Map()
    parsedCorpus.data.sources.forEach((auth, index) => {
      e3Qualifications.set(auth.domain, {
        tier: 2,
        primary_role: "proof",
        utility_score_detail: {
          pertinence_sectorielle: 15,
          couverture_besoins: 15,
          valeur_commerciale: 15,
          fraicheur: 15,
          autorite_editoriale: 15,
          automation_access: 15,
        },
        automation_fit: "high",
        content_temporality: "periodic",
        usage_scopes: ["study", "account_watch"],
        pack: index < 5 ? "minimal" : "enrichi",
        familles_couvertes: ["identite_juridique"],
      })
    })

    const result = adaptWorkStudyToKnowledge({
      accountIntelligence: parsedAi.data,
      sourceCorpus: parsedCorpus.data,
      context: {
        studyId: STUDY_ID,
        companyId: COMPANY_ID,
        companyName: COMPANY_NAME,
        fileName: "arkopharma-work.json",
        segmentSlug: "pharmacie-sante",
        segmentName: "Pharmacie & Santé naturelle",
      },
      e3Qualifications,
    })

    expect(result.registryImportable).toBe(true)
    expect(result.registryErrors).toHaveLength(0)
    expect(result.knowledge.coverage.registry.importable).toBe(true)
  })
})
