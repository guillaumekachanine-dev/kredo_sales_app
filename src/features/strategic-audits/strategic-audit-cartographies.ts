export type StrategicAuditCartographies = {
  companyId: string
  title: string
  auditDate: string | null
  operationalActivities: { domain: string; introduction?: string; activities: { code?: string; label: string; description: string; frequency?: string; workload?: string }[] }[]
  stakeholders: { domain: string; stakeholders: { name: string; nature?: string; frequency?: string; criticality?: string; friction?: string }[] }[]
  workload: { introduction?: string; columns: string[]; rows: { domain: string; values: string[] }[]; keyInsight?: string }
}

export function parseStrategicAuditCartographies(value: unknown): StrategicAuditCartographies | null {
  if (!value || typeof value !== "object") return null
  const data = value as Partial<StrategicAuditCartographies>
  if (!data.companyId || !data.title || !Array.isArray(data.operationalActivities) || !Array.isArray(data.stakeholders) || !data.workload) return null
  return data as StrategicAuditCartographies
}
