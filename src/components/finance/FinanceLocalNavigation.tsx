"use client"

import type { ReactNode } from "react"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailProps } from "@/lib/navigation/section-rail"

export type FinanceTabId = "synthesis" | "profitability" | "forecast"

export interface FinanceDesktopChapter {
  key: FinanceTabId
  label: string
  icon?: ReactNode
}

export const FINANCE_DESKTOP_CHAPTERS: readonly FinanceDesktopChapter[] = [
  { key: "synthesis", label: "Synthèse" },
  { key: "profitability", label: "Rentabilité missions" },
  { key: "forecast", label: "Prévision & simulation" },
] as const

export function parseFinanceTab(value: string | null | undefined): FinanceTabId {
  if (value === "profitability") return "profitability"
  if (value === "forecast") return "forecast"
  return "synthesis"
}

export function getFinanceDesktopChapterLabel(tab: FinanceTabId): string {
  return (
    FINANCE_DESKTOP_CHAPTERS.find((chapter) => chapter.key === tab)?.label ??
    "Synthèse"
  )
}

export function buildFinanceHref(
  pathname: string,
  searchParams:
    | URLSearchParams
    | { toString: () => string }
    | string
    | null
    | undefined,
  tab: FinanceTabId,
): string {
  const params = new URLSearchParams(
    typeof searchParams === "string"
      ? searchParams
      : searchParams?.toString() ?? "",
  )

  if (tab === "synthesis") {
    params.delete("tab")
  } else {
    params.set("tab", tab)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export interface FinanceLocalNavigationProps {
  active: FinanceTabId
  onChange: (tab: FinanceTabId) => void
}

export function buildFinanceRailProps({
  active,
  onChange,
}: FinanceLocalNavigationProps): SectionRailProps {
  return {
    ariaLabel: "Navigation locale Finance",
    title: "Finance",
    home: { onSelect: () => onChange("synthesis") },
    chapters: FINANCE_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: chapter.icon,
      active: active === chapter.key,
      onSelect: () => onChange(chapter.key),
    })),
    contextualModules: undefined,
  }
}

export function FinanceLocalNavigation(props: FinanceLocalNavigationProps) {
  return <SectionRail {...buildFinanceRailProps(props)} />
}
