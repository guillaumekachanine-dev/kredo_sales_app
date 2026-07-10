"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import {
  PitchMailDrawerContent,
  type PitchMailAccountContext,
} from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { createClient } from "@/lib/supabase/client"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  COMMUNICATION_COMPOSER_EVENT,
  type CommunicationComposerPreset,
  type CommunicationComposerRequest,
  type CommunicationComposerScope,
} from "@/lib/communication/communication-composer"

interface CompanyRecord {
  id: string
  name: string
  lifecycle_status: string
}

interface PersonRecord {
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
}

interface ContactRecord {
  id: string
  job_title: string | null
  relationship_role: string | null
  is_priority: boolean | null
  persons: PersonRecord | PersonRecord[] | null
}

interface ResolvedEntityContext {
  companyId?: string
  contactId?: string
  // ADR-0013 — résolution des entités sans compte pivot.
  collaboratorId?: string
  collaboratorName?: string
  collaboratorPractice?: string | null
  collaboratorTitle?: string | null
  sectorName?: string
  // Scope inféré du type d'entité primaire, quand le request ne le précise pas
  // explicitement (ex: primaryEntity.type === "collaborator" → scope "collaborator").
  inferredScope?: CommunicationComposerScope
  refs: NonNullable<CommunicationComposerPreset["refs"]>
}

type ComposerAccountContext = PitchMailAccountContext & {
  communicationPreset?: CommunicationComposerPreset
  scope: CommunicationComposerScope
}

const MAIL_DRAWER_CHROME_CLASS = "intelligence-drawer text-body border-l border-border/40"
const MAIL_DRAWER_HEADER_CLASS = "intelligence-drawer border-b border-border/40 [&_h2]:text-primary [&_p]:text-muted"
const MAIL_DRAWER_CONTENT_CLASS = "intelligence-drawer [--drawer-header-fade-start:rgba(10,13,26,0.95)] [--drawer-header-fade-end:rgba(10,13,26,0)]"

function enrichFromActiveIntelligenceContext(
  request: CommunicationComposerRequest,
): CommunicationComposerRequest {
  if (request.companyId || request.companyName || request.primaryEntity || request.contactId) {
    return request
  }

  const { entityContext, panelData } = useIntelligenceContext.getState()
  if (!entityContext) return request

  if (entityContext.entityType === "company") {
    return {
      ...request,
      companyId: panelData?.company.id ?? entityContext.entityId,
      companyName: panelData?.company.name ?? entityContext.label,
    }
  }

  return {
    ...request,
    contactId: entityContext.entityType === "contact" ? entityContext.entityId : request.contactId,
    primaryEntity: {
      type: entityContext.entityType,
      id: entityContext.entityId,
    },
  }
}

function mapContacts(rows: ContactRecord[]): ClientIntelligenceContact[] {
  return rows.map((row) => {
    const person = Array.isArray(row.persons) ? row.persons[0] : row.persons
    const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()

    return {
      id: row.id,
      fullName: person?.full_name || fallbackName || "Contact sans nom",
      jobTitle: row.job_title,
      relationshipRole: row.relationship_role,
      email: person?.primary_email ?? null,
    }
  })
}

function mergePreset(
  request: CommunicationComposerRequest,
  inferred: ResolvedEntityContext,
): CommunicationComposerPreset {
  return {
    ...request.preset,
    contactId: request.contactId ?? request.preset?.contactId ?? inferred.contactId,
    refs: {
      ...inferred.refs,
      ...(request.preset?.refs ?? {}),
    },
  }
}

