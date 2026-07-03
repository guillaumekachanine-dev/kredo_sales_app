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
  refs: NonNullable<CommunicationComposerPreset["refs"]>
}

type ComposerAccountContext = PitchMailAccountContext & {
  communicationPreset?: CommunicationComposerPreset
}

const MAIL_DRAWER_CHROME_CLASS = "bg-primary-deep text-primary-fg"
const MAIL_DRAWER_HEADER_CLASS = "bg-primary-deep [&_h2]:text-primary-fg [&_p]:text-primary-fg/65"
const MAIL_DRAWER_CONTENT_CLASS = "bg-primary-deep [--drawer-header-fade-start:rgba(30,69,150,0.95)] [--drawer-header-fade-end:rgba(30,69,150,0)]"

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
  selectedAccount,
  onAccountChange,
  error,
  variant,
  instanceKey,
}: {
  context: ComposerAccountContext | null
  selectedAccount: AccountValue | null
  onAccountChange: (value: AccountValue | null) => void
  error: string | null
  variant: "desktop" | "mobile"
  instanceKey: number
}) {
  if (!context) {
    return (
      <ComposerAccountSelector
        value={selectedAccount}
        onChange={onAccountChange}
        error={error}
      />
    )
  }

  return (
    <div data-theme="cockpit" className="rounded-[var(--radius-medium)] border border-border bg-surface p-4">
      <PitchMailDrawerContent
        key={`${instanceKey}:${context.company.id}:${context.communicationPreset?.contactId ?? "none"}`}
        data={context}
        variant={variant}
      />
    </div>
  )
}

function DesktopCommunicationDrawer({
  open,
  onOpenChange,
  loading,
  context,
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
      subtitle={context?.company.name}
      width="default"
      loading={loading}
      className={MAIL_DRAWER_CHROME_CLASS}
      headerClassName={MAIL_DRAWER_HEADER_CLASS}
      contentClassName={MAIL_DRAWER_CONTENT_CLASS}
    >
      <ComposerContent
        context={context}
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
      subtitle={context?.company.name}
      side="bottom"
      loading={loading}
      showMobileCloseButton
      className={`h-[92vh] max-h-[92vh] ${MAIL_DRAWER_CHROME_CLASS}`}
      headerClassName={MAIL_DRAWER_HEADER_CLASS}
      contentClassName={`${MAIL_DRAWER_CONTENT_CLASS} px-4`}
    >
      <ComposerContent
        context={context}
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
      let companyId = currentRequest.companyId ?? inferred.companyId
      let company: CompanyRecord | null = null

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

      setSelectedAccount({ id: company.id, name: company.name, isNew: false })
      setContext({
        company: {
          id: company.id,
          name: company.name,
          lifecycleStatus: company.lifecycle_status,
        },
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
