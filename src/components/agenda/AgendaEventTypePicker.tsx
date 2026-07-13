"use client"

import React, { useEffect, useState, useRef } from "react"
import { ProgressivePickerModal } from "@/components/ui/ProgressivePickerModal"
import { AGENDA_CATEGORIES, type AgendaCategoryId } from "@/lib/agenda/agenda-config"
import { cn } from "@/lib/utils"

interface AgendaEventTypePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
}

export function AgendaEventTypePicker({
  open,
  onOpenChange,
  value,
  onChange,
}: AgendaEventTypePickerProps) {
  const [step, setStep] = useState<"category" | "type">("category")
  const [selectedCategory, setSelectedCategory] = useState<AgendaCategoryId | null>(null)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    }
  }, [])

  // Reset picker state when opening
  useEffect(() => {
    if (open) {
      setStep("category")
      setSelectedCategory(null)
      setLeaving(false)
    }
  }, [open])

  function navigate(next: "category" | "type") {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => {
      setLeaving(false)
      setStep(next)
      leaveTimer.current = null
    }, 190)
  }

  const handleCategorySelect = (catId: AgendaCategoryId) => {
    setSelectedCategory(catId)
    navigate("type")
  }

  const handleTypeSelect = (typeId: string) => {
    onChange(typeId)
    onOpenChange(false)
  }

  const handleBack = () => {
    navigate("category")
    setSelectedCategory(null)
  }

  const currentCategory = selectedCategory
    ? AGENDA_CATEGORIES.find((c) => c.id === selectedCategory)
    : null

  const title =
    step === "category"
      ? "Choisir la nature de l'événement"
      : currentCategory?.label ?? "Choisir le type"

  const panelCls = cn("min-h-[13rem]", leaving ? "kredo-quoi-panel-out" : "kredo-quoi-panel-in")

  return (
    <ProgressivePickerModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      step={step}
      steps={["category", "type"]}
      onBack={step === "type" ? handleBack : undefined}
      leaving={leaving}
      variant="bright"
    >
      {step === "category" ? (
        <div key="category-step" className={cn(panelCls, "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
          {AGENDA_CATEGORIES.map((cat, index) => (
            <ProgressivePickerModal.CategoryCard
              key={cat.id}
              value={cat.id}
              label={cat.label}
              dataviz={cat.dataviz}
              iconUrl={cat.iconUrl}
              selected={cat.id === selectedCategory}
              onClick={() => handleCategorySelect(cat.id)}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div key="type-step" className={cn(panelCls, "flex flex-col gap-2")}>
          {currentCategory?.types.map((t, index) => (
            <ProgressivePickerModal.ItemRow
              key={t.id}
              value={t.id}
              label={t.label}
              description={t.shortLabel}
              selected={t.id === value}
              onClick={() => handleTypeSelect(t.id)}
              index={index}
            />
          ))}
        </div>
      )}
    </ProgressivePickerModal>
  )
}
