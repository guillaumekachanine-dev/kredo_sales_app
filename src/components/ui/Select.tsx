"use client"

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { FormControlSize, getControlClassName } from "./form-controls"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: FormControlSize
  invalid?: boolean
  fullWidth?: boolean
  hideIndicator?: boolean
  dropdownWidthMode?: "trigger" | "dynamic"
  maxDropdownWidth?: string
  /** Force the desktop dropdown even on mobile viewports (e.g. when inside a modal where the drawer z-index is too low) */
  forceDropdown?: boolean
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
      className?: string
    }

type SelectChildProps = {
  children?: React.ReactNode
  label?: string
  value?: string | number
  disabled?: boolean
  className?: string
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
        className: element.props.className,
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
      dropdownWidthMode = "trigger",
      maxDropdownWidth,
      forceDropdown = false,
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
    const shouldRenderMobileSelect = isMobileViewport && !multiple && !forceDropdown

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

    const containerRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement | null>(null)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

    const hasNativePopover = typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.showPopover === "function"

    const setDropdownRef = useCallback((node: HTMLDivElement | null) => {
      dropdownRef.current = node
      if (node && hasNativePopover) {
        try {
          node.showPopover()
        } catch (e) {
          console.warn("Failed to show popover:", e)
        }
      }
    }, [hasNativePopover])

    const updateCoords = () => {
      const trigger = triggerRef.current
      if (trigger) {
        const rect = trigger.getBoundingClientRect()
        setCoords({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        })
      }
    }

    const handleTriggerClick = () => {
      if (!dropdownOpen) {
        updateCoords()
      }
      setDropdownOpen((open) => !open)
    }

    useEffect(() => {
      if (typeof document === "undefined") return
      const parentDialog = containerRef.current?.closest("dialog")
      setPortalContainer(parentDialog ?? document.body)
    }, [dropdownOpen, drawerOpen])

    useEffect(() => {
      if (!dropdownOpen) return

      updateCoords()

      const handlePointerDown = (event: PointerEvent | MouseEvent) => {
        const clickTarget = event.target as Node
        if (
          triggerRef.current && !triggerRef.current.contains(clickTarget) &&
          dropdownRef.current && !dropdownRef.current.contains(clickTarget)
        ) {
          setDropdownOpen(false)
        }
      }
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setDropdownOpen(false)
        }
      }

      document.addEventListener("pointerdown", handlePointerDown)
      document.addEventListener("keydown", handleKeyDown)
      window.addEventListener("resize", updateCoords)
      window.addEventListener("scroll", updateCoords, { capture: true })

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown)
        document.removeEventListener("keydown", handleKeyDown)
        window.removeEventListener("resize", updateCoords)
        window.removeEventListener("scroll", updateCoords, { capture: true })
      }
    }, [dropdownOpen])

    if (shouldRenderMobileSelect) {
      return (
        <div ref={containerRef} className={cn("relative", fullWidth && "w-full")}>
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
                              item.className,
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
                portalContainer || document.body,
              )
            : null}
        </div>
      )
    }

    return (
      <div ref={containerRef} className={cn("relative", fullWidth && "w-full")}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
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
            "flex items-center justify-between gap-3 text-left w-full cursor-pointer",
          )}
          onClick={handleTriggerClick}
        >
          <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
          {!hideIndicator ? (
            <svg
              className={cn("size-4 shrink-0 text-muted transition-transform duration-150", dropdownOpen && "rotate-180")}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
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

        {dropdownOpen && coords && typeof document !== "undefined" &&
          createPortal(
            <div
              ref={setDropdownRef}
              role="listbox"
              {...{ popover: hasNativePopover ? "manual" : undefined }}
              style={{
                position: "fixed",
                inset: "auto",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: dropdownWidthMode === "dynamic" ? "max-content" : `${coords.width}px`,
                minWidth: dropdownWidthMode === "dynamic" ? `${coords.width}px` : undefined,
                maxWidth: dropdownWidthMode === "dynamic" ? (maxDropdownWidth || "350px") : undefined,
                margin: 0,
                backgroundColor: "var(--color-surface)",
                color: "var(--color-body)",
                borderColor: "var(--color-border)",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
              className="z-[9999] max-h-60 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg focus:outline-none"
            >
              {optionItems.map((item) => {
                if (item.kind === "group") {
                  return (
                    <div
                      key={item.key}
                      className="mt-1 border-t border-border/60 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted first:mt-0 first:border-t-0"
                    >
                      {item.label}
                    </div>
                  )
                }

                const isSelected = item.value === selectedValue

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.disabled}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-body hover:bg-canvas transition-colors",
                      isSelected ? "bg-primary/10 text-primary font-semibold" : "",
                      item.className,
                      item.disabled && "cursor-not-allowed opacity-50",
                    )}
                    onClick={() => {
                      commitValue(item.value)
                      setDropdownOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {isSelected && (
                      <svg className="size-3.5 text-primary shrink-0" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 8.25L6.5 11.25L12.5 4.75"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>,
            portalContainer || document.body
          )
        }
      </div>
    )
  },
)

Select.displayName = "Select"
