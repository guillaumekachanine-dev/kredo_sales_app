import { useState } from "react"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { WorkflowExecutionConfirmDialog } from "@/components/ui/WorkflowExecutionConfirmDialog"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { CompanyDocumentsModal } from "@/components/accounts-contacts/intelligence/CompanyDocumentsModal"
import { SummaryDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { openReportGeneration } from "@/lib/reports/report-generation"
import { triggerN8nWorkflow } from "@/lib/n8n/trigger-client"
import { returnToAccountCockpit } from "@/lib/intelligence/cockpit-navigation"
import { cn } from "@/lib/utils"

type HubSection = "summaries" | "reports" | "analyses"
type HubAction = "consult" | "generate"

type CompanyContext = {
  id: string
  name: string
  lifecycleStatus: string
  sectorId: string | null
}

const SECTIONS: Array<{
  id: HubSection
  title: string
  icon: string
  accent: string
}> = [
  { id: "summaries", title: "Fiches de synthèse", icon: "/icons_set/cockpit_intelligence/recommandations_ai.png", accent: "border-primary/25 bg-primary/5" },
  { id: "reports", title: "Rapports", icon: "/icons_set/cockpit_intelligence/generer_rapport.png", accent: "border-brand-brass/35 bg-brand-brass/5" },
  { id: "analyses", title: "Analyse", icon: "/icons_set/cockpit_intelligence/analyse_sectorielle.png", accent: "border-success/25 bg-success/5" },
]

const ACCOUNT_SUMMARY_AXES = [
  "Activité commerciale",
  "Activité recrutement",
  "Besoins traités",
  "Opportunités identifiées",
  "Pipe pondéré et CA réalisé",
  "Matrice des profils et des projets",
]

const INTELLIGENCE_SUMMARY_AXES = [
  "Fiche d’identité",
  "Métiers et chaîne de valeur",
  "Concurrents",
  "Tendances et positionnement marché",
  "Enjeux",
  "Échéances",
]

const ANALYSIS_TYPES = [
  { id: "news", label: "Analyse de l’actualité", detail: "Signaux et enseignements captés par la veille." },
  { id: "sector", label: "Analyse des tendances sectorielles", detail: "Dynamiques du secteur et impacts possibles pour le compte." },
  { id: "issues", label: "Analyse des enjeux du compte", detail: "Cartographie structurée des enjeux et priorités." },
] as const

function ActionGlyph({ action }: { action: HubAction }) {
  return action === "consult" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.8 12s3.3-6 9.2-6 9.2 6 9.2 6-3.3 6-9.2 6-9.2-6-9.2-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0-12 4 4m-4-4L8 7M5 14v5h14v-5" />
    </svg>
  )
}

function SectionCard({ section, onAction }: {
  section: (typeof SECTIONS)[number]
  onAction: (action: HubAction) => void
}) {
  return (
    <section className={cn("rounded-[var(--radius-medium)] border p-3.5", section.accent)}>
      <div className="mb-3 flex items-center gap-2.5">
        <Image src={section.icon} alt="" width={36} height={36} className="size-8 object-contain" />
        <h4 className="text-sm font-bold text-heading">{section.title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["consult", "generate"] as const).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="flex min-h-20 flex-col justify-between rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2.5 text-left text-primary transition-colors hover:bg-surface-hover"
          >
            <ActionGlyph action={action} />
            <span className="text-xs font-bold text-heading">{action === "consult" ? "Consulter" : "Générer"}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function OptionButton({ selected, title, detail, onClick }: {
  selected: boolean
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "w-full rounded-[var(--radius-small)] border p-3 text-left transition-colors",
      selected ? "border-primary bg-primary/8" : "border-border bg-surface hover:bg-surface-hover",
    )}>
      <span className="block text-sm font-bold text-heading">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted">{detail}</span>
    </button>
  )
}

