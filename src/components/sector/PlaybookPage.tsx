"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import type {
  PracticeKey,
  SectorPainPoint,
  SectorRegulatoryItem,
  SectorWithRelations,
} from "@/types/sector"

type PlaybookPageProps = {
  sector: SectorWithRelations
}

type SectionKey = "snapshot" | "pitch" | "playbook" | "actions"
type ActionKey = "follow_up" | "regulatory_email" | "quick_win" | "meeting_brief"

type PitchStep = {
  id: string
  timer: string
  title: string
  objective: string
  phrase: string
  points: string[]
  caution?: string
}

type PreparedAction = {
  key: ActionKey
  title: string
  label: string
  prompt: string
}

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  development: "En développement",
  watch: "Sous veille",
}

const MATURITY_LABEL: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
}

const PRACTICE_LABEL: Record<PracticeKey | "multi", string> = {
  data_ai: "Data & IA",
  cloud_eng: "Cloud Eng.",
  product: "Product",
  cyber: "Cyber",
  multi: "Multi-practice",
}

const SECTION_LABELS: Array<{ key: SectionKey; label: string; helper: string }> = [
  { key: "snapshot", label: "Brief", helper: "Lire le terrain" },
  { key: "pitch", label: "Pitch 15 min", helper: "Conduire le RDV" },
  { key: "playbook", label: "Playbook", helper: "Adapter l'angle" },
  { key: "actions", label: "Actions IA", helper: "Transformer en livrable" },
]

