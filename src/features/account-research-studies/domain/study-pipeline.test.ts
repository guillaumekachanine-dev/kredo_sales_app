import { describe, expect, it } from "vitest"

import { assembleStudyKnowledge } from "./assemble-study-knowledge"
import { reconstructPdfMarkdown, type PdfPage } from "./pdf-reconstruction"
import { prepareStudyStructure } from "./prepare-study-structure"
import { parseBlocksPartOutput, parseSourcesPartOutput } from "./study-conversion-output"
import { checkBlocksIntegrity, segmentStudy } from "./study-segmentation"
import { extractStudySources, normalizeSourceUrl } from "./study-sources"
import { buildStudyReportView, parseInline } from "./study-view"
import { validateStudyKnowledge } from "./validate-study-knowledge"

const STUDY_ID = "11111111-2222-4333-8444-555555555555"
const COMPANY_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"

function sourceQualification(id: string) {
  return {
    id,
    publisher: `Éditeur ${id}`,
    source_type: "company_official",
    tier: 2,
    primary_role: "proof",
    utility_score_detail: {
      pertinence_sectorielle: 15,
      couverture_besoins: 12,
      valeur_commerciale: 10,
      fraicheur: 10,
      autorite_editoriale: 15,
      automation_access: 8,
    },
    automation_fit: "high",
    content_temporality: "periodic",
    usage_scopes: ["study", "account_watch"],
    pack: "minimal",
    familles_couvertes: ["identite_juridique"],
    famille_obligatoire: null,
    atteste: "Document cité par l’étude",
  }
}

function buildFixture() {
  const urls = [
    "https://example.com/rapport-a?utm_source=chatgpt",
    "https://example.com/rapport-b",
    ...Array.from({ length: 7 }, (_, index) => `https://source-${index + 1}.test/document`),
  ]
  const raw = [
    "# Étude SOS Oxygène",
    "",
    "SOS Oxygène opère un réseau national.",
    "",
    ...urls.flatMap((url, index) => [`Information documentée ${index + 1} [${index + 1}](${url})`, ""]),
    "Bloc que le modèle oubliera de classer.",
  ].join("\n")
  const structure = prepareStudyStructure(raw, null)
  const blockIds = structure.blocks.map((block) => block.id)
  const sourceIds = structure.extraction.sources.map((source) => source.id)
  const authorityIds = structure.extraction.authorities.map((authority) => authority.id)

  const blocksOutput = parseBlocksPartOutput(JSON.stringify({
    classifications: blockIds.slice(0, -1).map((blockId) => ({ block_id: blockId, section: "identity" })),
    statements: [
      {
        text: "SOS Oxygène opère un réseau national.",
        qualification: "established",
        confidence: 0.9,
        block_ids: [blockIds[1]],
        source_refs: [sourceIds[0]],
      },
      {
        text: "Qualification volontairement invalide.",
        qualification: "certain",
        block_ids: ["bloc-inconnu"],
        source_refs: ["source-inconnue"],
      },
    ],
    gaps: [],
    entity: { legal_name: "SOS OXYGENE", siren: "384122099", naf_code: "7729Z", headquarters: "Nice" },
  }), { blockIds, sourceIds })
  if (!blocksOutput.ok) throw new Error(blocksOutput.error)

  const sourcesOutput = parseSourcesPartOutput(JSON.stringify({
    sources: authorityIds.slice(0, -1).map(sourceQualification),
  }), { sourceIds: authorityIds })
  if (!sourcesOutput.ok) throw new Error(sourcesOutput.error)

  const result = assembleStudyKnowledge({
    study: {
      id: STUDY_ID,
      companyId: COMPANY_ID,
      title: "Étude SOS Oxygène",
      fileName: "sos-oxygene.pdf",
      rawContent: raw,
      rawSha256: "sha256",
      importedAt: "2026-09-11T12:00:00.000Z",
    },
    company: { name: "SOS Oxygène", segmentSlug: "services-sante", segmentName: "Services de santé" },
    blocks: structure.blocks,
    extraction: structure.extraction,
    parts: [
      { key: "blocks-01", kind: "blocks", run_id: "run-blocks" },
      { key: "sources-01", kind: "sources", run_id: "run-sources" },
    ],
    blocksOutputs: [blocksOutput.value],
    sourcesOutputs: [sourcesOutput.value],
    convertedAt: "2026-09-11T12:05:00.000Z",
    model: "test-model",
  })
  return { raw, structure, ...result }
}

