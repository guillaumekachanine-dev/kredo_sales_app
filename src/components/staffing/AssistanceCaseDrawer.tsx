"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { CommunicationIntentMenu } from "@/components/communication/CommunicationIntentMenu"
import {
  AgendaEventDrawer,
  type AgendaEventDrawerInitialValues,
} from "@/components/agenda/AgendaEventDrawer"
import { CandidateProfileEditor } from "@/components/recruitment/CandidateProfileEditor"
import { CandidateReferenceProfile } from "@/components/recruitment/CandidateReferenceProfile"
import {
  HiringProcessStepper,
  findActiveProcess,
  type HiringProcess,
} from "@/components/recruitment/HiringProcessStepper"
import { createClient } from "@/lib/supabase/client"
import {
  getOfferPracticesForPicker,
  getSkillsForPicker,
} from "@/lib/reference-data/reference-data-actions"
import {
  useStaffingDrawerStore,
  type AssistanceCaseTab,
} from "@/hooks/use-staffing-drawer-store"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import {
  AssistanceCaseHeader,
  getAssistanceCaseHeaderStyle,
} from "./AssistanceCaseHeader"
import { OpportunityNeedTab } from "./OpportunityNeedTab"
import { OpportunityStaffingTab } from "./OpportunityStaffingTab"
import { OpportunityRecruitmentTab } from "./OpportunityRecruitmentTab"
import {
  RecruitmentInitiationButton,
  RecruitmentInitiationDialog,
  type RecruitmentInitiationPayload,
} from "./RecruitmentInitiationDialog"
import { StaffingProcessStepper } from "./StaffingProcessStepper"
import type {
  AssistanceCaseClientContact,
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

type RawOpportunityContactRow = {
  role: string | null
  contacts:
    | {
        id: string
        job_title: string | null
        persons:
          | {
              full_name: string | null
              first_name: string | null
              last_name: string | null
            }
          | Array<{
              full_name: string | null
              first_name: string | null
              last_name: string | null
            }>
          | null
      }
    | Array<{
        id: string
        job_title: string | null
        persons:
          | {
              full_name: string | null
              first_name: string | null
              last_name: string | null
            }
          | Array<{
              full_name: string | null
              first_name: string | null
              last_name: string | null
            }>
          | null
      }>
    | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatClientContactName(person: {
  full_name: string | null
  first_name: string | null
  last_name: string | null
} | null) {
  if (!person) return null
  if (person.full_name?.trim()) return person.full_name.trim()
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || null
}

function mapOpportunityClientContacts(
  rows: RawOpportunityContactRow[] | undefined,
): AssistanceCaseClientContact[] {
  return (rows ?? [])
    .map((row) => {
      const contact = getSingleRelation(row.contacts)
      if (!contact?.id) return null

      const person = getSingleRelation(contact.persons)
      const fullName = formatClientContactName(person)
      if (!fullName) return null

      return {
        id: contact.id,
        full_name: fullName,
        job_title: contact.job_title,
        role: row.role,
      }
    })
    .filter((contact): contact is AssistanceCaseClientContact => contact !== null)
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
  const router = useRouter()
  const openEventDrawer = useEventDrawerStore((state) => state.openEventDrawer)
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
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [eventInitialValues, setEventInitialValues] = useState<AgendaEventDrawerInitialValues>()
  const [recruitmentDraftPositioning, setRecruitmentDraftPositioning] =
    useState<AssistanceCasePositioning | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const syncViewport = () => setIsMobileViewport(media.matches)

    syncViewport()
    media.addEventListener("change", syncViewport)

    return () => {
      media.removeEventListener("change", syncViewport)
    }
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

        const [opportunityResult, practices, skills, eventsResult] = await Promise.all([
          supabase
            .from("opportunities")
            .select(`
              id, title, stage, priority, conviction, opportunity_type, requires_staffing,
              need_summary, context, seniority, location, remote_policy, practice,
              target_daily_rate, target_margin_pct, duration_days, estimated_gain, acv,
              opened_at, start_date, target_close_date, next_action_label, next_action_at,
              required_headcount,
              company:companies ( id, name, website, metadata ),
              opportunity_contacts (
                role,
                contacts (
                  id,
                  job_title,
                  persons ( full_name, first_name, last_name )
                )
              ),
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
          // Référentiels quasi-statiques : mis en cache 1h par workspace (audit
          // perf Session 28), servis via Server Action car ce composant est client.
          getOfferPracticesForPicker(),
          getSkillsForPicker(),
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
        if (eventsResult.error) throw new Error(eventsResult.error.message)

        const practiceMap = new Map(practices.map((practice) => [practice.id, practice]))
        const rawOpportunity = opportunityResult.data as unknown as AssistanceCaseOpportunity & {
          opportunity_contacts?: RawOpportunityContactRow[]
        }
        const hydratedOpportunity: AssistanceCaseOpportunity = {
          ...rawOpportunity,
          client_contacts: mapOpportunityClientContacts(rawOpportunity.opportunity_contacts),
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
          practices.map((practice) => ({
            id: practice.id,
            name: practice.name,
          })),
        )
        setSkillOptions(skills as CandidateSkillOption[])
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
  const currentCandidateName = currentPositioning
    ? currentPositioning.candidate.person?.full_name ||
      `${currentPositioning.candidate.person?.first_name ?? ""} ${currentPositioning.candidate.person?.last_name ?? ""}`.trim() ||
      null
    : null
  const currentCollaborator = currentPositioning?.candidate.person?.collaborators?.[0] ?? null
  const staffingContextLines = opportunity
    ? [
        `Besoin : ${opportunity.title}`,
        opportunity.company?.name ? `Compte : ${opportunity.company.name}` : null,
        opportunity.priority ? `Priorité : ${opportunity.priority}` : null,
        opportunity.practice ? `Practice : ${opportunity.practice}` : null,
        opportunity.required_headcount ? `Nombre de profils requis : ${opportunity.required_headcount}` : null,
        opportunity.next_action_label ? `Prochaine action besoin : ${opportunity.next_action_label}` : null,
        currentCandidateName ? `Profil sélectionné : ${currentCandidateName}` : null,
      ].filter(Boolean).join("\n")
    : undefined

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

  const openCreateNextActionEventDrawer = (positioning: AssistanceCasePositioning) => {
    const now = new Date()
    const rounded = new Date(now)
    rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0)
    const end = new Date(rounded.getTime() + 60 * 60 * 1000)
    const formatDate = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    const formatTime = (value: Date) =>
      `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`

    setEventInitialValues({
      title: positioning.next_action || `Prochaine action · ${positioning.candidate.person?.full_name ?? opportunity?.title ?? "staffing"}`,
      event_type:
        positioning.status === "entretien_planifie" || positioning.status === "entretien_realise"
          ? "entretien_client"
          : "preparation_candidat",
      date: formatDate(rounded),
      start_time: formatTime(rounded),
      end_time: formatTime(end),
      description: positioning.next_action ?? "",
      company: opportunity?.company
        ? { id: opportunity.company.id, name: opportunity.company.name, isNew: false }
        : null,
      opportunity_id: opportunity?.id,
      candidate_id: positioning.candidate.id,
    })
    setEventDrawerOpen(true)
  }

  const openCreateOpportunityEventDrawer = () => {
    const now = new Date()
    const rounded = new Date(now)
    rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0)
    const end = new Date(rounded.getTime() + 60 * 60 * 1000)
    const formatDate = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    const formatTime = (value: Date) =>
      `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`

    setEventInitialValues({
      title: opportunity?.next_action_label || `Next action · ${opportunity?.title ?? "Besoin"}`,
      event_type: "preparation_candidat",
      date: formatDate(rounded),
      start_time: formatTime(rounded),
      end_time: formatTime(end),
      description: "",
      company: opportunity?.company
        ? { id: opportunity.company.id, name: opportunity.company.name, isNew: false }
        : null,
      opportunity_id: opportunity?.id,
    })
    setEventDrawerOpen(true)
  }

  const openRecruitmentInitiation = (positioning: AssistanceCasePositioning) => {
    setRecruitmentDraftPositioning(positioning)
  }

  const handleRecruitmentDialogOpenChange = (open: boolean) => {
    if (!open) setRecruitmentDraftPositioning(null)
  }

  const handleRecruitmentInitiationSubmit = async (
    payload: RecruitmentInitiationPayload,
  ) => {
    if (!opportunity || !recruitmentDraftPositioning) {
      throw new Error("Contexte de recrutement introuvable.")
    }

    const positioning = recruitmentDraftPositioning
    const supabase = createClient()

    const { data: existingProcess, error: existingProcessError } = await supabase
      .from("candidate_hiring_processes")
      .select("id, opportunity_candidate_id")
      .eq("candidate_id", positioning.candidate.id)
      .eq("status", "active")
      .maybeSingle()

    if (existingProcessError) {
      throw new Error(existingProcessError.message)
    }

    if (existingProcess) {
      const isSamePositioning =
        existingProcess.opportunity_candidate_id === positioning.id
      throw new Error(
        isSamePositioning
          ? "Un processus actif existe déjà pour ce positionnement."
          : "Ce candidat a déjà un processus de recrutement actif sur un autre positionnement.",
      )
    }

    let jobProfileId: string | null = null
    const roleTitle = payload.roleTitle.trim()

    if (roleTitle) {
      const { data: jobProfile, error: jobProfileError } = await supabase
        .from("job_profiles")
        .select("id")
        .eq("title", roleTitle)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()

      if (jobProfileError) {
        throw new Error(jobProfileError.message)
      }

      jobProfileId = jobProfile?.id ?? null
    }

    const { data: createdProcess, error: createProcessError } = await supabase
      .from("candidate_hiring_processes")
      .insert({
        candidate_id: positioning.candidate.id,
        opportunity_candidate_id: positioning.id,
        job_profile_id: jobProfileId,
        current_step: "prequalification",
        status: "active",
      })
      .select("id")
      .single()

    if (createProcessError || !createdProcess) {
      throw new Error(
        createProcessError?.message ?? "Impossible de créer le processus de recrutement.",
      )
    }

    const foundationLines = [
      `Poste cible : ${roleTitle}`,
      payload.targetSalary.trim()
        ? `Salaire cible : ${payload.targetSalary.trim()} €`
        : null,
      payload.targetDailyRate.trim()
        ? `TJM client : ${payload.targetDailyRate.trim()} €`
        : null,
      payload.availability.trim()
        ? `Disponibilité : ${payload.availability.trim()}`
        : null,
      payload.location.trim() ? `Localisation : ${payload.location.trim()}` : null,
      payload.proposalFoundation.trim() || null,
    ]
      .filter(Boolean)
      .join("\n")

    const { error: milestoneError } = await supabase
      .from("candidate_hiring_milestones")
      .insert({
        hiring_process_id: createdProcess.id,
        step: "prequalification",
        result: "en_attente",
        scheduled_at: `${payload.scheduledDate}T09:00:00`,
        notes: foundationLines,
      })

    if (milestoneError) {
      await supabase
        .from("candidate_hiring_processes")
        .delete()
        .eq("id", createdProcess.id)
      throw new Error(milestoneError.message)
    }

    setRecruitmentDraftPositioning(null)
    selectPositioning(positioning.id, positioning.candidate.id)
    setPerspective("candidate")
    setActiveTab("recruitment")
    setReloadKey((current) => current + 1)
    router.refresh()
  }

  const renderOpportunityContent = () => {
    if (!opportunity) return null

    switch (activeTab) {
      case "subject":
        return (
          <OpportunityNeedTab
            opportunity={opportunity}
            events={events}
            onCreateEvent={openCreateOpportunityEventDrawer}
            onContactsSaved={() => setReloadKey((current) => current + 1)}
            isMobile={isMobileViewport}
            onStaffed={() => setReloadKey((current) => current + 1)}
          />
        )
      case "staffing":
        return (
          <OpportunityStaffingTab
            opportunity={opportunity}
            events={events}
            activePositioningId={currentPositioning?.id ?? null}
            onOpenCandidate={(positioning) => openCandidatePerspective(positioning, "staffing")}
            onOpenNextActionEvent={(eventId) => openEventDrawer(eventId)}
            onCreateNextActionEvent={openCreateNextActionEventDrawer}
          />
        )
      case "recruitment":
        return (
          <OpportunityRecruitmentTab
            opportunity={opportunity}
            onOpenCandidateRecruitment={(positioning) =>
              openCandidatePerspective(positioning, "recruitment")
            }
            onInitiateRecruitment={openRecruitmentInitiation}
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
          <HiringProcessStepper
            process={hiringProcess}
            fallbackTitle={currentPositioning.candidate.current_title ?? opportunity?.title}
          />
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border text-center">
            <div className="w-full max-w-xs px-4">
              <RecruitmentInitiationButton
                label="Initier le recrutement"
                onClick={() => openRecruitmentInitiation(currentPositioning)}
                dashed
                fullWidth
              />
            </div>
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
      className="w-screen max-w-screen overflow-x-hidden md:w-full md:max-w-[720px]"
      showMobileCloseButton={true}
      loading={loading && !opportunity}
    >
      {loading && !opportunity && <DrawerSkeleton />}

      {!loading && opportunity && !isCandidateEditing && (
        <div className="-mt-2 mb-4 flex justify-end px-1">
          <CommunicationIntentMenu
            label="Rédiger / préparer"
            origin="staffing_context"
            scope="internal"
            companyId={opportunity.company?.id ?? null}
            companyName={opportunity.company?.name ?? null}
            opportunityId={opportunity.id}
            opportunityTitle={opportunity.title}
            candidateId={currentPositioning?.candidate.id ?? null}
            candidateName={currentCandidateName}
            collaboratorId={currentCollaborator?.id ?? null}
            collaboratorName={currentCandidateName}
            internalDomain="staffing"
            mustInclude={staffingContextLines}
            refs={{
              ...(opportunity.company?.id ? { companyRef: opportunity.company.id } : {}),
              opportunityRef: opportunity.id,
              ...(currentPositioning?.candidate.id ? { profileRef: currentPositioning.candidate.id } : {}),
              ...(currentCollaborator?.id ? { collaboratorRef: currentCollaborator.id } : {}),
            }}
            items={[
              { intent: "staffing_help", label: "Demander de l’aide" },
              { intent: "staffing_priority", label: "Faire prioriser" },
              { intent: "staffing_review", label: "Préparer la revue" },
              { intent: "practice_support", label: "Appui Practice" },
              { intent: "presales_support", label: "Appui avant-vente" },
              { intent: "presales_kickoff", label: "Kickoff avant-vente" },
            ]}
          />
        </div>
      )}

      {!loading && opportunity && !isCandidateEditing && (
        <div
          className="-mx-4 -mt-4 mb-5 flex min-h-11 sticky top-0 z-20 items-stretch gap-0 border-b border-border bg-surface px-4 select-none sm:static sm:mx-0 sm:min-h-0 sm:px-0"
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
                className="min-h-11 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer sm:min-h-0 sm:py-2"
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

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        initialValues={eventInitialValues}
        onSaved={() => {
          setEventDrawerOpen(false)
          setReloadKey((current) => current + 1)
          router.refresh()
        }}
      />

      {opportunity && recruitmentDraftPositioning ? (
        <RecruitmentInitiationDialog
          open={Boolean(recruitmentDraftPositioning)}
          opportunity={opportunity}
          positioning={recruitmentDraftPositioning}
          onOpenChange={handleRecruitmentDialogOpenChange}
          onSubmit={handleRecruitmentInitiationSubmit}
        />
      ) : null}
    </AppDrawer>
  )
}
