"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ensureRealtimeAuth } from "@/lib/supabase/realtime-auth"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import {
  fetchCurrentWorkflowExecution,
  fetchRunJournalRows,
} from "@/lib/automations/run-journal-actions"

export const WORKFLOW_EXECUTION_TTL_MS = 120_000 // 120 secondes

export type CurrentWorkflowStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | null

export type UseCurrentWorkflowExecutionReturn = {
  run: RunJournalRow | null
  status: CurrentWorkflowStatus
  isActive: boolean
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void
  openDetail: () => void
  closeDetail: () => void
}

function resolveTerminalTime(run: RunJournalRow): string {
  return run.completedAt ?? run.failedAt ?? run.createdAt
}

function isTerminalStatus(status: string): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled"
}

export function useCurrentWorkflowExecution(): UseCurrentWorkflowExecutionReturn {
  const [run, setRun] = useState<RunJournalRow | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const runRef = useRef<RunJournalRow | null>(null)
  const isDetailOpenRef = useRef(false)

  useEffect(() => {
    runRef.current = run
  }, [run])

  useEffect(() => {
    isDetailOpenRef.current = isDetailOpen
  }, [isDetailOpen])

  const ttlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let disposed = false
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    function clearTtl() {
      if (ttlTimerRef.current !== null) {
        clearTimeout(ttlTimerRef.current)
        ttlTimerRef.current = null
      }
    }

    function scheduleTtl(terminalRun: RunJournalRow) {
      clearTtl()
      const terminalTimeStr = resolveTerminalTime(terminalRun)
      const elapsedMs = Date.now() - new Date(terminalTimeStr).getTime()
      const remainingMs = Math.max(0, WORKFLOW_EXECUTION_TTL_MS - elapsedMs)

      if (remainingMs <= 0) {
        if (!isDetailOpenRef.current) {
          setRun(null)
        }
        return
      }

      ttlTimerRef.current = setTimeout(() => {
        if (!disposed && !isDetailOpenRef.current) {
          setRun(null)
        }
      }, remainingMs)
    }

    async function init() {
      try {
        const initial = await fetchCurrentWorkflowExecution()
        if (disposed) return

        if (initial.run) {
          if (isTerminalStatus(initial.run.status)) {
            const terminalTimeStr = resolveTerminalTime(initial.run)
            const elapsedMs = Date.now() - new Date(terminalTimeStr).getTime()
            if (elapsedMs < WORKFLOW_EXECUTION_TTL_MS) {
              setRun(initial.run)
              scheduleTtl(initial.run)
            }
          } else {
            setRun(initial.run)
          }
        }

        const userId = initial.userId
        if (!userId) return

        await ensureRealtimeAuth(supabase)
        if (disposed) return

        channel = supabase
          .channel(`kredo-workflow-indicator-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ai_intelligence_runs",
              filter: `owner_id=eq.${userId}`,
            },
            async (payload) => {
              if (disposed) return

              if (payload.eventType === "DELETE") {
                const deletedId = (payload.old as { id?: string } | null)?.id
                if (deletedId && runRef.current?.id === deletedId) {
                  clearTtl()
                  setRun(null)
                }
                return
              }

              const newRow = payload.new as {
                id?: string
                trigger_source?: string
                owner_id?: string
                status?: string
                created_at?: string
              } | null

              if (!newRow?.id) return

              // Ne surveiller que les déclenchements UI de l'utilisateur connecté
              if (newRow.trigger_source && newRow.trigger_source !== "ui") return
              if (newRow.owner_id && newRow.owner_id !== userId) return

              const rows = await fetchRunJournalRows([newRow.id])
              if (disposed || rows.length === 0) return
              const hydrated = rows[0]!

              if (hydrated.triggerSource !== "ui") return

              const current = runRef.current

              // Règle en cas de plusieurs runs : retenir le plus récent
              let shouldAdopt = false
              if (!current) {
                shouldAdopt = true
              } else if (hydrated.id === current.id) {
                shouldAdopt = true
              } else {
                const incomingTime = new Date(hydrated.createdAt).getTime()
                const currentTime = new Date(current.createdAt).getTime()
                const currentIsTerminal = isTerminalStatus(current.status)
                const incomingIsActive = !isTerminalStatus(hydrated.status)

                if (incomingIsActive && currentIsTerminal) {
                  shouldAdopt = true
                } else if (incomingTime >= currentTime) {
                  shouldAdopt = true
                }
              }

              if (shouldAdopt) {
                setRun(hydrated)
                if (isTerminalStatus(hydrated.status)) {
                  scheduleTtl(hydrated)
                } else {
                  clearTtl()
                }
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error("[useCurrentWorkflowExecution] init error:", err)
      }
    }

    void init()

    return () => {
      disposed = true
      clearTtl()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open && run && isTerminalStatus(run.status)) {
      const elapsedMs = Date.now() - new Date(resolveTerminalTime(run)).getTime()
      if (elapsedMs >= WORKFLOW_EXECUTION_TTL_MS) {
        setRun(null)
      }
    }
  }

  const status = (run?.status as CurrentWorkflowStatus) ?? null
  const isActive = status === "queued" || status === "running"

  return {
    run,
    status,
    isActive,
    isDetailOpen,
    setIsDetailOpen: handleOpenChange,
    openDetail: () => handleOpenChange(true),
    closeDetail: () => handleOpenChange(false),
  }
}
