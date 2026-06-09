import { getModuleTabs } from "@/lib/navigation/main-menu.config"
import { SectionNavBar } from "@/components/layout/SectionNavBar"

const accountsContactsTabs = getModuleTabs("/accounts-contacts")

export default function AccountsContactsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionNavBar tabs={accountsContactsTabs} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
