import { normalizeCompanyRelationType } from "@/lib/accounts-contacts/company-constants"
import {
  getCurrentMultiFactTexts,
  getCurrentSingleFactText,
} from "@/lib/intelligence/company-facts-contract"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { AccountIntelligenceHomeFinancials } from "@/lib/intelligence/account-intelligence-home-contract"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import type { AccountIntelligenceHomeTemplateProps } from "./account-intelligence-home-template.types"

const ACTIVE_MISSION_STATUSES = new Set(["active", "en_cours", "ongoing"])
const EMPTY_LABELS = new Set(["", "non renseigné", "non disponible", "n/a", "—"])

function isUseful(value: string | null | undefined): value is string {
  if (!value) return false
  return !EMPTY_LABELS.has(value.trim().toLocaleLowerCase("fr-FR"))
}

function display(value: string | null | undefined): string {
  return isUseful(value) ? value.trim() : "—"
}

function sentence(value: string): string {
  const text = value.trim()
  if (!text) return ""
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function humanize(value: string): string {
  const text = value.replaceAll("_", " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—"
}

function formatMoney(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value / 1_000_000)} M€`
  }
  if (absolute >= 1_000) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value / 1_000)} k€`
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function importanceLabel(score: number): string {
  if (score >= 80) return "Importance critique"
  if (score >= 60) return "Importance élevée"
  if (score >= 40) return "Importance modérée"
  return "Importance faible"
}

function procurementDisplay(data: ClientIntelligenceData): string {
  const businessModel = getCurrentSingleFactText(data.companyFacts, "business_model")
  if (!businessModel) return "—"

  return /(public|priv[ée]|march[ée]|appel d['’]offres|centrale d['’]achat)/i.test(businessModel)
    ? businessModel
    : "—"
}

function buildSummary(data: ClientIntelligenceData): string {
  const description = getCurrentSingleFactText(data.companyFacts, "description")
  const primaryActivity = getCurrentSingleFactText(data.companyFacts, "primary_activity")
  const valueProposition = getCurrentSingleFactText(data.companyFacts, "value_proposition")
  const differentiators = getCurrentMultiFactTexts(data.companyFacts, "differentiators").slice(0, 2)

  const parts = [description, primaryActivity, valueProposition]
    .filter(isUseful)
    .map(sentence)

  if (differentiators.length > 0) {
    parts.push(`Différenciation : ${differentiators.join(", ")}.`)
  }

  if (parts.length > 0) return parts.join(" ")

  const fallback = [data.companyProfile.primaryActivity, data.companyPositioning.valueProposition]
    .filter(isUseful)
    .map(sentence)

  return fallback.length > 0
    ? fallback.join(" ")
    : "Les informations métier et de positionnement ne sont pas encore suffisamment documentées pour ce compte."
}

function buildProcessSteps(data: ClientIntelligenceData): AccountIntelligenceHomeTemplateProps["processSteps"] {
  const profileFactCount = [
    "description",
    "primary_activity",
    "value_proposition",
    "market_position",
  ].filter((factType) => Boolean(getCurrentSingleFactText(data.companyFacts, factType))).length

  return [
    {
      id: "profile",
      label: "Profil de l’entreprise",
      state: profileFactCount >= 3 ? "available" : profileFactCount > 0 ? "partial" : "empty",
    },
    {
      id: "news",
      label: "Actualités du compte",
      state: data.accountSignals.length > 0 ? "available" : data.accountWatch.isEnabled ? "partial" : "empty",
    },
    {
      id: "sector",
      label: "Contexte sectoriel",
      state: data.sectorSnapshot ? "available" : data.company.segmentId || data.company.sectorId ? "partial" : "empty",
    },
    {
      id: "issues",
      label: "Cartographie des enjeux",
      state: data.accountIssues.length > 0 ? "available" : "empty",
    },
    {
      id: "strategy",
      label: "Stratégie commerciale",
      state: data.commercialStrategy ? "available" : "empty",
    },
    {
      id: "roadmap",
      label: "Roadmap d’adressage",
      state: data.presence.hasRoadmap ? "available" : "empty",
    },
  ]
}

export function buildAccountIntelligenceHomeTemplateData(
  data: ClientIntelligenceData,
  financials: AccountIntelligenceHomeFinancials | null,
  playbookSlug: string | null,
): AccountIntelligenceHomeTemplateProps {
  const relationType = financials?.relationType ?? normalizeCompanyRelationType(data.company.lifecycleStatus)
  const isClient = relationType === "client"
  const activeMissions = data.missions.filter((mission) => ACTIVE_MISSION_STATUSES.has(mission.status.toLowerCase()))
  const activeOpportunities = data.opportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
  const activePipeline = activeOpportunities.reduce((sum, opportunity) => sum + (opportunity.estimatedGain ?? 0), 0)

  const latestSignal = [...data.accountSignals]
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())[0] ?? null

  const marketPosition = getCurrentSingleFactText(data.companyFacts, "market_position")
    ?? data.companyPositioning.marketPosition
  const revenue = getCurrentSingleFactText(data.companyFacts, "revenue_estimate")
    ?? data.companyProfile.revenue
  const priority = getCurrentSingleFactText(data.companyFacts, "strategic_priority")
    ?? data.company.priority

  const lifecycle = {
    client: "Client",
    prospect: "Prospect",
    ancien_client: "Ancien client",
    pair_partenaire: "Partenaire",
  }[relationType]

  const clientRanking = isClient && financials?.clientRank && financials.clientCount
    ? `(${financials.clientRank}/${financials.clientCount} clients)`
    : undefined

  const resolvedPlaybookSlug = playbookSlug || data.sectorSnapshot?.slug || null

  return {
    account: {
      name: data.company.name,
      sector: data.company.sector,
      segment: data.company.segment,
      website: data.company.website,
      logoPath: data.company.logoPath,
      location: display(data.company.hqLocation),
      lifecycle,
    },
    processSteps: buildProcessSteps(data),
    companySummary: buildSummary(data),
    facts: [
      { label: "Catégorie marché", value: display(marketPosition) },
      { label: "Chiffre d’affaires", value: display(revenue) },
      { label: "Modèle d’achat", value: procurementDisplay(data) },
      { label: "Priorité", value: isUseful(priority) ? humanize(priority) : "—" },
    ],
    metrics: [
      { value: String(data.commercialTimeline.length), label: "événements commerciaux", tone: "dark" },
      isClient
        ? { value: String(activeMissions.length), label: "missions en cours", tone: "light" }
        : { value: String(activeOpportunities.length), label: "opportunités actives", tone: "light" },
      isClient
        ? {
            value: financials?.realizedRevenue === null || financials?.realizedRevenue === undefined
              ? "—"
              : formatMoney(financials.realizedRevenue),
            label: "CA réalisé",
            secondary: clientRanking,
            tone: "light",
          }
        : {
            value: formatMoney(activePipeline),
            label: "pipe actif",
            tone: "light",
          },
      { value: String(data.accountIssues.length), label: "enjeux identifiés", tone: "dark" },
    ],
    recentSignal: latestSignal ? {
      title: latestSignal.title,
      dateLabel: formatDate(latestSignal.publishedAt ?? latestSignal.detectedAt),
      importanceLabel: importanceLabel(latestSignal.interestScore),
      implication: latestSignal.recommendedAction ?? latestSignal.summary ?? "Aucune implication commerciale structurée.",
    } : null,
    watch: {
      enabled: data.accountWatch.isEnabled,
      label: data.accountWatch.isEnabled ? "Veille active" : "Activer la veille",
    },
    toolbox: [
      {
        id: "contacts",
        title: "Répertoire de contacts",
        description: "Retrouver les interlocuteurs connus et leurs rôles sur le compte.",
        icon: "contacts",
        disabled: false,
      },
      {
        id: "documents",
        title: "Bibliothèque de documents",
        description: "Consulter les rapports, analyses et contenus liés au compte.",
        icon: "documents",
        disabled: false,
      },
      {
        id: "playbook",
        title: "Playbook commercial",
        description: "Accéder aux angles, personas, objections et arguments du segment.",
        icon: "playbook",
        href: resolvedPlaybookSlug ? `/ressources/playbook/${resolvedPlaybookSlug}` : undefined,
        disabled: !resolvedPlaybookSlug,
      },
    ],
  }
}
