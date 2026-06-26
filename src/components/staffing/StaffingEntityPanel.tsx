import { SectionTab } from "@/lib/tabs/tab-types"
import { StaffingDetailPanel } from "./StaffingDetailPanel"

interface StaffingEntityPanelProps {
  tab: SectionTab
  isMobile?: boolean
}

export function StaffingEntityPanel({ tab, isMobile = false }: StaffingEntityPanelProps) {
  if (tab.entityType === "staffing") {
    return <StaffingDetailPanel tab={tab} />
  }
  
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      <p className="text-sm text-muted text-center py-12">
        Type d&apos;entité non supporté dans le module staffing.
      </p>
    </div>
  )
}
