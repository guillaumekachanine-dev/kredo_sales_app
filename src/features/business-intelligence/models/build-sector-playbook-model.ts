import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

export interface SectorPlaybookItem {
  sectorId: string
  name: string
  status: "active" | "watch"
  summary: string
  personas: any[]
  roiArguments: any[]
  objections: any[]
  entryPoints: any[]
  painPoints: any[]
  deadlines: {
    title: string
    date: string | null
    urgency: number
  }[]
  practices: Record<string, number>
  priorityAccounts: { id: string; name: string; priority: number }[]
  caveats: any[]
  sources: any[]
}

export function buildSectorPlaybookModel(snapshot: BusinessIntelligenceSnapshot, sectorId: string): SectorPlaybookItem | null {
  const { sectors, accounts, windows } = snapshot

  const sector = sectors.find(s => s.id === sectorId)
  if (!sector) return null

  // Ensure sector is cast correctly since we added playbook dynamically
  const playbookData = (sector as any).playbook ?? {}

  const sectorAccounts = accounts.filter(a => a.sectorId === sectorId)
    .toSorted((a, b) => b.actionPriorityScore30d - a.actionPriorityScore30d)

  const sectorWindows = windows.filter(w => w.sectorId === sectorId)
  
  return {
    sectorId: sector.id,
    name: sector.name,
    status: sector.status as "active" | "watch",
    summary: sector.status === "active" ? "Secteur documenté et prêt à l'emploi" : "Secteur en préparation / veille",
    personas: Array.isArray(playbookData.personas) ? playbookData.personas : [],
    roiArguments: Array.isArray(playbookData.roi_arguments) ? playbookData.roi_arguments : [],
    objections: Array.isArray(playbookData.objections) ? playbookData.objections : [],
    entryPoints: Array.isArray(playbookData.entry_points) ? playbookData.entry_points : [],
    painPoints: [], // Will be hydrated from windows or db later if needed, but not strictly in playbook JSON
    deadlines: sectorWindows.filter(w => w.sourceType === "regulation").map(w => ({
      title: w.title,
      date: w.deadlineAt,
      urgency: w.urgencyScore
    })),
    practices: sector.practiceScores ?? {},
    priorityAccounts: sectorAccounts.slice(0, 5).map(a => ({ id: a.id, name: a.name, priority: a.actionPriorityScore30d })),
    caveats: [],
    sources: []
  }
}

