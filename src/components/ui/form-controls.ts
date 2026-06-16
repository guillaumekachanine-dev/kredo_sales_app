import { cn } from "@/lib/utils"

export type FormControlSize = "sm" | "md" | "lg"

export const controlBaseClasses = cn(
  "w-full rounded-[var(--radius-medium)] border [border-width:var(--border-width-default)]",
  "bg-canvas text-heading shadow-none outline-none",
  "placeholder:text-muted",
  "transition-[background-color,border-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
  "focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
  "focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
  "disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)] disabled:opacity-100",
)

export const controlStateClasses = {
  default: "border-border",
  invalid: "border-danger text-heading",
}

export const controlSizeClasses: Record<FormControlSize, string> = {
  sm: "h-11 px-3 text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)] sm:h-9",
  md: "h-11 px-3 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] sm:h-10",
  lg: "h-12 px-4 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] sm:h-11",
}

export const controlTextareaMinHeightClasses: Record<FormControlSize, string> = {
  sm: "min-h-24 px-3 py-2.5 text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)]",
  md: "min-h-28 px-3 py-2.5 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)]",
  lg: "min-h-32 px-4 py-3 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)]",
}

export const controlAffixPadding = {
  left: {
    sm: "pl-9 sm:pl-8",
    md: "pl-10 sm:pl-9",
    lg: "pl-11 sm:pl-10",
  },
  right: {
    sm: "pr-9 sm:pr-8",
    md: "pr-10 sm:pr-9",
    lg: "pr-11 sm:pr-10",
  },
}

export const fieldLabelClasses = "text-xs font-medium text-heading"
export const fieldMetaClasses = "text-[11px] leading-4 text-body"
export const fieldErrorClasses = "text-[11px] leading-4 text-danger"

export function getControlClassName({
  size,
  invalid,
  hasLeftElement,
  hasRightElement,
  className,
}: {
  size: FormControlSize
  invalid?: boolean
  hasLeftElement?: boolean
  hasRightElement?: boolean
  className?: string
}) {
  return cn(
    controlBaseClasses,
    invalid ? controlStateClasses.invalid : controlStateClasses.default,
    controlSizeClasses[size],
    hasLeftElement && controlAffixPadding.left[size],
    hasRightElement && controlAffixPadding.right[size],
    className,
  )
}
