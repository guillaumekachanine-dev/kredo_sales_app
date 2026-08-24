// ─────────────────────────────────────────────────────────────────────────────
//  Intelligence Registry — source unique des actions du Cockpit Intelligence
//
//  Mappe chaque pattern de route vers des actions IA contextuelles.
//  Le mode Compte (entityContext.entityType défini) court-circuite ce registre
//  et utilise AccountPanelContent — ce registre ne pilote que le mode Page.
// ─────────────────────────────────────────────────────────────────────────────

import { MONTHLY_WATCH_MISSION_ACTION_ID } from "@/features/intelligence-missions/components/mission-composer-model"

export type IntelligenceActionStatus = "active" | "coming_soon"

export type IntelligenceActionCategory = "contextual" | "common"

export type IntelligenceAction = {
  id: string
  label: string
  description: string
  icon: IntelligenceIconKey
  category: IntelligenceActionCategory
  status: IntelligenceActionStatus
  requiresEntity?: boolean
}

// Types d'entité que le panneau sait résoudre en mode Entité. Seul "company"
// est branché à ce jour (AccountPanelContent) — les autres élargissent le
// contrat pour les lots suivants sans forcer une réécriture des consommateurs.
export type IntelligenceEntityType =
  | "company"
  | "contact"
  | "opportunity"
  | "mission"
  | "project"
  | "collaborator"
  | "candidate"
  | "sector"
  | "calendar_event"

export type IntelligenceIconKey =
  | "search_news"
  | "scan_contact"
  | "deep_analysis"
  | "generate_pitch"
  | "build_roadmap"
  | "create_campaign"
  | "match_profiles"
  | "prioritize"
  | "detect_risks"
  | "analyze_skills"
  | "analyze_margins"
  | "forecast"
  | "weekly_brief"
  | "write_email"
  | "sector_analysis"
  | "report"
  | "recommendations"
  | "sparkle"

// ─── Actions définies ────────────────────────────────────────────────────────

