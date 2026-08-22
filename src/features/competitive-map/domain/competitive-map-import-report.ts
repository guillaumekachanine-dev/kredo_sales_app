/**
 * Gestion des sources — Lot 6 · contrat du rapport d'import de cartographie.
 *
 * Module PUR (aucune dépendance Supabase), même doctrine que
 * `competitive-map-output.ts` : utilisé à la fois par l'action serveur qui
 * archive l'import (`confirmCompetitiveMapIngestion`) et par le composant qui
 * le restitue (`CompetitiveMapImportReportContent`), pour ne jamais faire
 * dériver la forme lue de la forme écrite.
 *
 * `content_text` alimente `intelligence_documents.search_vector`
 * (`to_tsvector('french', title || current_content_text)`, migration 042) :
 * ce n'est pas un doublon décoratif de `content_json`, c'est ce qui rend
 * l'import trouvable depuis la recherche de /reports.
 */

export type CompetitiveMapImportReportContent = {
  schemaVersion: 1
  sectorName: string
  /** Nom d'affichage du segment (`sector_intelligence.name`) — alimente le titre du document, distinct du `sectorName` (macro). */
  segmentName: string
  segmentSlug: string
  studySnapshotDate: string
  importedAt: string
  sourceFileName: string
  /** `null` si le JSON source dépasse le seuil d'archivage (cf. `sourceTruncated`). */
  sourceJson: unknown | null
  sourceTruncated: boolean
  counts: {
    analyzed: number
    imported: number
    rejected: number
    /** Exclu par l'utilisateur à l'étape d'arbitrage (jamais envoyé à la RPC). */
    excluded: number
    /** Décision envoyée à la RPC mais retournée en erreur. */
    failed: number
    created: number
    attached: number
  }
  createdAccounts: { companyId: string; name: string }[]
  attachedAccounts: { companyId: string }[]
  errors: { name: string | null; code: string; sqlstate: string }[]
}

export function isCompetitiveMapImportReportContent(value: unknown): value is CompetitiveMapImportReportContent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).schemaVersion === 1 &&
    typeof (value as Record<string, unknown>).sectorName === "string" &&
    typeof (value as Record<string, unknown>).counts === "object"
  )
}

function formatDateTimeFR(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Rapport concis lisible — c'est le texte qui doit alimenter `content_text`/`search_vector`, jamais un dump JSON. */
export function buildCompetitiveMapImportReportText(content: CompetitiveMapImportReportContent): string {
  const lines = [
    "Import de cartographie concurrentielle",
    "",
    `Secteur : ${content.sectorName}`,
    `Fichier : ${content.sourceFileName}`,
    `Import réalisé le : ${formatDateTimeFR(content.importedAt)}`,
    "",
    `Comptes analysés : ${content.counts.analyzed}`,
    `Comptes importés : ${content.counts.imported}`,
    `Comptes rejetés : ${content.counts.rejected}`,
  ]

  if (content.counts.created > 0) lines.push(`${content.counts.created} comptes créés`)
  if (content.counts.attached > 0) lines.push(`${content.counts.attached} comptes rattachés au CRM`)
  if (content.counts.excluded > 0) lines.push(`${content.counts.excluded} comptes exclus à l'arbitrage`)
  if (content.counts.failed > 0) lines.push(`${content.counts.failed} comptes en erreur d'import`)

  return lines.join("\n")
}

export function buildCompetitiveMapImportDocumentTitle(content: Pick<CompetitiveMapImportReportContent, "segmentName">): string {
  return `05-comptes - ${content.segmentName}`
}