function ComposerAccountSelector({
  value,
  onChange,
  error,
}: {
  value: AccountValue | null
  onChange: (value: AccountValue | null) => void
  error: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-medium)] border border-primary-fg/15 bg-primary-fg/[0.07] p-4">
        <p className="text-sm font-semibold text-primary-fg">Sélectionne le compte concerné</p>
        <div className="mt-3">
          <AccountCombobox
            value={value}
            onChange={onChange}
            allowCreate={false}
            openOnFocus
            minSearchLength={0}
            searchLimit={16}
            className="border-primary-fg/25 bg-primary-fg text-heading placeholder:text-muted focus:border-primary-fg/60"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-medium)] border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-primary-fg">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function ComposerContent({
  context,
  scope,
  selectedAccount,
  onAccountChange,
  error,
  variant,
  instanceKey,
}: {
  context: ComposerAccountContext | null
  scope: CommunicationComposerScope
  selectedAccount: AccountValue | null
  onAccountChange: (value: AccountValue | null) => void
  error: string | null
  variant: "desktop" | "mobile"
  instanceKey: number
}) {
  if (!context) {
    // ADR-0013 — le sélecteur de compte n'a de sens que pour le scope "account" :
    // pour "collaborator"/"internal", rien à faire choisir manuellement, on
    // affiche l'erreur factuelle de résolution telle quelle.
    if (scope !== "account") {
      return (
        <div className="rounded-[var(--radius-medium)] border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-primary-fg">
          {error ?? "Aucune entité n'a pu être résolue pour cette action."}
        </div>
      )
    }
    return (
      <ComposerAccountSelector
        value={selectedAccount}
        onChange={onAccountChange}
        error={error}
      />
    )
  }

  const content = (
    <PitchMailDrawerContent
      key={`${instanceKey}:${context.company?.id ?? context.collaborator?.id ?? "internal"}:${context.communicationPreset?.contactId ?? "none"}`}
      data={context}
      variant={variant}
    />
  )

  if (variant === "mobile") {
    return (
      <div className="rounded-[var(--radius-medium)] border border-border/30 bg-surface/30 p-4">
        {content}
      </div>
    )
  }

  return <div className="communication-composer-panel">{content}</div>
}

function DesktopCommunicationDrawer({
  open,
  onOpenChange,
  loading,
  context,
  scope,
  selectedAccount,
  onAccountChange,
  error,
  instanceKey,
}: DrawerVariantProps) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Rédiger un email"
      eyebrow="Assistance IA contextuelle"
      subtitle={context?.company?.name ?? context?.collaborator?.name}
      width="default"
      loading={loading}
      className={MAIL_DRAWER_CHROME_CLASS}
      headerClassName={MAIL_DRAWER_HEADER_CLASS}
      contentClassName={MAIL_DRAWER_CONTENT_CLASS}
    >
      <ComposerContent
        context={context}
        scope={scope}
        selectedAccount={selectedAccount}
        onAccountChange={onAccountChange}
        error={error}
        variant="desktop"
        instanceKey={instanceKey}
      />
    </AppDrawer>
  )
}

function MobileCommunicationDrawer({
  open,
  onOpenChange,
  loading,
  context,
  scope,
  selectedAccount,
  onAccountChange,
  error,
  instanceKey,
}: DrawerVariantProps) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Rédiger un email"
      eyebrow="Assistant IA"
      subtitle={context?.company?.name ?? context?.collaborator?.name}
      side="bottom"
      loading={loading}
      showMobileCloseButton
      className={`h-[92vh] max-h-[92vh] ${MAIL_DRAWER_CHROME_CLASS}`}
      headerClassName={MAIL_DRAWER_HEADER_CLASS}
      contentClassName={`${MAIL_DRAWER_CONTENT_CLASS} px-4`}
    >
      <ComposerContent
        context={context}
        scope={scope}
        selectedAccount={selectedAccount}
        onAccountChange={onAccountChange}
        error={error}
        variant="mobile"
        instanceKey={instanceKey}
      />
    </AppDrawer>
  )
}

interface DrawerVariantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  context: ComposerAccountContext | null
  scope: CommunicationComposerScope
  selectedAccount: AccountValue | null
  onAccountChange: (value: AccountValue | null) => void
  error: string | null
  instanceKey: number
}

