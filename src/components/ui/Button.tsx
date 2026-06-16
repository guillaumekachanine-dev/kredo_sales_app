"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "brass"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const buttonBaseClasses = cn(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap",
  "rounded-[var(--radius-medium)] border [border-width:var(--border-width-default)] shadow-none",
  "font-semibold outline-none",
  "transition-[background-color,border-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
  "focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]",
  "focus-visible:ring-offset-[var(--focus-ring-offset)] focus-visible:ring-offset-[var(--color-bg-canvas)]",
  "disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]",
)

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    "border-transparent bg-primary text-primary-fg",
    "hover:bg-primary-deep active:bg-primary-deep/95",
    "disabled:border-[var(--color-disabled-border)] disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]",
  ),
  secondary: cn(
    "border-border bg-surface text-heading",
    "hover:bg-surface-hover active:bg-surface-hover/80",
    "disabled:border-[var(--color-disabled-border)] disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]",
  ),
  ghost: cn(
    "border-transparent bg-transparent text-body",
    "hover:bg-surface-hover hover:text-heading active:bg-surface-hover/80",
    "disabled:border-transparent disabled:bg-transparent disabled:text-[var(--color-disabled-text)]",
  ),
  destructive: cn(
    "border-transparent bg-danger text-primary-fg",
    "hover:bg-danger/90 active:bg-danger/95",
    "disabled:border-[var(--color-disabled-border)] disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]",
  ),
  brass: cn(
    "border-transparent bg-brand-brass text-secondary-fg",
    "hover:bg-brand-brass-hover active:bg-brand-brass-hover/95",
    "disabled:border-[var(--color-disabled-border)] disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)]",
  ),
}

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "h-11 min-w-11 px-3 text-[length:var(--font-size-label-sm)] leading-[var(--line-height-label-sm)] sm:h-9 sm:min-w-9",
  md: "h-11 min-w-11 px-4 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] sm:h-10 sm:min-w-10",
  lg: "h-12 min-w-12 px-5 text-[length:var(--font-size-body-md)] leading-[var(--line-height-body-md)] sm:h-11 sm:min-w-11",
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "size-4",
  md: "size-4",
  lg: "size-[1.125rem]",
}

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const spinnerSize = size === "lg" ? "size-[1.125rem]" : "size-4"

  return (
    <svg
      className={cn("animate-spin text-current", spinnerSize)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingLabel,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          buttonBaseClasses,
          buttonVariantClasses[variant],
          buttonSizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center gap-2",
            loading && "opacity-0",
          )}
        >
          {leftIcon ? (
            <span className={cn("inline-flex shrink-0 items-center justify-center", iconSizeClasses[size])} aria-hidden="true">
              {leftIcon}
            </span>
          ) : null}
          {children}
          {rightIcon ? (
            <span className={cn("inline-flex shrink-0 items-center justify-center", iconSizeClasses[size])} aria-hidden="true">
              {rightIcon}
            </span>
          ) : null}
        </span>

        {loading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
            <LoadingSpinner size={size} />
            {loadingLabel ? <span>{loadingLabel}</span> : null}
            <span className="sr-only">{loadingLabel ?? "Chargement"}</span>
          </span>
        ) : null}
      </button>
    )
  },
)

Button.displayName = "Button"

export {
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
  iconSizeClasses,
  LoadingSpinner,
}
