// ─── Validateur de sortie de mission (ADR-0020 L3) ──────────────────────────
// Ce que ces tests protègent : la seule barrière entre un texte produit par un LLM et
// `ai_intelligence_results`. Trois familles de garanties y sont vérifiées séparément —
// le refus du JSON malformé SANS réparation, le refus des énumérations approximatives,
// et le refus de toute citation qui n'a pas été réellement soumise au modèle.
//
// Aucun mock, aucun client Supabase : la fonction est pure, la trace est écrite en dur.

import { describe, expect, it } from "vitest"
import { readCorpusTrace, validateMissionReport } from "../domain/validate-mission-report"
import type { MissionReportV1, ResolvedCorpus } from "../domain/mission-contracts"

const DIGEST_ID = "11111111-1111-4111-8111-111111111111"
const ARTICLE_ID = "22222222-2222-4222-8222-222222222222"
const DROPPED_ID = "33333333-3333-4333-8333-333333333333"
const ABSENT_ID = "44444444-4444-4444-8444-444444444444"

const TRACE: ResolvedCorpus["trace"] = [
  {
    ref: { kind: "veille_period", table: "veille_digests", id: DIGEST_ID },
    title: "Digest juillet 2026",
    provenance: "veille_digests",
    kept: true,
  },
  {
    ref: { kind: "veille_period", table: "veille_articles", id: ARTICLE_ID },
    title: "Article — cybersécurité industrielle",
    provenance: "veille_articles",
    kept: true,
  },
  {
    ref: { kind: "veille_period", table: "veille_articles", id: DROPPED_ID },
    title: "Article écarté par le budget",
    provenance: "veille_articles",
    kept: false,
    reason: "budget_total",
  },
]

/** Citation telle que le LLM l'écrit : `title`/`provenance` y sont fantaisistes exprès. */
function llmRef(id: string, table = "veille_articles") {
  return {
    ref: { kind: "veille_period", table, id },
    title: "TITRE INVENTÉ PAR LE MODÈLE",
    provenance: "provenance inventée",
  }
}

function rawReport(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    title: "Analyse mensuelle — juillet 2026",
    executiveSummary: "Le mois est dominé par la pression réglementaire NIS2.",
    findings: [
      {
        category: "tendance",
        statement: "Les budgets cyber industriels accélèrent.",
        evidence: [llmRef(ARTICLE_ID)],
      },
    ],
    recommendations: [
      {
        action: "Cadrer une offre NIS2 pour l'industrie.",
        rationale: "Trois comptes du portefeuille sont concernés.",
        horizon: "30_days",
        evidence: [llmRef(DIGEST_ID, "veille_digests")],
      },
    ],
    sourceRefs: [llmRef(DIGEST_ID, "veille_digests"), llmRef(ARTICLE_ID)],
    ...overrides,
  })
}

function messages(result: ReturnType<typeof validateMissionReport>): string {
  return result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")
}

describe("validateMissionReport — parse strict (M-2)", () => {
  it("accepte un rapport valide et rend le contrat reconstruit", () => {
    const result = validateMissionReport(rawReport(), TRACE)

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error(messages(result))

    const report: MissionReportV1 = result.value
    expect(report.schemaVersion).toBe(1)
    expect(report.title).toBe("Analyse mensuelle — juillet 2026")
    expect(report.findings).toHaveLength(1)
    expect(report.recommendations).toHaveLength(1)
    expect(report.recommendations[0]?.horizon).toBe("30_days")
    expect(report.sourceRefs).toHaveLength(2)
  })

  it("refuse une sortie non-JSON sans tenter de la réparer", () => {
    const result = validateMissionReport('```json\n{"schemaVersion": 1}\n```', TRACE)

    expect(result.valid).toBe(false)
    expect(result.value).toBeNull()
    expect(messages(result)).toContain("Sortie LLM non-JSON")
  })

  it("refuse un JSON tronqué plutôt que de le refermer", () => {
    const truncated = rawReport().slice(0, 120)
    const result = validateMissionReport(truncated, TRACE)

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("Sortie LLM non-JSON")
  })

  it("refuse une sortie vide ou non textuelle", () => {
    expect(validateMissionReport("   ", TRACE).valid).toBe(false)
    // Le champ vient d'un payload n8n : il peut ne pas être une chaîne du tout.
    expect(validateMissionReport(undefined as unknown as string, TRACE).valid).toBe(false)
  })

  it("refuse un JSON valide qui n'est pas un objet", () => {
    const result = validateMissionReport('["findings"]', TRACE)

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("objet JSON attendu")
  })
})

