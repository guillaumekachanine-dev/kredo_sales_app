import React from "react"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import type { FinancialModelFormState } from "../../persistence/financial-model-persistence.types"

interface FinancialPeriodFieldsProps {
  value: FinancialModelFormState
  onChange: (value: FinancialModelFormState) => void
  disabled?: boolean
}

export function FinancialPeriodFields({ value, onChange, disabled }: FinancialPeriodFieldsProps) {
  const { startDate, endDate, forecastActivityRate, annualWorkingDays } = value.input

  const activityPct = Math.round(forecastActivityRate * 100)

  const handleFieldChange = (key: keyof typeof value.input, val: unknown) => {
    if (disabled) return
    const updated = { ...value }
    updated.input = { ...value.input, [key]: val } as typeof value.input
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date de début" required>
          <Input
            type="date"
            value={startDate || ""}
            disabled={disabled}
            onChange={(e) => handleFieldChange("startDate", e.target.value)}
          />
        </Field>

        <Field label="Date de fin" optional>
          <Input
            type="date"
            value={endDate || ""}
            disabled={disabled}
            onChange={(e) => handleFieldChange("endDate", e.target.value || null)}
          />
        </Field>
      </div>

      {/* Activity and Working Days */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Taux d'activité prévu (%)" required>
          <Input
            type="number"
            min="1"
            max="100"
            value={activityPct || ""}
            disabled={disabled}
            onChange={(e) => {
              const val = Number(e.target.value) / 100
              handleFieldChange("forecastActivityRate", val)
            }}
          />
        </Field>

        <Field label="Jours ouvrés annuels de réf." required>
          <Input
            type="number"
            value={annualWorkingDays || ""}
            disabled={disabled}
            onChange={(e) => handleFieldChange("annualWorkingDays", Number(e.target.value))}
          />
        </Field>

      </div>
    </div>
  )
}
