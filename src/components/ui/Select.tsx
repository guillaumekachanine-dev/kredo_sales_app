"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { FormControlSize, getControlClassName } from "./form-controls"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: FormControlSize
  invalid?: boolean
  fullWidth?: boolean
  hideIndicator?: boolean
}

type SelectItem =
  | {
      kind: "group"
      key: string
      label: string
    }
  | {
      kind: "option"
      key: string
      value: string
      label: React.ReactNode
      disabled: boolean
    }

type SelectChildProps = {
  children?: React.ReactNode
  label?: string
  value?: string | number
  disabled?: boolean
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("")
  }

  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<SelectChildProps>
    return getNodeText(element.props.children)
  }

  return ""
}

function flattenSelectChildren(
  children: React.ReactNode,
  prefix = "root",
): SelectItem[] {
  const items: SelectItem[] = []

  React.Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) {
      return
    }

    const element = child as React.ReactElement<SelectChildProps>

    const key = `${prefix}-${element.key ?? index}`

    if (element.type === React.Fragment) {
      items.push(...flattenSelectChildren(element.props.children, key))
      return
    }

    if (typeof element.type === "string" && element.type.toLowerCase() === "optgroup") {
      const nextGroupLabel = typeof element.props.label === "string" ? element.props.label : ""
      if (nextGroupLabel) {
        items.push({
          kind: "group",
          key: `${key}-group`,
          label: nextGroupLabel,
        })
      }
      items.push(...flattenSelectChildren(element.props.children, key))
      return
    }

    if (typeof element.type === "string" && element.type.toLowerCase() === "option") {
      const value = element.props.value == null ? getNodeText(element.props.children) : String(element.props.value)
      items.push({
        kind: "option",
        key,
        value,
        label: element.props.children,
        disabled: Boolean(element.props.disabled),
      })
    }
  })

  return items
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)

    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return isMobile
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      size = "md",
      invalid = false,
      fullWidth = false,
      hideIndicator = false,
      className,
      disabled,
      children,
      id,
      name,
      value,
      defaultValue,
      onChange,
      multiple,
      title,
      required,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref,
  ) {
    const nativeSelectRef = useRef<HTMLSelectElement | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [uncontrolledValue, setUncontrolledValue] = useState(
      defaultValue == null ? "" : String(defaultValue),
    )
    const isMobileViewport = useIsMobileViewport()
    const isControlled = value !== undefined
    const optionItems = useMemo(() => flattenSelectChildren(children), [children])
    const selectedValue = isControlled ? String(value ?? "") : uncontrolledValue
    const selectedOption = optionItems.find(
      (item): item is Extract<SelectItem, { kind: "option" }> =>
        item.kind === "option" && item.value === selectedValue,
    )
    const fallbackOption = optionItems.find(
      (item): item is Extract<SelectItem, { kind: "option" }> => item.kind === "option" && !item.disabled,
    )
    const displayOption = selectedOption ?? fallbackOption
    const displayLabel = displayOption?.label ?? "Sélectionner"
    const drawerTitle = ariaLabel ?? title ?? "Sélectionner une option"
    const shouldRenderMobileSelect = isMobileViewport && !multiple

    useEffect(() => {
      if (!drawerOpen) return

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setDrawerOpen(false)
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [drawerOpen])

    const setRefs = (node: HTMLSelectElement | null) => {
      nativeSelectRef.current = node

      if (typeof ref === "function") {
        ref(node)
        return
      }

      if (ref) {
        ref.current = node
      }
    }

    const commitValue = (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }

      const selectNode = nativeSelectRef.current
      if (selectNode) {
        selectNode.value = nextValue
        selectNode.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }

    if (shouldRenderMobileSelect) {
      return (
        <div className={cn("relative", fullWidth && "w-full")}>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            title={title}
            className={cn(
              getControlClassName({
                size,
                invalid,
                hasRightElement: !hideIndicator,
                className,
              }),
              "flex items-center justify-between gap-3 text-left",
            )}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
            {!hideIndicator ? (
              <svg className="size-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>

          <select
            {...props}
            ref={setRefs}
            hidden
            aria-hidden="true"
            tabIndex={-1}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            name={name}
            required={required}
            value={selectedValue}
            onChange={onChange}
          >
            {children}
          </select>

          {drawerOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  className="fixed inset-0 z-[var(--z-drawer)] flex items-center justify-center bg-[var(--color-backdrop)] px-4 py-6 sm:hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-label={drawerTitle}
                  onClick={() => setDrawerOpen(false)}
                >
                  <div
                    className="flex w-[min(92vw,26rem)] max-w-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface text-heading shadow-[var(--shadow-overlay-md)] animate-in fade-in zoom-in-95 duration-150"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="border-b border-border/70 px-4 py-3.5">
                      <p className="text-sm font-semibold leading-5 text-heading">{drawerTitle}</p>
                    </div>

                    <div className="flex max-h-[min(60vh,28rem)] flex-col overflow-y-auto px-2 py-2">
                      {optionItems.map((item) => {
                        if (item.kind === "group") {
                          return (
                            <p
                              key={item.key}
                              className="px-2 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted first:pt-0"
                            >
                              {item.label}
                            </p>
                          )
                        }

                        const isSelected = item.value === selectedValue

                        return (
                          <button
                            key={item.key}
                            type="button"
                            disabled={item.disabled}
                            className={cn(
                              "flex min-h-11 w-full items-start justify-between gap-3 rounded-[14px] px-3 py-3 text-left text-sm leading-6 text-heading transition-colors",
                              isSelected ? "bg-primary/8 text-primary" : "bg-transparent",
                              item.disabled && "cursor-not-allowed opacity-50",
                            )}
                            onClick={() => {
                              commitValue(item.value)
                              setDrawerOpen(false)
                            }}
                          >
                            <span className="min-w-0 flex-1 break-words">{item.label}</span>
                            <span
                              className={cn(
                                "mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border",
                                isSelected && "border-primary bg-primary text-primary-fg",
                              )}
                              aria-hidden="true"
                            >
                              {isSelected ? (
                                <svg className="size-3" viewBox="0 0 16 16" fill="none">
                                  <path
                                    d="M3.5 8.25L6.5 11.25L12.5 4.75"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>,
                document.body,
              )
            : null}
        </div>
      )
    }

    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <select
          id={id}
          ref={ref}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            getControlClassName({
              size,
              invalid,
              hasRightElement: !hideIndicator,
              className,
            }),
            "appearance-none cursor-pointer",
          )}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          {...props}
        >
          {children}
        </select>
        {!hideIndicator ? (
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
        ) : null}
      </div>
    )
  },
)

Select.displayName = "Select"
