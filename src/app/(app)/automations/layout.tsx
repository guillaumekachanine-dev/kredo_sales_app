import { SectionNavBarSlot } from "@/components/layout/SectionNavBarSlot"

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden touch-pan-y">
      <SectionNavBarSlot />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-full touch-pan-y">
        {children}
      </div>
    </div>
  )
}
