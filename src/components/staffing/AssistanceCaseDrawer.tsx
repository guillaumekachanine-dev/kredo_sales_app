"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CandidateProfileEditor } from "@/components/recruitment/CandidateProfileEditor"
import { CandidateReferenceProfile } from "@/components/recruitment/CandidateReferenceProfile"
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from "@/components/recruitment/HiringProcessStepper"
import { createClient } from "@/lib/supabase/client"
import {
  useStaffingDrawerStore,
  type AssistanceCaseTab,
} from "@/hooks/use-staffing-drawer-store"
import {
  AssistanceCaseHeader,
  getAssistanceCaseHeaderStyle,
} from "./AssistanceCaseHeader"
import { OpportunityNeedTab } from "./OpportunityNeedTab"
import { OpportunityStaffingTab } from "./OpportunityStaffingTab"
import { OpportunityRecruitmentTab } from "./OpportunityRecruitmentTab"
import { StaffingProcessStepper } from "./StaffingProcessStepper"
import type {
  AssistanceCaseEvent,
  AssistanceCaseOpportunity,
  AssistanceCasePositioning,
} from "@/types/assistance-case"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"
import type {
  CandidatePracticeOption,
  CandidateSkillOption,
} from "@/types/candidate-profile-form"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Erreur de chargement du dossier assistance technique."
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1 select-none">
      <div className="h-20 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
      <div className="flex gap-4 border-b border-border pb-2">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
      </div>
      <div className="h-28 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/25" />
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/25" />
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/25" />
      </div>
    </div>
  )
}

function toStaffingViewModel(
  opportunity: AssistanceCaseOpportunity,
  positioning: AssistanceCasePositioning,
): StaffingDrawerViewModel {
  return {
    ...positioning,
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      stage: opportunity.stage,
      priority: opportunity.priority,
      opportunity_type: opportunity.opportunity_type,
      requires_staffing: opportunity.requires_staffing,
      start_date: opportunity.start_date,
      target_daily_rate: opportunity.target_daily_rate,
      context: opportunity.context,
      company: opportunity.company,
    },
  }
}

