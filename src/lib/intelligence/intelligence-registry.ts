// ─────────────────────────────────────────────────────────────────────────────
//  Intelligence Registry — source unique du contenu du Cockpit Intelligence
//
//  Mappe chaque page fonctionnelle vers ses Actions et ses Modules.
//  Le mode Compte (entityContext.entityType défini) court-circuite ce registre
//  et utilise AccountPanelContent — ce registre ne pilote que le mode Page.
// ─────────────────────────────────────────────────────────────────────────────

import { MONTHLY_WATCH_MISSION_ACTION_ID } from "@/features/intelligence-missions/components/mission-composer-model"

export type IntelligenceActionStatus = "active" | "coming_soon"

export type IntelligenceAction = {
  id: string
  label: string
  description: string
  icon: IntelligenceIconKey
  status: IntelligenceActionStatus
  requiresEntity?: boolean
}

export type CockpitModuleStatus = "active" | "disabled" | "coming_soon"

export type CockpitModuleIconKey =
  | "financial_modeling"
  | "activity_leave"
  | "pool_competences"
  | "automation_metrics"
  | "commercial_activity"
  | "source_management"
  | "cadence_simulator"
  | "portfolio_atlas"
  | "playbooks"
  | "revenue_modeling"
  | "agenda_light"

/**
 * Comment un module s'ouvre. Déclaratif : le rendu mobile ne connaît plus d'id
 * en dur (`module.id === "financial_modeling"`), il lit ce champ.
 *
 *  - `route`    : navigation vers `href`.
 *  - `launcher` : monte un flow client, chargé à l'ouverture via `next/dynamic`.
 *                 `href` reste facultatif et purement informatif (page d'origine).
 *
 * Un module `launcher` doit être AUTOPORTANT : il charge ses propres données
 * (server action appelée depuis le client). Un composant qui exige un snapshot
 * en prop ne peut pas être monté depuis le panneau — il reste `coming_soon`
 * tant que son chargeur n'existe pas.
 */
export type CockpitModuleKind = "route" | "launcher"

export type CockpitModule = {
  id: string
  label: string
  description: string
  icon: CockpitModuleIconKey
  kind: CockpitModuleKind
  href?: string
  status: CockpitModuleStatus
}

