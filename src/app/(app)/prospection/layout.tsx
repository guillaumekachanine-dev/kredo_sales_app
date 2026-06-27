import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"
import { CrmTabbedShell } from "@/components/accounts-contacts/CrmTabbedShell"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"

export default async function ProspectionLayout({ children }: { children: React.ReactNode }) {
  const device = await getDashboardDevice()
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBarSlot />
      <CrmTabbedShell isMobile={device === "mobile"}>
        {children}
      </CrmTabbedShell>
    </div>
  )
}
