"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { FormControlSize, getControlClassName } from "./form-controls"

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: FormControlSize
  invalid?: boolean
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      size = "md",
      invalid = false,
      leftElement,
      rightElement,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    const hasLeftElement = Boolean(leftElement)
    const hasRightElement = Boolean(rightElement)

    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        {hasLeftElement ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted"
            aria-hidden="true"
          >
            {leftElement}
          </div>
        ) : null}

        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={getControlClassName({
            size,
            invalid,
            hasLeftElement,
            hasRightElement,
            className,
          })}
          {...props}
        />

        {hasRightElement ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {rightElement}
          </div>
        ) : null}
      </div>
    )
  },
)

Input.displayName = "Input"
