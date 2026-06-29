"use client"

import React, { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { createClient } from "@/lib/supabase/client"
import { useStaffingDrawerStore, type StaffingDrawerTab } from "@/hooks/use-staffing-drawer-store"
import { StaffingDrawerHeader } from "./StaffingDrawerHeader"
import { TabDetails } from "./TabDetails"
import { HiringProcessStepper, findActiveProcess, type HiringProcess } from "@/components/recruitment/HiringProcessStepper"
import { StaffingProcessStepper } from "./StaffingProcessStepper"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface DrawerEventRecord {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string | null
  description: string | null
  metadata: {
    resources?: Array<{
      name: string
      bucket?: string
      storage_path?: string
    }>
  } | null
  organizer_id: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Erreur de chargement des données."
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1 select-none">
      <div className="flex gap-4 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
      </div>
      <div className="h-24 animate-pulse rounded-xl w-full bg-[var(--color-skeleton-base)]/30" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
      </div>
      <div className="h-36 animate-pulse rounded-xl w-full bg-[var(--color-skeleton-base)]/25" />
    </div>
  )
}

export function StaffingDrawer() {
  const { isOpen, staffingId, activeTab, closeStaffingDrawer, setActiveTab } = useStaffingDrawerStore()

  const [drawerData, setDrawerData] = useState<StaffingDrawerViewModel | null>(null)
  const [events, setEvents] = useState<DrawerEventRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false,
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)")
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  useEffect(() => {
    if (!isOpen || !staffingId) return

    const loadData = async () => {
      setLoading(true)
      setFetchError(null)
      setDrawerData(null)
      setEvents([])

      try {
        const supabase = createClient()

        const { data: staffing, error: staffingError } = await supabase
          .from("opportunity_candidates")
          .select(`
            id, status, comment, next_action, positioning_origin, proposed_at, sent_to_client_at, status_changed_at, created_at, updated_at,
            opportunity:opportunities (
              id, title, stage, priority, opportunity_type, requires_staffing, start_date, target_daily_rate, context,
              company:companies ( id, name, website, metadata )
            ),
            candidate:candidates (
              id, status, source, current_title, seniority, expected_daily_rate, expected_salary, availability,
              person:persons (
                id, first_name, last_name, full_name, primary_email, phone, linkedin_url, location, notes,
                person_skills (
                  id, level, years, confidence, source,
                  skill:skills ( id, name, category )
                ),
                collaborators (
                  id, status, current_title, entry_date, practice, seniority,
                  compensation:collaborator_compensation ( gross_annual, effective_to ),
                  missions (
                    id, title, status, start_date, end_date, tjm, cjm, gross_margin_pct,
                    company:companies ( name )
                  )
                )
              ),
              candidate_hiring_processes (
                id, status, current_step, started_at, closed_at, close_reason,
                job_profile:job_profiles ( id, title ),
                candidate_hiring_milestones (
                  id, step, result, scheduled_at, completed_at, calendar_event_id, notes
                )
              )
            )
          `)
          .eq("id", staffingId)
          .maybeSingle()

        if (staffingError) throw new Error(staffingError.message)
        if (!staffing) throw new Error("Positionnement de staffing introuvable.")

        const model = staffing as unknown as StaffingDrawerViewModel
        setDrawerData(model)

        const candidateId = model.candidate?.id
        if (candidateId) {
          const { data: candidateEvents } = await supabase
            .from("calendar_events")
            .select("id, title, event_type, status, starts_at, ends_at, description, metadata, organizer_id")
            .eq("candidate_id", candidateId)
            .order("starts_at", { ascending: false })

          setEvents((candidateEvents ?? []) as DrawerEventRecord[])
        }
      } catch (error: unknown) {
        console.error("[StaffingDrawer] Error loading data:", error)
        setFetchError(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    startTransition(() => {
      void loadData()
    })
  }, [isOpen, reloadKey, staffingId])

  const isCollaborator = drawerData?.candidate?.source === "collaborateur" ||
    Boolean(drawerData?.candidate?.person?.collaborators?.length)

  const hiringProcess = drawerData?.candidate?.candidate_hiring_processes
    ? findActiveProcess(drawerData.candidate.candidate_hiring_processes as unknown as HiringProcess[])
    : null

  const tabs: { id: StaffingDrawerTab; label: string }[] = [
    { id: "profil", label: "Profil" },
    { id: "staffing", label: "Staffing" },
    { id: "recrutement", label: "Recrutement" },
  ]

  const renderTabContent = () => {
    if (!drawerData) return null

    switch (activeTab) {
      case "profil":
        return <TabDetails data={drawerData} isCollaborator={isCollaborator} />
      case "staffing":
        return <StaffingProcessStepper data={drawerData} events={events} />
      case "recrutement":
        return hiringProcess ? (
          <HiringProcessStepper process={hiringProcess} />
        ) : (
          <div
            className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-center"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            <p className="max-w-xs text-xs leading-relaxed">
              Aucun processus de recrutement actif n&apos;est associé à ce positionnement.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeStaffingDrawer()
      }}
      title={
        drawerData ? (
          <StaffingDrawerHeader data={drawerData} isCollaborator={isCollaborator} />
        ) : (
          "Dossier candidat"
        )
      }
      eyebrow="Dossier candidat"
      className={isMobile ? "w-full max-w-full" : "max-w-[520px]"}
      loading={loading && !drawerData}
    >
      {!loading && drawerData && (
        <div
          className="-mt-4 mb-4 flex gap-0 border-b select-none"
          style={{ borderColor: "var(--color-border)" }}
          role="tablist"
        >
          {tabs.map(({ id, label }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer"
                style={{
                  color: isActive ? "var(--color-primary)" : "var(--color-muted)",
                  borderBottom: isActive
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                  marginBottom: "-1px",
                  background: "transparent",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {loading && !drawerData && <DrawerSkeleton />}

      {fetchError && !loading && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center select-none"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
        >
          <p className="text-sm font-semibold text-heading">Erreur de chargement</p>
          <p className="text-xs">{fetchError}</p>
          <button
            onClick={() => {
              if (staffingId) setReloadKey((current) => current + 1)
            }}
            className="mt-1 text-xs underline underline-offset-2 text-primary cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !fetchError && drawerData && (
        <div role="tabpanel" className="pb-6">
          {renderTabContent()}
        </div>
      )}
    </AppDrawer>
  )
}
