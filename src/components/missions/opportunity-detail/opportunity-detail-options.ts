export const PRACTICE_OPTIONS = [
  "Data",
  "Cloud",
  "Cybersecurity",
  "Digital",
  "Infrastructure",
  "Workplace",
  "SAP",
  "Project Management",
  "Architecture",
  "AI"
]

export const TYPE_OPTIONS = [
  { value: "assistance_technique", label: "Assistance technique" },
  { value: "forfait", label: "Forfait" },
  { value: "centre_de_services", label: "Centre de services" },
  { value: "conseil", label: "Conseil" },
  { value: "audit", label: "Audit" },
  { value: "formation", label: "Formation" }
]

export const SOURCE_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "referral", label: "Referral" },
  { value: "account_growth", label: "Account growth" },
  { value: "partner", label: "Partner" },
  { value: "existing_client", label: "Existing client" }
]

export const REMOTE_OPTIONS = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "unknown", label: "Unknown" }
]

export const SENIORITY_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "confirme", label: "Confirmé" },
  { value: "senior", label: "Senior" },
  { value: "expert", label: "Expert" }
]

export const STAGE_LABELS: Record<string, string> = {
  en_cours: "En cours",
  cv_sent: "CV sent",
  rt: "RT",
  win: "Win",
  lost: "Lost",
  non_traitee: "Non traitée",
}

export const PRIORITY_LABELS: Record<string, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
}

export const OUTCOME_LABELS: Record<string, string> = {
  gagnee: "Gagnée",
  perdue: "Perdue",
  abandonnee: "Abandonnée",
}

export function getStageLabel(stage: string | null | undefined): string {
  if (!stage) return "—"
  return STAGE_LABELS[stage] || stage
}

export function getPriorityLabel(priority: string | null | undefined): string {
  if (!priority) return "—"
  return PRIORITY_LABELS[priority] || priority
}

export function getOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return "—"
  return OUTCOME_LABELS[outcome] || outcome
}

export function getTypeLabel(type: string | null | undefined): string {
  if (!type) return "—"
  const opt = TYPE_OPTIONS.find((o) => o.value === type)
  return opt ? opt.label : type.replace("_", " ")
}

export function getSourceLabel(source: string | null | undefined): string {
  if (!source) return "—"
  const opt = SOURCE_OPTIONS.find((o) => o.value === source)
  return opt ? opt.label : source.replace("_", " ")
}

export function getRemoteLabel(remote: string | null | undefined): string {
  if (!remote) return "—"
  const opt = REMOTE_OPTIONS.find((o) => o.value === remote)
  return opt ? opt.label : remote
}

export function getSeniorityLabel(seniority: string | null | undefined): string {
  if (!seniority) return "—"
  const opt = SENIORITY_OPTIONS.find((o) => o.value === seniority)
  return opt ? opt.label : seniority
}
