"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "./Input"
import { IconButton } from "./IconButton"
import { FormControlSize } from "./form-controls"

export interface ComboboxOption {
  id: string
  label: string
  description?: string
  disabled?: boolean
  kind?: "option" | "action"
}

export interface ComboboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "onChange" | "onSelect"> {
  size?: FormControlSize
  invalid?: boolean
  fullWidth?: boolean
  value: string
  onValueChange: (value: string) => void
  options: ComboboxOption[]
  onSelect: (option: ComboboxOption) => void
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  canOpen?: boolean
  clearable?: boolean
  onClear?: () => void
  rightStatus?: React.ReactNode
  renderOption?: (option: ComboboxOption, state: { active: boolean; selected: boolean }) => React.ReactNode
}

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(
    {
      size = "md",
      invalid = false,
      fullWidth = false,
      value,
      onValueChange,
      options,
      onSelect,
      loading = false,
      loadingMessage = "Recherche…",
      emptyMessage = "Aucun résultat",
      canOpen = true,
      clearable = false,
      onClear,
      rightStatus,
      renderOption,
      className,
      disabled,
      onFocus,
      onBlur,
      placeholder,
      ...props
    },
    ref,
  ) {
    const inputId = useId()
    const listboxId = `${inputId}-listbox`
    const statusId = `${inputId}-status`
    const containerRef = useRef<HTMLDivElement>(null)
    const localInputRef = useRef<HTMLInputElement>(null)
    const mergedRef = (node: HTMLInputElement | null) => {
      localInputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    }

    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    const selectableOptions = useMemo(
      () => options.filter((option) => !option.disabled),
      [options],
    )

    useEffect(() => {
      if (!canOpen) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }, [canOpen])

    useEffect(() => {
      if (!isOpen) return

      function handleOutsideClick(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          setActiveIndex(-1)
        }
      }

      document.addEventListener("mousedown", handleOutsideClick)
      return () => document.removeEventListener("mousedown", handleOutsideClick)
    }, [isOpen])

    useEffect(() => {
      if (!isOpen) {
        setActiveIndex(-1)
        return
      }

      if (selectableOptions.length === 0) {
        setActiveIndex(-1)
        return
      }

      setActiveIndex((current) => {
        if (current >= 0 && current < selectableOptions.length) return current
        return 0
      })
    }, [isOpen, selectableOptions])

    const activeOption = activeIndex >= 0 ? selectableOptions[activeIndex] : undefined

    const handleSelect = (option: ComboboxOption) => {
      if (option.disabled) return
      onSelect(option)
      setIsOpen(false)
      setActiveIndex(-1)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      if (event.key === "ArrowDown") {
        event.preventDefault()
        if (!isOpen && canOpen) {
          setIsOpen(true)
          return
        }
        setActiveIndex((current) =>
          selectableOptions.length === 0 ? -1 : Math.min(current + 1, selectableOptions.length - 1),
        )
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        if (!isOpen && canOpen) {
          setIsOpen(true)
          return
        }
        setActiveIndex((current) =>
          selectableOptions.length === 0 ? -1 : Math.max(current - 1, 0),
        )
        return
      }

      if (event.key === "Enter" && isOpen && activeOption) {
        event.preventDefault()
        handleSelect(activeOption)
        return
      }

      if (event.key === "Escape") {
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
          setActiveIndex(-1)
        }
        return
      }

      if (event.key === "Tab") {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    const rightElement = (
      <div className="flex items-center gap-1">
        {rightStatus ? <div className="text-muted">{rightStatus}</div> : null}
        {clearable && value.trim().length > 0 && onClear ? (
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Effacer la sélection"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear()
              localInputRef.current?.focus()
            }}
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M6 6L14 14M14 6L6 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        ) : null}
        <span className={cn("text-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true">
          <svg className="size-4" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    )

    const statusMessage = loading
      ? loadingMessage
      : isOpen && options.length === 0
        ? emptyMessage
        : undefined

    return (
      <div ref={containerRef} className={cn("relative", fullWidth && "w-full")}>
        <Input
          {...props}
          ref={mergedRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
          aria-describedby={props["aria-describedby"] ? `${props["aria-describedby"]} ${statusId}` : statusId}
          size={size}
          invalid={invalid}
          fullWidth={fullWidth}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value)
            if (!isOpen && canOpen) setIsOpen(true)
          }}
          onFocus={(event) => {
            if (canOpen) setIsOpen(true)
            onFocus?.(event)
          }}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rightElement={rightElement}
          className={className}
        />

        <div id={statusId} className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>

        {isOpen && canOpen && !disabled ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute top-[calc(100%+4px)] z-[var(--z-dropdown)] max-h-72 w-full overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-surface p-1 shadow-lg"
          >
            {loading ? (
              <div className="px-3 py-2 text-xs text-muted">{loadingMessage}</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted">{emptyMessage}</div>
            ) : (
              options.map((option) => {
                const active = option.id === activeOption?.id
                const selected = option.label === value

                return (
                  <button
                    key={option.id}
                    id={`${listboxId}-${option.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => {
                      const nextIndex = selectableOptions.findIndex((candidate) => candidate.id === option.id)
                      setActiveIndex(nextIndex)
                    }}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-[calc(var(--radius-medium)-2px)] px-3 py-2 text-left transition-[background-color,color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
                      active ? "bg-surface-hover text-heading" : "text-body hover:bg-surface-hover hover:text-heading",
                      option.disabled && "cursor-not-allowed opacity-[var(--opacity-disabled)]",
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, { active, selected })
                    ) : (
                      <div className="flex min-w-0 flex-col">
                        <span className={cn("truncate text-xs", option.kind === "action" ? "font-semibold text-primary" : "font-medium")}>
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="truncate text-[11px] text-muted">{option.description}</span>
                        ) : null}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>
    )
  },
)

Combobox.displayName = "Combobox"
