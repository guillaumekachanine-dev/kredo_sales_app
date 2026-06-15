"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

/* ── Constantes de layout ────────────────────────────────────────
   Toutes les dimensions sont en px pour que le calcul de hauteur
   du panneau soit exact et que la transition CSS soit fluide.
   ─────────────────────────────────────────────────────────────── */
const CELL_H = 36     // hauteur fixe de chaque case-jour (px)
const HEADER_H = 20   // hauteur de la ligne d'en-tête (px)
const HEADER_MB = 6   // mb-1.5 entre en-tête et grille (px)
const ROW_GAP = 4     // gap-1 entre les rangées de semaines (px)
const PAD_V = 24      // padding vertical total : p-3 × 2 = 12 + 12 (px)
const PANEL_W = 480   // largeur du panneau déplié (px)
const BTN_SIZE = 36   // taille du bouton icône replié (px)

type CalendarMode = "week" | "month"

type AlertEntry = { type: "urgency" | "info" | "success"; label: string }

const MOCK_ALERTS: Record<number, AlertEntry[]> = {
  1: [{ type: "urgency", label: "Urgence : Karim B. fin de mission imminente" }],
  3: [{ type: "info",    label: "Entretien client programmé pour Voyage Privé" }],
  5: [{ type: "success", label: "Staffing validé avec succès pour EDF" }],
}

const DAY_NAMES   = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

/* ── Utilitaires de date ─────────────────────────────────────── */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay() // 0=Sun
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

function getWeekDays(date: Date): Date[] {
  const monday = getMondayOf(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthWeeks(date: Date): Date[][] {
  const year  = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  const start = getMondayOf(firstDay)

  // Sunday of the week containing lastDay
  const lastDow = lastDay.getDay()
  const end = new Date(lastDay)
  end.setDate(lastDay.getDate() + (lastDow === 0 ? 0 : 7 - lastDow))

  const weeks: Date[][] = []
  const cur = new Date(start)
  while (cur <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function getWeekNumber(d: Date): number {
  const date   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

/* ── Composant ───────────────────────────────────────────────── */
export function HeaderCalendar() {
  const [isOpen, setIsOpen]         = useState(false)
  const [mode, setMode]             = useState<CalendarMode>("week")
  const containerRef                = useRef<HTMLDivElement>(null)

  // Fermeture au clic extérieur
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setMode("week")
      }
    }
    if (isOpen) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [isOpen])

  const today      = new Date()
  const weekDays   = getWeekDays(today)
  const monthWeeks = getMonthWeeks(today)

  // Hauteur exacte du panneau selon le mode affiché
  const weekH = PAD_V + HEADER_H + HEADER_MB + CELL_H
  const monthH = PAD_V + HEADER_H + HEADER_MB
    + monthWeeks.length * CELL_H
    + Math.max(0, monthWeeks.length - 1) * ROW_GAP

  const expandedH = mode === "month" ? monthH : weekH

  // Dimensions du panneau flottant — pilotées via style pour que
  // la transition CSS entre chaque valeur soit parfaitement fluide
  const cardStyle: React.CSSProperties = isOpen
    ? { width: PANEL_W, height: expandedH }
    : { width: BTN_SIZE, height: BTN_SIZE }

  function close() {
    setIsOpen(false)
    setMode("week")
  }

  function toggleMode(e: React.MouseEvent) {
    e.stopPropagation()
    setMode((m) => m === "week" ? "month" : "week")
  }

  /* ── Case-jour ─────────────────────────────────────────────── */
  function DayCell({ day, colIdx, inMonth = true }: { day: Date; colIdx: number; inMonth?: boolean }) {
    const isToday  = day.toDateString() === today.toDateString()
    const alerts   = MOCK_ALERTS[day.getDay()] ?? []

    return (
      <div
        style={{ height: CELL_H }}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-1 rounded-lg border text-center transition-all relative group cursor-default",
          !inMonth && "opacity-30",
          isToday
            ? "bg-primary/5 border-primary text-primary"
            : "bg-canvas/30 border-border/40 text-body hover:bg-canvas/60 hover:border-border/80"
        )}
      >
        <span className="text-[8px] font-bold uppercase tracking-wider block opacity-75">
          {DAY_NAMES[colIdx]}
        </span>
        <span className="text-xs font-black tracking-tight mt-0.5 leading-none block">
          {day.getDate()}
        </span>

        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm text-white border border-surface",
              alert.type === "urgency" && "bg-danger",
              alert.type === "info"    && "bg-[#FF9800]",
              alert.type === "success" && "bg-success"
            )}
          >
            {alert.type === "urgency" && <span className="text-[8px] font-extrabold leading-none">!</span>}
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

        {alerts.length > 0 && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex bg-slate-800 text-white text-[9px] py-1 px-2.5 rounded shadow-lg whitespace-nowrap z-[100] pointer-events-none">
            {alerts[0].label}
          </span>
        )}
      </div>
    )
  }

  return (
    /* Slot fixe 36 × 36 dans la barre de header */
    <div ref={containerRef} className="relative select-none shrink-0" style={{ width: BTN_SIZE, height: BTN_SIZE }}>

      {/* ── Panneau flottant — s'étend depuis top-0 right-0 ──── */}
      <div
        onClick={() => !isOpen && setIsOpen(true)}
        style={cardStyle}
        className={cn(
          "absolute right-0 top-0 border bg-surface text-body overflow-hidden",
          "transition-[width,height] duration-500 ease-in-out",
          isOpen
            ? "rounded-xl border-border shadow-lg p-3 cursor-default z-50"
            : "rounded-lg border-border hover:bg-surface-hover flex items-center justify-center z-10 cursor-pointer"
        )}
      >
        {!isOpen ? (
          /* Icône calendrier (état replié) */
          <svg className="w-4 h-4 text-heading" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          /* Contenu déplié */
          <div className="w-full flex flex-col">

            {/* ── En-tête ──────────────────────────────────────── */}
            <div
              style={{ height: HEADER_H, marginBottom: HEADER_MB }}
              className="flex items-center justify-between px-1"
            >
              {/* Étiquette de période */}
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                {mode === "week"
                  ? `S${getWeekNumber(today)} · du ${fmt(weekDays[0])} au ${fmt(weekDays[6])}`
                  : `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Bouton mode mois / semaine */}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/60 bg-canvas/50 hover:bg-canvas text-[9px] font-bold text-body transition-colors cursor-pointer shrink-0"
                >
                  {mode === "week" ? "Mois" : "Semaine"}
                  <svg
                    className={cn(
                      "w-2.5 h-2.5 transition-transform duration-300",
                      mode === "month" && "rotate-180"
                    )}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Bouton fermer */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); close() }}
                  className="p-0.5 rounded hover:bg-canvas text-muted hover:text-body transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Grille calendrier ─────────────────────────────── */}
            <div className="flex flex-col gap-1">
              {mode === "week"
                ? (
                  /* Vue semaine : une seule rangée de 7 cases */
                  <div className="flex gap-1.5 justify-between w-full">
                    {weekDays.map((day, idx) => (
                      <DayCell key={day.toISOString()} day={day} colIdx={idx} />
                    ))}
                  </div>
                )
                : (
                  /* Vue mois : N rangées de 7 cases */
                  monthWeeks.map((week, wi) => (
                    <div key={wi} className="flex gap-1.5 justify-between w-full">
                      {week.map((day, di) => (
                        <DayCell
                          key={day.toISOString()}
                          day={day}
                          colIdx={di}
                          inMonth={day.getMonth() === today.getMonth()}
                        />
                      ))}
                    </div>
                  ))
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
