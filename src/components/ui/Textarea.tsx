"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  FormControlSize,
  controlBaseClasses,
  controlStateClasses,
  controlTextareaMinHeightClasses,
} from "./form-controls"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: FormControlSize
  invalid?: boolean
  fullWidth?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      size = "md",
      invalid = false,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBaseClasses,
          invalid ? controlStateClasses.invalid : controlStateClasses.default,
          controlTextareaMinHeightClasses[size],
          "resize-y",
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    )
  },
)

Textarea.displayName = "Textarea"
