"use client"

import type { ReactNode } from "react"
import { SectionRail } from "@/components/layout/SectionRail"
import type { SectionRailProps } from "@/lib/navigation/section-rail"

export type FinanceTabId = "synthesis" | "profitability" | "forecast"
export type FinanceModuleId = "simulation"

export interface FinanceDesktopChapter {
  key: FinanceTabId
  label: string
  icon?: ReactNode
}

export interface FinanceContextualModule {
  key: FinanceModuleId
  label: string
  icon?: ReactNode
}

export const FINANCE_DESKTOP_CHAPTERS: readonly FinanceDesktopChapter[] = [
  { key: "synthesis", label: "Synthèse" },
  { key: "profitability", label: "Rentabilité P&L" },
  { key: "forecast", label: "Forecast" },
] as const

export const FINANCE_CONTEXTUAL_MODULES: readonly FinanceContextualModule[] = [
  { key: "simulation", label: "Simulation financière" },
] as const

export function parseFinanceTab(value: string | null | undefined): FinanceTabId {
  if (value === "profitability") return "profitability"
  if (value === "forecast") return "forecast"
  return "synthesis"
}

export function parseFinanceModule(value: string | null | undefined): FinanceModuleId | null {
  if (value === "simulation") return "simulation"
  return null
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

export function buildFinanceModuleHref(
  pathname: string,
  searchParams:
    | URLSearchParams
    | { toString: () => string }
    | string
    | null
    | undefined,
  moduleId: FinanceModuleId | null,
): string {
  const params = new URLSearchParams(
    typeof searchParams === "string"
      ? searchParams
      : searchParams?.toString() ?? "",
  )

  if (!moduleId) {
    params.delete("module")
  } else {
    params.set("module", moduleId)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export interface FinanceLocalNavigationProps {
  active: FinanceTabId
  activeModule?: FinanceModuleId | null
  onChange: (tab: FinanceTabId) => void
  onModuleSelect?: (module: FinanceModuleId) => void
}

export function buildFinanceRailProps({
  active,
  activeModule,
  onChange,
  onModuleSelect,
}: FinanceLocalNavigationProps): SectionRailProps {
  return {
    ariaLabel: "Navigation locale Finance",
    title: "Finance",
    home: { onSelect: () => onChange("synthesis") },
    chapters: FINANCE_DESKTOP_CHAPTERS.map((chapter) => ({
      key: chapter.key,
      label: chapter.label,
      icon: chapter.icon,
      active: active === chapter.key && !activeModule,
      onSelect: () => onChange(chapter.key),
    })),
    contextualModules: FINANCE_CONTEXTUAL_MODULES.map((mod) => ({
      key: mod.key,
      label: mod.label,
      icon: mod.icon,
      active: activeModule === mod.key,
      onSelect: () => onModuleSelect?.(mod.key),
    })),
  }
}

export function FinanceLocalNavigation(props: FinanceLocalNavigationProps) {
  return <SectionRail {...buildFinanceRailProps(props)} />
}