const ACTIONS: Record<string, IntelligenceAction> = {
  search_news: {
    id: "search_news",
    label: "Rechercher des actualités",
    description: "Collecter les dernières actualités et signaux marché sur les comptes ciblés.",
    icon: "search_news",
    category: "contextual",
    status: "coming_soon",
  },
  scan_contacts: {
    id: "scan_contacts",
    label: "Scanner les contacts",
    description: "Identifier les décideurs clés et enrichir les fiches contacts.",
    icon: "scan_contact",
    category: "contextual",
    status: "active",
  },
  deep_analysis: {
    id: "deep_analysis",
    label: "Analyse approfondie",
    description: "Lancer une analyse complète du compte : identité, positionnement, signaux.",
    icon: "deep_analysis",
    category: "contextual",
    status: "coming_soon",
    requiresEntity: true,
  },
  generate_pitch: {
    id: "generate_pitch",
    label: "Construire un pitch",
    description: "Générer un message contextualisé à partir des données du compte.",
    icon: "generate_pitch",
    category: "contextual",
    status: "coming_soon",
    requiresEntity: true,
  },
  build_roadmap: {
    id: "build_roadmap",
    label: "Roadmap commerciale",
    description: "Élaborer une feuille de route commerciale personnalisée.",
    icon: "build_roadmap",
    category: "contextual",
    status: "coming_soon",
  },
  create_campaign: {
    id: "create_campaign",
    label: "Créer une campagne",
    description: "Configurer une campagne de prospection multi-canal.",
    icon: "create_campaign",
    category: "contextual",
    status: "coming_soon",
  },
  prioritize_accounts: {
    id: "prioritize_accounts",
    label: "Prioriser les comptes",
    description: "Identifier les comptes prioritaires à relancer d'après les signaux d'achat et la fraîcheur relationnelle.",
    icon: "prioritize",
    category: "contextual",
    status: "active",
  },
  activity_report: {
    id: "activity_report",
    label: "Bilan d'activité",
    description: "Synthétiser les interactions et le volume de relances du portefeuille.",
    icon: "weekly_brief",
    category: "contextual",
    status: "coming_soon",
  },
  prioritize_followups: {
    id: "prioritize_followups",
    label: "Prioriser les relances",
    description: "Classer les comptes sans contact récent par urgence de reprise.",
    icon: "prioritize",
    category: "contextual",
    status: "coming_soon",
  },
  match_profiles: {
    id: "match_profiles",
    label: "Matching profils",
    description: "Rechercher l'adéquation entre consultants, candidats et offres.",
    icon: "match_profiles",
    category: "contextual",
    status: "coming_soon",
  },
  prioritize_pipeline: {
    id: "prioritize_pipeline",
    label: "Prioriser le pipeline",
    description: "Classer les opportunités par probabilité de closing et valeur.",
    icon: "prioritize",
    category: "contextual",
    status: "active",
  },
  detect_risks: {
    id: "detect_risks",
    label: "Détection de risques",
    description: "Identifier les risques sur les opportunités et engagements actifs.",
    icon: "detect_risks",
    category: "contextual",
    status: "active",
  },
  initiate_quote: {
    id: "initiate_quote",
    label: "Initier un devis",
    description: "Initier la trame d'une proposition commerciale pour un staffing.",
    icon: "generate_pitch",
    category: "contextual",
    status: "coming_soon",
  },
  initiate_offer: {
    id: "initiate_offer",
    label: "Initier une offre",
    description: "Initier la trame d'une proposition d'embauche.",
    icon: "generate_pitch",
    category: "contextual",
    status: "coming_soon",
  },
  analyze_needs: {
    id: "analyze_needs",
    label: "Analyser les besoins",
    description: "Cartographier les compétences recherchées et les écarts.",
    icon: "analyze_skills",
    category: "contextual",
    status: "active",
  },
  project_portfolio_review: {
    id: "project_portfolio_review",
    label: "Revue de portefeuille",
    description: "Synthétiser avancement, budget et risques des projets actifs.",
    icon: "report",
    category: "contextual",
    status: "coming_soon",
  },
  analyze_skill_gaps: {
    id: "analyze_skill_gaps",
    label: "Écarts de compétences",
    description: "Analyser les gaps entre compétences disponibles et demande marché.",
    icon: "analyze_skills",
    category: "contextual",
    status: "coming_soon",
  },
  suggest_training: {
    id: "suggest_training",
    label: "Plan de formation",
    description: "Recommander des formations en fonction des tendances marché.",
    icon: "recommendations",
    category: "contextual",
    status: "coming_soon",
  },
  analyze_activity: {
    id: "analyze_activity",
    label: "Analyse & recommandations",
    description: "Analyser les indicateurs d'activité et formuler des recommandations.",
    icon: "recommendations",
    category: "contextual",
    status: "active",
  },
  forecast_availability: {
    id: "forecast_availability",
    label: "Prévoir les disponibilités",
    description: "Anticiper qui se libère dans les 3 mois à venir et rapprocher ces disponibilités des besoins ouverts.",
    icon: "forecast",
    category: "contextual",
    status: "active",
  },
  analyze_margins: {
    id: "analyze_margins",
    label: "Analyse des marges",
    description: "Décrypter les marges par mission, client et consultant.",
    icon: "analyze_margins",
    category: "contextual",
    status: "active",
  },
  forecast_revenue: {
    id: "forecast_revenue",
    label: "Prévision de CA",
    description: "Projeter le chiffre d'affaires sur les prochains trimestres.",
    icon: "forecast",
    category: "contextual",
    status: "active",
  },
  detect_anomalies: {
    id: "detect_anomalies",
    label: "Détecter les anomalies",
    description: "Identifier les écarts financiers et les incohérences de facturation.",
    icon: "detect_risks",
    category: "contextual",
    status: "coming_soon",
  },
  analyze_funnel: {
    id: "analyze_funnel",
    label: "Analyser le funnel",
    description: "Identifier les étapes de recrutement qui bloquent le plus de candidats.",
    icon: "report",
    category: "contextual",
    status: "active",
  },
  weekly_brief: {
    id: "weekly_brief",
    label: "Brief hebdomadaire",
    description: "Priorités de la semaine, alertes à traiter et actions recommandées — calculées, pas devinées.",
    icon: "weekly_brief",
    category: "contextual",
    status: "active",
  },
  action_priorities: {
    id: "action_priorities",
    label: "Priorités d'action",
    description: "Recommander les actions les plus impactantes à mener cette semaine.",
    icon: "prioritize",
    category: "contextual",
    status: "active",
  },
  pipeline_insights: {
    id: "pipeline_insights",
    label: "Insights pipeline",
    description: "Vue synthétique de l'état du pipe et des risques de dérapage.",
    icon: "sparkle",
    category: "contextual",
    status: "active",
  },
  prepare_day: {
    id: "prepare_day",
    label: "Préparer la journée",
    description: "Structurer les priorités et rendez-vous du jour.",
    icon: "prioritize",
    category: "contextual",
    status: "active",
  },
  flag_unprepared_meetings: {
    id: "flag_unprepared_meetings",
    label: "RDV à préparer",
    description: "Repérer les rendez-vous à venir sans brief associé.",
    icon: "detect_risks",
    category: "contextual",
    status: "coming_soon",
  },
  [MONTHLY_WATCH_MISSION_ACTION_ID]: {
    id: MONTHLY_WATCH_MISSION_ACTION_ID,
    label: "Analyse mensuelle de la veille",
    description: "Identifier les tendances, signaux faibles, évolutions réglementaires, opportunités, risques et actions prioritaires d’une période de veille.",
    icon: "deep_analysis",
    category: "contextual",
    status: "active",
  },

  // ── Plus d'actions — transverses, disponibles sur toutes les pages ──────

  common_write_email: {
    id: "common_write_email",
    label: "Rédiger un email",
    description: "Composer un email professionnel assisté par l'IA.",
    icon: "write_email",
    category: "common",
    status: "coming_soon",
  },
  common_sector_analysis: {
    id: "common_sector_analysis",
    label: "Analyse sectorielle",
    description: "Obtenir une analyse de marché par secteur d'activité.",
    icon: "sector_analysis",
    category: "common",
    status: "coming_soon",
  },
  common_report: {
    id: "common_report",
    label: "Générer un rapport",
    description: "Produire un rapport consolidé à partir des données existantes.",
    icon: "report",
    category: "common",
    status: "coming_soon",
  },
  common_priorities: {
    id: "common_priorities",
    label: "Priorités",
    description: "Identifier et hiérarchiser les actions à mener.",
    icon: "prioritize",
    category: "common",
    status: "coming_soon",
  },
}

