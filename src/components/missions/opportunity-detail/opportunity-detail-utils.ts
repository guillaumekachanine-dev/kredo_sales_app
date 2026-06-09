export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "—"
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return formatted
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const STAGE_LABELS: Record<string, string> = {
  en_cours: "En cours",
  cv_sent: "CV sent",
  rt: "RT",
  win: "Win",
  lost: "Lost",
  non_traitee: "Non traitée",
}

export function getStageLabel(stage: string | null | undefined): string {
  if (!stage) return "—"
  return STAGE_LABELS[stage] || stage
}

export const PRIORITY_LABELS: Record<string, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
}

export function getPriorityLabel(priority: string | null | undefined): string {
  if (!priority) return "—"
  return PRIORITY_LABELS[priority] || priority
}

export const OUTCOME_LABELS: Record<string, string> = {
  gagnee: "Gagnée",
  perdue: "Perdue",
  abandonnee: "Abandonnée",
}

export function getOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return "—"
  return OUTCOME_LABELS[outcome] || outcome
}
