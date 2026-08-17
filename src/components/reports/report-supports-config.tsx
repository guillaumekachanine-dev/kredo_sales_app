import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { openReportGeneration } from "@/lib/reports/report-generation"

import { IntelligenceIcon } from "@/components/intelligence/intelligence-icons"

export type ReportSupportId =
  | "mail"
  | "pitch"
  | "rapport"
  | "prise_de_parole"
  | "note_interne"
  | "synthese_compte"
  | "briefing"
  | "strategie_commerciale"
  | "analyses"
  | "analyse_personnalisee"

export type ReportSupportIconType =
  | "write_email"
  | "generate_pitch"
  | "report"
  | "mic"
  | "file_text"
  | "building"
  | "weekly_brief"
  | "target"
  | "chart"
  | "sliders"

export interface ReportSupportConfig {
  id: ReportSupportId
  label: string
  mobileLabel: string
  description: string
  iconType: ReportSupportIconType
  onClick: () => void
}

export function ReportSupportIcon({
  iconType,
  className = "size-5",
}: {
  iconType: ReportSupportIconType
  className?: string
}) {
  if (
    iconType === "write_email" ||
    iconType === "generate_pitch" ||
    iconType === "report" ||
    iconType === "weekly_brief"
  ) {
    return <IntelligenceIcon name={iconType} className={className} preferVector />
  }

  const commonProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (iconType === "mic") {
    return (
      <svg {...commonProps}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    )
  }

  if (iconType === "file_text") {
    return (
      <svg {...commonProps}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )
  }

  if (iconType === "building") {
    return (
      <svg {...commonProps}>
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01" />
      </svg>
    )
  }

  if (iconType === "target") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    )
  }

  if (iconType === "chart") {
    return (
      <svg {...commonProps}>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    )
  }

  // sliders / combine / analyse personnalisee
  return (
    <svg {...commonProps}>
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  )
}

export const REPORT_SUPPORTS: ReportSupportConfig[] = [
  {
    id: "mail",
    label: "Mail",
    mobileLabel: "Mail",
    description: "Composer une communication assistée depuis le flux existant.",
    iconType: "write_email",
    onClick: () => openCommunicationComposer({ origin: "global", preset: { channel: "email" } }),
  },
  {
    id: "pitch",
    label: "Pitch",
    mobileLabel: "Pitch",
    description: "Réutiliser la rédaction assistée pour une prise de parole.",
    iconType: "generate_pitch",
    onClick: () => openCommunicationComposer({ origin: "global", preset: { scenario: "signal_outreach" } }),
  },
  {
    id: "rapport",
    label: "Rapport",
    mobileLabel: "Rapport",
    description: "Ouvrir les types et paramètres du moteur de génération actuel.",
    iconType: "report",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "prise_de_parole",
    label: "Prise de parole",
    mobileLabel: "Oral",
    description: "Préparer une intervention ou un argumentaire oral",
    iconType: "mic",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "note_interne",
    label: "Note interne",
    mobileLabel: "Note",
    description: "Structurer une communication interne",
    iconType: "file_text",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "synthese_compte",
    label: "Synthèse de compte",
    mobileLabel: "Synthèse",
    description: "Consolider les informations clés d'un compte",
    iconType: "building",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "briefing",
    label: "Briefing",
    mobileLabel: "Briefing",
    description: "Hebdo · Priorités · Pipeline",
    iconType: "weekly_brief",
    onClick: () => openReportGeneration({ origin: "reports_library", reportType: "weekly_manager" }),
  },
  {
    id: "strategie_commerciale",
    label: "Stratégie commerciale",
    mobileLabel: "Stratégie",
    description: "Structurer une recommandation commerciale",
    iconType: "target",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "analyses",
    label: "Analyses",
    mobileLabel: "Analyses",
    description: "Actualité · Compte · Segment marché · Diagnostic P&L",
    iconType: "chart",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
  {
    id: "analyse_personnalisee",
    label: "Analyse personnalisée",
    mobileLabel: "Analyse libre",
    description: "Croiser librement jusqu'à 4 sujets",
    iconType: "sliders",
    onClick: () => openReportGeneration({ origin: "reports_library" }),
  },
]

