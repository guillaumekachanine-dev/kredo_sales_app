"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { ActivityCategory } from "@/lib/communication/communication-scenario-registry"

export const STEP_LEAVE_MS = 190
export const RELIEF_HOVER = "kredo-relief-hover"

export const CATEGORY_IMAGE_SRC: Record<ActivityCategory, string> = {
  recrutement: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  management_consultants: "/icons_set/recrutement%20%26%20staffing/candidate_CV_sent.png",
  internal_staff: "/icons_set/presentation_client_rt_2.png",
  commerce_prospection: "/icons_set/contexte_client.png",
  commerce_actif: "/icons_set/contacts_client.png",
  delivery: "/icons_set/Data_%26_IA.png",
}

export const CATEGORY_TONE_CLASSES: Record<1 | 2 | 3 | 4 | 5 | 6, { card: string }> = {
  1: { card: "border-dataviz-1/35 bg-dataviz-1/[0.05] hover:border-dataviz-1/70" },
  2: { card: "border-dataviz-2/35 bg-dataviz-2/[0.05] hover:border-dataviz-2/70" },
  3: { card: "border-dataviz-3/35 bg-dataviz-3/[0.05] hover:border-dataviz-3/70" },
  4: { card: "border-dataviz-4/35 bg-dataviz-4/[0.05] hover:border-dataviz-4/70" },
  5: { card: "border-dataviz-5/35 bg-dataviz-5/[0.05] hover:border-dataviz-5/70" },
  6: { card: "border-dataviz-6/35 bg-dataviz-6/[0.05] hover:border-dataviz-6/70" },
}

export function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="mt-0.5 size-4 shrink-0 text-primary"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function StepDots({ steps, currentStep }: { steps: string[]; currentStep: string }) {
  return (
    <span className="ml-auto flex items-center gap-1.5" aria-hidden="true">
      {steps.map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            s === currentStep ? "w-4 bg-primary" : "w-1.5 bg-border",
          )}
        />
      ))}
    </span>
  )
}

export function CategoryCard({
  value,
  label,
  dataviz,
  isSelected,
  onClick,
  style,
  className,
}: {
  value: ActivityCategory
  label: string
  dataviz: 1 | 2 | 3 | 4 | 5 | 6
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center w-full cursor-pointer",
        CATEGORY_TONE_CLASSES[dataviz].card,
        isSelected && "ring-2 ring-primary/70",
        RELIEF_HOVER,
        className,
      )}
    >
      <span className="relative z-10 flex size-11 items-center justify-center">
        <Image
          src={CATEGORY_IMAGE_SRC[value]}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      </span>
      <span className="relative z-10 line-clamp-2 text-[11px] font-bold leading-tight text-heading">
        {label}
      </span>
    </button>
  )
}

export function ScenarioCard({
  label,
  description,
  isSelected,
  onClick,
  style,
  className,
}: {
  label: string
  description: string
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-left w-full cursor-pointer",
        RELIEF_HOVER,
        className,
        isSelected ? "bg-primary/8" : "bg-canvas/50 hover:bg-canvas",
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-heading">{label}</span>
        <span className="line-clamp-2 text-[11px] leading-relaxed text-muted">
          {description}
        </span>
      </div>
      {isSelected && <CheckIcon />}
    </button>
  )
}

export function ObjectiveCard({
  label,
  suggested,
  isSelected,
  onClick,
  style,
  className,
}: {
  label: string
  suggested?: boolean
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left w-full cursor-pointer",
        RELIEF_HOVER,
        className,
        isSelected
          ? "border-primary/50 bg-primary/10"
          : "border-border/40 bg-canvas/50 hover:bg-canvas",
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-heading")}>
          {label}
        </span>
        {suggested && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] text-primary">
            Suggéré
          </span>
        )}
      </span>
      {isSelected && <CheckIcon />}
    </button>
  )
}
