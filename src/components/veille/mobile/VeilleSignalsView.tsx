"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { AccountSignalDetailDrawer } from "@/components/accounts-contacts/intelligence/AccountSignalDetailDrawer"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { WatchedAccountSignal } from "@/app/(app)/veille/_data/veille-data"
import { IconChevronRight } from "./icons"
import {
  SIGNAL_MARKER_LABELS,
  buildSignalGroups,
  formatProducedDate,
  formatSignalAge,
  resolveSignalMarker,
  type SignalGroupVM,
  type SignalMarker,
} from "./veille-mobile-view-models"

type VeilleSignalsViewProps = {
  signals: WatchedAccountSignal[]
  companies?: Array<{ id: string; name: string }>
  onDismissSignal: (signalId: string) => void
  onFeedback?: (message: string) => void
}

function formatSourceAge(
  sourceName: string | null | undefined,
  detectedAt: string | null | undefined,
): string {
  const source = sourceName?.trim() || "Actualité"
  const age = formatSignalAge(detectedAt)
  if (!age) return source
  const compactAge = age.replace(" ", "")
  return `${source} - ${compactAge}`
}

export function VeilleSignalsView({
  signals,
  companies,
  onDismissSignal,
  onFeedback,
}: VeilleSignalsViewProps) {
  const groups = useMemo(() => buildSignalGroups(signals), [signals])

  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [detailSignal, setDetailSignal] = useState<WatchedAccountSignal | null>(null)
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false)
  const groupTriggerRef = useRef<HTMLButtonElement | null>(null)

  const openGroup = useMemo(
    () => groups.find((group) => group.companyId === openGroupId) ?? null,
    [groups, openGroupId],
  )

  const closeGroup = () => {
    setOpenGroupId(null)
    window.requestAnimationFrame(() => groupTriggerRef.current?.focus())
  }

  const openDetail = (signal: WatchedAccountSignal, fromGroupId: string) => {
    setReturnGroupId(fromGroupId)
    setOpenGroupId(null)
    setDetailSignal(signal)
  }

  const closeDetail = () => {
    setDetailSignal(null)
    if (returnGroupId) {
      setOpenGroupId(returnGroupId)
      setReturnGroupId(null)
    }
  }

  return (
    <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <h2 className="font-heading text-[22px] font-bold leading-7 text-heading">
          Signaux & actualités
        </h2>
        <button
          type="button"
          onClick={() => setIsConfigureModalOpen(true)}
          title="Paramétrer une nouvelle veille de compte"
          aria-label="Paramétrer une nouvelle veille de compte"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-fg shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heading"
        >
          +
        </button>
      </header>

      {groups.length === 0 ? (
        <p className="px-8 py-16 text-center text-sm text-muted">
          Aucun signal de compte surveillé pour le moment.
        </p>
      ) : (
        <>
          <ul aria-label={`${groups.length} comptes surveillés`}>
            {groups.map((group) => (
              <li key={group.companyId} className="border-b border-border">
                <button
                  type="button"
                  onClick={(event) => {
                    groupTriggerRef.current = event.currentTarget
                    setOpenGroupId(group.companyId)
                  }}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                >
                  <span className="mt-0.5 shrink-0">
                    <CompanyLogo
                      name={group.companyName}
                      logoPath={group.logoPath}
                      website={group.website}
                      size="lg"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[17px] font-bold leading-6 text-heading">
                        {group.companyName}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-primary">
                        {group.signals.length} {group.signals.length > 1 ? "signaux" : "signal"}
                      </span>
                    </span>

                    {group.marker ? <SignalMarkerBadge marker={group.marker} /> : null}

                    <span className="mt-1.5 block text-sm leading-5 text-body">{group.primary.title}</span>

                    <span className="mt-1.5 block text-xs text-muted">
                      {formatSourceAge(
                        group.primary.primarySource?.source_name,
                        group.primary.detectedAt,
                      )}
                    </span>
                  </span>

                  <span className="mt-1 shrink-0 text-heading">
                    <IconChevronRight className="size-5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="px-4 py-4 text-xs text-muted">Tri : urgence, score global, puis fraîcheur</p>
        </>
      )}

      <AppDrawer
        open={openGroup !== null}
        onOpenChange={(next) => (next ? undefined : closeGroup())}
        side="bottom"
        title={openGroup?.companyName ?? "Signaux"}
      >
        {openGroup ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-[22px] font-bold leading-7 text-heading truncate">
                  {openGroup.companyName}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {openGroup.signals.length > 1
                    ? `${openGroup.signals.length} signaux détectés`
                    : "1 signal détecté"}
                  {" · mis à jour le "}
                  {formatProducedDate(new Date().toISOString())}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onFeedback) {
                    onFeedback(`Signaux de ${openGroup.companyName} mis à jour.`)
                  }
                }}
                className="shrink-0 inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heading"
              >
                Mettre à jour
              </button>
            </div>
            <GroupSignalList group={openGroup} onSelect={openDetail} />
          </div>
        ) : null}
      </AppDrawer>

      <ConfigureAccountWatchModal
        open={isConfigureModalOpen}
        onOpenChange={setIsConfigureModalOpen}
        companies={companies}
        onSuccess={(companyName) => {
          if (onFeedback) {
            onFeedback(`Veille configurée et activée pour ${companyName}.`)
          }
        }}
      />

      {detailSignal ? (
        <AccountSignalDetailDrawer
          open
          onOpenChange={(next) => (next ? undefined : closeDetail())}
          signal={{
            id: detailSignal.id,
            category: detailSignal.category,
            type: detailSignal.type,
            title: detailSignal.title,
            summary: detailSignal.summary,
            detectedAt: detailSignal.detectedAt,
            expiresAt: null,
            // La veille de compte ne porte ni date de parution ni score
            // d'intérêt dédié : même repli que pour les signaux manuels.
            publishedAt: null,
            globalScore: detailSignal.globalScore,
            interestScore: detailSignal.globalScore,
            urgencyScore: detailSignal.urgencyScore,
            confidenceScore: detailSignal.confidenceScore,
            status: detailSignal.status,
            primarySourceId: detailSignal.primarySource?.id ?? null,
            recommendedAction: detailSignal.recommendedAction,
            recommendedPracticeId: detailSignal.recommendedPracticeId,
            primarySource: detailSignal.primarySource,
          }}
          companyId={detailSignal.company.id}
          companyName={detailSignal.company.name}
          onDismiss={(signalId) => {
            setReturnGroupId(null)
            onDismissSignal(signalId)
          }}
        />
      ) : null}
    </div>
  )
}