describe("validateMissionReport — structure", () => {
  it("exige schemaVersion === 1 exactement", () => {
    expect(validateMissionReport(rawReport({ schemaVersion: undefined }), TRACE).valid).toBe(false)
    expect(validateMissionReport(rawReport({ schemaVersion: 2 }), TRACE).valid).toBe(false)
    expect(validateMissionReport(rawReport({ schemaVersion: "1" }), TRACE).valid).toBe(false)

    const result = validateMissionReport(rawReport({ schemaVersion: 2 }), TRACE)
    expect(messages(result)).toContain("$.schemaVersion")
  })

  it("exige un titre et une synthèse non vides", () => {
    expect(messages(validateMissionReport(rawReport({ title: "  " }), TRACE))).toContain("$.title")
    expect(messages(validateMissionReport(rawReport({ executiveSummary: null }), TRACE))).toContain(
      "$.executiveSummary",
    )
  })

  it("refuse une catégorie de constat hors énumération, même mal orthographiée", () => {
    const result = validateMissionReport(
      rawReport({
        findings: [{ category: "opportunité", statement: "Accent en trop.", evidence: [] }],
      }),
      TRACE,
    )

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("$.findings[0].category")
    expect(messages(result)).toContain("Catégorie hors énumération")
  })

  it("refuse un rapport sans aucun constat", () => {
    expect(messages(validateMissionReport(rawReport({ findings: [] }), TRACE))).toContain(
      "Au moins un constat requis",
    )
    expect(messages(validateMissionReport(rawReport({ findings: "aucun" }), TRACE))).toContain(
      "$.findings",
    )
  })

  it("accepte un constat sans preuve directe, mais exige un tableau", () => {
    const accepted = validateMissionReport(
      rawReport({
        findings: [{ category: "signal_faible", statement: "Faisceau d'indices convergents.", evidence: [] }],
      }),
      TRACE,
    )
    expect(accepted.valid).toBe(true)

    const refused = validateMissionReport(
      rawReport({
        findings: [{ category: "signal_faible", statement: "Sans tableau.", evidence: null }],
      }),
      TRACE,
    )
    expect(refused.valid).toBe(false)
    expect(messages(refused)).toContain("$.findings[0].evidence")
  })

  it("accepte des recommandations vides, refuse une recommandation incomplète", () => {
    expect(validateMissionReport(rawReport({ recommendations: [] }), TRACE).valid).toBe(true)

    const result = validateMissionReport(
      rawReport({ recommendations: [{ action: "", rationale: "  ", evidence: [] }] }),
      TRACE,
    )
    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("$.recommendations[0].action")
    expect(messages(result)).toContain("$.recommendations[0].rationale")
  })

  it("refuse un horizon hors énumération et traite null comme une absence", () => {
    const refused = validateMissionReport(
      rawReport({
        recommendations: [{ action: "Agir", rationale: "Parce que", horizon: "semaine", evidence: [] }],
      }),
      TRACE,
    )
    expect(refused.valid).toBe(false)
    expect(messages(refused)).toContain("Horizon hors énumération")

    const accepted = validateMissionReport(
      rawReport({
        recommendations: [{ action: "Agir", rationale: "Parce que", horizon: null, evidence: [] }],
      }),
      TRACE,
    )
    expect(accepted.valid).toBe(true)
    if (!accepted.valid) throw new Error(messages(accepted))
    expect("horizon" in (accepted.value.recommendations[0] ?? {})).toBe(false)
  })

  it("ne persiste aucune clé étrangère au contrat", () => {
    const result = validateMissionReport(
      rawReport({
        piegeRacine: "à ne pas persister",
        findings: [
          {
            category: "risque",
            statement: "Constat",
            evidence: [],
            piegeConstat: "à ne pas persister",
          },
        ],
      }),
      TRACE,
    )

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error(messages(result))
    expect(Object.keys(result.value).sort()).toEqual([
      "executiveSummary",
      "findings",
      "recommendations",
      "schemaVersion",
      "sourceRefs",
      "title",
    ])
    expect(Object.keys(result.value.findings[0] ?? {}).sort()).toEqual([
      "category",
      "evidence",
      "statement",
    ])
  })
})

