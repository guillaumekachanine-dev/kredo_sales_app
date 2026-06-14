"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export function HeaderCalendar() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside hook
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Get current week days (Monday to Sunday)
  const getWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push(day)
    }
    return days
  }

  const days = getWeekDays()

  // Get ISO week number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
  }

  // Format date as DD/MM
  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    return `${day}/${month}`
  }

  // mock alerts/urgencies
  // E.g., Monday: Urgence (Red warning), Wednesday: Info (Amber clock), Friday: Success (Green check)
  const mockAlerts: Record<number, { type: "urgency" | "info" | "success"; label: string }[]> = {
    1: [{ type: "urgency", label: "Urgence : Karim B. fin de mission imminente" }], // Monday (1)
    3: [{ type: "info", label: "Entretien client programmé pour Voyage Privé" }], // Wednesday (3)
    5: [{ type: "success", label: "Staffing validé avec succès pour EDF" }], // Friday (5)
  }

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

  return (
    <div ref={containerRef} className="relative w-9 h-9 select-none shrink-0 flex items-center justify-center">
      {/* Collapsed/Expanded Container */}
      <div
        onClick={() => !isOpen && setIsOpen(true)}
        className={cn(
          "transition-all duration-500 ease-in-out border bg-surface text-body cursor-pointer absolute right-0",
          isOpen
            ? "top-1/2 -translate-y-1/2 w-[480px] h-[86px] rounded-xl border-border shadow-lg p-3 cursor-default z-50 origin-right overflow-visible"
            : "top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg border-border hover:bg-surface-hover flex items-center justify-center z-10 overflow-hidden"
        )}
      >
        {!isOpen ? (
          /* Simple Icon (Collapsed State) */
          <svg className="w-4 h-4 text-heading transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          /* Expanded Panel Content */
          <div className="w-full h-full flex flex-col justify-between animate-fade-in">
            {/* Header of unfold calendar */}
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                Semaine {getWeekNumber(new Date())} - du {formatDate(days[0])} au {formatDate(days[6])}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                className="p-0.5 rounded hover:bg-canvas text-muted hover:text-body transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Days row */}
            <div className="flex gap-1.5 justify-between w-full h-full">
              {days.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString()
                const dayNum = day.getDate()
                const dayName = dayNames[idx]
                const alerts = mockAlerts[day.getDay()] || []

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all relative group",
                      isToday
                        ? "bg-primary/5 border-primary text-primary"
                        : "bg-canvas/30 border-border/40 text-body hover:bg-canvas/60 hover:border-border/80"
                    )}
                  >
                    <span className="text-[8px] font-bold uppercase tracking-wider block opacity-75">
                      {dayName}
                    </span>
                    <span className="text-xs font-black tracking-tight mt-0.5 leading-none block">
                      {dayNum}
                    </span>

                    {/* Alerts indicators inside day square */}
                    {alerts.map((alert, alertIdx) => (
                      <div
                        key={alertIdx}
                        className={cn(
                          "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm text-white border border-surface",
                          alert.type === "urgency" && "bg-danger",
                          alert.type === "info" && "bg-[#FF9800]",
                          alert.type === "success" && "bg-success"
                        )}
                      >
                        {/* Small icon inside alert dot */}
                        {alert.type === "urgency" && (
                          <span className="text-[8px] font-extrabold leading-none">!</span>
                        )}
                        {alert.type === "info" && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                          </svg>
                        )}
                        {alert.type === "success" && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}

                    {/* Centered tooltip on day card hover */}
                    {alerts.length > 0 && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[9px] py-1 px-2.5 rounded shadow-lg whitespace-nowrap z-50 select-none pointer-events-none">
                        {alerts[0].label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
