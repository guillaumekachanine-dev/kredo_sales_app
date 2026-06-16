"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { FormControlSize, getControlClassName } from "./form-controls"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: FormControlSize
  invalid?: boolean
  fullWidth?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      size = "md",
      invalid = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            getControlClassName({
              size,
              invalid,
              hasRightElement: true,
              className,
            }),
            "appearance-none cursor-pointer",
          )}
          {...props}
        >
          {children}
        </select>

        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted"
          aria-hidden="true"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )
  },
)

Select.displayName = "Select"
