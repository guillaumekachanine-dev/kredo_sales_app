"use client"

import React, { useState } from "react"
import { Button, ButtonProps } from "./Button"

export interface AsyncActionButtonProps extends Omit<ButtonProps, "loading" | "onClick"> {
  children: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  isLoading?: boolean
}

export function AsyncActionButton({
  children,
  onClick,
  isLoading: externalIsLoading,
  disabled,
  className,
  type = "button",
  ...props
}: AsyncActionButtonProps) {
  const [internalIsLoading, setInternalIsLoading] = useState(false)
  const isLoading = externalIsLoading ?? internalIsLoading

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || !onClick) return

    try {
      const result = onClick(event)
      if (result instanceof Promise) {
        setInternalIsLoading(true)
        await result
      }
    } finally {
      setInternalIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      loading={isLoading}
      disabled={disabled}
      className={className}
      type={type}
      {...props}
    >
      {children}
    </Button>
  )
}