export type PageCockpitConfig = {
  pattern: string
  label: string
  actionIds: string[]
  moduleIds: string[]
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

export type CockpitDisplayMode = "company" | "entity" | "page"

export function resolveCockpitDisplayMode(
  entityType: IntelligenceEntityType | null | undefined,
): CockpitDisplayMode {
  if (entityType === "company") return "company"
  if (entityType) return "entity"
  return "page"
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
    status: "coming_soon",
  },
  scan_contacts: {
    id: "scan_contacts",
    label: "Scanner les contacts",
    description: "Identifier les décideurs clés et enrichir les fiches contacts.",
    icon: "scan_contact",
    status: "active",
  },
  deep_analysis: {
    id: "deep_analysis",
    label: "Analyse approfondie",
    description: "Lancer une analyse complète du compte : identité, positionnement, signaux.",
    icon: "deep_analysis",
    status: "coming_soon",
    requiresEntity: true,
  },
  generate_pitch: {
    id: "generate_pitch",
    label: "Construire un pitch",
    description: "Générer un message contextualisé à partir des données du compte.",
    icon: "generate_pitch",
    status: "coming_soon",
    requiresEntity: true,
  },
  build_roadmap: {
    id: "build_roadmap",
    label: "Roadmap commerciale",
    description: "Élaborer une feuille de route commerciale personnalisée.",
    icon: "build_roadmap",
    status: "coming_soon",
  },
  create_campaign: {
    id: "create_campaign",
    label: "Créer une campagne",
    description: "Configurer une campagne de prospection multi-canal.",
    icon: "create_campaign",
    status: "coming_soon",
  },
  prioritize_accounts: {
    id: "prioritize_accounts",
    label: "Prioriser les comptes",
    description: "Identifier les comptes prioritaires à relancer d'après les signaux d'achat et la fraîcheur relationnelle.",
    icon: "prioritize",
    status: "coming_soon",
  },
  mission_activation_portefeuille: {
    id: "mission_activation_portefeuille",
    label: "Intelligence Mission — Activation portefeuille",
    description: "Identifier les comptes prioritaires à relancer selon les signaux d'achat et la fraîcheur relationnelle.",
    icon: "prioritize",
    status: "coming_soon",
  },
  review_account: {
    id: "review_account",
    label: "Revue de compte client",
    description: "Croiser relation commerciale, intelligence compte et rentabilité de la delivery pour un compte donné.",
    icon: "report",
    status: "coming_soon",
  },
  activity_report: {
    id: "activity_report",
    label: "Bilan d'activité",
    description: "Synthétiser les interactions et le volume de relances du portefeuille.",
    icon: "weekly_brief",
    status: "coming_soon",
  },
  prioritize_followups: {
    id: "prioritize_followups",
    label: "Prioriser les relances",
    description: "Classer les comptes sans contact récent par urgence de reprise.",
    icon: "prioritize",
    status: "coming_soon",
  },
  match_profiles: {
    id: "match_profiles",
    label: "Matcher les profils",
    description: "Classer candidats et collaborateurs disponibles sur un besoin : compétences, séniorité, TJM, practice.",
    icon: "match_profiles",
    status: "active",
  },
  prioritize_pipeline: {
    id: "prioritize_pipeline",
    label: "Prioriser le pipeline",
    description: "Classer les opportunités par probabilité de closing et valeur.",
    icon: "prioritize",
    status: "active",
  },
  post_mortem_pipeline: {
    id: "post_mortem_pipeline",
    label: "Post-mortem commercial",
    description: "Analyser les affaires gagnées et perdues du trimestre pour identifier les motifs récurrents de succès et d'échec.",
    icon: "report",
    status: "coming_soon",
  },
  detect_risks: {
    id: "detect_risks",
    label: "Détection de risques",
    description: "Identifier les risques sur les opportunités et engagements actifs.",
    icon: "detect_risks",
    status: "active",
  },
  initiate_quote: {
    id: "initiate_quote",
    label: "Initier un devis",
    description: "Initier la trame d'une proposition commerciale pour un staffing.",
    icon: "generate_pitch",
    status: "coming_soon",
  },
  initiate_offer: {
    id: "initiate_offer",
    label: "Initier une offre",
    description: "Initier la trame d'une proposition d'embauche.",
    icon: "generate_pitch",
    status: "coming_soon",
  },
  analyze_needs: {
    id: "analyze_needs",
    label: "Analyser les besoins",
    description: "Cartographier les compétences recherchées et les écarts.",
    icon: "analyze_skills",
    status: "active",
  },
  project_portfolio_review: {
    id: "project_portfolio_review",
    label: "Revue de portefeuille",
    description: "Synthétiser avancement, budget et risques des projets actifs.",
    icon: "report",
    status: "coming_soon",
  },
  analyze_skill_gaps: {
    id: "analyze_skill_gaps",
    label: "Écarts de compétences",
    description: "Analyser les gaps entre compétences disponibles et demande marché.",
    icon: "analyze_skills",
    status: "coming_soon",
  },
  suggest_training: {
    id: "suggest_training",
    label: "Plan de formation",
    description: "Recommander des formations en fonction des tendances marché.",
    icon: "recommendations",
    status: "coming_soon",
  },
  analyze_activity: {
    id: "analyze_activity",
    label: "Analyse & recommandations",
    description: "Analyser les indicateurs d'activité et formuler des recommandations.",
    icon: "recommendations",
    status: "active",
  },
  forecast_availability: {
    id: "forecast_availability",
    label: "Prévoir les disponibilités",
    description: "Anticiper qui se libère dans les 3 mois à venir et rapprocher ces disponibilités des besoins ouverts.",
    icon: "forecast",
    status: "active",
  },
  analyze_margins: {
    id: "analyze_margins",
    label: "Analyse des marges",
    description: "Décrypter les marges par mission, client et consultant.",
    icon: "analyze_margins",
    status: "active",
  },
  forecast_revenue: {
    id: "forecast_revenue",
    label: "Prévision de CA",
    description: "Projeter le chiffre d'affaires sur les prochains trimestres.",
    icon: "forecast",
    status: "active",
  },
  detect_anomalies: {
    id: "detect_anomalies",
    label: "Détecter les anomalies",
    description: "Identifier les écarts financiers et les incohérences de facturation.",
    icon: "detect_risks",
    status: "coming_soon",
  },
  analyze_funnel: {
    id: "analyze_funnel",
    label: "Analyser le funnel",
    description: "Identifier les étapes de recrutement qui bloquent le plus de candidats.",
    icon: "report",
    status: "active",
  },
  analyze_hiring_delays: {
    id: "analyze_hiring_delays",
    label: "Funnel & Délais Recrutement",
    description: "Analyser où le funnel de recrutement perd des candidats et repérer les délais anormaux entre étapes.",
    icon: "report",
    status: "coming_soon",
  },
  // ── Adaptateurs Lot C : point d'entrée contextualisé vers une capacité
  //    transverse existante (INTEL-020 rédaction, manual_custom V2). Aucun
  //    moteur propre — c'est tout l'intérêt.
  prepare_meeting: {
    id: "prepare_meeting",
    label: "Préparer un RDV",
    description: "Construire la fiche de préparation d'un rendez-vous : contexte, angles, objections et prochaines étapes.",
    icon: "generate_pitch",
    status: "active",
  },
  prepare_candidate: {
    id: "prepare_candidate",
    label: "Préparer un candidat",
    description: "Préparer un profil à une étape de son parcours : entretien client, soutenance ou point de closing.",
    icon: "match_profiles",
    status: "active",
  },
  candidate_communication: {
    id: "candidate_communication",
    label: "Communication candidat",
    description: "Composer un message candidat contextualisé : approche, relance, feedback ou invitation.",
    icon: "write_email",
    status: "active",
  },
  manual_analysis: {
    id: "manual_analysis",
    label: "Analyse à la demande",
    description: "Croiser jusqu'à trois familles de sources autour d'une intention libre, avec preuves rattachées.",
    icon: "deep_analysis",
    status: "active",
  },
  cross_analysis: {
    id: "cross_analysis",
    label: "Analyse transverse",
    description: "Analyser ensemble digests, signaux, documents et collections pour en tirer une lecture sourcée.",
    icon: "deep_analysis",
    status: "active",
  },
  skills_vs_needs: {
    id: "skills_vs_needs",
    label: "Compétences VS besoins",
    description: "Confronter la capacité sourcée (collaborateurs + vivier) à la demande reçue sur 12 mois, tendance 90 jours.",
    icon: "analyze_skills",
    status: "active",
  },
  analyze_automation_errors: {
    id: "analyze_automation_errors",
    label: "Analyser les erreurs",
    description: "Regrouper les pannes des workflows sur 30 jours et distinguer les vraies erreurs des runs bloqués.",
    icon: "detect_risks",
    status: "active",
  },
  analyze_automation_costs: {
    id: "analyze_automation_costs",
    label: "Analyser les coûts",
    description: "Répartir le coût des automatisations par workflow, mesurer la dérive et signaler les coûts incomplets.",
    icon: "analyze_margins",
    status: "active",
  },
  prioritize_automation_fixes: {
    id: "prioritize_automation_fixes",
    label: "Prioriser les corrections",
    description: "Ordonner les workflows à corriger selon le taux d'échec, le volume, les runs bloqués et la récence.",
    icon: "prioritize",
    status: "active",
  },
  upcoming_deadlines: {
    id: "upcoming_deadlines",
    label: "Anticiper les échéances",
    description: "Consolider sur 30/60/90 jours les fins de mission, closings attendus, absences longues et fermetures client.",
    icon: "forecast",
    status: "active",
  },
  weekly_brief: {
    id: "weekly_brief",
    label: "Brief hebdomadaire",
    description: "Priorités de la semaine, alertes à traiter et actions recommandées — calculées, pas devinées.",
    icon: "weekly_brief",
    status: "active",
  },
  action_priorities: {
    id: "action_priorities",
    label: "Priorités",
    description: "Recommander les actions les plus impactantes à mener cette semaine.",
    icon: "prioritize",
    status: "active",
  },
  pipeline_insights: {
    id: "pipeline_insights",
    label: "Insights pipeline",
    description: "Vue synthétique de l'état du pipe et des risques de dérapage.",
    icon: "sparkle",
    status: "active",
  },
  prepare_day: {
    id: "prepare_day",
    label: "Préparer la journée",
    description: "Structurer les priorités et rendez-vous du jour.",
    icon: "prioritize",
    status: "active",
  },
  flag_unprepared_meetings: {
    id: "flag_unprepared_meetings",
    label: "RDV à préparer",
    description: "Repérer les rendez-vous à venir sans brief associé.",
    icon: "detect_risks",
    status: "coming_soon",
  },
  [MONTHLY_WATCH_MISSION_ACTION_ID]: {
    id: MONTHLY_WATCH_MISSION_ACTION_ID,
    label: "Analyse mensuelle de la veille",
    description: "Identifier les tendances, signaux faibles, évolutions réglementaires, opportunités, risques et actions prioritaires d’une période de veille.",
    icon: "deep_analysis",
    status: "active",
  },

  // Actions transverses disponibles uniquement lorsqu'une page les référence
  // explicitement dans sa configuration.

  common_write_email: {
    id: "common_write_email",
    label: "Rédiger un email",
    description: "Composer un email professionnel assisté par l'IA.",
    icon: "write_email",
    status: "coming_soon",
  },
  common_sector_analysis: {
    id: "common_sector_analysis",
    label: "Analyse sectorielle",
    description: "Obtenir une analyse de marché par secteur d'activité.",
    icon: "sector_analysis",
    status: "coming_soon",
  },
  common_report: {
    id: "common_report",
    label: "Générer un rapport",
    description: "Produire un rapport consolidé à partir des données existantes.",
    icon: "report",
    status: "active",
  },
  common_priorities: {
    id: "common_priorities",
    label: "Priorités",
    description: "Identifier et hiérarchiser les actions à mener.",
    icon: "prioritize",
    status: "coming_soon",
  },
}

