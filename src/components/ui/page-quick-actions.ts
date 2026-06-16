import type { ReactNode } from "react"

export const pageQuickActionButtonClassName =
  "kredo-quick-action-button h-9 min-w-9 border-transparent bg-primary px-3 text-sm font-medium text-primary-fg shadow-none hover:bg-primary-deep active:bg-primary-deep/95 sm:h-9 sm:min-w-9 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-transparent disabled:bg-primary disabled:text-primary-fg disabled:opacity-100"

export const pageQuickActionIconClassName =
  "kredo-quick-action-icon inline-flex size-4 shrink-0 items-center justify-center"

export type QuickActionFieldType = "text" | "textarea" | "select" | "date"

export type QuickActionFieldOption = {
  value: string
  label: string
}

export type QuickActionField = {
  id: string
  label: string
  type: QuickActionFieldType
  description?: string
  placeholder?: string
  required?: boolean
  options?: QuickActionFieldOption[]
}

export type QuickActionValues = Record<string, string>

type PageQuickActionBase = {
  id: string
  label: string
  icon?: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  loading?: boolean
  disabled?: boolean
  ariaLabel?: string
}

type PageQuickActionTarget = {
  href: string
  onClick?: never
  feedbackMessage?: never
}

type PageQuickActionHandler = {
  href?: never
  onClick: () => void
  feedbackMessage?: never
}

type PageQuickActionFeedback = {
  href?: never
  onClick?: never
  feedbackMessage: string
}

type QuickActionExecutable =
  | PageQuickActionTarget
  | PageQuickActionHandler
  | PageQuickActionFeedback

export type QuickActionOption = PageQuickActionBase &
  QuickActionExecutable & {
    description?: string
    fields?: QuickActionField[]
    submitLabel?: string
  }

type PageQuickActionHref = PageQuickActionBase & PageQuickActionTarget

type PageQuickActionClick = PageQuickActionBase & PageQuickActionHandler

type PageQuickActionSoon = PageQuickActionBase & PageQuickActionFeedback

export type PageQuickActionGroup = PageQuickActionBase & {
  href?: never
  onClick?: never
  feedbackMessage?: never
  description?: string
  submitLabel: string
  options: QuickActionOption[]
}

export type PageQuickAction =
  | PageQuickActionHref
  | PageQuickActionClick
  | PageQuickActionSoon
  | PageQuickActionGroup

export function isPageQuickActionGroup(
  action: PageQuickAction,
): action is PageQuickActionGroup {
  return "options" in action
}

export function areQuickActionFieldsComplete(
  fields: QuickActionField[] | undefined,
  values: QuickActionValues,
) {
  if (!fields?.length) {
    return true
  }

  return fields.every((field) => {
    if (!field.required) {
      return true
    }

    return Boolean(values[field.id]?.trim())
  })
}
