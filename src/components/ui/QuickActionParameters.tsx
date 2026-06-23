"use client"

import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { cn } from "@/lib/utils"
import type {
  QuickActionField,
  QuickActionOption,
  QuickActionValues,
} from "./page-quick-actions"

interface QuickActionParametersProps {
  option: QuickActionOption
  values: QuickActionValues
  onValueChange: (fieldId: string, value: string) => void
  onBack: () => void
}

function QuickActionFieldControl({
  field,
  value,
  onValueChange,
}: {
  field: QuickActionField
  value: string
  onValueChange: (fieldId: string, value: string) => void
}) {
  const commonClasses =
    "w-full rounded-[var(--radius-medium)] border border-border bg-surface px-3 py-2.5 text-sm text-heading outline-none transition-colors focus-visible:border-primary focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        placeholder={field.placeholder}
        rows={4}
        onChange={(event) => onValueChange(field.id, event.target.value)}
        className={cn(commonClasses, "resize-y")}
      />
    )
  }

  if (field.type === "select") {
    return (
      <Select
        value={value}
        onChange={(event) => onValueChange(field.id, event.target.value)}
        className={commonClasses}
      >
        <option value="">Sélectionner</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    )
  }

  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      placeholder={field.placeholder}
      onChange={(event) => onValueChange(field.id, event.target.value)}
      className={commonClasses}
    />
  )
}

export function QuickActionParameters({
  option,
  values,
  onValueChange,
  onBack,
}: QuickActionParametersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={onBack}
          data-autofocus="true"
        >
          <span aria-hidden="true">←</span>
          Retour
        </Button>
        {option.icon ? (
          <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-medium)] border border-primary/18 bg-primary/8 text-primary">
            <span className="size-5">{option.icon}</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-bold tracking-tight text-heading">
          {option.label}
        </h3>
        {option.description ? (
          <p className="text-sm leading-6 text-body">{option.description}</p>
        ) : null}
      </div>

      {option.fields?.length ? (
        <div className="flex flex-col gap-4">
          {option.fields.map((field) => (
            <label key={field.id} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <QuickActionFieldControl
                field={field}
                value={values[field.id] ?? ""}
                onValueChange={onValueChange}
              />
              {field.description ? (
                <span className="text-xs text-body">{field.description}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/45 px-4 py-5">
          <p className="text-sm font-medium text-heading">
            Les paramètres de cette fonctionnalité seront ajoutés ultérieurement.
          </p>
          <p className="mt-1 text-sm text-body">
            L’architecture est prête, mais aucun champ métier n’est activé dans ce lot.
          </p>
        </div>
      )}
    </div>
  )
}