function formatScore(value: number | null) {
  if (value === null) return "n/a"
  const denominator = value > 5 ? 10 : 5
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/${denominator}`
}

function formatDate(value: string | null) {
  if (!value) return "Date à confirmer"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getPrimaryRegulatoryItem(items: SectorRegulatoryItem[]) {
  return (
    items.find((item) => item.is_commercial_window) ??
    items.find((item) => item.urgency === "critical" || item.urgency === "high") ??
    items[0] ??
    null
  )
}

function getPracticeLabel(practice: PracticeKey | "multi" | null) {
  return practice ? PRACTICE_LABEL[practice] : "Kredo"
}

function buildPitchSteps(
  sector: SectorWithRelations,
  primaryPain: SectorPainPoint | null,
  regulatoryItem: SectorRegulatoryItem | null,
): PitchStep[] {
  const firstPain = primaryPain?.title ?? "la pression opérationnelle et réglementaire"
  const secondPain = sector.pain_points[1]?.title ?? "la fragmentation des processus et des outils"
  const thirdPain = sector.pain_points[2]?.title ?? "la difficulté à capitaliser le savoir-faire métier"
  const regulatoryHook = regulatoryItem
    ? `${formatDate(regulatoryItem.deadline_date)} - ${regulatoryItem.name}`
    : "une fenêtre réglementaire à objectiver"
  const proofCompany = sector.companies[0]?.name ?? "un acteur comparable du portefeuille"
  const leadPersona = sector.playbook.personas[0]?.role ?? "votre sponsor métier"

  return [
    {
      id: "hook",
      timer: "0-2 min",
      title: "Accroche",
      objective: "Montrer qu'on connaît leur monde avant de parler de Kredo.",
      phrase: `Avant de vous parler de nous, je voudrais poser trois signaux sur ${sector.name}. Dites-moi lequel résonne le plus avec votre réalité.`,
      points: [
        regulatoryHook,
        firstPain,
        `${sector.companies.length || "Plusieurs"} comptes suivis dans le périmètre Kredo`,
      ],
      caution: "Après l'accroche, laisser le client choisir la douleur. La suite du pitch doit suivre sa réponse.",
    },
    {
      id: "mirror",
      timer: "2-5 min",
      title: "Diagnostic miroir",
      objective: "Créer le sentiment d'être compris, pas démarché.",
      phrase: `Les directions que je vois sur ce secteur portent trois chantiers en même temps, avec peu de marge pour tout industrialiser.`,
      points: [firstPain, secondPain, thirdPain],
    },
    {
      id: "shift",
      timer: "5-9 min",
      title: "Bascule de valeur",
      objective: "Rendre le bénéfice concret, sans rentrer trop tôt dans la stack.",
      phrase: "Je ne vais pas vous parler technologie. Je vais vous parler de ce qui change pour vos équipes dans les 90 prochains jours.",
      points: [
        "Une douleur prioritaire transformée en pilote mesurable.",
        `Un angle adapté à ${leadPersona}.`,
        "Un livrable court qui sécurise la décision avant un programme plus large.",
      ],
      caution: "Choisir une seule bascule. Trois promesses faibles valent moins qu'une preuve approfondie.",
    },
    {
      id: "proof",
      timer: "9-12 min",
      title: "Preuve",
      objective: "Passer de la promesse au déjà fait.",
      phrase: `Ce que je décris n'est pas théorique. On l'ancre sur des cas et signaux proches de ${proofCompany}.`,
      points: [
        sector.events[0]?.commercial_opportunity ?? "Un signal acheteur récent à qualifier.",
        sector.playbook.roi_arguments[0] ?? "Un ROI exprimé dans le langage métier.",
        sector.playbook.objections[0]?.reponse ?? "Une réponse préparée à l'objection la plus probable.",
      ],
    },
    {
      id: "next",
      timer: "12-15 min",
      title: "Premier pas",
      objective: "Sortir avec une date, un périmètre et le bon interlocuteur.",
      phrase: "Je ne vous propose pas un grand programme. Je vous propose un premier livrable court, daté, qui donne un résultat mesurable.",
      points: [
        regulatoryItem?.commercial_angle ?? "Un diagnostic ciblé sur la douleur exprimée.",
        "Un cadrage 3 à 6 semaines, budget fixe, critères de succès visibles.",
        "Une prochaine réunion avec le sponsor métier et le décideur opérationnel.",
      ],
    },
  ]
}

function buildPreparedActions(sector: SectorWithRelations): PreparedAction[] {
  const regulatoryItem = getPrimaryRegulatoryItem(sector.regulatory_items)
  const primaryCompany = sector.companies[0]?.name ?? "le compte cible"
  const primaryPain = sector.pain_points[0]?.title ?? "la douleur prioritaire"
  const primaryPersona = sector.playbook.personas[0]?.role ?? "le décideur cible"

  return [
    {
      key: "follow_up",
      title: "Email de suivi post-RDV",
      label: "Email de suivi",
      prompt: `Rédige un email de confirmation post-RDV pour ${primaryCompany}, ton professionnel et synthétique. Rappelle la douleur exprimée (${primaryPain}), le quick-win proposé, et demande qui doit rejoindre le prochain rendez-vous.`,
    },
    {
      key: "regulatory_email",
      title: "Approche par fenêtre commerciale",
      label: "Email d'approche",
      prompt: `Rédige un email d'approche pour ${primaryPersona} dans le secteur ${sector.name}. Exploite l'échéance suivante: ${regulatoryItem?.name ?? "fenêtre réglementaire à qualifier"}. Angle: ${regulatoryItem?.commercial_angle ?? primaryPain}.`,
    },
    {
      key: "quick_win",
      title: "Cadrage mission quick-win",
      label: "Cadrer quick-win",
      prompt: `Détaille le contenu d'une mission quick-win de 3 à 6 semaines pour ${sector.name}. Inclure objectifs, livrables, jalons, profils Kredo mobilisés, risques, critères de succès et décision de généralisation.`,
    },
    {
      key: "meeting_brief",
      title: "Brief avant RDV",
      label: "Brief RDV",
      prompt: `Prépare un brief commercial avant rendez-vous pour ${primaryCompany}. Structure: contexte secteur, 3 signaux à déposer, objections probables, pitch 15 minutes, question de clôture et prochaine action recommandée.`,
    },
  ]
}

