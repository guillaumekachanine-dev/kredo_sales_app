"use client"

import { cn } from "@/lib/utils"

export type RatingIndicatorProps = {
  value: number | null
  mode?: "single" | "scale"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function RatingIndicator({
  value,
  mode = "scale",
  size = "md",
  showLabel = true,
  className,
}: RatingIndicatorProps) {
  // Ensure value is in 1..5 range if provided
  const score = value !== null ? Math.min(5, Math.max(1, Math.round(value))) : null

  // Size configurations
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-7 h-7 text-xs",
    lg: "w-10 h-10 text-lg",
  }

  const pxSizes = {
    sm: "24px",
    md: "28px",
    lg: "40px",
  }

  const sizeClass = sizeClasses[size] || sizeClasses.md
  const pxSize = pxSizes[size] || pxSizes.md

  // Definitions for each of the 5 levels
  const levels = [
    {
      level: 1,
      symbol: "--",
      label: "Très mauvais",
      colorClass: "bg-danger/10 text-danger border-danger/30",
    },
    {
      level: 2,
      symbol: "-",
      label: "Mauvais",
      colorClass: "bg-accent/10 text-accent border-accent/30",
    },
    {
      level: 3,
      symbol: "=",
      label: "Neutre",
      colorClass: "bg-warning/10 text-warning border-warning/30",
    },
    {
      level: 4,
      symbol: "+",
      label: "Bon",
      colorClass: "bg-success/10 text-success border-success/30",
    },
    {
      level: 5,
      symbol: "++",
      label: "Très bon",
      // Uses the global .kredo-ready-action-circle animation & styling rules
      colorClass: "kredo-rating-level5-blue text-white border-2 border-white! shadow-sm font-black",
    },
  ]

  if (score === null) {
    return (
      <span className={cn("text-xs text-muted font-medium italic", className)}>
        Non renseigné
      </span>
    )
  }

  if (mode === "single") {
    const currentLevel = levels[score - 1]
    const isLevel5 = score === 5

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span
          className={cn(
            "flex items-center justify-center rounded-full font-extrabold border shrink-0 transition-all select-none",
            sizeClass,
            isLevel5 ? currentLevel.colorClass : cn(currentLevel.colorClass, "bg-clip-padding")
          )}
          style={isLevel5 ? { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize } : undefined}
        >
          <span className="relative z-10">{currentLevel.symbol}</span>
        </span>
        {showLabel && (
          <span className="text-xs font-semibold text-heading">
            {currentLevel.label}
          </span>
        )}
      </div>
    )
  }

  // mode === "scale"
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {levels.map((lvl) => {
        const isActive = lvl.level === score
        const isLevel5 = lvl.level === 5

        return (
          <span
            key={lvl.level}
            title={lvl.label}
            className={cn(
              "flex items-center justify-center rounded-full font-extrabold transition-all shrink-0 select-none",
              sizeClass,
              isActive
                ? (isLevel5 ? lvl.colorClass : cn(lvl.colorClass, "border bg-clip-padding"))
                : "bg-muted/5 text-muted/30 border border-border/50"
            )}
            style={isActive && isLevel5 ? { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize } : undefined}
          >
            <span className="relative z-10">{lvl.symbol}</span>
          </span>
        )
      })}
    </div>
  )
}

