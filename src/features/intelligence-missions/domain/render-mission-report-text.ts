/**
 * Rendu texte d'un rapport de mission — ADR-0020 L3.
 *
 * POURQUOI CE FICHIER EXISTE. `buildResultContentText`
 * (`src/lib/communication/communication-result-documents.ts`) est un dispatcher par
 * FORME : il reconnaît `CommunicationOutput`, `SpokenPitchOutput`,
 * `MeetingBriefingOutput`… et retombe sur le `content_text` reçu pour toute forme
 * inconnue. `MissionReportV1` n'a aucune de ces formes. Sans ce module, le
 * `content_text` du document de mission serait le JSON brut du modèle — illisible dans
 * `/reports`. Lui apprendre une forme de plus recréerait côté Next.js un couplage aux
 * détails d'une capacité unique (contraire à P7) : le callback écrit donc lui-même le
 * texte lisible dans `persistedPayload.contentText`.
 *
 * Le rendu est EXHAUSTIF par construction : tout champ du contrat apparaît dans le
 * texte. Les libellés sont portés par des `Record` exhaustifs — ajouter une catégorie
 * de constat ou un horizon au contrat casse le `typecheck` ici, plutôt que de laisser
 * disparaître une section en silence.
 *
 * Fonction PURE : aucune I/O, aucune dépendance runtime.
 */

import type { Finding, MissionReportV1, Recommendation, SourceRef } from "./mission-contracts"

/**
 * Un seul `Record`, exhaustif : ajouter une catégorie au contrat sans l'ajouter ici casse
 * le `typecheck`, au lieu de rendre ses constats muets. L'ORDRE DES CLÉS est l'ordre
 * d'affichage — les six sections d'`intel-021`, dont ce contrat est la reprise.
 */
const FINDING_SECTION_HEADINGS: Record<Finding["category"], string> = {
  tendance: "Tendances",
  signal_faible: "Signaux faibles",
  reglementaire: "Réglementaire",
  opportunite: "Opportunités",
  risque: "Risques",
  autre: "Autres constats",
}

const FINDING_SECTION_ORDER = Object.keys(FINDING_SECTION_HEADINGS) as Array<Finding["category"]>

const HORIZON_LABELS: Record<NonNullable<Recommendation["horizon"]>, string> = {
  immediate: "immédiat",
  "30_days": "30 jours",
  quarter: "trimestre",
}

function renderSources(evidence: readonly SourceRef[]): string | null {
  if (evidence.length === 0) return null
  return `  Sources : ${evidence.map((source) => `${source.title} (${source.provenance})`).join(" ; ")}`
}

export function renderMissionReportText(report: MissionReportV1): string {
  const lines: string[] = [`# ${report.title}`, "", "## Synthèse", report.executiveSummary]

  if (report.findings.length > 0) {
    lines.push("", "## Constats")

    for (const category of FINDING_SECTION_ORDER) {
      const findings = report.findings.filter((finding) => finding.category === category)
      if (findings.length === 0) continue

      lines.push("", `### ${FINDING_SECTION_HEADINGS[category]}`)
      for (const finding of findings) {
        lines.push(`- ${finding.statement}`)
        const sources = renderSources(finding.evidence)
        if (sources) lines.push(sources)
      }
    }
  }

  if (report.recommendations.length > 0) {
    lines.push("", "## Recommandations")
    for (const recommendation of report.recommendations) {
      const horizon = recommendation.horizon ? ` (horizon : ${HORIZON_LABELS[recommendation.horizon]})` : ""
      lines.push(`- ${recommendation.action}${horizon}`)
      lines.push(`  Pourquoi : ${recommendation.rationale}`)
      const sources = renderSources(recommendation.evidence)
      if (sources) lines.push(sources)
    }
  }

  if (report.sourceRefs.length > 0) {
    lines.push("", "## Sources du rapport")
    for (const source of report.sourceRefs) {
      lines.push(`- ${source.title} (${source.provenance})`)
    }
  }

  return lines.join("\n")
}
