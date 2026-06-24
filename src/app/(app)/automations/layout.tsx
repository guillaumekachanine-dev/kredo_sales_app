import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SectionNavBarSlot />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