// ─── Modules définis ─────────────────────────────────────────────────────────

const MODULES: Record<string, CockpitModule> = {
  // ── Prêts : moteur réel, surface mobile réelle ──────────────────────────
  financial_modeling: {
    id: "financial_modeling",
    label: "Modélisation financière",
    description: "Analyses & scénarios",
    icon: "financial_modeling",
    kind: "launcher",
    href: "/finance",
    status: "active",
  },
  activity_leave: {
    id: "activity_leave",
    label: "Activité & congés",
    description: "Planning & absences",
    icon: "activity_leave",
    kind: "route",
    href: "/consultants/activite-conges",
    status: "active",
  },
  pool_competences: {
    id: "pool_competences",
    label: "Pool de compétences",
    description: "Offre & tension",
    icon: "pool_competences",
    kind: "route",
    href: "/consultants/pool-competences",
    status: "active",
  },
  automation_metrics: {
    id: "automation_metrics",
    label: "Métriques",
    description: "Volume, coûts & incidents",
    icon: "automation_metrics",
    kind: "launcher",
    href: "/automations",
    status: "active",
  },

  // ── Déclarés mais pas ouvrables : la surface existe, son chargeur non ───
  //
  //  Ces quatre modules sont montés aujourd'hui DANS leur page, qui leur passe
  //  un snapshot chargé côté serveur (`snapshot`, `baseline`, `overview`). Le
  //  panneau Cockpit est un composant client sans ces données : les brancher
  //  demande d'écrire le chargeur autoportant correspondant, pas de recâbler
  //  le panneau. Ils restent honnêtement `coming_soon` d'ici là.
  commercial_activity: {
    id: "commercial_activity",
    label: "Métriques activité",
    description: "Rythme & résultats commerciaux",
    icon: "commercial_activity",
    kind: "launcher",
    status: "coming_soon",
  },
  source_management: {
    id: "source_management",
    label: "Gestion des sources",
    description: "Socle éditorial & corpus",
    icon: "source_management",
    kind: "launcher",
    href: "/veille",
    status: "active",
  },
  cadence_simulator: {
    id: "cadence_simulator",
    label: "Simuler la cadence",
    description: "Coût & fréquence des workflows",
    icon: "cadence_simulator",
    kind: "launcher",
    href: "/automations",
    status: "active",
  },
  portfolio_atlas: {
    id: "portfolio_atlas",
    label: "Atlas du portefeuille",
    description: "Missions, clients & marges",
    icon: "portfolio_atlas",
    kind: "launcher",
    href: "/missions",
    status: "coming_soon",
  },

  // ── Capacité métier absente — chantiers dédiés, pas un défaut de câblage ─
  playbooks: {
    id: "playbooks",
    label: "Playbooks",
    description: "Angles & argumentaires par segment",
    icon: "playbooks",
    kind: "launcher",
    status: "coming_soon",
  },
  revenue_modeling: {
    id: "revenue_modeling",
    label: "Modélisation du CA",
    description: "Scénarios gain / perte",
    icon: "revenue_modeling",
    kind: "launcher",
    status: "coming_soon",
  },
  agenda_light: {
    id: "agenda_light",
    label: "Agenda light",
    description: "Prochaines échéances",
    icon: "agenda_light",
    kind: "launcher",
    status: "active",
  },
}

