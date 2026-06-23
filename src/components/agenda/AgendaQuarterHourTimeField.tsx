"use client"

import React from "react"
import {
  AGENDA_HOUR_OPTIONS,
  AGENDA_MINUTE_OPTIONS,
  normalizeTimeToQuarterHour,
} from "@/lib/agenda/agenda-time-utils"
import { cn } from "@/lib/utils"

interface AgendaQuarterHourTimeFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  hourAriaLabel: string
  minuteAriaLabel: string
}

export function AgendaQuarterHourTimeField({
  value,
  onChange,
  disabled = false,
  className,
  hourAriaLabel,
  minuteAriaLabel,
}: AgendaQuarterHourTimeFieldProps) {
  const normalizedValue = normalizeTimeToQuarterHour(value || "09:00")
  const [hoursValue, minutesValue] = normalizedValue.split(":")

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2 py-2",
        disabled && "opacity-60",
        className,
      )}
    >
      <select
        value={hoursValue}
        onChange={(event) => onChange(`${event.target.value}:${minutesValue}`)}
        disabled={disabled}
        aria-label={hourAriaLabel}
        className="w-8 appearance-none bg-transparent p-0 text-center text-xs text-heading outline-none disabled:cursor-not-allowed"
      >
        {AGENDA_HOUR_OPTIONS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>

      <span className="shrink-0 text-xs font-semibold text-heading" aria-hidden="true">
        :
      </span>

      <select
        value={minutesValue}
        onChange={(event) => onChange(`${hoursValue}:${event.target.value}`)}
        disabled={disabled}
        aria-label={minuteAriaLabel}
        className="w-8 appearance-none bg-transparent p-0 text-center text-xs text-heading outline-none disabled:cursor-not-allowed"
      >
        {AGENDA_MINUTE_OPTIONS.map((minute) => (
          <option key={minute} value={minute}>
            {minute === "00" ? "0" : minute}
          </option>
        ))}
      </select>
    </div>
  )
}