// ─── Route → Actions mapping ─────────────────────────────────────────────────
//
//  Source de vérité de la nav : src/lib/navigation/main-menu.config.ts.
//  13 routes à données réelles + 3 placeholders (aucune action inventée pour
//  une page sans contenu — /settings n'affiche même pas le socle commun).
//  `/staffing` volontairement absent : route orpheline, retirée de la nav
//  principale au profit de `/missions/opps` (Besoins & Staffing).

type RouteMapping = {
  pattern: string
  label: string
  actionIds: string[]
  suppressCommon?: boolean
}

const ROUTE_MAPPINGS: RouteMapping[] = [
  // ── Général ───────────────────────────────────────────────────────────
  {
    pattern: "/cockpit",
    label: "Cockpit",
    actionIds: ["weekly_brief", "action_priorities", "pipeline_insights"],
  },
  {
    pattern: "/agenda",
    label: "Agenda",
    actionIds: ["weekly_brief", "prepare_day", "action_priorities", "flag_unprepared_meetings"],
  },

  // ── CRM & Prospection ─────────────────────────────────────────────────
  {
    pattern: "/prospection/accounts/",
    label: "Fiche compte",
    actionIds: ["deep_analysis", "generate_pitch", "build_roadmap", "scan_contacts"],
  },
  {
    pattern: "/prospection/accounts",
    label: "Comptes & contacts",
    actionIds: ["scan_contacts", "deep_analysis", "generate_pitch"],
  },
  {
    pattern: "/intelligence",
    label: "Business Intelligence",
    actionIds: ["common_sector_analysis", "search_news", "build_roadmap"],
  },
  {
    pattern: "/veille",
    label: "Veille & Actualités",
    actionIds: [MONTHLY_WATCH_MISSION_ACTION_ID],
  },
  {
    pattern: "/prospection",
    label: "CRM & Prospection",
    actionIds: ["prioritize_accounts", "search_news", "create_campaign", "build_roadmap"],
  },

  // ── Besoins, Staffing et Engagements ─────────────────────────────────
  {
    pattern: "/missions/opps",
    label: "Besoins & Staffing",
    actionIds: ["match_profiles", "prioritize_pipeline", "initiate_quote", "analyze_needs"],
  },
  {
    pattern: "/missions/actives",
    label: "Missions",
    actionIds: ["detect_risks", "analyze_margins", "forecast_revenue"],
  },
  {
    pattern: "/missions/projets",
    label: "Projets",
    actionIds: ["project_portfolio_review", "detect_risks", "analyze_margins"],
  },
  {
    pattern: "/missions",
    label: "Engagements",
    actionIds: ["detect_risks", "analyze_margins", "forecast_revenue"],
  },

  // ── Équipe et Recrutement ─────────────────────────────────────────────
  {
    pattern: "/consultants/pool-competences",
    label: "Pool de compétences",
    actionIds: ["analyze_skill_gaps", "suggest_training", "match_profiles"],
  },
  {
    pattern: "/consultants/activite-conges",
    label: "Activité & congés",
    actionIds: ["analyze_activity", "detect_anomalies", "forecast_availability"],
  },

  {
    pattern: "/consultants",
    label: "Équipe",
    actionIds: ["analyze_skill_gaps", "suggest_training", "analyze_activity"],
  },
  {
    pattern: "/recruitment",
    label: "Recrutement",
    actionIds: ["analyze_funnel", "match_profiles", "initiate_offer", "analyze_skill_gaps"],
  },

  // ── Finance ───────────────────────────────────────────────────────────
  {
    pattern: "/finance",
    label: "Finance",
    actionIds: ["analyze_margins", "forecast_revenue", "detect_anomalies"],
  },

  // ── Outils / Paramètres — placeholders, pas d'action inventée ────────
  {
    pattern: "/knowledge",
    label: "Knowledge Hub",
    actionIds: [],
  },
  {
    pattern: "/automations",
    label: "Automatisations",
    actionIds: [],
  },
  {
    pattern: "/settings",
    label: "Paramètres",
    actionIds: [],
    suppressCommon: true, // pas d'action commerciale générique sur les réglages
  },
]