// ─── Page → Actions + Modules mapping ────────────────────────────────────────
//
//  Source de vérité de la nav : src/lib/navigation/main-menu.config.ts.
//  Aucune action ou module n'est injecté implicitement. Une page sans contenu
//  configuré conserve seulement les raccourcis fixes du shell mobile.
//  `/staffing` volontairement absent : route orpheline, retirée de la nav
//  principale au profit de `/missions/opps` (Besoins & Staffing).

export const PAGE_COCKPIT_CONFIGS: PageCockpitConfig[] = [
  // ── Général ───────────────────────────────────────────────────────────
  {
    pattern: "/cockpit",
    label: "Cockpit",
    actionIds: ["action_priorities", "weekly_brief", "pipeline_insights", "mission_activation_portefeuille"],
    moduleIds: ["financial_modeling", "activity_leave"],
  },
  {
    pattern: "/agenda",
    label: "Agenda",
    actionIds: ["prepare_day", "prepare_meeting", "upcoming_deadlines", "action_priorities", "weekly_brief"],
    moduleIds: ["commercial_activity"],
  },

  // ── CRM & Prospection ─────────────────────────────────────────────────
  {
    pattern: "/prospection/accounts/:companyId",
    label: "Fiche compte",
    actionIds: ["deep_analysis", "generate_pitch", "build_roadmap", "scan_contacts"],
    moduleIds: [],
  },
  {
    pattern: "/prospection/accounts",
    label: "Comptes & contacts",
    actionIds: ["scan_contacts", "deep_analysis", "generate_pitch"],
    moduleIds: [],
  },
  {
    pattern: "/intelligence",
    label: "Business Intelligence",
    actionIds: ["manual_analysis"],
    moduleIds: ["playbooks"],
  },
  {
    pattern: "/veille",
    label: "Veille & Actualités",
    actionIds: [MONTHLY_WATCH_MISSION_ACTION_ID, "cross_analysis"],
    moduleIds: ["source_management"],
  },
  {
    pattern: "/prospection-intelligence",
    label: "Prospection Intelligence",
    actionIds: ["prioritize_accounts", "review_account", "create_campaign"],
    moduleIds: ["playbooks", "agenda_light"],
  },
  {
    pattern: "/reports",
    label: "Rapports & Rédaction",
    actionIds: ["common_report", "cross_analysis"],
    moduleIds: [],
  },

  // ── Besoins, Staffing et Engagements ─────────────────────────────────
  {
    pattern: "/missions/opps",
    label: "Besoins & Staffing",
    actionIds: ["prioritize_pipeline", "match_profiles", "prepare_candidate", "post_mortem_pipeline", "analyze_needs"],
    moduleIds: ["financial_modeling", "revenue_modeling"],
  },
  {
    pattern: "/missions",
    label: "Engagements",
    actionIds: ["analyze_margins", "detect_risks", "forecast_revenue", "upcoming_deadlines"],
    moduleIds: ["portfolio_atlas", "activity_leave"],
  },

  // ── Équipe et Recrutement ─────────────────────────────────────────────
  {
    pattern: "/consultants",
    label: "Équipe",
    actionIds: ["forecast_availability", "skills_vs_needs", "match_profiles", "analyze_activity"],
    moduleIds: ["pool_competences", "activity_leave"],
  },
  {
    pattern: "/recruitment",
    label: "Recrutement",
    actionIds: ["analyze_hiring_delays", "skills_vs_needs", "candidate_communication", "match_profiles", "analyze_funnel"],
    moduleIds: ["agenda_light"],
  },

  // ── Finance ───────────────────────────────────────────────────────────
  {
    pattern: "/finance",
    label: "Finance",
    actionIds: ["analyze_margins", "forecast_revenue", "detect_anomalies"],
    moduleIds: ["portfolio_atlas", "activity_leave"],
  },

  // ── Outils / Paramètres — placeholders, pas d'action inventée ────────
  {
    pattern: "/knowledge",
    label: "Knowledge Hub",
    actionIds: [],
    moduleIds: [],
  },
  {
    pattern: "/automations",
    label: "Automatisations",
    actionIds: ["common_report", "analyze_automation_errors", "analyze_automation_costs", "prioritize_automation_fixes"],
    moduleIds: ["automation_metrics", "cadence_simulator"],
  },
  {
    pattern: "/settings",
    label: "Paramètres",
    actionIds: [],
    moduleIds: [],
  },
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
): ResolvedEntityIntelligenceContext {
  const actionIds = ENTITY_ACTION_IDS[entityType] ?? []
  const actions = actionIds
    .map((id) => ACTIONS[id])
    .filter((a): a is IntelligenceAction => !!a)

  return { actions }
}

