"use client"

import React from "react"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { QuickActionChoiceGrid } from "./QuickActionChoiceGrid"
import { QuickActionParameters } from "./QuickActionParameters"
import {
  areQuickActionFieldsComplete,
  type PageQuickActionGroup,
  type QuickActionOption,
  type QuickActionValues,
} from "./page-quick-actions"

export type QuickActionSubmitResult = {
  status: "success" | "info" | "error"
  message?: string
}

interface QuickActionDrawerProps {
  action: PageQuickActionGroup | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitOption: (
    action: PageQuickActionGroup,
    option: QuickActionOption,
    values: QuickActionValues,
  ) => Promise<QuickActionSubmitResult> | QuickActionSubmitResult
}

export function QuickActionDrawer({
  action,
  open,
  onOpenChange,
  onSubmitOption,
}: QuickActionDrawerProps) {
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null)
  const [values, setValues] = React.useState<QuickActionValues>({})
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  if (!action) {
    return null
  }

  const selectedOption =
    action.options.find((option) => option.id === selectedOptionId) ?? null
  const submitLabel = selectedOption?.submitLabel ?? action.submitLabel
  const isSubmitDisabled =
    !selectedOption ||
    !areQuickActionFieldsComplete(selectedOption.fields, values) ||
    loading

  const handleValueChange = (fieldId: string, value: string) => {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId)
    setValues({})
    setMessage(null)
    setError(null)
  }

  const handleBack = () => {
    setSelectedOptionId(null)
    setValues({})
    setMessage(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedOption) {
      return
    }

    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const result = await onSubmitOption(action, selectedOption, values)

      if (result.status === "success") {
        onOpenChange(false)
        return
      }

      if (result.status === "info") {
        setMessage(result.message ?? "Fonctionnalité à venir")
        return
      }

      setError(result.message ?? "Une erreur est survenue.")
    } catch (submissionError) {
      const fallbackMessage =
        submissionError instanceof Error
          ? submissionError.message
          : "Une erreur est survenue."
      setError(fallbackMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={action.label}
      subtitle={
        selectedOption
          ? "Paramétrez l’action sélectionnée avant de valider."
          : action.description
      }
      footer={
        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={loading}
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
        >
          {submitLabel}
        </Button>
      }
      contentClassName="flex flex-col gap-5"
      closeLabel={`Fermer ${action.label}`}
    >
      {selectedOption ? (
        <QuickActionParameters
          option={selectedOption}
          values={values}
          onValueChange={handleValueChange}
          onBack={handleBack}
        />
      ) : (
        <QuickActionChoiceGrid
          options={action.options}
          selectedOptionId={selectedOptionId}
          onSelect={handleOptionSelect}
        />
      )}

      {message ? (
        <AlertBlock
          variant="info"
          title={message}
          description="Cette option reste visible dans le drawer tant qu’aucune exécution réelle n’existe."
        />
      ) : null}

      {error ? (
        <AlertBlock
          variant="warning"
          title="Action non disponible"
          description={error}
        />
      ) : null}
    </AppDrawer>
  )
}
