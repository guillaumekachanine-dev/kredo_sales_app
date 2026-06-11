import { getModuleTabs } from "@/lib/navigation/main-menu.config"
import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

const tabs = getModuleTabs("/prospection")

export default function ProspectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBarSlot tabs={tabs} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