export function AssistanceCaseDrawer() {
  const {
    isOpen,
    staffingId,
    opportunityId,
    candidateId,
    perspective,
    activeTab,
    closeStaffingDrawer,
    setActiveTab,
    setPerspective,
    hydrateCaseContext,
    selectPositioning,
  } = useStaffingDrawerStore()

  const [opportunity, setOpportunity] = useState<AssistanceCaseOpportunity | null>(null)
  const [events, setEvents] = useState<AssistanceCaseEvent[]>([])
  const [practices, setPractices] = useState<CandidatePracticeOption[]>([])
  const [skillOptions, setSkillOptions] = useState<CandidateSkillOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingMode, setEditingMode] = useState<"candidate" | "opportunity" | null>(null)
  const [dirty, setDirty] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false,
  )
  const [, startTransition] = useTransition()

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)")
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  useEffect(() => {
    if (!isOpen || (!opportunityId && !staffingId)) return

    const loadData = async () => {
      setLoading(true)
      setFetchError(null)
      setEditingMode(null)
      setDirty(false)

      try {
        const supabase = createClient()
        let resolvedOpportunityId = opportunityId
        let resolvedCandidateId = candidateId
        const resolvedStaffingId = staffingId

        if (!resolvedOpportunityId && resolvedStaffingId) {
          const contextResult = await supabase
            .from("opportunity_candidates")
            .select("id, opportunity_id, candidate_id")
            .eq("id", resolvedStaffingId)
            .maybeSingle()

          if (contextResult.error) throw new Error(contextResult.error.message)
          if (!contextResult.data) throw new Error("Positionnement de staffing introuvable.")

          resolvedOpportunityId = contextResult.data.opportunity_id
          resolvedCandidateId = contextResult.data.candidate_id
        }

        if (!resolvedOpportunityId) throw new Error("Opportunité introuvable.")

        const [opportunityResult, practicesResult, skillsResult, eventsResult] = await Promise.all([
          supabase
            .from("opportunities")
            .select(`
              id, title, stage, priority, conviction, opportunity_type, requires_staffing,
              need_summary, context, seniority, location, remote_policy, practice,
              target_daily_rate, target_margin_pct, duration_days, estimated_gain, acv,
              opened_at, start_date, target_close_date, next_action_label, next_action_at,
              required_headcount,
              company:companies ( id, name, website, metadata ),
              opportunity_skills (
                id, importance, min_level, min_years, weight, comment,
                skill:skills ( id, name, category )
              ),
              opportunity_candidates (
                id, status, comment, client_feedback, next_action, positioning_origin,
                proposed_at, sent_to_client_at, status_changed_at, created_at, updated_at,
                candidate:candidates (
                  *,
                  person:persons (
                    id, first_name, last_name, full_name, primary_email, phone,
                    linkedin_url, location, notes,
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
                    opportunity_candidate_id,
                    job_profile:job_profiles ( id, title ),
                    candidate_hiring_milestones (
                      id, step, result, scheduled_at, completed_at, calendar_event_id, notes
                    )
                  )
                )
              )
            `)
            .eq("id", resolvedOpportunityId)
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
          supabase
            .from("calendar_events")
            .select(
              "id, title, event_type, status, starts_at, ends_at, description, candidate_id, opportunity_candidate_id, metadata, organizer_id",
            )
            .eq("opportunity_id", resolvedOpportunityId)
            .order("starts_at", { ascending: false }),
        ])

        if (opportunityResult.error) throw new Error(opportunityResult.error.message)
        if (!opportunityResult.data) throw new Error("Opportunité introuvable.")
        if (practicesResult.error) throw new Error(practicesResult.error.message)
        if (skillsResult.error) throw new Error(skillsResult.error.message)
        if (eventsResult.error) throw new Error(eventsResult.error.message)

        const practiceMap = new Map(
          (practicesResult.data ?? []).map((practice) => [practice.id, practice]),
        )
        const rawOpportunity = opportunityResult.data as unknown as AssistanceCaseOpportunity
        const hydratedOpportunity: AssistanceCaseOpportunity = {
          ...rawOpportunity,
          opportunity_candidates: (rawOpportunity.opportunity_candidates ?? []).map(
            (positioning) => ({
              ...positioning,
              candidate: {
                ...positioning.candidate,
                practice: positioning.candidate.practice_id
                  ? practiceMap.get(positioning.candidate.practice_id) ?? null
                  : null,
              },
            }),
          ),
        }

        const selectedPositioning =
          hydratedOpportunity.opportunity_candidates.find(
            (positioning) => positioning.id === resolvedStaffingId,
          ) ??
          hydratedOpportunity.opportunity_candidates.find(
            (positioning) => positioning.candidate.id === resolvedCandidateId,
          ) ??
          null

        setOpportunity(hydratedOpportunity)
        setPractices(
          (practicesResult.data ?? []).map((practice) => ({
            id: practice.id,
            name: practice.name,
          })),
        )
        setSkillOptions((skillsResult.data ?? []) as CandidateSkillOption[])
        setEvents((eventsResult.data ?? []) as unknown as AssistanceCaseEvent[])
        hydrateCaseContext({
          opportunityId: resolvedOpportunityId,
          staffingId: selectedPositioning?.id ?? null,
          candidateId: selectedPositioning?.candidate.id ?? null,
        })
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
  }, [candidateId, hydrateCaseContext, isOpen, opportunityId, reloadKey, staffingId])

  const currentPositioning = useMemo(() => {
    if (!opportunity) return null
    return (
      opportunity.opportunity_candidates.find((positioning) => positioning.id === staffingId) ??
      opportunity.opportunity_candidates.find(
        (positioning) => positioning.candidate.id === candidateId,
      ) ??
      null
    )
  }, [candidateId, opportunity, staffingId])

  const currentViewModel = useMemo(
    () =>
      opportunity && currentPositioning
        ? toStaffingViewModel(opportunity, currentPositioning)
        : null,
    [currentPositioning, opportunity],
  )

  const candidateEvents = useMemo(() => {
    if (!currentPositioning) return []
    return events.filter(
      (event) =>
        event.opportunity_candidate_id === currentPositioning.id ||
        (!event.opportunity_candidate_id &&
          event.candidate_id === currentPositioning.candidate.id),
    )
  }, [currentPositioning, events])

  const hiringProcess = useMemo(() => {
    if (!currentPositioning) return null
    const exactProcesses = (
      currentPositioning.candidate.candidate_hiring_processes ?? []
    ).filter((process) => process.opportunity_candidate_id === currentPositioning.id)
    return findActiveProcess(exactProcesses as unknown as HiringProcess[])
  }, [currentPositioning])

  const tabs: { id: AssistanceCaseTab; label: string }[] = [
    { id: "subject", label: perspective === "candidate" ? "Profil" : "Besoin" },
    { id: "staffing", label: "Staffing" },
    { id: "recruitment", label: "Recrutement" },
  ]

  const requestClose = () => {
    if (editingMode !== "candidate" || !dirty) return true
    return window.confirm("Des modifications ne sont pas enregistrées. Fermer le dossier ?")
  }

  const isCandidateEditing = editingMode === "candidate"

  const openCandidatePerspective = (
    positioning: AssistanceCasePositioning,
    tab: AssistanceCaseTab = activeTab,
  ) => {
    selectPositioning(positioning.id, positioning.candidate.id)
    setActiveTab(tab)
    setPerspective("candidate")
  }

  const renderOpportunityContent = () => {
    if (!opportunity) return null

    switch (activeTab) {
      case "subject":
        return <OpportunityNeedTab opportunity={opportunity} />
      case "staffing":
        return (
          <OpportunityStaffingTab
            opportunity={opportunity}
            activePositioningId={currentPositioning?.id ?? null}
            onOpenCandidate={(positioning) => openCandidatePerspective(positioning, "staffing")}
          />
        )
      case "recruitment":
        return (
          <OpportunityRecruitmentTab
            opportunity={opportunity}
            onOpenCandidateRecruitment={(positioning) =>
              openCandidatePerspective(positioning, "recruitment")
            }
          />
        )
      default:
        return null
    }
  }

  const renderCandidateContent = () => {
    if (!currentPositioning || !currentViewModel) {
      return (
        <div className="rounded-[var(--radius-large)] border border-dashed border-border py-12 text-center">
          <p className="text-sm font-semibold text-heading">Aucun profil sélectionné</p>
          <button
            type="button"
            onClick={() => setPerspective("opportunity")}
            className="mt-2 text-xs font-semibold text-primary underline underline-offset-2"
          >
            Revenir au dossier opportunité
          </button>
        </div>
      )
    }

    if (editingMode === "candidate") {
      return (
        <CandidateProfileEditor
          data={currentPositioning.candidate}
          practices={practices}
          skillOptions={skillOptions}
          onCancel={() => {
            if (!dirty || requestClose()) {
              setEditingMode(null)
              setDirty(false)
            }
          }}
          onSaved={() => {
            setEditingMode(null)
            setDirty(false)
            setReloadKey((current) => current + 1)
          }}
          onDirtyChange={setDirty}
        />
      )
    }

    switch (activeTab) {
      case "subject":
        return <CandidateReferenceProfile data={currentPositioning.candidate} />
      case "staffing":
        return <StaffingProcessStepper data={currentViewModel} events={candidateEvents} />
      case "recruitment":
        return hiringProcess ? (
          <HiringProcessStepper process={hiringProcess} />
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border text-center">
            <p className="max-w-xs text-xs leading-relaxed text-muted">
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
      dirty={isCandidateEditing && dirty}
      headerStyle={getAssistanceCaseHeaderStyle(perspective)}
      title={
        opportunity ? (
          <AssistanceCaseHeader
            opportunity={opportunity}
            positioning={currentPositioning}
            perspective={perspective}
            onEdit={() => {
              if (perspective === "candidate") {
                if (!currentPositioning) return
                setEditingMode("candidate")
                setDirty(false)
                return
              }

              setEditingMode("opportunity")
              setDirty(false)
            }}
            editDisabled={perspective === "candidate" && !currentPositioning}
            onPerspectiveChange={(nextPerspective) => {
              if (nextPerspective === "candidate" && !currentPositioning) return
              if (editingMode === "candidate" && dirty && !requestClose()) return
              setPerspective(nextPerspective)
              setEditingMode(null)
              setDirty(false)
            }}
          />
        ) : (
          "Dossier assistance technique"
        )
      }
      subtitle={
        isCandidateEditing ? "Modification du dossier candidat" : undefined
      }
      eyebrow="Dossier assistance technique"
      className={isMobile ? "w-full max-w-full" : "max-w-[720px]"}
      loading={loading && !opportunity}
    >
      {loading && !opportunity && <DrawerSkeleton />}

      {!loading && opportunity && !isCandidateEditing && (
        <div
          className="-mt-4 mb-4 flex items-center gap-0 border-b border-border select-none"
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

      {fetchError && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center select-none">
          <p className="text-sm font-semibold text-heading">Erreur de chargement</p>
          <p className="text-xs text-muted">{fetchError}</p>
          <button
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-1 text-xs text-primary underline underline-offset-2"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !fetchError && opportunity && (
        <div role="tabpanel" className="pb-6">
          {perspective === "opportunity"
            ? renderOpportunityContent()
            : renderCandidateContent()}
        </div>
      )}
    </AppDrawer>
  )
}
