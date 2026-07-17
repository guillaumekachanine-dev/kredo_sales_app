import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

export function buildSectorPlaybookModel(snapshot: BusinessIntelligenceSnapshot, sectorId: string) {
  const { sectors, accounts, windows } = snapshot

  const sector = sectors.find(s => s.id === sectorId)
  if (!sector) return null

  // Ensure sector is cast correctly since we added playbook dynamically
  const playbookData = (sector as any).playbook ?? {}

  const sectorAccounts = accounts.filter(a => a.sectorId === sectorId)
    .toSorted((a, b) => b.actionPriorityScore30d - a.actionPriorityScore30d)

  const sectorWindows = windows.filter(w => w.sectorId === sectorId)
  
  // Extract pain points logically or directly if available in the snapshot? 
  // Wait, pain points are NOT in SectorActivationSector natively unless we add them or compute from windows.
  // The contract just wants what we can get. The playbook JSON itself should contain personas, roi_arguments, objections, entry_points.
  
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
