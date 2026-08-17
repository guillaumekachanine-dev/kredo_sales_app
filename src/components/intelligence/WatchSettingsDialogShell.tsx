import type { ReactNode } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"

export function Triangle({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true" className={cn("block size-0 border-y-[4px] border-y-transparent", direction === "left" ? "border-r-[7px] border-r-current" : "border-l-[7px] border-l-current")} />
}

export function Switch({ checked, onChange, disabled = false, label }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", checked ? "border-primary bg-primary" : "border-border-strong bg-border", disabled && "cursor-not-allowed opacity-50")}>
      <span className={cn("block size-[18px] rounded-full bg-surface shadow-sm transition-transform duration-200 motion-reduce:transition-none", checked ? "translate-x-[21px]" : "translate-x-0.5")} />
    </button>
  )
}

export function WatchSteps({ activeIndex, steps }: { activeIndex: number, steps: ReadonlyArray<{ id: string, label: string }> }) {
  return (
    <ol className="grid h-[68px] px-3 pt-3 sm:h-[74px] sm:px-5 sm:pt-3.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Étapes de paramétrage de la veille">
      {steps.map((step, index) => {
        const reached = index <= activeIndex
        return (
          <li key={step.id} className="relative flex min-w-0 flex-col items-center gap-1">
            {index > 0 ? <span className={cn("absolute right-1/2 top-[11px] h-px w-full", reached ? "bg-edito-brass" : "bg-white/25")} aria-hidden="true" /> : null}
            <span className={cn("relative z-10 flex size-[23px] items-center justify-center rounded-full border text-[10px] font-black leading-none", reached ? "border-edito-brass bg-edito-brass text-edito-ink" : "border-white/55 bg-edito-navy text-white/70")}>{index < activeIndex ? "✓" : index + 1}</span>
            <span className={cn("relative z-10 max-w-full truncate text-[8px] font-bold leading-3 sm:text-[9px]", reached ? "text-edito-brass" : "text-white/65")}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-edito-heading">{children}</h3>
}

export function CompactActionTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-small)] border border-edito-border bg-edito-surface px-3 text-edito-navy transition-colors duration-200 hover:border-primary/50 hover:bg-primary/[0.035] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
      <span className="text-[14px] font-bold text-primary">+</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.05em]">{label}</span>
    </button>
  )
}

export function LargeActionTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[90px] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-small)] border border-edito-border bg-edito-surface p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.035] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="text-2xl font-bold leading-none text-primary">+</span>
      <span className="text-xs font-bold text-edito-navy">{label}</span>
    </button>
  )
}

export function CompactDialogShell({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={title} className="w-[min(calc(100vw-1.5rem),25rem)]" maxHeightClassName="max-h-[min(calc(100dvh-2rem),34rem)]" headerClassName="border-b border-border pb-3" bodyClassName="pr-0">
      {children}
    </AppDialog>
  )
}
