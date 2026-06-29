"use client"

import React, { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { CandidateProfileEditor } from "@/components/recruitment/CandidateProfileEditor"
import { createClient } from "@/lib/supabase/client"
import { useStaffingDrawerStore, type StaffingDrawerTab } from "@/hooks/use-staffing-drawer-store"
import { StaffingDrawerHeader } from "./StaffingDrawerHeader"
import { TabDetails } from "./TabDetails"
import { HiringProcessStepper, findActiveProcess, type HiringProcess } from "@/components/recruitment/HiringProcessStepper"
import { StaffingProcessStepper } from "./StaffingProcessStepper"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"
import type {
  CandidatePracticeOption,
  CandidateSkillOption,
} from "@/types/candidate-profile-form"

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

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487 19.5 7.125m-1.638-4.276a1.875 1.875 0 1 1 2.652 2.652L7.125 18.89 3 20l1.11-4.125L17.862 2.85Z" />
    </svg>
  )
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
  const [practices, setPractices] = useState<CandidatePracticeOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CandidateSkillOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
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
      setEditing(false)
      setDirty(false)

      try {
        const supabase = createClient()

        const [staffingResult, practicesResult, skillsResult] = await Promise.all([
          supabase
            .from("opportunity_candidates")
            .select(`
              id, status, comment, next_action, positioning_origin, proposed_at, sent_to_client_at, status_changed_at, created_at, updated_at,
              opportunity:opportunities (
                id, title, stage, priority, opportunity_type, requires_staffing, start_date, target_daily_rate, context,
                company:companies ( id, name, website, metadata )
              ),
              candidate:candidates (
                *,
                person:persons (
                  id, first_name, last_name, full_name, primary_email, phone, linkedin_url, location, notes,
                  person_skills (
                    *,
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
            .maybeSingle(),
          supabase
            .from("offer_practices")
            .select("id, name, slug, color_hex")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("skills")
            .select("id, name, category")
            .order("name", { ascending: true }),
        ])

        if (staffingResult.error) throw new Error(staffingResult.error.message)
        if (!staffingResult.data) throw new Error("Positionnement de staffing introuvable.")
        if (practicesResult.error) throw new Error(practicesResult.error.message)
        if (skillsResult.error) throw new Error(skillsResult.error.message)

        const model = staffingResult.data as unknown as StaffingDrawerViewModel
        const candidateId = model.candidate?.id
        const practice = (practicesResult.data ?? []).find(
          (item) => item.id === model.candidate?.practice_id,
        )

        const eventsResult = candidateId
          ? await supabase
              .from("calendar_events")
              .select("id, title, event_type, status, starts_at, ends_at, description, metadata, organizer_id")
              .eq("candidate_id", candidateId)
              .order("starts_at", { ascending: false })
          : { data: [], error: null }

        if (eventsResult.error) {
          console.error("[StaffingDrawer] Candidate events error:", eventsResult.error)
        }

        setPractices(
          (practicesResult.data ?? []).map((item) => ({
            id: item.id,
            name: item.name,
          })),
        )
        setSkillOptions((skillsResult.data ?? []) as CandidateSkillOption[])
        setEvents((eventsResult.data ?? []) as DrawerEventRecord[])
        setDrawerData({
          ...model,
          candidate: {
            ...model.candidate,
            practice: practice ?? null,
          },
        })
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

  const requestClose = () => {
    if (!editing || !dirty) return true
    return window.confirm(
      "Des modifications ne sont pas enregistrées. Fermer le dossier ?",
    )
  }

  const renderTabContent = () => {
    if (!drawerData) return null

    if (editing) {
      return (
        <CandidateProfileEditor
          data={drawerData.candidate}
          practices={practices}
          skillOptions={skillOptions}
          onCancel={() => {
            if (!dirty || requestClose()) {
              setEditing(false)
              setDirty(false)
            }
          }}
          onSaved={() => {
            setEditing(false)
            setDirty(false)
            setReloadKey((current) => current + 1)
          }}
          onDirtyChange={setDirty}
        />
      )
    }

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
      onRequestClose={requestClose}
      dirty={editing && dirty}
      title={
        drawerData ? (
          <StaffingDrawerHeader data={drawerData} isCollaborator={isCollaborator} />
        ) : (
          "Dossier candidat"
        )
      }
      subtitle={editing ? "Modification du dossier candidat" : undefined}
      eyebrow="Dossier candidat"
      className={isMobile ? "w-full max-w-full" : "max-w-[620px]"}
      loading={loading && !drawerData}
      headerActions={
        !editing && drawerData && activeTab === "profil" ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<EditIcon />}
            onClick={() => setEditing(true)}
          >
            Modifier
          </Button>
        ) : null
      }
    >
      {!loading && drawerData && !editing && (
        <div
          className="-mt-4 mb-4 flex items-center gap-0 border-b select-none"
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
          {activeTab === "profil" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-3 text-[11px] font-bold text-primary sm:hidden"
            >
              <span className="size-3.5" aria-hidden="true">
                <EditIcon />
              </span>
              Modifier
            </button>
          )}
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
