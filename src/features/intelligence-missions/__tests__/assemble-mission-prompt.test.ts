import { describe, expect, it } from "vitest"
import { assembleMissionPrompt } from "../data/assemble-mission-prompt"
import { findMissionSpec } from "../domain/mission-catalog"
import type { MissionSpec, ResolvedCorpus } from "../domain/mission-contracts"

const SPEC = findMissionSpec("veille-analyse-mensuelle") as MissionSpec

const CORPUS: ResolvedCorpus = {
  items: [
    {
      ref: { kind: "veille_period", table: "veille_digests", id: "digest-1" },
      title: "Semaine du 7 juillet",
      date: "2026-07-07",
      provenance: "veille_digests",
      content: "Synthèse de la période : trois mouvements notables.",
      chars: 51,
    },
    {
      ref: { kind: "veille_period", table: "veille_articles", id: "article-1" },
      title: "Nouvelle directive NIS2",
      date: "2026-07-09",
      provenance: "veille_articles · Les Echos",
      content: "Résumé : entrée en application.",
      chars: 31,
    },
  ],
  stats: { requested: 3, kept: 2, dropped: 1, totalChars: 82 },
  trace: [],
}

describe("assembleMissionPrompt — fonction pure", () => {
  it("rend exactement la même chose à deux appels identiques", () => {
    expect(assembleMissionPrompt(SPEC, CORPUS)).toEqual(assembleMissionPrompt(SPEC, CORPUS))
  })

  it("ne mute ni le preset ni le corpus", () => {
    const specSnapshot = JSON.stringify(SPEC)
    const corpusSnapshot = JSON.stringify(CORPUS)
    assembleMissionPrompt(SPEC, CORPUS)
    expect(JSON.stringify(SPEC)).toBe(specSnapshot)
    expect(JSON.stringify(CORPUS)).toBe(corpusSnapshot)
  })
})

describe("assembleMissionPrompt — prompt système", () => {
  it("porte les contraintes du preset", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    for (const rule of SPEC.constraints.rules) {
      expect(systemPrompt).toContain(rule)
    }
  })

  it("impose le contrat MissionReportV1 et ses six catégories", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(systemPrompt).toContain('"schemaVersion": 1')
    for (const key of ["title", "executiveSummary", "findings", "recommendations", "sourceRefs"]) {
      expect(systemPrompt).toContain(`"${key}"`)
    }
    for (const category of [
      "tendance",
      "signal_faible",
      "reglementaire",
      "opportunite",
      "risque",
      "autre",
    ]) {
      expect(systemPrompt).toContain(`\`${category}\``)
    }
    for (const horizon of ["immediate", "30_days", "quarter"]) {
      expect(systemPrompt).toContain(`\`${horizon}\``)
    }
  })

  it("ne contient aucun contenu de corpus — il ne dépend que du preset", () => {
    const { systemPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(systemPrompt).not.toContain("mouvements notables")
    expect(systemPrompt).toBe(assembleMissionPrompt(SPEC, { ...CORPUS, items: [] }).systemPrompt)
  })
})

describe("assembleMissionPrompt — prompt utilisateur", () => {
  it("rend chaque source avec le triplet que le LLM devra citer", () => {
    const { userPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    for (const source of CORPUS.items) {
      expect(userPrompt).toContain(`kind: ${source.ref.kind}`)
      expect(userPrompt).toContain(`table: ${source.ref.table}`)
      expect(userPrompt).toContain(`id: ${source.ref.id}`)
      expect(userPrompt).toContain(source.title)
      expect(userPrompt).toContain(source.provenance)
      expect(userPrompt).toContain(source.content)
    }
  })

  it("annonce la couverture réelle et interdit d'interpréter les écarts", () => {
    const { userPrompt } = assembleMissionPrompt(SPEC, CORPUS)
    expect(userPrompt).toContain("Sources retenues : 2 sur 3 considérées (82 caractères).")
    expect(userPrompt).toContain("1 élément(s) ont été écartés")
    expect(userPrompt).toContain("Ne suppose rien de leur contenu")
  })

  it("tait la ligne d'écart quand rien n'a été écarté", () => {
    const complete: ResolvedCorpus = {
      ...CORPUS,
      stats: { requested: 2, kept: 2, dropped: 0, totalChars: 82 },
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, complete)
    expect(userPrompt).not.toContain("ont été écartés")
  })

  it("dit explicitement qu'aucune source n'a pu être hydratée plutôt que de rendre un bloc vide", () => {
    const empty: ResolvedCorpus = {
      items: [],
      stats: { requested: 0, kept: 0, dropped: 0, totalChars: 0 },
      trace: [],
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, empty)
    expect(userPrompt).toContain("Aucune source n'a pu être hydratée.")
  })

  it("affiche « inconnue » plutôt qu'une date inventée", () => {
    const undated: ResolvedCorpus = {
      ...CORPUS,
      items: [{ ...CORPUS.items[0], date: null }],
    }
    const { userPrompt } = assembleMissionPrompt(SPEC, undated)
    expect(userPrompt).toContain("date: inconnue")
  })
})