function GroupSignalList({
  group,
  onSelect,
}: {
  group: SignalGroupVM
  onSelect: (signal: WatchedAccountSignal, fromGroupId: string) => void
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {group.signals.map((signal) => {
        const marker = resolveSignalMarker(signal)
        const age = formatSignalAge(signal.detectedAt)
        return (
          <li key={signal.id}>
            <button
              type="button"
              onClick={() => onSelect(signal, group.companyId)}
              className="flex min-h-16 w-full items-start gap-3 px-1 py-3 text-left outline-none hover:bg-surface-hover/60 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                {marker ? <SignalMarkerBadge marker={marker} /> : null}
                <span className="block text-sm font-semibold leading-5 text-heading">{signal.title}</span>
                {age ? <span className="mt-1 block text-xs text-muted">{age}</span> : null}
              </span>
              <span className="mt-1 shrink-0 text-heading">
                <IconChevronRight className="size-5" />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SignalMarkerBadge({ marker }: { marker: Exclude<SignalMarker, null> }) {
  return (
    <span className="mt-1 flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          marker === "action" ? "bg-brand-brass" : "bg-primary",
        )}
      />
      <span
        className={cn(
          "text-sm font-semibold",
          marker === "action" ? "text-brand-brass" : "text-primary",
        )}
      >
        {SIGNAL_MARKER_LABELS[marker]}
      </span>
    </span>
  )
}

function ConfigureAccountWatchModal({
  open,
  onOpenChange,
  companies,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies?: Array<{ id: string; name: string }>
  onSuccess: (companyName: string) => void
}) {
  const [companyList, setCompanyList] = useState<Array<{ id: string; name: string }>>(companies ?? [])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [frequency, setFrequency] = useState("hebdomadaire")
  const [sensitivity, setSensitivity] = useState("normale")
  const [keywords, setKeywords] = useState("")

  const [scopes, setScopes] = useState({
    ma: true,
    nominations: true,
    tenders: true,
    finance: true,
    product: true,
  })

  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompanyList(companies)
      if (!selectedCompanyId) setSelectedCompanyId(companies[0].id)
      return
    }
    if (!open) return
    const supabase = createClient()
    void supabase
      .from("companies")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCompanyList(data)
          setSelectedCompanyId(data[0].id)
        }
      })
  }, [open, companies, selectedCompanyId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedCompany = companyList.find((c) => c.id === selectedCompanyId)
    const companyName = selectedCompany?.name || "Compte"
    onSuccess(companyName)
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paramétrer une nouvelle veille de compte"
      description="Établissez le périmètre et les modalités de surveillance d'un compte CRM."
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-body">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Compte à surveiller</label>
          <Select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            required
            fullWidth
          >
            <option value="">-- Sélectionner un compte CRM --</option>
            {companyList.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Périmètre de surveillance</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5">
              <input
                type="checkbox"
                checked={scopes.ma}
                onChange={(e) => setScopes((s) => ({ ...s, ma: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Signaux M&A & Stratégie</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5">
              <input
                type="checkbox"
                checked={scopes.nominations}
                onChange={(e) => setScopes((s) => ({ ...s, nominations: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Nominations & Dirigeants</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5">
              <input
                type="checkbox"
                checked={scopes.tenders}
                onChange={(e) => setScopes((s) => ({ ...s, tenders: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Appels d'offres & Projets</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5">
              <input
                type="checkbox"
                checked={scopes.finance}
                onChange={(e) => setScopes((s) => ({ ...s, finance: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Finances & Levées</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Fréquence d'alerte</label>
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} fullWidth>
              <option value="hebdomadaire">Hebdomadaire (Briefing lundi)</option>
              <option value="temps_reel">Temps réel (Signal à chaud)</option>
              <option value="mensuel">Mensuel (Bilan stratégique)</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Sensibilité</label>
            <Select value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} fullWidth>
              <option value="normale">Normale (Signaux qualifiés)</option>
              <option value="haute">Haute (Signaux d'action urgente)</option>
              <option value="exhaustive">Exhaustive (Flux complet)</option>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Mots-clés / Enjeux prioritaires (optionnel)</label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. Cloud, IA, Cybersécurité, SAP..."
            fullWidth
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" variant="brass">
            Activer la veille du compte
          </Button>
        </div>
      </form>
    </AppDialog>
  )
}
