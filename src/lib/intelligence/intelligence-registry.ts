// ─────────────────────────────────────────────────────────────────────────────
//  Intelligence Registry — source unique des actions du Cockpit Intelligence
//
//  Mappe chaque pattern de route vers des actions IA contextuelles.
//  3 niveaux : contextuel entité > contextuel page > socle commun.
//  Le drawer/panel résout le pathname courant → actions à afficher.
// ─────────────────────────────────────────────────────────────────────────────

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
    status: "coming_soon",
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
    status: "coming_soon",
  },
  detect_risks: {
    id: "detect_risks",
    label: "Détection de risques",
    description: "Identifier les risques sur les opportunités actives.",
    icon: "detect_risks",
    category: "contextual",
    status: "coming_soon",
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
    status: "coming_soon",
  },
  suggest_reassignment: {
    id: "suggest_reassignment",
    label: "Suggestions staffing",
    description: "Proposer des réaffectations optimales de ressources.",
    icon: "match_profiles",
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
    status: "coming_soon",
  },
  analyze_margins: {
    id: "analyze_margins",
    label: "Analyse des marges",
    description: "Décrypter les marges par mission, client et consultant.",
    icon: "analyze_margins",
    category: "contextual",
    status: "coming_soon",
  },
  forecast_revenue: {
    id: "forecast_revenue",
    label: "Prévision de CA",
    description: "Projeter le chiffre d'affaires sur les prochains trimestres.",
    icon: "forecast",
    category: "contextual",
    status: "coming_soon",
  },
  detect_anomalies: {
    id: "detect_anomalies",
    label: "Détecter les anomalies",
    description: "Identifier les écarts financiers et les incohérences de facturation.",
    icon: "detect_risks",
    category: "contextual",
    status: "coming_soon",
  },
  weekly_brief: {
    id: "weekly_brief",
    label: "Brief hebdomadaire",
    description: "Synthèse de la semaine : faits marquants, alertes, prochaines étapes.",
    icon: "weekly_brief",
    category: "contextual",
    status: "coming_soon",
  },
  action_priorities: {
    id: "action_priorities",
    label: "Priorités d'action",
    description: "Recommander les actions les plus impactantes à mener cette semaine.",
    icon: "prioritize",
    category: "contextual",
    status: "coming_soon",
  },
  pipeline_insights: {
    id: "pipeline_insights",
    label: "Insights pipeline",
    description: "Vue synthétique de l'état du pipe et des risques de dérapage.",
    icon: "sparkle",
    category: "contextual",
    status: "coming_soon",
  },

  // ── Socle commun — toujours disponible ──────────────────────────────────

  common_sector_analysis: {
    id: "common_sector_analysis",
    label: "Analyse sectorielle",
    description: "Obtenir une analyse de marché par secteur d'activité.",
    icon: "sector_analysis",
    category: "common",
    status: "coming_soon",
  },
  common_write_pitch: {
    id: "common_write_pitch",
    label: "Construire un pitch",
    description: "Rédiger un message commercial contextualisé.",
    icon: "generate_pitch",
    category: "common",
    status: "coming_soon",
  },
  common_write_email: {
    id: "common_write_email",
    label: "Rédiger un email",
    description: "Composer un email professionnel assisté par l'IA.",
    icon: "write_email",
    category: "common",
    status: "coming_soon",
  },
  common_recommendations: {
    id: "common_recommendations",
    label: "Recommandations",
    description: "Formuler des recommandations stratégiques basées sur les données.",
    icon: "recommendations",
    category: "common",
    status: "coming_soon",
  },
  common_search_news: {
    id: "common_search_news",
    label: "Rechercher des actualités",
    description: "Lancer une recherche d'actualités sur un secteur ou un compte.",
    icon: "search_news",
    category: "common",
    status: "coming_soon",
  },
  common_roadmap: {
    id: "common_roadmap",
    label: "Roadmap commerciale",
    description: "Construire une feuille de route commerciale structurée.",
    icon: "build_roadmap",
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

type RouteMapping = {
  pattern: string
  label: string
  actionIds: string[]
}

const ROUTE_MAPPINGS: RouteMapping[] = [
  {
    pattern: "/prospection/accounts/",
    label: "Fiche compte",
    actionIds: ["deep_analysis", "generate_pitch", "build_roadmap", "create_campaign", "search_news", "scan_contacts"],
  },
  {
    pattern: "/prospection/accounts",
    label: "Comptes & contacts",
    actionIds: ["search_news", "scan_contacts", "deep_analysis", "generate_pitch"],
  },
  {
    pattern: "/prospection/approche-sectorielle",
    label: "Approche sectorielle",
    actionIds: ["common_sector_analysis", "search_news", "build_roadmap"],
  },
  {
    pattern: "/prospection",
    label: "CRM & Prospection",
    actionIds: ["search_news", "scan_contacts", "create_campaign", "build_roadmap"],
  },
  {
    pattern: "/missions/opps",
    label: "Opportunités",
    actionIds: ["match_profiles", "prioritize_pipeline", "initiate_quote", "analyze_needs"],
  },
  {
    pattern: "/staffing",
    label: "Staffing",
    actionIds: ["match_profiles", "suggest_reassignment", "analyze_needs", "detect_risks"],
  },
  {
    pattern: "/missions",
    label: "Engagements",
    actionIds: ["detect_risks", "analyze_margins", "forecast_revenue"],
  },
  {
    pattern: "/consultants/pool-competences",
    label: "Pool de compétences",
    actionIds: ["analyze_skill_gaps", "suggest_training", "match_profiles"],
  },
  {
    pattern: "/consultants/activite-conges",
    label: "Activité & congés",
    actionIds: ["analyze_activity", "detect_anomalies"],
  },
  {
    pattern: "/consultants",
    label: "Équipe",
    actionIds: ["analyze_skill_gaps", "suggest_training", "analyze_activity"],
  },
  {
    pattern: "/recruitment",
    label: "Recrutement",
    actionIds: ["match_profiles", "scan_contacts", "analyze_skill_gaps", "initiate_offer"],
  },
  {
    pattern: "/finance",
    label: "Finance",
    actionIds: ["analyze_margins", "forecast_revenue", "detect_anomalies"],
  },
  {
    pattern: "/cockpit",
    label: "Cockpit",
    actionIds: ["weekly_brief", "action_priorities", "pipeline_insights"],
  },
  {
    pattern: "/agenda",
    label: "Agenda",
    actionIds: ["action_priorities", "weekly_brief"],
  },
]

const COMMON_ACTION_IDS = [
  "common_sector_analysis",
  "common_write_pitch",
  "common_write_email",
  "common_recommendations",
  "common_search_news",
  "common_roadmap",
  "common_report",
  "common_priorities",
]

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
  const commonActions = COMMON_ACTION_IDS
    .map((id) => ACTIONS[id])
    .filter((a): a is IntelligenceAction => !!a && !contextualIds.has(a.id))

  return {
    label: bestMapping?.label ?? "Navigation",
    contextualActions,
    commonActions,
  }
}
