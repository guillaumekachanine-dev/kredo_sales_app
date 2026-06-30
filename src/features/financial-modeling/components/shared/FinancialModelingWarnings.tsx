import React from "react"
import { AlertBlock } from "@/components/ui/AlertBlock"
import type { FinancialModelWarning } from "../../domain/financial-model.types"

interface FinancialModelingWarningsProps {
  warnings: FinancialModelWarning[]
}

const IconAlert = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

export function FinancialModelingWarnings({ warnings }: FinancialModelingWarningsProps) {
  if (!warnings || warnings.length === 0) return null

  const dangerCodes = ["negative_margin", "sales_rate_below_productive_cost"]
  const warningCodes = ["low_activity_rate", "low_mco", "year_end_projection"]

  const sortedWarnings = [...warnings].sort((a, b) => {
    const aIsDanger = dangerCodes.includes(a.code) ? 1 : 0
    const bIsDanger = dangerCodes.includes(b.code) ? 1 : 0
    if (aIsDanger !== bIsDanger) return bIsDanger - aIsDanger
    
    const aIsWarning = warningCodes.includes(a.code) ? 1 : 0
    const bIsWarning = warningCodes.includes(b.code) ? 1 : 0
    return bIsWarning - aIsWarning
  })

  return (
    <div className="space-y-2">
      {sortedWarnings.map((warn, idx) => {
        const isDanger = dangerCodes.includes(warn.code)
        const isWarning = warningCodes.includes(warn.code)
        const variant = isDanger ? "danger" : isWarning ? "warning" : "info"

        return (
          <AlertBlock
            key={idx}
            variant={variant}
            title={warn.message}
            icon={<IconAlert />}
            className="text-xs"
          />
        )
      })}
    </div>
  )
}
