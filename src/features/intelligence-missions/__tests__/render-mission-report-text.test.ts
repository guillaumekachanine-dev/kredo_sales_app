// ─── Rendu texte d'un rapport de mission (ADR-0020 L3) ──────────────────────
// Ce que ce test protège : le `content_text` du document de mission dans /reports.
// L'invariant est l'EXHAUSTIVITÉ — aucun champ du contrat ne doit disparaître du texte.
// Sans lui, la régression serait invisible (un document s'affiche quand même, amputé).

import { describe, expect, it } from "vitest"
import { renderMissionReportText } from "../domain/render-mission-report-text"
import type { MissionReportV1, SourceRef } from "../domain/mission-contracts"

function source(id: string, title: string): SourceRef {
  return {
    ref: { kind: "veille_period", table: "veille_articles", id },
    title,
    provenance: "veille_articles",
  }
}

const DIGEST = source("11111111-1111-4111-8111-111111111111", "Digest juillet 2026")
const ARTICLE = source("22222222-2222-4222-8222-222222222222", "Article — NIS2")

const REPORT: MissionReportV1 = {
  schemaVersion: 1,
  title: "Analyse mensuelle — juillet 2026",
  executiveSummary: "La pression réglementaire domine le mois.",
  findings: [
    { category: "risque", statement: "Dépendance à un fournisseur unique.", evidence: [ARTICLE] },
    { category: "tendance", statement: "Les budgets cyber accélèrent.", evidence: [DIGEST, ARTICLE] },
    { category: "signal_faible", statement: "Deux recrutements RSSI publiés.", evidence: [] },
    { category: "reglementaire", statement: "NIS2 transposée au 4e trimestre.", evidence: [DIGEST] },
    { category: "opportunite", statement: "Fenêtre d'audit de conformité.", evidence: [ARTICLE] },
    { category: "autre", statement: "Consolidation du secteur en cours.", evidence: [] },
  ],
  recommendations: [
    {
      action: "Cadrer une offre NIS2 industrie.",
      rationale: "Trois comptes concernés au portefeuille.",
      horizon: "30_days",
      evidence: [DIGEST],
    },
    {
      action: "Qualifier les deux comptes en recrutement RSSI.",
      rationale: "Signal d'achat précoce.",
      evidence: [],
    },
    {
      action: "Préparer un audit flash.",
      rationale: "Porte d'entrée à faible engagement.",
      horizon: "immediate",
      evidence: [ARTICLE],
    },
  ],
  sourceRefs: [DIGEST, ARTICLE],
}

describe("renderMissionReportText", () => {
  const text = renderMissionReportText(REPORT)

  it("porte le titre et la synthèse en tête", () => {
    expect(text.startsWith(`# ${REPORT.title}`)).toBe(true)
    expect(text).toContain("## Synthèse")
    expect(text).toContain(REPORT.executiveSummary)
  })

  it("n'omet AUCUN constat, quelle que soit sa catégorie", () => {
    for (const finding of REPORT.findings) {
      expect(text).toContain(finding.statement)
    }
    for (const heading of [
      "Tendances",
      "Signaux faibles",
      "Réglementaire",
      "Opportunités",
      "Risques",
      "Autres constats",
    ]) {
      expect(text).toContain(`### ${heading}`)
    }
  })

  it("n'omet AUCUNE recommandation, avec ou sans horizon", () => {
    for (const recommendation of REPORT.recommendations) {
      expect(text).toContain(recommendation.action)
      expect(text).toContain(recommendation.rationale)
    }
    expect(text).toContain("(horizon : 30 jours)")
    expect(text).toContain("(horizon : immédiat)")
    // La recommandation sans horizon n'en invente pas un.
    expect(text).toContain("- Qualifier les deux comptes en recrutement RSSI.\n  Pourquoi :")
  })

  it("cite les sources de chaque constat et la liste globale", () => {
    // Constat « tendance » : ses deux preuves sont rendues, dans l'ordre.
    expect(text).toContain(
      `  Sources : ${DIGEST.title} (${DIGEST.provenance}) ; ${ARTICLE.title} (${ARTICLE.provenance})`,
    )
    expect(text).toContain("## Sources du rapport")
    for (const ref of REPORT.sourceRefs) {
      expect(text).toContain(`- ${ref.title} (${ref.provenance})`)
    }
  })

  it("ne produit pas le JSON brut du modèle", () => {
    expect(text).not.toContain("schemaVersion")
    expect(text).not.toContain('"findings"')
  })

  it("omet les sections vides plutôt que d'afficher des titres creux", () => {
    const minimal = renderMissionReportText({
      schemaVersion: 1,
      title: "Rapport minimal",
      executiveSummary: "Synthèse.",
      findings: [{ category: "autre", statement: "Un seul constat.", evidence: [] }],
      recommendations: [],
      sourceRefs: [],
    })

    expect(minimal).toContain("### Autres constats")
    expect(minimal).not.toContain("## Recommandations")
    expect(minimal).not.toContain("## Sources du rapport")
    expect(minimal).not.toContain("### Tendances")
  })
})