// ─── Résolution publique ─────────────────────────────────────────────────────

export type ResolvedEntityIntelligenceContext = {
  actions: IntelligenceAction[]
}

export type ResolvedPageCockpitConfig = {
  config: PageCockpitConfig | null
  label: string
  actions: IntelligenceAction[]
  modules: CockpitModule[]
}

function splitPath(pathname: string): string[] {
  return pathname.split(/[?#]/, 1)[0].split("/").filter(Boolean)
}

export function doesCockpitPatternMatch(pathname: string, pattern: string): boolean {
  const pathnameSegments = splitPath(pathname)
  const patternSegments = splitPath(pattern)

  if (pathnameSegments.length < patternSegments.length) return false

  return patternSegments.every((segment, index) => (
    segment.startsWith(":") || segment === pathnameSegments[index]
  ))
}

function patternSpecificity(pattern: string): number {
  const segments = splitPath(pattern)
  const literalSegments = segments.filter((segment) => !segment.startsWith(":")).length

  return segments.length * 100 + literalSegments
}

export function resolvePageCockpitConfig(pathname: string): ResolvedPageCockpitConfig {
  let bestConfig: PageCockpitConfig | null = null
  let bestSpecificity = -1

  for (const config of PAGE_COCKPIT_CONFIGS) {
    if (doesCockpitPatternMatch(pathname, config.pattern)) {
      const specificity = patternSpecificity(config.pattern)
      if (specificity > bestSpecificity) {
        bestSpecificity = specificity
        bestConfig = config
      }
    }
  }

  const actions = (bestConfig?.actionIds ?? [])
    .map((id) => ACTIONS[id])
    .filter((action): action is IntelligenceAction => !!action)
  const modules = (bestConfig?.moduleIds ?? [])
    .map((id) => MODULES[id])
    .filter((module): module is CockpitModule => !!module)

  return {
    config: bestConfig,
    label: bestConfig?.label ?? "Navigation",
    actions,
    modules,
  }
}