export function AccountAnalysisHub({ company, onClose }: { company: CompanyContext; onClose: () => void }) {
  const [modal, setModal] = useState<{ section: HubSection; action: HubAction } | null>(null)
  const [summaryType, setSummaryType] = useState<"account" | "intelligence">("account")
  const [selectedAxes, setSelectedAxes] = useState<string[]>(ACCOUNT_SUMMARY_AXES)
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false)
  const [analysisType, setAnalysisType] = useState<(typeof ANALYSIS_TYPES)[number]["id"]>("news")
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [runMessage, setRunMessage] = useState<string | null>(null)
  const [documents, setDocuments] = useState<"fiches" | "rapports" | null>(null)

  const [confirmSummaryOpen, setConfirmSummaryOpen] = useState(false)
  const [confirmAnalysisOpen, setConfirmAnalysisOpen] = useState(false)

  function backToCockpit() {
    setModal(null)
    setDocuments(null)
    setShowSummaryGenerator(false)
    returnToAccountCockpit()
  }

  function selectSummaryType(next: "account" | "intelligence") {
    setSummaryType(next)
    setSelectedAxes(next === "account" ? ACCOUNT_SUMMARY_AXES : INTELLIGENCE_SUMMARY_AXES)
  }

  function toggleAxis(axis: string) {
    setSelectedAxes((current) => current.includes(axis) ? current.filter((item) => item !== axis) : [...current, axis])
  }

  async function launchIntelligenceSummary() {
    setRunStatus("running")
    setRunMessage(null)
    try {
      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "intel-030-account-knowledge",
          entityType: "company",
          entityId: company.id,
          companyId: company.id,
          input: { accountKnowledgeSchemaVersion: 3, includedSubjects: selectedAxes },
        }),
      })
      if (!response.ok) throw new Error("Le workflow n’a pas pu être lancé.")
      setRunStatus("done")
      setRunMessage("La synthèse account intelligence est en cours de production.")
    } catch (error) {
      setRunStatus("error")
      setRunMessage(error instanceof Error ? error.message : "Erreur inattendue.")
    }
  }

  async function launchAnalysis() {
    if (analysisType !== "issues") {
      setRunStatus("done")
      setRunMessage("Le récipient et ses paramètres sont prêts. Le workflow dédié sera raccordé dans un prochain lot.")
      return
    }
    setRunStatus("running")
    setRunMessage(null)
    try {
      await triggerN8nWorkflow({ workflowId: "intel-031-issues-map", entityType: "company", entityId: company.id })
      setRunStatus("done")
      setRunMessage("L’analyse des enjeux du compte est lancée.")
    } catch (error) {
      setRunStatus("error")
      setRunMessage(error instanceof Error ? error.message : "Erreur inattendue.")
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
        <span aria-hidden="true">←</span> Retour aux actions
      </button>
      <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-4 text-body">
        <h3 className="text-lg font-bold text-heading">Synthèses et analyses</h3>
        <div className="mt-4 space-y-3">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onAction={(action) => {
                setRunStatus("idle")
                setRunMessage(null)
                if (action === "consult" && section.id === "summaries") setDocuments("fiches")
                else if (action === "consult" && section.id === "reports") setDocuments("rapports")
                else if (action === "generate" && section.id === "reports") {
                  openReportGeneration({ origin: "cockpit", returnToCockpit: true, companyId: company.id })
                } else setModal({ section: section.id, action })
              }}
            />
          ))}
        </div>
      </div>

      <CompanyDocumentsModal
        key={documents ?? "documents"}
        open={documents !== null}
        onClose={() => setDocuments(null)}
        companyId={company.id}
        companyName={company.name}
        isMobile
        initialCategory={documents ?? undefined}
        onReturnToCockpit={backToCockpit}
      />

      <AppDialog
        open={modal?.section === "summaries" && modal.action === "generate"}
        onOpenChange={(open) => { if (!open) setModal(null) }}
        title="Générer une fiche de synthèse"
        className="w-[min(calc(100vw-0.75rem),40rem)]"
      >
        <CockpitReturnButton onClick={backToCockpit} className="mb-2" />
        {showSummaryGenerator && summaryType === "account" ? (
          <SummaryDrawerContent
            data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus } }}
            variant="mobile"
            initialInstructions={`Inclure et analyser uniquement les sujets suivants : ${selectedAxes.join(", ")}.`}
          />
        ) : (
          <div className="space-y-4">
            <OptionButton selected={summaryType === "account"} title="Synthèse du compte" detail="Tous les sujets qui impactent l’ESN et sa relation avec le compte." onClick={() => selectSummaryType("account")} />
            <OptionButton selected={summaryType === "intelligence"} title="Synthèse account intelligence" detail="Identité, métiers, marché, concurrence, tendances, enjeux et échéances." onClick={() => selectSummaryType("intelligence")} />
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">Sujets inclus</legend>
              {(summaryType === "account" ? ACCOUNT_SUMMARY_AXES : INTELLIGENCE_SUMMARY_AXES).map((axis) => (
                <label key={axis} className="flex min-h-11 items-center gap-3 rounded border border-border px-3 text-sm text-body">
                  <input type="checkbox" checked={selectedAxes.includes(axis)} onChange={() => toggleAxis(axis)} className="size-4 accent-primary" />
                  {axis}
                </label>
              ))}
            </fieldset>
            {runMessage ? <p className={cn("rounded px-3 py-2 text-xs", runStatus === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>{runMessage}</p> : null}
            <button
              type="button"
              disabled={selectedAxes.length === 0 || runStatus === "running"}
              onClick={() => {
                if (summaryType === "account") {
                  setShowSummaryGenerator(true)
                } else {
                  setConfirmSummaryOpen(true)
                }
              }}
              className="min-h-11 w-full rounded bg-primary px-4 text-sm font-bold text-primary-fg disabled:opacity-50 cursor-pointer"
            >
              {runStatus === "running" ? "Lancement…" : "Continuer et générer"}
            </button>
          </div>
        )}
      </AppDialog>

      <WorkflowExecutionConfirmDialog
        open={confirmSummaryOpen}
        onOpenChange={setConfirmSummaryOpen}
        actionLabel="Continuer et générer"
        runType="intel-030-account-knowledge"
        onConfirm={launchIntelligenceSummary}
        pending={runStatus === "running"}
      />

      <AppDialog
        open={modal?.section === "analyses"}
        onOpenChange={(open) => { if (!open) setModal(null) }}
        title={modal?.action === "consult" ? "Consulter les analyses" : "Générer une analyse"}
        className="w-[min(calc(100vw-0.75rem),40rem)]"
      >
        <CockpitReturnButton onClick={backToCockpit} className="mb-2" />
        <div className="space-y-3">
          {ANALYSIS_TYPES.map((type) => (
            <OptionButton key={type.id} selected={analysisType === type.id} title={type.label} detail={type.detail} onClick={() => setAnalysisType(type.id)} />
          ))}
          {modal?.action === "consult" ? (
            <div className="rounded border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center text-xs leading-5 text-muted">
              La fenêtre de visualisation accueillera l’historique et la lecture de chaque analyse produite.
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold uppercase tracking-[0.1em] text-muted">
                Précisions
                <textarea className="mt-2 min-h-24 w-full rounded border border-border bg-surface px-3 py-2 text-sm font-normal normal-case tracking-normal text-body" placeholder="Angle, période, sujets à inclure ou à exclure…" />
              </label>
              {runMessage ? <p className={cn("rounded px-3 py-2 text-xs", runStatus === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>{runMessage}</p> : null}
              <button
                type="button"
                onClick={() => setConfirmAnalysisOpen(true)}
                disabled={runStatus === "running"}
                className="min-h-11 w-full rounded bg-primary px-4 text-sm font-bold text-primary-fg disabled:opacity-50 cursor-pointer"
              >
                {runStatus === "running" ? "Lancement…" : "Lancer l’analyse"}
              </button>
            </>
          )}
        </div>
      </AppDialog>

      <WorkflowExecutionConfirmDialog
        open={confirmAnalysisOpen}
        onOpenChange={setConfirmAnalysisOpen}
        actionLabel="Lancer l’analyse"
        runType={analysisType === "issues" ? "intel-031-issues-map" : "intel-021-monthly-watch-analysis"}
        onConfirm={launchAnalysis}
        pending={runStatus === "running"}
      />
    </div>
  )
}