const COMMON_ACTION_IDS = [
  "common_write_email",
  "common_sector_analysis",
  "common_report",
  "common_priorities",
]

// ─── Résolution par entité (mode Entité, hors "company") ────────────────────
//
//  "company" reste piloté par AccountPanelContent (données riches déjà
//  câblées : ressources, activité, contacts clés). Les autres types
//  affichent un jeu d'actions contextuelles ciblées — pas de section
//  ressources/activité tant qu'aucune requête dédiée n'est branchée.

export const ENTITY_TYPE_LABELS: Record<Exclude<IntelligenceEntityType, "company">, string> = {
  opportunity: "Opportunité",
  mission: "Mission",
  project: "Projet",
  collaborator: "Collaborateur",
  candidate: "Candidat",
  contact: "Contact",
  sector: "Secteur",
  calendar_event: "Événement",
}

const ENTITY_ACTION_IDS: Record<Exclude<IntelligenceEntityType, "company">, string[]> = {
  opportunity: ["match_profiles", "initiate_quote", "detect_risks"],
  mission: ["detect_risks", "analyze_margins", "forecast_revenue"],
  project: ["project_portfolio_review", "detect_risks", "analyze_margins"],
  collaborator: ["analyze_skill_gaps", "suggest_training", "forecast_availability"],
  candidate: ["match_profiles", "analyze_skill_gaps", "initiate_offer"],
  contact: ["generate_pitch", "scan_contacts", "activity_report"],
  sector: ["common_sector_analysis", "search_news", "build_roadmap"],
  calendar_event: ["prepare_day", "flag_unprepared_meetings"],
}

export function resolveEntityActions(
  entityType: Exclude<IntelligenceEntityType, "company">,
): ResolvedIntelligenceContext {
  const actionIds = ENTITY_ACTION_IDS[entityType] ?? []
  const contextualActions = actionIds
    .map((id) => ACTIONS[id])
    .filter((a): a is IntelligenceAction => !!a)

  const contextualIds = new Set(contextualActions.map((a) => a.id))
  const commonActions = COMMON_ACTION_IDS
    .map((id) => ACTIONS[id])
    .filter((a): a is IntelligenceAction => !!a && !contextualIds.has(a.id))

  return { label: "", contextualActions, commonActions }
}

// ─── Résolution publique ─────────────────────────────────────────────────────

export type ResolvedIntelligenceContext = {
  label: string
  contextualActions: IntelligenceAction[]
  commonActions: IntelligenceAction[]
}

export function resolveIntelligenceActions(pathname: string): ResolvedIntelligenceContext {
  let bestMapping: RouteMapping | null = null
  let bestLen = -1

  for (const mapping of ROUTE_MAPPINGS) {
    if (pathname === mapping.pattern || pathname.startsWith(mapping.pattern)) {
      if (mapping.pattern.length > bestLen) {
        bestLen = mapping.pattern.length
        bestMapping = mapping
      }
    }
  }

  const contextualActions = (bestMapping?.actionIds ?? [])
    .map((id) => ACTIONS[id])
    .filter((a): a is IntelligenceAction => !!a)

  const contextualIds = new Set(contextualActions.map((a) => a.id))
  const commonActions = bestMapping?.suppressCommon
    ? []
    : COMMON_ACTION_IDS
        .map((id) => ACTIONS[id])
        .filter((a): a is IntelligenceAction => !!a && !contextualIds.has(a.id))

  return {
    label: bestMapping?.label ?? "Navigation",
    contextualActions,
    commonActions,
  }
}
