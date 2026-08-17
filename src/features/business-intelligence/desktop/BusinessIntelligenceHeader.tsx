import { cn } from "@/lib/utils"

interface BusinessIntelligenceHeaderProps {
  title?: string
  minimal?: boolean
}

export function BusinessIntelligenceHeader({
  title = "Business Intelligence",
  minimal = false,
}: BusinessIntelligenceHeaderProps) {
  return (
    <header
      className={cn(
        "mx-auto flex w-full items-center border-b border-border/40 px-4 py-3.5 lg:px-8",
        minimal ? "max-w-none" : "max-w-[1600px]",
      )}
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
        {title}
      </h1>
    </header>
  )
}