describe("reconstructPdfMarkdown", () => {
  it("préserve la couche texte, trace la citation et compte le numéro de page retiré", () => {
    const pages: PdfPage[] = [{
      pageNumber: 1,
      items: [
        { str: "Phrase source", x: 10, y: 100, width: 75, height: 10 },
        { str: "1", x: 50, y: 5, width: 5, height: 8 },
      ],
      links: [{ url: "https://example.com/preuve", x1: 90, y1: 96, x2: 100, y2: 106 }],
    }]
    const result = reconstructPdfMarkdown(pages)

    expect(result.markdown).toContain("Phrase source")
    expect(result.markdown).toContain("[↗](https://example.com/preuve)")
    expect(result.stats.pageNumbersRemoved).toEqual(["1"])
    expect(result.stats.identical).toBe(true)
  })
})

describe("segmentation et sources", () => {
  it("partitionne le texte sans perdre ni réordonner un caractère significatif", () => {
    const raw = "# Titre\r\n\r\nPremier paragraphe.\r\n\r\n- Élément A\r\n- Élément B"
    const blocks = segmentStudy(raw)
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "paragraph", "list"])
    expect(checkBlocksIntegrity(raw, blocks).identical).toBe(true)
  })

  it("conserve deux pages d’un domaine comme documents distincts et une seule autorité", () => {
    const blocks = segmentStudy("[1](https://example.com/a)\n\n[2](https://example.com/b)")
    const extraction = extractStudySources(blocks)
    expect(extraction.sources).toHaveLength(2)
    expect(extraction.authorities).toHaveLength(1)
    expect(extraction.authorities[0].document_ids).toEqual(["DOC-001", "DOC-002"])
  })

  it("retire les paramètres de suivi sans fusionner deux chemins différents", () => {
    expect(normalizeSourceUrl("https://EXAMPLE.com/a?utm_source=x&id=2#partie")).toBe("https://example.com/a?id=2")
  })
})

describe("assemblage zéro perte", () => {
  it("range tout bloc non classé dans l’annexe au lieu de le supprimer", () => {
    const { knowledge, structure } = buildFixture()
    expect(knowledge.blocks).toHaveLength(structure.blocks.length)
    expect(knowledge.blocks.at(-1)?.section_key).toBe("appendix")
    expect(knowledge.blocks.at(-1)?.classified_by).toBe("fallback")
    expect(knowledge.coverage.blocks.fallback).toBeGreaterThan(0)
  })

  it("démontre l’intégrité du texte dans le rapport de couverture", () => {
    const { knowledge } = buildFixture()
    expect(knowledge.coverage.text.identical).toBe(true)
    expect(knowledge.coverage.text.raw_non_ws_chars).toBe(knowledge.coverage.text.blocks_non_ws_chars)
  })

  it("conserve tous les documents mais regroupe le registre E3 par autorité", () => {
    const { knowledge, registry } = buildFixture()
    const registrySources = registry.sources as Array<{ domain: string; documents: unknown[] }>
    expect(knowledge.sources).toHaveLength(9)
    expect(registrySources).toHaveLength(8)
    expect(registrySources.find((source) => source.domain === "example.com")?.documents).toHaveLength(2)
    expect(knowledge.coverage.registry).toEqual({ importable: true, errors: [] })
  })

  it("signale les références inconnues et rétrograde une qualification invalide", () => {
    const { knowledge } = buildFixture()
    expect(knowledge.coverage.statements.unresolved_block_refs).toBe(1)
    expect(knowledge.coverage.statements.unresolved_source_refs).toBe(1)
    expect(knowledge.coverage.statements.fallback_qualification).toBe(1)
    expect(knowledge.statements[1].qualification).toBe("hypothesis")
  })

  it("qualifie explicitement par défaut toute autorité oubliée par le modèle", () => {
    const { knowledge } = buildFixture()
    expect(knowledge.coverage.sources.authorities_default_qualified).toBe(1)
    expect(knowledge.sources.some((source) => source.qualified_by === "default")).toBe(true)
  })

  it("produit un contrat relisible et refuse ensuite toute référence cassée", () => {
    const { knowledge } = buildFixture()
    expect(validateStudyKnowledge(knowledge).ok).toBe(true)
    const broken = structuredClone(knowledge)
    broken.statements[0].source_refs = ["DOC-999"]
    expect(validateStudyKnowledge(broken).ok).toBe(false)
  })

  it("alimente le read model avec le texte complet dans son ordre d’origine", () => {
    const { knowledge, raw } = buildFixture()
    const view = buildStudyReportView(knowledge)
    expect(checkBlocksIntegrity(raw, view.orderedBlocks).identical).toBe(true)
    expect(view.bibliography).toHaveLength(9)
    expect(parseInline("Preuve [1](https://example.com/a)")).toEqual([
      { kind: "text", text: "Preuve " },
      { kind: "citation", label: "1", url: "https://example.com/a" },
    ])
  })
})
