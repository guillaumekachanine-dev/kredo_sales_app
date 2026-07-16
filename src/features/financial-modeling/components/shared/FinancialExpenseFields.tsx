import React from "react"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import type { FinancialModelFormState } from "../../persistence/financial-model-persistence.types"
import type { FinancialModelResult } from "../../domain/financial-model.types"
import { formatEuroWithCents } from "./FinancialModelingResults"

interface FinancialExpenseFieldsProps {
  value: FinancialModelFormState
  onChange: (value: FinancialModelFormState) => void
  result: FinancialModelResult | null
  disabled?: boolean
}

const EXPENSE_CATEGORIES = [
  { value: "travel", label: "Déplacement / Transport" },
  { value: "hardware", label: "Matériel / Laptop" },
  { value: "software", label: "Licences / Logiciels" },
  { value: "subcontracting", label: "Sous-traitance" },
  { value: "other", label: "Autre" },
]

export function FinancialExpenseFields({ value, onChange, result, disabled }: FinancialExpenseFieldsProps) {
  const expenses = value.input.expenses ?? []

  const handleAddExpense = () => {
    if (disabled) return
    const newExpense = {
      label: "",
      calculationMode: "fixed" as const,
      unitAmount: 0,
      quantity: 1,
    }
    const updated = { ...value }
    updated.input = {
      ...value.input,
      expenses: [...expenses, newExpense],
    }
    onChange(updated)
  }

  const handleRemoveExpense = (index: number) => {
    if (disabled) return
    const updated = { ...value }
    const nextExpenses = [...expenses]
    nextExpenses.splice(index, 1)
    updated.input = { ...value.input, expenses: nextExpenses }
    onChange(updated)
  }

  const handleExpenseFieldChange = (index: number, key: string, val: unknown) => {
    if (disabled) return
    const updated = { ...value }
    const nextExpenses = expenses.map((exp, idx) => {
      if (idx !== index) return exp
      return { ...exp, [key]: val }
    })
    updated.input = { ...value.input, expenses: nextExpenses }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">5. Frais</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddExpense}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover disabled:opacity-50 disabled:hover:text-primary transition-colors"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter un frais
        </button>
      </div>

      {expenses.length === 0 ? (
        <p className="text-[11px] text-muted py-2 italic text-center">Aucun frais rattaché à cette modélisation.</p>
      ) : (
        <div className="space-y-3.5">
          {expenses.map((expense, idx) => {
            const calculatedAmount = result?.expenseBreakdown?.[idx]?.amount ?? (expense.unitAmount * (expense.quantity ?? 1))

            return (
              <div
                key={idx}
                className="relative bg-canvas/30 border border-border/60 rounded-[var(--radius-medium)] p-3 space-y-3"
              >
                {/* Row Header with controls */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-heading">Frais #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      Total : <span className="font-semibold text-heading">{formatEuroWithCents(calculatedAmount)}</span>
                    </span>
                    {/* Deletion */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveExpense(idx)}
                      className="text-muted hover:text-danger disabled:opacity-30 disabled:hover:text-muted ml-1 transition-colors"
                      title="Supprimer"
                    >
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Primary input fields */}
                <div>
                  <Field label="Libellé" required>
                    <Input
                      placeholder="ex: Abonnement train, Loyer laptop..."
                      value={expense.label}
                      disabled={disabled}
                      onChange={(e) => handleExpenseFieldChange(idx, "label", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Catégorie" optional>
                    <Select
                      value={expense.category || ""}
                      disabled={disabled}
                      onChange={(e) => handleExpenseFieldChange(idx, "category", e.target.value || undefined)}
                    >
                      <option value="">-- Non spécifiée --</option>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Mode de calcul" required>
                    <Select
                      value={expense.calculationMode}
                      disabled={disabled}
                      onChange={(e) => handleExpenseFieldChange(idx, "calculationMode", e.target.value)}
                    >
                      <option value="fixed">Fixe</option>
                      <option value="per_business_day">Par jour ouvré</option>
                      <option value="per_production_day">Par jour produit</option>
                      <option value="monthly">Mensuel proratisé</option>
                      <option value="annual">Annuel proratisé</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Montant unitaire (€)" required>
                    <Input
                      type="number"
                      value={expense.unitAmount || ""}
                      disabled={disabled}
                      onChange={(e) => handleExpenseFieldChange(idx, "unitAmount", Number(e.target.value))}
                    />
                  </Field>

                  <Field label="Quantité" optional>
                    <Input
                      type="number"
                      placeholder="1"
                      value={expense.quantity != null ? expense.quantity : ""}
                      disabled={disabled}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value)
                        handleExpenseFieldChange(idx, "quantity", val)
                      }}
                    />
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
