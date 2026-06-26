import { cn } from "@/lib/utils"
import { Breadcrumb } from "./Breadcrumb"
import { IntelligenceToggle } from "@/components/intelligence/IntelligenceToggle"

interface AppHeaderProps {
  className?: string
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-[var(--layout-header-height)] shrink-0 select-none items-center justify-between gap-4 border-b border-border bg-surface px-6",
        className,
      )}
    >
      <Breadcrumb />

      <div className="flex items-center gap-4 shrink-0">
        <IntelligenceToggle />
      </div>
    </header>
  )
}
