"use client"

type DocumentAppliedParametersProps = {
  briefJson: unknown
}

type ParameterRow = {
  label: string
  value: string
}

const FORMAT_LABELS: Record<string, string> = {
  web: "Web",
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  csv: "CSV",
}

const PERIOD_PRESET_LABELS: Record<string, string> = {
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  year: "Année",
  custom: "Personnalisée",
}

const SCOPE_LABELS: Record<string, string> = {
  companyIds: "Comptes",
  sectorIds: "Secteurs",
  practices: "Pratiques",
  ownerIds: "Responsables",
  recruiterIds: "Recruteurs",
}

const OPTION_LABELS: Record<string, string> = {
  includeForecast: "Prévisions",
  includeRecommendations: "Recommandations",
  includeSources: "Sources",
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  client_summary: "Synthèse client",
  activity_commercial: "Activité commerciale",
  activity_recruitment: "Activité recrutement",
  weekly_manager: "Rapport hebdo manager",
  planning_deadlines: "Planning & échéances",
  financial: "Rapport financier",
  quarterly_review: "Business review trimestrielle",
  staffing_capacity: "Staffing & capacité",
  delivery_profitability: "Delivery & rentabilité",
  account_portfolio: "Revue de portefeuille comptes",
}

const AUDIENCE_LABELS: Record<string, string> = {
  self: "Usage personnel",
  management: "Management",
  executive: "Exécutif",
  account_team: "Équipe compte",
}

const DETAIL_LEVEL_LABELS: Record<string, string> = {
  executive: "Exécutif",
  standard: "Standard",
  detailed: "Détaillé",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("fr-FR")
}

function formatArrayValue(key: string, values: unknown[]) {
  const normalized = values
    .filter((value): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value))
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (normalized.length === 0) return null
  if (key.endsWith("Ids")) {
    return `${normalized.length} élément${normalized.length > 1 ? "s" : ""}`
  }

  return normalized.join(", ")
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function buildReportRows(brief: Record<string, unknown>): ParameterRow[] {
  const rows: ParameterRow[] = []

  if (typeof brief.reportType === "string") {
    rows.push({ label: "Rapport", value: REPORT_TYPE_LABELS[brief.reportType] ?? humanizeKey(brief.reportType) })
  }

  if (typeof brief.audience === "string") {
    rows.push({ label: "Public", value: AUDIENCE_LABELS[brief.audience] ?? humanizeKey(brief.audience) })
  }

  if (typeof brief.detailLevel === "string") {
    rows.push({ label: "Niveau de détail", value: DETAIL_LEVEL_LABELS[brief.detailLevel] ?? humanizeKey(brief.detailLevel) })
  }

  if (Array.isArray(brief.outputFormats) && brief.outputFormats.length > 0) {
    rows.push({
      label: "Formats",
      value: brief.outputFormats
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => FORMAT_LABELS[value] ?? value.toUpperCase())
        .join(", "),
    })
  }

  if (isRecord(brief.period)) {
    const { startDate, endDate, asOfDate, preset } = brief.period
    if (typeof asOfDate === "string" && asOfDate.trim()) {
      rows.push({ label: "Date de référence", value: formatDate(asOfDate) })
    }

    const periodParts = [
      typeof preset === "string" && preset.trim() ? (PERIOD_PRESET_LABELS[preset] ?? humanizeKey(preset)) : null,
      typeof startDate === "string" && typeof endDate === "string"
        ? `${formatDate(startDate)} → ${formatDate(endDate)}`
        : null,
    ].filter((value): value is string => Boolean(value))

    if (periodParts.length > 0) {
      rows.push({ label: "Période", value: periodParts.join(" · ") })
    }
  }

  if (isRecord(brief.scope)) {
    rows.push(
      ...Object.entries(brief.scope).flatMap(([key, rawValue]) => {
        if (!Array.isArray(rawValue) || rawValue.length === 0) return []
        const formatted = formatArrayValue(key, rawValue)
        return formatted
          ? [{ label: SCOPE_LABELS[key] ?? humanizeKey(key), value: formatted }]
          : []
      })
    )
  }

  if (isRecord(brief.options)) {
    rows.push(
      ...Object.entries(brief.options).flatMap(([key, rawValue]) => {
        if (typeof rawValue !== "boolean") return []
        return [{
          label: OPTION_LABELS[key] ?? humanizeKey(key),
          value: rawValue ? "Oui" : "Non",
        }]
      })
    )
  }

  if (typeof brief.additionalInstructions === "string" && brief.additionalInstructions.trim()) {
    rows.push({ label: "Instructions", value: brief.additionalInstructions.trim() })
  }

  return rows
}

function flattenGenericParameters(
  value: Record<string, unknown>,
): ParameterRow[] {
  return Object.entries(value).flatMap(([key, rawValue]) => {
    const nextLabel = humanizeKey(key)

    if (rawValue == null) return []

    if (typeof rawValue === "string") {
      return rawValue.trim() ? [{ label: nextLabel, value: rawValue.trim() }] : []
    }

    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      return [{ label: nextLabel, value: typeof rawValue === "boolean" ? (rawValue ? "Oui" : "Non") : String(rawValue) }]
    }

    if (Array.isArray(rawValue)) {
      const formatted = formatArrayValue(key, rawValue)
      return formatted ? [{ label: nextLabel, value: formatted }] : []
    }

    if (isRecord(rawValue)) {
      return flattenGenericParameters(rawValue)
    }

    return []
  })
}

function buildParameterRows(briefJson: unknown): ParameterRow[] {
  if (!isRecord(briefJson)) return []
  if ("reportType" in briefJson && "period" in briefJson && "audience" in briefJson) {
    return buildReportRows(briefJson)
  }

  return flattenGenericParameters(briefJson)
}

export function DocumentAppliedParameters({ briefJson }: DocumentAppliedParametersProps) {
  const rows = buildParameterRows(briefJson)

  if (rows.length === 0) {
    return <p className="text-sm text-muted">Aucun paramètre enregistré.</p>
  }

  return (
    <dl className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}:${row.value}`}
          className="inline-flex min-h-8 max-w-full items-center gap-2 border border-border bg-canvas/35 px-2.5 py-1.5 align-top"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {row.label}
          </dt>
          <dd className="truncate text-sm leading-none text-body">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
