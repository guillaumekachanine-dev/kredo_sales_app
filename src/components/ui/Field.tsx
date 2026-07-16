"use client"

import React, { useId } from "react"
import { cn } from "@/lib/utils"
import { fieldErrorClasses, fieldLabelClasses, fieldMetaClasses } from "./form-controls"

export interface FieldProps {
  label?: React.ReactNode
  htmlFor?: string
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  optional?: boolean
  children: React.ReactElement
  className?: string
  labelClassName?: string
}

export function Field({
  label,
  htmlFor,
  description,
  error,
  required = false,
  optional = false,
  children,
  className,
  labelClassName,
}: FieldProps) {
  const generatedId = useId()
  const controlId = htmlFor ?? generatedId
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : (children.props as { "aria-invalid"?: boolean })["aria-invalid"],
      } as Record<string, unknown>)
    : children

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={controlId} className={cn(fieldLabelClasses, labelClassName)}>
          <span>{label}</span>
          {required ? (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
          {!required && optional ? (
            <span className="ml-1 text-muted">Optionnel</span>
          ) : null}
        </label>
      ) : null}

      {child}

      {description ? (
        <p id={descriptionId} className={fieldMetaClasses}>
          {description}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className={fieldErrorClasses} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
