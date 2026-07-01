import { useState, useEffect } from "react"
import { Select } from "@/components/ui/Select"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { CommunicationBrief, CommunicationOutput, CommunicationQaFlag } from "@/lib/n8n/types"
import {
  ClientSummaryFormState,
  CampaignFormState,
  ClientSummaryFormat,
} from "./intelligence-action-types"
import {
  buildClientSummaryPayload,
  buildCampaignPayload,
  getAnalysisAvailabilityLabel,
  getSectorAvailabilityLabel,
  getRoadmapAvailabilityLabel,
} from "./intelligence-action-utils"
import { buildDefaultBrief, CHANNEL_OPTIONS } from "./communication-brief-options"
import { CommunicationBriefForm } from "./CommunicationBriefForm"
import { CommunicationResult } from "./CommunicationResult"

type RunStatus = "idle" | "loading" | "done" | "error"

export function PitchMailDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company, contacts } = data
  const isMobile = variant === "mobile"
  const supabase = createClient()

  const [brief, setBrief] = useState<CommunicationBrief>(() => buildDefaultBrief(data, ""))

  const [runStatus, setRunStatus] = useState<RunStatus>("idle")
  const [runId, setRunId] = useState<string | null>(null)
  const [result, setResult] = useState<CommunicationOutput | null>(null)
  const [qaFlags, setQaFlags] = useState<CommunicationQaFlag[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Émetteur dérivé du profil connecté — § 4.2, seul le rôle reste modifiable en UI
  useEffect(() => {
    let cancelled = false
    async function loadSender() {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .single()
      if (!cancelled && profile?.full_name) {
        setBrief((b) => ({ ...b, who: { ...b.who, sender: { ...b.who.sender, name: profile.full_name as string } } }))
      }
    }
    void loadSender()
    return () => { cancelled = true }
  }, [supabase])

  // Abonnement Realtime : dès qu'on a un runId, on écoute le résultat
  useEffect(() => {
    if (!runId) return

    const channel = supabase
      .channel(`communication-result-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_intelligence_results",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; content_json: CommunicationOutput; qa_flags: CommunicationQaFlag[] }
          if (row.status === "succeeded") {
            setResult(row.content_json)
            setQaFlags(row.qa_flags || [])
            setRunStatus("done")
          } else if (row.status === "failed") {
            setErrorMsg("La génération a échoué. Vérifie les logs n8n et réessaie.")
            setRunStatus("error")
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setRunStatus("loading")
    setResult(null)
    setQaFlags([])
    setErrorMsg(null)

    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-020-communication",
          companyId: company.id,
          input: brief,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur réseau" }))
        throw new Error((err as { error?: string }).error ?? "Erreur réseau")
      }

      const { runId: newRunId } = await res.json() as { runId: string }
      setRunId(newRunId)
      // runStatus reste "loading" → Realtime le passera à "done" ou "error"
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue")
      setRunStatus("error")
    }
  }

  function handleReset() {
    setRunStatus("idle")
    setRunId(null)
    setResult(null)
    setQaFlags([])
    setErrorMsg(null)
  }

  const channelLabel = CHANNEL_OPTIONS.find((o) => o.value === brief.what.channel)?.label ?? brief.what.channel

  // ── Résultat généré ──────────────────────────────────────────────────────────
  if (runStatus === "done" && result) {
    return (
      <CommunicationResult
        result={result}
        qaFlags={qaFlags}
        companyId={company.id}
        companyName={company.name}
        channelLabel={channelLabel}
        brief={brief}
        isMobile={isMobile}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Rédaction assistée</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Préparer un message contextualisé à partir des données disponibles sur le compte.
        </p>
      </div>

      <CommunicationBriefForm
        brief={brief}
        onChange={setBrief}
        contacts={contacts}
        isMobile={isMobile}
      />

      <div className="rounded-lg border border-border bg-canvas/30 p-3 text-[11px] text-muted">
        Contexte automatique : compte, contacts, historique commercial, opportunités, missions et
        actualité sectorielle sont résolus par n8n au moment de la génération.
      </div>

      {/* Erreur */}
      {runStatus === "error" && errorMsg && (
        <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      {/* CTA */}
      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={runStatus === "loading"}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-colors",
            isMobile ? "min-h-[44px]" : "min-h-[36px]",
            runStatus === "loading"
              ? "border-primary/20 bg-primary/5 text-primary/50 cursor-wait"
              : "border-primary bg-primary text-primary-fg hover:bg-primary/90"
          )}
        >
          {runStatus === "loading" ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Génération en cours…
            </>
          ) : (
            "Générer le message"
          )}
        </button>
        {runStatus === "loading" && (
          <p className="text-[10px] text-muted text-center leading-normal">
            n8n travaille… le résultat apparaîtra automatiquement.
          </p>
        )}
      </div>
    </div>
  )
}

export function SummaryDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company, contacts, pitches, signals } = data

  const [form, setForm] = useState<ClientSummaryFormState>({
    format: "executive_brief",
    includeSectorAnalysis: true,
    includeSignals: true,
    includeContacts: true,
    includePitches: true,
    additionalInstructions: "",
  })

  // Payload préparé pour le branchement futur n8n
  buildClientSummaryPayload({ companyId: company.id, form, data })

  const isMobile = variant === "mobile"
  const selectCls = cn(
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
  )
  const textareaCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  const clientAvailability = getAnalysisAvailabilityLabel(data)
  const sectorAvailability = getSectorAvailabilityLabel(data)
  const roadmapAvailability = getRoadmapAvailabilityLabel(data)

  const clientTone = {
    success: "text-success",
    warning: "text-warning",
    neutral: "text-muted",
  }[clientAvailability.tone]

  const sectorTone = {
    success: "text-success",
    warning: "text-warning",
    neutral: "text-muted",
  }[sectorAvailability.tone]

  const roadmapTone = {
    success: "text-success",
    neutral: "text-muted",
  }[roadmapAvailability.tone]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Synthèse client</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Créer une fiche de synthèse consolidée à partir des analyses, signaux, contacts et éléments commerciaux.
        </p>
      </div>

      {/* Formulaire contrôlé */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Format de sortie</label>
          <Select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value as ClientSummaryFormat })}
            className={selectCls}
          >
            <option value="executive_brief">Brief exécutif</option>
            <option value="sales_sheet">Fiche commerciale</option>
            <option value="account_memo">Mémo compte</option>
          </Select>
        </div>

        <div>
          <span className={labelCls}>Sources à inclure</span>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeSectorAnalysis}
                onChange={(e) => setForm({ ...form, includeSectorAnalysis: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Analyse sectorielle</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeSignals}
                onChange={(e) => setForm({ ...form, includeSignals: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Signaux récents</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeContacts}
                onChange={(e) => setForm({ ...form, includeContacts: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Contacts clés</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.includePitches}
                onChange={(e) => setForm({ ...form, includePitches: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Pitchs existants</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Instructions complémentaires</label>
          <textarea
            value={form.additionalInstructions}
            onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
            placeholder="Ex : insiste sur les enjeux cloud, cybersécurité, staffing…"
            className={textareaCls}
          />
        </div>
      </div>

      {/* Sources détectées */}
      <div className="rounded-lg border border-border bg-canvas/30 p-4 space-y-3">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted border-b border-border/50 pb-1.5">
          Sources détectées
        </span>
        <ul className="space-y-2 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-muted">Analyse client :</span>
            <span className={cn("font-semibold", clientTone)}>{clientAvailability.label}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Analyse sectorielle :</span>
            <span className={cn("font-semibold", sectorTone)}>{sectorAvailability.label}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Signaux :</span>
            <span className="font-semibold text-heading">{signals.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Contacts :</span>
            <span className="font-semibold text-heading">{contacts.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Pitchs :</span>
            <span className="font-semibold text-heading">{pitches.length}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted">Roadmap :</span>
            <span className={cn("font-semibold", roadmapTone)}>
              {roadmapAvailability.label}
            </span>
          </li>
        </ul>
      </div>

      {/* CTA section */}
      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          disabled
          className={cn(
            "w-full inline-flex items-center justify-center rounded bg-primary/20 border border-primary/10 px-3 text-xs font-bold text-muted cursor-not-allowed opacity-60",
            isMobile ? "min-h-[44px]" : "min-h-[36px]"
          )}
        >
          Synthèse IA à connecter
        </button>
        <p className="text-[10px] text-muted text-center leading-normal">
          La génération sera exécutée par n8n pour éviter les timeouts Vercel.
        </p>
      </div>
    </div>
  )
}

export function CampaignDrawerContent({
  data,
  variant = "desktop",
}: {
  data: ClientIntelligenceData
  variant?: "desktop" | "mobile"
}) {
  const { company } = data

  const [form, setForm] = useState<CampaignFormState>({
    campaignName: `Campagne prospection - ${company.name}`,
    channels: {
      email: true,
      linkedin: true,
      phone: false,
    },
    additionalInstructions: "",
  })

  // Payload préparé pour le branchement n8n
  buildCampaignPayload({ companyId: company.id, form, data })

  const isMobile = variant === "mobile"
  const selectCls = cn(
    "w-full rounded border border-border bg-surface px-3 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50",
    isMobile ? "h-11" : "h-9"
  )
  const textareaCls = "w-full rounded border border-border bg-surface px-3 py-2 text-xs font-medium text-body focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[80px]"
  const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted mb-1"

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-base font-bold text-heading">Créer une campagne</h2>
        <p className="text-[11px] text-body mt-0.5 leading-relaxed">
          Configurer une campagne de prospection multi-canal ciblant le compte.
        </p>
      </div>

      {/* Formulaire contrôlé */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nom de la campagne</label>
          <input
            type="text"
            value={form.campaignName}
            onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
            className={selectCls}
          />
        </div>

        <div>
          <span className={labelCls}>Canaux de prospection</span>
          <div className="space-y-2 mt-2">
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.email}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, email: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Email</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.linkedin}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, linkedin: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>LinkedIn</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.channels.phone}
                onChange={(e) => setForm({ ...form, channels: { ...form.channels, phone: e.target.checked } })}
                className="rounded border-border text-primary focus:ring-primary/50"
              />
              <span>Téléphone</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Directives & consignes</label>
          <textarea
            value={form.additionalInstructions}
            onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
            placeholder="Ex : cible les profils achat et DSI, message personnalisé..."
            className={textareaCls}
          />
        </div>
      </div>

      {/* CTA section */}
      <div className="pt-4 border-t border-border space-y-2">
        <button
          type="button"
          disabled
          className={cn(
            "w-full inline-flex items-center justify-center rounded bg-primary/20 border border-primary/10 px-3 text-xs font-bold text-muted cursor-not-allowed opacity-60",
            isMobile ? "min-h-[44px]" : "min-h-[36px]"
          )}
        >
          Campagne IA à connecter
        </button>
        <p className="text-[10px] text-muted text-center leading-normal">
          La création de campagne sera orchestrée par n8n.
        </p>
      </div>
    </div>
  )
}
