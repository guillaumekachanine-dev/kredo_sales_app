"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type FinanceTabId = "synthesis" | "profitability" | "forecast"

interface FinanceTabsProps {
  activeTab: FinanceTabId
  onChange: (tab: FinanceTabId) => void
}

export function FinanceTabs({ activeTab, onChange }: FinanceTabsProps) {
  const tabs = [
    { id: "synthesis" as const, label: "Synthèse" },
    { id: "profitability" as const, label: "Rentabilité missions" },
    { id: "forecast" as const, label: "Prévision & simulation" },
  ]

  return (
    <div className="flex border-b border-border mb-4">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-6 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer",
              isActive
                ? "text-primary"
                : "text-muted hover:text-body"
            )}
            style={{ marginBottom: "-1px" }}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