export function CommunicationComposerHost({ device }: { device: DashboardDevice }) {
  const supabase = useMemo(() => createClient(), [])
  const loadSequence = useRef(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState<CommunicationComposerRequest>({ origin: "global" })
  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(null)
  const [context, setContext] = useState<ComposerAccountContext | null>(null)
  const [instanceKey, setInstanceKey] = useState(0)

  const resolvePrimaryEntity = useCallback(async (
    currentRequest: CommunicationComposerRequest,
  ): Promise<ResolvedEntityContext> => {
    const entity = currentRequest.primaryEntity
    if (!entity) return { refs: {} }

    switch (entity.type) {
      case "company":
        return { companyId: entity.id, refs: {} }
      case "contact": {
        const { data } = await supabase
          .from("contacts")
          .select("id, company_id")
          .eq("id", entity.id)
          .maybeSingle()
        return {
          companyId: data?.company_id ?? undefined,
          contactId: data?.id ?? entity.id,
          refs: {},
        }
      }
      case "opportunity": {
        const { data } = await supabase
          .from("opportunities")
          .select("company_id")
          .eq("id", entity.id)
          .maybeSingle()
        return {
          companyId: data?.company_id ?? undefined,
          refs: { opportunityRef: entity.id },
        }
      }
      case "mission": {
        const { data } = await supabase
          .from("missions")
          .select("company_id")
          .eq("id", entity.id)
          .maybeSingle()
        return {
          companyId: data?.company_id ?? undefined,
          refs: { missionRef: entity.id },
        }
      }
      case "project": {
        const { data } = await supabase
          .from("projects")
          .select("company_id")
          .eq("id", entity.id)
          .maybeSingle()
        return { companyId: data?.company_id ?? undefined, refs: {} }
      }
      case "calendar_event": {
        const { data } = await supabase
          .from("calendar_events")
          .select("company_id, contact_id, opportunity_id, mission_id")
          .eq("id", entity.id)
          .maybeSingle()
        return {
          companyId: data?.company_id ?? undefined,
          contactId: data?.contact_id ?? undefined,
          refs: {
            ...(data?.opportunity_id ? { opportunityRef: data.opportunity_id } : {}),
            ...(data?.mission_id ? { missionRef: data.mission_id } : {}),
          },
        }
      }
      // ADR-0013 Lot 0 — candidat : rattaché à un compte via son dernier
      // positionnement (opportunity_candidates), sinon scope interne (recrutement
      // pur, pas encore de client identifié).
      case "candidate": {
        const { data: positioning } = await supabase
          .from("opportunity_candidates")
          .select("opportunity_id, opportunities(company_id)")
          .eq("candidate_id", entity.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const opportunity = positioning?.opportunities
          ? (Array.isArray(positioning.opportunities) ? positioning.opportunities[0] : positioning.opportunities)
          : null

        return {
          companyId: opportunity?.company_id ?? undefined,
          inferredScope: opportunity?.company_id ? "account" : "internal",
          refs: {
            ...(positioning?.opportunity_id ? { opportunityRef: positioning.opportunity_id } : {}),
            profileRef: entity.id,
          },
        }
      }
      // ADR-0013 Lot 0 — collaborateur : scope dédié, aucun compte requis (1:1,
      // recadrage, sortie d'intercontrat, business review...).
      case "collaborator": {
        const { data } = await supabase
          .from("collaborators")
          .select("id, practice, current_title, persons(full_name)")
          .eq("id", entity.id)
          .maybeSingle()
        const person = data?.persons
          ? (Array.isArray(data.persons) ? data.persons[0] : data.persons)
          : null
        return {
          collaboratorId: data?.id ?? entity.id,
          collaboratorName: person?.full_name ?? undefined,
          collaboratorPractice: data?.practice ?? null,
          collaboratorTitle: data?.current_title ?? null,
          inferredScope: "collaborator",
          refs: {},
        }
      }
      // ADR-0013 Lot 0 — secteur : contexte sectoriel pur, jamais de compte.
      // Reste en scope "account" (catégorie commerciale) mais companyId null —
      // le nom du secteur est injecté en mustInclude par hydrate().
      case "sector": {
        const { data } = await supabase
          .from("sector_intelligence")
          .select("id, name")
          .eq("id", entity.id)
          .maybeSingle()
        return {
          sectorName: data?.name ?? undefined,
          inferredScope: "account",
          refs: {},
        }
      }
      default:
        return { refs: {} }
    }
  }, [supabase])

  const hydrate = useCallback(async (rawRequest: CommunicationComposerRequest) => {
    const sequence = ++loadSequence.current
    const currentRequest = enrichFromActiveIntelligenceContext(rawRequest)
    setRequest(currentRequest)
    setLoading(true)
    setError(null)
    setContext(null)

    try {
      const inferred = await resolvePrimaryEntity(currentRequest)
      // ADR-0013 — scope explicite du request, sinon inféré du type d'entité
      // primaire (ex: primaryEntity.type === "collaborator"), sinon "account"
      // (comportement historique, rétro-compatible avec tous les call-sites existants).
      const scope: CommunicationComposerScope = currentRequest.scope ?? inferred.inferredScope ?? "account"

      // ── Scope "collaborator" — aucun compte requis, contexte = collaborateur ──
      if (scope === "collaborator") {
        const collaboratorId = currentRequest.collaboratorId ?? inferred.collaboratorId
        if (!collaboratorId) {
          if (sequence !== loadSequence.current) return
          setError("Aucun collaborateur n'a pu être résolu pour cette action.")
          return
        }

        let collaboratorName = inferred.collaboratorName
        let collaboratorPractice = inferred.collaboratorPractice ?? null
        let collaboratorTitle = inferred.collaboratorTitle ?? null
        let collaboratorSeniority: string | null = null
        let collaboratorEmploymentStatus: string | null = null

        // ADR-0013 Lot 3 — collaboratorId peut être passé directement (sans
        // primaryEntity) : toujours re-résoudre en direct plutôt que de
        // dépendre uniquement de resolvePrimaryEntity, pour disposer des
        // champs supplémentaires (seniority/employment_status) qui alimentent
        // le mustInclude ci-dessous. Aucune RPC dédiée en Lot 3 (scope
        // volontairement limité) — ces faits directs suffisent à ancrer les
        // prompts management sans halluciner.
        const { data: collaboratorRow } = await supabase
          .from("collaborators")
          .select("id, practice, current_title, seniority, employment_status, persons(full_name)")
          .eq("id", collaboratorId)
          .maybeSingle()
        if (collaboratorRow) {
          const person = collaboratorRow.persons
            ? (Array.isArray(collaboratorRow.persons) ? collaboratorRow.persons[0] : collaboratorRow.persons)
            : null
          collaboratorName = person?.full_name ?? collaboratorName
          collaboratorPractice = collaboratorRow.practice ?? collaboratorPractice
          collaboratorTitle = collaboratorRow.current_title ?? collaboratorTitle
          collaboratorSeniority = collaboratorRow.seniority ?? null
          collaboratorEmploymentStatus = collaboratorRow.employment_status ?? null
        }

        if (sequence !== loadSequence.current) return

        if (!collaboratorName) {
          setError("Le collaborateur sélectionné n'a pas pu être résolu.")
          return
        }

        const preset = mergePreset(currentRequest, inferred)
        const collaboratorMustInclude = `[COLLABORATEUR_CONTEXT]
Nom : ${collaboratorName}
Poste : ${collaboratorTitle || "Non renseigné"}
Practice : ${collaboratorPractice || "Non renseignée"}
Séniorité : ${collaboratorSeniority || "Non renseignée"}
Statut : ${collaboratorEmploymentStatus || "Non renseigné"}

Le message généré doit s'appuyer sur ces informations réelles, sans inventer de détail supplémentaire sur ce collaborateur.`
        preset.mustInclude = [collaboratorMustInclude, preset.mustInclude].filter(Boolean).join("\n\n")

        setContext({
          scope,
          company: null,
          collaborator: {
            id: collaboratorId,
            name: collaboratorName,
            practice: collaboratorPractice,
            currentTitle: collaboratorTitle,
          },
          contacts: [],
          communicationPreset: preset,
        })
        setInstanceKey((key) => key + 1)
        return
      }

      // ── Scope "internal" — aucune entité requise, contexte porté par le prompt ──
      if (scope === "internal") {
        setContext({
          scope,
          company: null,
          collaborator: null,
          contacts: [],
          communicationPreset: mergePreset(currentRequest, inferred),
        })
        setInstanceKey((key) => key + 1)
        return
      }

      // ── Scope "account" (défaut) — comportement historique ──
      let companyId = currentRequest.companyId ?? inferred.companyId
      let company: CompanyRecord | null = null

      const signalRef = currentRequest.preset?.refs?.signalRef
      let signalMustInclude = ""
      let signalPractice: string | undefined = undefined

      if (signalRef) {
        const { data: signalRow } = await supabase
          .from("account_signals")
          .select(`
            id,
            title,
            summary,
            recommended_action,
            recommended_practice_id,
            intelligence_sources(id, source_name, source_url),
            offer_practices(id, name)
          `)
          .eq("id", signalRef)
          .maybeSingle()

        if (signalRow) {
          const source = signalRow.intelligence_sources
            ? Array.isArray(signalRow.intelligence_sources)
              ? signalRow.intelligence_sources[0]
              : signalRow.intelligence_sources
            : null

          const practice = signalRow.offer_practices
            ? Array.isArray(signalRow.offer_practices)
              ? signalRow.offer_practices[0]
              : signalRow.offer_practices
            : null

          signalPractice = practice?.name || undefined

          signalMustInclude = `[SIGNAL_CONTEXT]
Titre du signal : ${signalRow.title}
Résumé : ${signalRow.summary || "Non renseigné"}
Source principale : ${source?.source_name || "Non spécifiée"}${source?.source_url ? ` (${source.source_url})` : ""}
Action recommandée : ${signalRow.recommended_action || "Non spécifiée"}
Practice recommandée : ${practice?.name || "Non spécifiée"}

Le message généré DOIT obligatoirement s'appuyer sur ce signal de veille.`
        }
      }

      if (companyId) {
        const { data, error: companyError } = await supabase
          .from("companies")
          .select("id, name, lifecycle_status")
          .eq("id", companyId)
          .maybeSingle()
        if (companyError) throw companyError
        company = data
      } else if (currentRequest.companyName) {
        const { data, error: companyError } = await supabase
          .from("companies")
          .select("id, name, lifecycle_status")
          .ilike("name", currentRequest.companyName)
          .limit(1)
          .maybeSingle()
        if (companyError) throw companyError
        company = data
        companyId = data?.id
      }

      if (sequence !== loadSequence.current) return

      if (!company || !companyId) {
        // ADR-0013 — secteur pur (companyId volontairement absent) : pas de
        // forçage du sélecteur de compte, le contexte sectoriel est injecté en
        // mustInclude et le drawer s'ouvre directement.
        if (inferred.sectorName) {
          const preset = mergePreset(currentRequest, inferred)
          const sectorMustInclude = `[SECTEUR_CONTEXT]\nSecteur : ${inferred.sectorName}\n\nAncre le message/pitch sur ce secteur, sans supposer de compte précis.`
          preset.mustInclude = [sectorMustInclude, preset.mustInclude].filter(Boolean).join("\n\n")

          setContext({
            scope,
            company: null,
            collaborator: null,
            contacts: [],
            communicationPreset: preset,
          })
          setInstanceKey((key) => key + 1)
          return
        }

        setSelectedAccount(null)
        setError(
          currentRequest.companyName
            ? `Le compte « ${currentRequest.companyName} » n’a pas été résolu automatiquement. Sélectionne-le dans le CRM.`
            : null,
        )
        return
      }

      const { data: contactRows, error: contactsError } = await supabase
        .from("contacts")
        .select("id, job_title, relationship_role, is_priority, persons(full_name, first_name, last_name, primary_email)")
        .eq("company_id", companyId)
        .order("is_priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100)

      if (contactsError) throw contactsError
      if (sequence !== loadSequence.current) return

      const contacts = mapContacts((contactRows ?? []) as unknown as ContactRecord[])
      const preset = mergePreset(currentRequest, inferred)
      if (signalMustInclude) {
        preset.mustInclude = [signalMustInclude, preset.mustInclude].filter(Boolean).join("\n\n")
      }
      if (signalPractice) {
        preset.practice = signalPractice
      }

      setSelectedAccount({ id: company.id, name: company.name, isNew: false })
      setContext({
        scope,
        company: {
          id: company.id,
          name: company.name,
          lifecycleStatus: company.lifecycle_status,
        },
        collaborator: null,
        contacts,
        communicationPreset: preset,
      })
      setInstanceKey((key) => key + 1)
    } catch (caught) {
      if (sequence !== loadSequence.current) return
      setError(caught instanceof Error ? caught.message : "Impossible de charger le contexte de rédaction.")
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [resolvePrimaryEntity, supabase])

  useEffect(() => {
    function handleOpen(event: Event) {
      const customEvent = event as CustomEvent<CommunicationComposerRequest>
      const nextRequest = customEvent.detail ?? { origin: "global" }
      setOpen(true)
      setSelectedAccount(null)
      void hydrate(nextRequest)
    }

    window.addEventListener(COMMUNICATION_COMPOSER_EVENT, handleOpen)
    return () => window.removeEventListener(COMMUNICATION_COMPOSER_EVENT, handleOpen)
  }, [hydrate])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      loadSequence.current += 1
      setLoading(false)
      setError(null)
      setContext(null)
      setSelectedAccount(null)
      setRequest({ origin: "global" })
    }
  }

  function handleAccountChange(value: AccountValue | null) {
    setSelectedAccount(value)
    if (!value) return

    if (!value.id || value.isNew) {
      setError("La rédaction assistée nécessite un compte CRM existant.")
      return
    }

    void hydrate({
      ...request,
      companyId: value.id,
      companyName: value.name,
      primaryEntity: null,
    })
  }

  const drawerProps: DrawerVariantProps = {
    open,
    onOpenChange: handleOpenChange,
    loading,
    context,
    scope: context?.scope ?? request.scope ?? "account",
    selectedAccount,
    onAccountChange: handleAccountChange,
    error,
    instanceKey,
  }

  return device === "mobile" ? (
    <MobileCommunicationDrawer {...drawerProps} />
  ) : (
    <DesktopCommunicationDrawer {...drawerProps} />
  )
}
