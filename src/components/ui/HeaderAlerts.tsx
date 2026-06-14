"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export function HeaderAlerts() {
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

  // Mock notifications/alerts
  const alerts = [
    {
      id: "a-1",
      title: "Fin de mission imminente",
      desc: "Karim B. chez Banque Populaire (15j restants)",
      type: "urgency",
    },
    {
      id: "a-2",
      title: "Entretien client programmé",
      desc: "Thomas L. avec Voyage Privé (Mercredi 14h)",
      type: "info",
    },
    {
      id: "a-3",
      title: "Staffing validé avec succès",
      desc: "Mission signée chez EDF pour Elodie R.",
      type: "success",
    },
  ]

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none shrink-0 transition-all duration-500 ease-in-out",
        isOpen ? "w-[320px] h-9" : "w-9 h-9"
      )}
    >
      {/* Collapsed/Expanded Card overlaying */}
      <div
        onClick={() => !isOpen && setIsOpen(true)}
        className={cn(
          "transition-all duration-500 ease-in-out border bg-surface text-body cursor-pointer absolute right-0 top-0",
          isOpen
            ? "w-[320px] h-[225px] rounded-xl border-border shadow-lg p-3.5 cursor-default z-50 overflow-visible"
            : "w-9 h-9 rounded-lg border-border hover:bg-surface-hover flex items-center justify-center z-10 overflow-hidden"
        )}
      >
        {!isOpen ? (
          /* Bell Icon with Alert Dot (Collapsed State) */
          <div className="relative">
            <svg className="w-4 h-4 text-heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-danger border border-surface animate-pulse" />
          </div>
        ) : (
          /* Expanded Panel Content */
          <div className="w-full h-full flex flex-col justify-between animate-fade-in">
            {/* Header of alerts panel */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/40 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-heading uppercase tracking-wider">
                  Alertes & Messages
                </span>
                <span className="bg-danger text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              </div>
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

            {/* List of alerts */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 p-2 bg-canvas/30 rounded-lg border border-border/40 hover:border-primary/30 transition-all cursor-pointer"
                >
                  {/* Status Indicator Dot */}
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      alert.type === "urgency" && "bg-danger",
                      alert.type === "info" && "bg-[#FF9800]",
                      alert.type === "success" && "bg-success"
                    )}
                  />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-heading leading-tight truncate">
                      {alert.title}
                    </h4>
                    <p className="text-[10px] text-body mt-0.5 leading-normal">
                      {alert.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
