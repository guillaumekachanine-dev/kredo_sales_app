import { getModuleTabs } from "@/lib/navigation/main-menu.config"
import { SectionNavBar } from "@/components/layout/SectionNavBar"

const tabs = getModuleTabs("/knowledge")

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBar tabs={tabs} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
