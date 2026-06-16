"use client"

import React from "react"
import {
  ButtonSize,
  ButtonVariant,
  LoadingSpinner,
  buttonBaseClasses,
  buttonSizeClasses,
  buttonVariantClasses,
} from "./Button"
import { cn } from "@/lib/utils"

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  "aria-label": string
  children: React.ReactNode
  variant?: Extract<ButtonVariant, "primary" | "secondary" | "ghost" | "destructive">
  size?: ButtonSize
  loading?: boolean
}

const iconButtonSizeClasses: Record<ButtonSize, string> = {
  sm: cn(buttonSizeClasses.sm, "px-0"),
  md: cn(buttonSizeClasses.md, "px-0"),
  lg: cn(buttonSizeClasses.lg, "px-0"),
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      "aria-label": ariaLabel,
      variant = "ghost",
      size = "md",
      loading = false,
      className,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={cn(
          buttonBaseClasses,
          buttonVariantClasses[variant],
          iconButtonSizeClasses[size],
          "aspect-square",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center",
            loading && "opacity-0",
          )}
          aria-hidden="true"
        >
          {children}
        </span>

        {loading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <LoadingSpinner size={size} />
            <span className="sr-only">Chargement</span>
          </span>
        ) : null}
      </button>
    )
  },
)

IconButton.displayName = "IconButton"
