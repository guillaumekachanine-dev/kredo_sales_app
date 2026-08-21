import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

interface BusinessIntelligenceHeaderProps {
  title?: string
  minimal?: boolean
  segmentName: string
  macroName: string | null
  status: string
  onChangeSegment: () => void
}

export function BusinessIntelligenceHeader({
  title = "Business Intelligence",
  minimal = false,
  segmentName,
  macroName,
  status,
  onChangeSegment,
}: BusinessIntelligenceHeaderProps) {
  return (
    <header
      className={cn(
        "mx-auto flex w-full items-center border-b border-border/40 px-4 py-3.5 lg:px-8",
        minimal ? "max-w-none" : "max-w-[1600px]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-5">
        <div className="min-w-0"><h1 className="font-heading text-2xl font-bold tracking-tight text-heading">{title}</h1><p className="mt-1 truncate text-xs text-muted"><strong className="font-semibold text-body">{segmentName}</strong>{macroName ? ` · ${macroName}` : ""} · {status}</p></div>
        <Button variant="secondary" size="sm" onClick={onChangeSegment}>Changer de segment</Button>
      </div>
    </header>
  )
}
