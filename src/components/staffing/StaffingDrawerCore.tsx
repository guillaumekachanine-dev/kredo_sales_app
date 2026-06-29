"use client"

import React, { useEffect, useMemo, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { CandidateProfileEditor } from "@/components/recruitment/CandidateProfileEditor"
import { createClient } from "@/lib/supabase/client"
import {
  useStaffingDrawerStore,
  type AssistanceCaseTab,
  type CasePerspective,
} from "@/hooks/use-staffing-drawer-store"
import { useMissionsTabStore } from "@/lib/tabs/missions-tab-store"
import { StaffingDrawerHeader } from "./StaffingDrawerHeader"
import { TabDetails } from "./TabDetails"
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from "@/components/recruitment/HiringProcessStepper"
import { StaffingProcessStepper } from "./StaffingProcessStepper"
import { AssistanceCasePerspectiveSwitcher } from "./AssistanceCasePerspectiveSwitcher"
import {
  OpportunityCaseNeedTab,
  OpportunityCaseRecruitmentTab,
  OpportunityCaseStaffingTab,
} from "./OpportunityCaseTabs"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"
import type {
  AssistanceCaseEvent,
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import type {
  CandidatePracticeOption,
  CandidateSkillOption,
} from "@/types/candidate-profile-form"

interface StaffingDrawerProps {
  device: DashboardDevice
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Erreur de chargement des données."
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487 19.5 7.125m-1.638-4.276a1.875 1.875 0 1 1 2.652 2.652L7.125 18.89 3 20l1.11-4.125L17.862 2.85Z"
      />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5H19.5V10.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14L19.5 4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13.5V18.5A1.5 1.5 0 0 1 17.5 20H5.5A1.5 1.5 0 0 1 4 18.5V6.5A1.5 1.5 0 0 1 5.5 5H10.5" />
    </svg>
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1 select-none">
      <div className="h-16 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/30" />
      <div className="flex gap-4 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
      </div>
      <div className="h-28 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/30" />
      <div className="h-40 animate-pulse rounded-[var(--radius-large)] bg-[var(--color-skeleton-base)]/25" />
    </div>
  )
}

function resolveCandidateName(positioning: AssistanceCasePositioning | null) {
  if (!positioning) return null
  const person = positioning.candidate.person
  return (
    person?.full_name ||
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() ||
    "Candidat"
  )
}

export function StaffingDrawer({ device }: StaffingDrawerProps) {
  const {
    isOpen,
    perspective,
    staffingId,
    opportunityId,
    activeTab,
    closeStaffingDrawer,
    setActiveTab,
    setPerspective,
    hydrateCaseContext,
    selectPositioning,
  } = useStaffingDrawerStore()
  const { openTab } = useMissionsTabStore()

  const [candidateData, setCandidateData] = useState<StaffingDrawerViewModel | null>(null)
  const [opportunityData, setOpportunityData] = useState<AssistanceCaseOpportunity | null>(null)
  const [events, setEvents] = useState<AssistanceCaseEvent[]>([])
  const [practices, setPractices] = useState<CandidatePracticeOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CandidateSkillOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!isOpen) return

    const loadCandidatePerspective = async (positioningId: string) => {
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
                id, opportunity_candidate_id, status, current_step, started_at, closed_at, close_reason,
                job_profile:job_profiles ( id, title ),
                candidate_hiring_milestones (
                  id, step, result, scheduled_at, completed_at, calendar_event_id, notes
                )
              )
            )
          `)
          .eq("id", positioningId)
          .maybeSingle(),
        supabase
          .from("offer_practices")
          .select("id, name")
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
      const exactProcesses = (model.candidate.candidate_hiring_processes ?? []).filter(
        (process) =>
          process.opportunity_candidate_id === model.id ||
          process.opportunity_candidate_id === null,
      )
      model.candidate.candidate_hiring_processes = exactProcesses

      const practice = (practicesResult.data ?? []).find(
        (item) => item.id === model.candidate.practice_id,
      )
      model.candidate.practice = practice
        ? { id: practice.id, name: practice.name, slug: "", color_hex: null }
        : null

      const eventsResult = await supabase
        .from("calendar_events")
        .select("id, title, event_type, status, starts_at, ends_at, description, opportunity_candidate_id")
        .eq("candidate_id", model.candidate.id)
        .eq("opportunity_id", model.opportunity.id)
        .order("starts_at", { ascending: false })

      if (eventsResult.error) {
        console.error("[AssistanceCaseDrawer] Candidate events error:", eventsResult.error)
      }

      setCandidateData(model)
      setPractices((practicesResult.data ?? []) as CandidatePracticeOption[])
      setSkillOptions((skillsResult.data ?? []) as CandidateSkillOption[])
      setEvents((eventsResult.data ?? []) as AssistanceCaseEvent[])
      hydrateCaseContext({
        opportunityId: model.opportunity.id,
        candidateId: model.candidate.id,
        staffingId: model.id,
      })
    }

    const loadOpportunityPerspective = async (nextOpportunityId: string) => {
      const supabase = createClient()
      const [opportunityResult, eventsResult] = await Promise.all([
        supabase
          .from("opportunities")
          .select(`
            *,
            company:companies (
              id, name, website, sector, hq_location, metadata
            ),
            opportunity_skills (
              id, importance, min_level, min_years, weight, comment,
              skill:skills ( id, name, category )
            ),
            opportunity_candidates (
              id, status, proposed_at, sent_to_client_at, client_feedback, comment, next_action,
              positioning_origin, status_changed_at, created_at, updated_at,
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
                  id, opportunity_candidate_id, status, current_step, started_at, closed_at, close_reason,
                  job_profile:job_profiles ( id, title ),
                  candidate_hiring_milestones (
                    id, step, result, scheduled_at, completed_at, calendar_event_id, notes
                  )
                )
              )
            )
          `)
          .eq("id", nextOpportunityId)
          .maybeSingle(),
        supabase
          .from("calendar_events")
          .select("id, title, event_type, status, starts_at, ends_at, description, opportunity_candidate_id")
          .eq("opportunity_id", nextOpportunityId)
          .order("starts_at", { ascending: false }),
      ])

      if (opportunityResult.error) throw new Error(opportunityResult.error.message)
      if (!opportunityResult.data) throw new Error("Opportunité introuvable.")
      if (eventsResult.error) {
        console.error("[AssistanceCaseDrawer] Opportunity events error:", eventsResult.error)
      }

      const model = opportunityResult.data as unknown as AssistanceCaseOpportunity
      model.opportunity_candidates = (model.opportunity_candidates ?? []).map(
        (positioning) => ({
          ...positioning,
          candidate_hiring_processes: (
            positioning.candidate.candidate_hiring_processes ?? []
          ).filter(
            (process) =>
              process.opportunity_candidate_id === positioning.id ||
              process.opportunity_candidate_id === null,
          ),
        }),
      )

      setOpportunityData(model)
      setEvents((eventsResult.data ?? []) as AssistanceCaseEvent[])
    }

    const loadData = async () => {
      setLoading(true)
      setFetchError(null)
      setEditing(false)
      setDirty(false)

      try {
        if (perspective === "candidate") {
          if (!staffingId) throw new Error("Aucun positionnement sélectionné.")
          await loadCandidatePerspective(staffingId)
        } else {
          if (!opportunityId) throw new Error("Aucune opportunité sélectionnée.")
          await loadOpportunityPerspective(opportunityId)
        }
      } catch (error: unknown) {
        console.error("[AssistanceCaseDrawer] Error loading data:", error)
        setFetchError(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    startTransition(() => {
      void loadData()
    })
  }, [
    hydrateCaseContext,
    isOpen,
    opportunityId,
    perspective,
    reloadKey,
    staffingId,
  ])

  const currentOpportunity =
    perspective === "opportunity"
      ? opportunityData
      : candidateData
        ? {
            id: candidateData.opportunity.id,
            title: candidateData.opportunity.title,
            company: candidateData.opportunity.company,
          }
        : null

  const selectedPositioning = useMemo(() => {
    if (candidateData) {
      return {
        id: candidateData.id,
        candidate: candidateData.candidate,
      } as AssistanceCasePositioning
    }
    if (!opportunityData || !staffingId) return null
    return (
      opportunityData.opportunity_candidates.find((item) => item.id === staffingId) ??
      null
    )
  }, [candidateData, opportunityData, staffingId])

  const candidateName = resolveCandidateName(selectedPositioning)
  const isCollaborator =
    candidateData?.candidate?.source === "collaborateur" ||
    Boolean(candidateData?.candidate?.person?.collaborators?.length)

  const hiringProcess = candidateData?.candidate?.candidate_hiring_processes
    ? findActiveProcess(
        candidateData.candidate.candidate_hiring_processes as unknown as HiringProcess[],
      )
    : null

  const tabs: { id: AssistanceCaseTab; label: string }[] =
    perspective === "opportunity"
      ? [
          { id: "besoin", label: "Besoin" },
          { id: "staffing", label: "Staffing" },
          { id: "recrutement", label: "Recrutement" },
        ]
      : [
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

  const handlePerspectiveChange = (nextPerspective: CasePerspective) => {
    if (nextPerspective === "candidate" && !staffingId) return
    setPerspective(nextPerspective)
  }

  const handleSelectPositioning = (positioning: AssistanceCasePositioning) => {
    selectPositioning(positioning.id, positioning.candidate.id)
  }

  const openFullOpportunity = () => {
    if (!currentOpportunity) return
    openTab({
      entityType: "opportunite",
      entityId: currentOpportunity.id,
      title: currentOpportunity.company?.name ?? currentOpportunity.title,
      subtitle: currentOpportunity.title,
    })
    closeStaffingDrawer()
  }

  const renderCandidateContent = () => {
    if (!candidateData) return null

    if (editing) {
      return (
        <CandidateProfileEditor
          data={candidateData.candidate}
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
        return <TabDetails data={candidateData} isCollaborator={isCollaborator} />
      case "staffing":
        return <StaffingProcessStepper data={candidateData} events={events} />
      case "recrutement":
        return hiringProcess ? (
          <HiringProcessStepper process={hiringProcess} />
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-[var(--radius-large)] border border-dashed border-border px-6 text-center text-xs text-muted">
            Aucun processus de recrutement actif n&apos;est associé à ce positionnement.
          </div>
        )
      default:
        return null
    }
  }

  const renderOpportunityContent = () => {
    if (!opportunityData) return null
    const commonProps = {
      opportunity: opportunityData,
      events,
      device,
      onSelectPositioning: handleSelectPositioning,
    }

    switch (activeTab) {
      case "besoin":
        return <OpportunityCaseNeedTab {...commonProps} />
      case "staffing":
        return <OpportunityCaseStaffingTab {...commonProps} />
      case "recrutement":
        return <OpportunityCaseRecruitmentTab {...commonProps} />
      default:
        return null
    }
  }

  const hasActiveData =
    perspective === "candidate" ? Boolean(candidateData) : Boolean(opportunityData)

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeStaffingDrawer()
      }}
      onRequestClose={requestClose}
      dirty={editing && dirty}
      title={
        perspective === "candidate" && candidateData ? (
          <StaffingDrawerHeader
            data={candidateData}
            isCollaborator={isCollaborator}
          />
        ) : opportunityData ? (
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-heading">
              {opportunityData.title}
            </p>
            <p className="truncate text-xs text-muted">
              {opportunityData.company?.name ?? "Compte non renseigné"}
            </p>
          </div>
        ) : (
          "Dossier assistance technique"
        )
      }
      subtitle={editing ? "Modification du dossier candidat" : undefined}
      eyebrow={
        perspective === "candidate" ? "Dossier candidat" : "Dossier opportunité"
      }
      className={device === "mobile" ? "w-full max-w-full" : "max-w-[720px]"}
      loading={loading && !hasActiveData}
      headerActions={
        !editing && perspective === "candidate" && candidateData && activeTab === "profil" ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<EditIcon />}
            onClick={() => setEditing(true)}
          >
            Modifier
          </Button>
        ) : !editing && perspective === "opportunity" && opportunityData ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<OpenIcon />}
            onClick={openFullOpportunity}
          >
            Fiche complète
          </Button>
        ) : null
      }
    >
      {!loading && hasActiveData && currentOpportunity && !editing && (
        <AssistanceCasePerspectiveSwitcher
          perspective={perspective}
          opportunityTitle={currentOpportunity.title}
          companyName={currentOpportunity.company?.name ?? null}
          candidateName={candidateName}
          canOpenCandidate={Boolean(staffingId)}
          onChange={handlePerspectiveChange}
        />
      )}

      {!loading && hasActiveData && !editing && (
        <div
          className="mb-4 flex items-center gap-0 border-b border-border select-none"
          role="tablist"
        >
          {tabs.map(({ id, label }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className="min-h-11 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none"
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
          {perspective === "candidate" && activeTab === "profil" && (
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

      {loading && !hasActiveData && <DrawerSkeleton />}

      {fetchError && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-large)] border border-dashed border-border py-12 text-center text-muted">
          <p className="text-sm font-semibold text-heading">Erreur de chargement</p>
          <p className="text-xs">{fetchError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-1 text-xs text-primary underline underline-offset-2"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !fetchError && hasActiveData && (
        <div role="tabpanel" className="pb-6">
          {perspective === "candidate"
            ? renderCandidateContent()
            : renderOpportunityContent()}
        </div>
      )}
    </AppDrawer>
  )
}