describe("validateMissionReport — citations vérifiées contre la trace", () => {
  it("reconstruit title et provenance depuis la trace, jamais depuis le JSON du modèle", () => {
    const result = validateMissionReport(rawReport(), TRACE)

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error(messages(result))

    const evidence = result.value.findings[0]?.evidence[0]
    expect(evidence?.title).toBe("Article — cybersécurité industrielle")
    expect(evidence?.provenance).toBe("veille_articles")

    const recommendationEvidence = result.value.recommendations[0]?.evidence[0]
    expect(recommendationEvidence?.title).toBe("Digest juillet 2026")
    expect(recommendationEvidence?.provenance).toBe("veille_digests")

    expect(result.value.sourceRefs.map((source) => source.title)).toEqual([
      "Digest juillet 2026",
      "Article — cybersécurité industrielle",
    ])

    // Le `ref` lui-même est recopié depuis la trace : rien d'autre que le triplet.
    expect(Object.keys(evidence?.ref ?? {}).sort()).toEqual(["id", "kind", "table"])
  })

  it("rejette le rapport ENTIER quand une citation est absente de la trace", () => {
    const result = validateMissionReport(
      rawReport({
        findings: [
          { category: "tendance", statement: "Constat sourcé.", evidence: [llmRef(ARTICLE_ID)] },
          { category: "risque", statement: "Constat inventé.", evidence: [llmRef(ABSENT_ID)] },
        ],
      }),
      TRACE,
    )

    // Aucun élagage silencieux : pas de rapport amputé de sa citation fautive.
    expect(result.valid).toBe(false)
    expect(result.value).toBeNull()
    expect(messages(result)).toContain(ABSENT_ID)
    expect(messages(result)).toContain("absente du corpus du run")
    expect(messages(result)).toContain("$.findings[1].evidence[0].ref")
  })

  it("rejette une citation présente dans la trace mais écartée (kept: false)", () => {
    const result = validateMissionReport(
      rawReport({
        findings: [{ category: "tendance", statement: "Cite un écarté.", evidence: [llmRef(DROPPED_ID)] }],
      }),
      TRACE,
    )

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain(DROPPED_ID)
    expect(messages(result)).toContain("écartée du corpus")
    expect(messages(result)).toContain("budget_total")
  })

  it("contrôle sourceRefs et les preuves de recommandation au même titre", () => {
    const onSourceRefs = validateMissionReport(rawReport({ sourceRefs: [llmRef(ABSENT_ID)] }), TRACE)
    expect(onSourceRefs.valid).toBe(false)
    expect(messages(onSourceRefs)).toContain("$.sourceRefs[0].ref")

    const onRecommendation = validateMissionReport(
      rawReport({
        recommendations: [{ action: "Agir", rationale: "Parce que", evidence: [llmRef(ABSENT_ID)] }],
      }),
      TRACE,
    )
    expect(onRecommendation.valid).toBe(false)
    expect(messages(onRecommendation)).toContain("$.recommendations[0].evidence[0].ref")
  })

  it("distingue une même id sur une autre table : le triplet complet est la clé", () => {
    // `DIGEST_ID` est conservé, mais sur `veille_digests` — pas sur `veille_articles`.
    const result = validateMissionReport(
      rawReport({
        findings: [{ category: "tendance", statement: "Mauvaise table.", evidence: [llmRef(DIGEST_ID)] }],
      }),
      TRACE,
    )

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("veille_period:veille_articles:" + DIGEST_ID)
  })

  it("refuse une citation dont le ref est incomplet", () => {
    const result = validateMissionReport(
      rawReport({
        findings: [
          {
            category: "tendance",
            statement: "Ref partielle.",
            evidence: [{ ref: { kind: "veille_period", id: ARTICLE_ID }, title: "x", provenance: "y" }],
          },
        ],
      }),
      TRACE,
    )

    expect(result.valid).toBe(false)
    expect(messages(result)).toContain("Référence incomplète")
  })

  it("traite une trace absente ou malformée comme vide, sans lever d'exception", () => {
    for (const trace of [undefined, null, {}, "trace", 42]) {
      const result = validateMissionReport(rawReport(), trace)
      expect(result.valid).toBe(false)
      expect(messages(result)).toContain("Trace de corpus indisponible")
    }

    // Un rapport sans AUCUNE citation reste valide sans trace : rien n'est invérifiable.
    const noCitations = validateMissionReport(
      rawReport({
        findings: [{ category: "autre", statement: "Constat sans source.", evidence: [] }],
        recommendations: [],
        sourceRefs: [],
      }),
      null,
    )
    expect(noCitations.valid).toBe(true)
  })

  it("ignore les entrées de trace inexploitables sans faire échouer la lecture", () => {
    const noisyTrace = [
      null,
      "bruit",
      { ref: { kind: "veille_period" }, kept: true },
      { ref: { kind: "inconnu", table: "veille_articles", id: ARTICLE_ID }, kept: true, title: "x", provenance: "y" },
      ...TRACE,
    ]

    const result = validateMissionReport(rawReport(), noisyTrace)
    expect(result.valid).toBe(true)
  })
})

describe("readCorpusTrace", () => {
  it("extrait la trace d'un input_snapshot de mission", () => {
    expect(readCorpusTrace({ schemaVersion: 1, trace: TRACE })).toBe(TRACE)
  })

  it("rend null sur tout snapshot qui n'est pas un objet porteur de trace", () => {
    expect(readCorpusTrace(null)).toBeNull()
    expect(readCorpusTrace("mission")).toBeNull()
    expect(readCorpusTrace([TRACE])).toBeNull()
    expect(readCorpusTrace({ schemaVersion: 1 })).toBeUndefined()
  })
})