export default function PlaybookPage({ sector }: PlaybookPageProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("snapshot")
  const [activePitchStepId, setActivePitchStepId] = useState("hook")
  const [selectedAction, setSelectedAction] = useState<PreparedAction | null>(null)
  const [copiedActionKey, setCopiedActionKey] = useState<ActionKey | null>(null)

  const primaryPain = sector.pain_points[0] ?? null
  const primaryRegulatory = getPrimaryRegulatoryItem(sector.regulatory_items)
  const preparedActions = useMemo(() => buildPreparedActions(sector), [sector])
  const pitchSteps = useMemo(
    () => buildPitchSteps(sector, primaryPain, primaryRegulatory),
    [sector, primaryPain, primaryRegulatory],
  )
  const activePitchStep = pitchSteps.find((step) => step.id === activePitchStepId) ?? pitchSteps[0]
  const topPractice = Object.entries(sector.practices_fit ?? {})
    .sort(([, a], [, b]) => b - a)[0] as [PracticeKey, number] | undefined
  const urgentRegulatoryCount = sector.regulatory_items.filter(
    (item) => item.urgency === "critical" || item.urgency === "high",
  ).length
  const primaryCompany = sector.companies[0] ?? null
  const sectorOfferRefs = {
    angle: [
      `Secteur: ${sector.name}`,
      primaryPain?.title ? `Douleur prioritaire: ${primaryPain.title}` : null,
      primaryRegulatory?.commercial_angle ? `Angle commercial: ${primaryRegulatory.commercial_angle}` : null,
      topPractice ? `Practice recommandée: ${getPracticeLabel(topPractice[0])}` : null,
    ].filter(Boolean).join("\n") || undefined,
  }

  function handleCopyAction(action: PreparedAction) {
    void navigator.clipboard.writeText(action.prompt).then(() => {
      setCopiedActionKey(action.key)
      window.setTimeout(() => setCopiedActionKey(null), 1600)
    })
  }

  return (
    <main data-theme="cockpit" className="min-h-screen bg-canvas px-4 py-5 text-body sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="relative overflow-hidden rounded-[var(--radius-medium)] border border-brand-brass/40 bg-surface px-4 py-4 shadow-[var(--shadow-card-sm)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/prospection/approche-sectorielle/${sector.slug}`}
                className="mb-4 inline-flex text-xs font-semibold text-muted transition-colors hover:text-heading"
              >
                Retour fiche sectorielle
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brass" size="md" dot>
                  Notebook commercial
                </Badge>
                <Badge variant="neutral" size="md">
                  {STATUS_LABEL[sector.status] ?? sector.status}
                </Badge>
                {sector.digital_maturity ? (
                  <Badge variant="info" size="md">
                    Maturité {MATURITY_LABEL[sector.digital_maturity]}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-heading sm:text-4xl">
                {sector.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
                {sector.description ??
                  "Notebook d'activation commerciale: lire le secteur, conduire le rendez-vous, traiter les objections et transformer le brief en livrable."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[24rem]">
              <div className="rounded-[var(--radius-medium)] border border-border bg-primary-fg/[0.05] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Score</p>
                <p className="mt-1 text-xl font-bold text-heading">{formatScore(sector.attractiveness_score)}</p>
              </div>
              <div className="rounded-[var(--radius-medium)] border border-border bg-primary-fg/[0.05] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Comptes</p>
                <p className="mt-1 text-xl font-bold text-heading">{sector.companies.length}</p>
              </div>
              <div className="rounded-[var(--radius-medium)] border border-border bg-primary-fg/[0.05] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Alertes</p>
                <p className="mt-1 text-xl font-bold text-heading">{urgentRegulatoryCount}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Prochaine meilleure action</p>
              <p className="mt-1 text-sm font-semibold text-heading">
                {primaryRegulatory?.commercial_angle ??
                  primaryPain?.description ??
                  "Qualifier le compte le plus exposé avec un pitch court et une proposition quick-win."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="brass" size="sm" onClick={() => setActiveSection("pitch")}>
                Ouvrir le pitch
              </Button>
              <ContextualCommunicationButton
                entryPoint="sector_offer"
                companyId={primaryCompany?.id}
                companyName={primaryCompany?.name}
                primaryEntity={primaryCompany ? { type: "company", id: primaryCompany.id } : { type: "sector", id: sector.id }}
                label="Présenter cette offre"
                variant="secondary"
                refs={sectorOfferRefs}
                aria-label={`Présenter l'offre ${sector.name}`}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Sections du notebook">
              {SECTION_LABELS.map((section) => {
                const isActive = activeSection === section.key
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={cn(
                      "min-w-[12rem] rounded-[var(--radius-medium)] border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-200 lg:min-w-0",
                      isActive
                        ? "border-brand-brass bg-primary-fg/[0.10] text-heading"
                        : "border-border bg-surface text-body hover:border-brand-brass/50 hover:bg-surface-hover",
                    )}
                  >
                    <span className="block text-sm font-bold">{section.label}</span>
                    <span className="mt-1 block text-xs text-muted">{section.helper}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className="cockpit-reading rounded-[var(--radius-medium)] border px-4 py-5 shadow-[var(--shadow-card-sm)] sm:px-6">
            {activeSection === "snapshot" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Lecture rapide</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Ce qu&apos;il faut comprendre avant d&apos;appeler</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Marché" value={sector.market_size_eur_bn ? `${sector.market_size_eur_bn} Md€` : "À qualifier"} />
                    <MetricTile label="Croissance" value={sector.market_growth_pct ? `+${sector.market_growth_pct}%` : "n/a"} tone="success" />
                    <MetricTile label="TJM observé" value={sector.avg_tjm_min ? `${sector.avg_tjm_min}-${sector.avg_tjm_max ?? "?"} €` : "n/a"} />
                    <MetricTile
                      label="Meilleur fit"
                      value={topPractice ? getPracticeLabel(topPractice[0]) : "Kredo"}
                      tone="brand"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <NotebookPanel title="Douleurs dominantes" subtitle="À utiliser pour le diagnostic miroir">
                      <div className="space-y-3">
                        {sector.pain_points.slice(0, 4).map((pain) => (
                          <div key={pain.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-heading">{pain.title}</p>
                              <Badge variant="brand">{pain.frequency_count} signaux</Badge>
                            </div>
                            {pain.description ? <p className="mt-1 text-xs leading-5 text-body">{pain.description}</p> : null}
                            {pain.verbatim ? (
                              <p className="mt-2 border-l-2 border-brand-brass pl-3 text-xs italic leading-5 text-muted">
                                {pain.verbatim}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </NotebookPanel>

                    <NotebookPanel title="Fenêtres commerciales" subtitle="À transformer en prétexte de contact">
                      <div className="space-y-3">
                        {sector.regulatory_items.slice(0, 4).map((item) => (
                          <div key={item.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-heading">{item.name}</p>
                              <Badge variant={item.urgency === "critical" || item.urgency === "high" ? "danger" : "warning"}>
                                {formatDate(item.deadline_date)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-body">
                              {item.commercial_angle ?? item.description ?? "Angle commercial à qualifier."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </NotebookPanel>
                  </div>
                </div>

                <NotebookPanel title="Comptes à activer" subtitle="Point d'entrée depuis le cockpit">
                  <div className="space-y-2">
                    {sector.companies.slice(0, 6).map((company) => (
                      <Link
                        key={company.id}
                        href={`/prospection/accounts/${company.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-medium)] border border-border px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-surface-hover"
                      >
                        <span className="font-semibold text-heading">{company.name}</span>
                        <span className="text-xs text-muted">{company.legacy_folio_score !== null ? `${company.legacy_folio_score}/5` : "score n/a"}</span>
                      </Link>
                    ))}
                  </div>
                </NotebookPanel>
              </div>
            ) : null}

            {activeSection === "pitch" ? (
              <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Mode rendez-vous</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Pitch 15 minutes</h2>
                  <div className="mt-5 space-y-2">
                    {pitchSteps.map((step) => {
                      const isActive = activePitchStep.id === step.id
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => setActivePitchStepId(step.id)}
                          className={cn(
                            "w-full rounded-[var(--radius-medium)] border px-3 py-3 text-left transition-colors",
                            isActive ? "border-primary bg-primary/[0.08]" : "border-border hover:bg-surface-hover",
                          )}
                        >
                          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                            {step.timer}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-heading">{step.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <article className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-5 sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Badge variant="brand" size="md">{activePitchStep.timer}</Badge>
                      <h3 className="mt-3 font-heading text-2xl font-bold text-heading">{activePitchStep.title}</h3>
                      <p className="mt-1 text-sm text-body">{activePitchStep.objective}</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedAction(preparedActions[3])}>
                      Générer brief RDV
                    </Button>
                  </div>

                  <div className="mt-5 rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Phrase à dire</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-heading">&quot;{activePitchStep.phrase}&quot;</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">À déposer</p>
                    {activePitchStep.points.map((point) => (
                      <div key={point} className="flex gap-3 border-b border-border pb-3 last:border-b-0">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <p className="text-sm leading-6 text-body">{point}</p>
                      </div>
                    ))}
                  </div>

                  {activePitchStep.caution ? (
                    <div className="mt-5 rounded-[var(--radius-medium)] border border-warning/25 bg-warning/[0.10] px-4 py-3 text-sm leading-6 text-heading">
                      {activePitchStep.caution}
                    </div>
                  ) : null}
                </article>
              </div>
            ) : null}

            {activeSection === "playbook" ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Angles de vente</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Choisir la bonne porte d&apos;entrée</h2>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <NotebookPanel title="Personas" subtitle="Peur dominante et enjeu à reformuler">
                    <div className="space-y-3">
                      {sector.playbook.personas.map((persona) => (
                        <div key={persona.role} className="rounded-[var(--radius-medium)] border border-border px-3 py-3">
                          <p className="text-sm font-bold text-heading">{persona.role}</p>
                          <p className="mt-2 text-xs leading-5 text-body">
                            <span className="font-semibold text-muted">Enjeu: </span>
                            {persona.enjeu}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-danger">
                            <span className="font-semibold">Peur: </span>
                            {persona.peur}
                          </p>
                        </div>
                      ))}
                    </div>
                  </NotebookPanel>

                  <NotebookPanel title="Objections" subtitle="Réponses prêtes à sortir en rendez-vous">
                    <div className="space-y-3">
                      {sector.playbook.objections.map((objection) => (
                        <div key={objection.objection} className="rounded-[var(--radius-medium)] border border-border px-3 py-3">
                          <p className="text-sm font-semibold italic text-danger">&quot;{objection.objection}&quot;</p>
                          <p className="mt-2 border-t border-border pt-2 text-xs leading-5 text-body">{objection.reponse}</p>
                        </div>
                      ))}
                    </div>
                  </NotebookPanel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <NotebookPanel title="Arguments ROI" subtitle="À chiffrer dans le langage du secteur">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sector.playbook.roi_arguments.map((argument) => (
                        <div key={argument} className="rounded-[var(--radius-medium)] border border-success/20 bg-success/[0.06] px-3 py-3">
                          <p className="text-sm font-semibold leading-6 text-heading">{argument}</p>
                        </div>
                      ))}
                    </div>
                  </NotebookPanel>

                  <NotebookPanel title="Points d'entrée" subtitle="Ordre de contact possible">
                    <div className="space-y-2">
                      {sector.playbook.entry_points.map((entryPoint) => (
                        <p key={entryPoint} className="rounded-[var(--radius-medium)] border border-border px-3 py-2 text-sm leading-6 text-body">
                          {entryPoint}
                        </p>
                      ))}
                    </div>
                  </NotebookPanel>
                </div>
              </div>
            ) : null}

            {activeSection === "actions" ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Actions IA</p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-heading">Transformer le notebook en livrable</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {preparedActions.map((action) => (
                    <div
                      key={action.key}
                      className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-4 transition-colors hover:border-primary hover:bg-surface-hover"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAction(action)}
                        className="w-full text-left"
                      >
                        <span className="text-sm font-bold text-heading">{action.title}</span>
                        <span className="mt-2 block text-xs leading-5 text-body">{action.prompt}</span>
                      </button>
                      <div className="mt-4 flex justify-end border-t border-border pt-3">
                        <ContextualCommunicationButton
                          entryPoint="sector_offer"
                          companyId={primaryCompany?.id}
                          companyName={primaryCompany?.name}
                          primaryEntity={primaryCompany ? { type: "company", id: primaryCompany.id } : { type: "sector", id: sector.id }}
                          label="Présenter cette offre"
                          refs={{
                            angle: [
                              sectorOfferRefs.angle,
                              `Action préparée: ${action.title}`,
                              action.prompt,
                            ].filter(Boolean).join("\n\n") || undefined,
                          }}
                          aria-label={`Présenter l'offre ${sector.name} avec l'action ${action.title}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <AppDrawer
        open={selectedAction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
        title={selectedAction?.title ?? "Action IA"}
        subtitle="Prototype local: le prompt est préparé, pas encore envoyé à n8n."
        side="right"
        width="wide"
        footer={
          selectedAction ? (
            <div className="flex flex-col gap-2 border-t border-border bg-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button variant="secondary" onClick={() => setSelectedAction(null)}>
                Fermer
              </Button>
              <Button variant="primary" onClick={() => handleCopyAction(selectedAction)}>
                {copiedActionKey === selectedAction.key ? "Prompt copié" : "Copier le prompt"}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedAction ? (
          <div className="space-y-4">
            <Badge variant="brand" size="md">{selectedAction.label}</Badge>
            <div className="rounded-[var(--radius-medium)] border border-border bg-canvas px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Prompt préparé</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-body">{selectedAction.prompt}</p>
            </div>
            <div className="rounded-[var(--radius-medium)] border border-brand-brass/25 bg-brand-brass/[0.08] px-4 py-3 text-sm leading-6 text-heading">
              Étape suivante envisagée: brancher cette action sur le flux de rédaction existant pour créer une version dans la bibliothèque documentaire.
            </div>
          </div>
        ) : null}
      </AppDrawer>
    </main>
  )
}

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "brand" | "success"
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-medium)] border px-3 py-3",
        tone === "brand" && "border-primary/20 bg-primary/[0.07]",
        tone === "success" && "border-success/20 bg-success/[0.07]",
        tone === "neutral" && "border-border bg-surface",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-heading">{value}</p>
    </div>
  )
}

function NotebookPanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-4">
      <div className="mb-4 border-b border-border pb-3">
        <h3 className="font-heading text-base font-bold text-heading">{title}</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}
