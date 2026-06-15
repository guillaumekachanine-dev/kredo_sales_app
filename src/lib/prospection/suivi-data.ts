// ─────────────────────────────────────────────────────────────────────────────
//  Suivi des Actions — couche données (action-first · "Impulsion Globale")
//
//  Cette couche est le cockpit d'ACTION de la prospection Intelligence :
//  gestion de l'impulsion commerciale, actions critiques en retard,
//  relances recommandées par l'IA, flux d'actions personnel.
//
//  ⚠️ Données mockées pour le shell (Lot 1). Chaque bloc porte un repère // SEAM:
//  qui indique la source Supabase à brancher. `getSuiviData()` est le SEUL point
//  d'accès — quand le réel arrive, on remplace l'intérieur sans toucher les vues.
//
//  Modèle cible (à brancher, RLS workspace_id = current_workspace_id()) :
//   - actions critiques   → table `tasks` WHERE status != 'done' AND due_at < now()
//   - relances IA         → moteur n8n next-best-action (table `ai_recommendations`)
//   - flux d'actions      → `tasks` JOIN `interactions` ORDER BY priority
//   - KPIs impulsion      → agrégats `tasks` + `sequences` + `interactions`
//   - objectif journalier → table `user_daily_goals` (à créer, lot Suivi)
// ─────────────────────────────────────────────────────────────────────────────

export type SuiviStatus = "danger" | "warning" | "success" | "neutral"

/** Canal d'action standardisé */
export type SuiviChannel = "email" | "linkedin" | "call" | "meeting" | "task"

// ── KPI "Impulsion Globale" ──────────────────────────────────────────────────

export type SuiviImpulsionKpi = {
  id: string
  /** Label court affiché sous la valeur */
  label: string
  /** Valeur principale (ex: "7", "45/60 actions", "68%", "12h / 18h") */
  value: string
  /** Sous-texte ou valeur secondaire optionnelle */
  subLabel?: string
  /** Variante de KPI — pilote le rendu (gauge | progress | big | workload) */
  variant: "gauge" | "progress" | "big" | "workload"
  /** Statut sémantique pour la couleur */
  status: SuiviStatus
  /** Valeur numérique 0-100 pour la jauge/barre de progression */
  numericValue?: number
  /** Pour variant=gauge : valeur max */
  gaugeMax?: number
}

// ── Action Critique / Retard ─────────────────────────────────────────────────

export type SuiviActionCritique = {
  id: string
  /** Nom du consultant ou collaborateur responsable */
  consultantName: string
  /** Initiales pour l'avatar */
  avatarInitials: string
  /** Practice ou pôle */
  practice?: string
  /** Type d'action */
  channel: SuiviChannel
  /** Titre court de l'action */
  actionTitle: string
  /** Description courte de l'action à mener */
  description: string
  /** Label du retard (ex: "3 jours") */
  overdueLabel: string
  /** Statut sémantique global */
  status: SuiviStatus
  /** Score de prédiction de succès IA (0.0-1.0) */
  aiSuccessPrediction: number
  /** Prochaine étape recommandée par l'IA */
  aiRecommendedStep: string
  /** Entreprise ciblée */
  company?: string
  companyId?: string
}

// ── Relance Recommandée IA ──────────────────────────────────────────────────

export type SuiviRelanceIA = {
  id: string
  /** Nom de l'entreprise cible */
  company: string
  companyId?: string
  /** Initiales pour l'avatar de l'entreprise */
  avatarInitials: string
  /** Type d'action recommandée */
  channel: SuiviChannel
  /** Titre de la relance recommandée */
  title: string
  /** Justification IA courte */
  description: string
  /** Secteur d'activité de l'entreprise */
  sector: string
  /** Score de prédiction de succès IA (0.0-1.0) */
  aiSuccessPrediction: number
  /** Prochaine étape recommandée */
  aiRecommendedStep: string
}

// ── Flux d'Actions Personnel (Mobile) ───────────────────────────────────────

export type SuiviFluxAction = {
  id: string
  /** Type d'action — pilote l'icône */
  channel: SuiviChannel
  /** Label du canal affiché */
  channelLabel: string
  /** Date ou délai (ex: "3 jours 2021") */
  dateLabel: string
  /** Entreprise cible */
  company?: string
  /** Progression de la tâche 0-100 */
  progress: number
  /** Statut sémantique */
  status: SuiviStatus
}

// ── Dashboard Personnel (Mobile) ─────────────────────────────────────────────

export type SuiviDashboardPersonnel = {
  actionsUrgentesCount: number
  actionsUrgentesTotal: number
  objectifJournalierPct: number
}

// ── Prospects à Relancer en Urgence (Mobile) ─────────────────────────────────

export type SuiviProspectUrgent = {
  id: string
  company: string
  companyId?: string
  raison: string
  sector: string
}

// ── Type global ──────────────────────────────────────────────────────────────

export type SuiviData = {
  /** KPIs de la bannière "Impulsion Globale" */
  impulsionKpis: SuiviImpulsionKpi[]
  /** Actions critiques / en retard (panel gauche desktop) */
  actionsCritiques: SuiviActionCritique[]
  /** Relances recommandées par l'IA (panel droit desktop) */
  relancesIA: SuiviRelanceIA[]
  /** Flux d'actions personnel (mobile) */
  fluxActions: SuiviFluxAction[]
  /** Dashboard personnel (mobile) */
  dashboardPersonnel: SuiviDashboardPersonnel
  /** Prospects à relancer en urgence (mobile) */
  prospectsUrgents: SuiviProspectUrgent[]

  // ── Rétrocompatibilité avec les vues legacy (non utilisées dans le nouveau design) ──
  kpis?: SuiviKpi[]
  deadlines?: SuiviDeadline[]
  roadmap?: SuiviRoadmapItem[]
  campaigns?: SuiviCampaign[]
  recommendations?: SuiviRecommendation[]
  interactions?: SuiviInteraction[]
}

// ── Types legacy (conservés pour ne pas casser les imports existants) ─────────

export type SuiviKpi = { id: string; label: string; value: string; status: SuiviStatus }
export type SuiviDeadline = {
  id: string; title: string; company: string; companyId?: string
  channel: SuiviChannel; dueLabel: string; overdue?: boolean; status: SuiviStatus
}
export type SuiviRoadmapItem = {
  id: string; company: string; companyId: string; move: string
  horizon: "court_terme" | "moyen_terme" | "long_terme"; scheduled: boolean
}
export type SuiviCampaign = {
  id: string; name: string; status: "active" | "paused" | "draft" | "done"
  channel: string; targets: number; progress: number; replyRate: number; nextStepLabel: string
}
export type SuiviRecommendation = {
  id: string; title: string; rationale: string; company?: string; companyId?: string
}
export type SuiviInteraction = {
  id: string; company: string; companyId?: string; type: string
  summary: string; dateLabel: string; sentiment?: "positive" | "neutral" | "negative"
}

// ── Mock (shell Lot 1) ────────────────────────────────────────────────────────

const MOCK: SuiviData = {
  // SEAM: agrégats `tasks` + `sequences` + `interactions` + user_daily_goals
  impulsionKpis: [
    {
      id: "ik1",
      label: "Actions Urgentes / Retard",
      value: "7",
      variant: "gauge",
      status: "danger",
      numericValue: 7,
      gaugeMax: 20,
    },
    {
      id: "ik2",
      label: "Total Actions Semaine",
      value: "45/60 actions",
      subLabel: "45/60",
      variant: "progress",
      status: "neutral",
      numericValue: 75,
    },
    {
      id: "ik3",
      label: "Conversion d'Actions (Succès %)",
      value: "68%",
      variant: "big",
      status: "success",
      numericValue: 68,
    },
    {
      id: "ik4",
      label: "Charge de Travail (H)",
      value: "12h / 18h",
      variant: "workload",
      status: "warning",
      numericValue: 67,
    },
  ],

  // SEAM: `tasks` WHERE status != 'done' AND due_at < now() + filter collaborateur
  actionsCritiques: [
    {
      id: "ac1",
      consultantName: "Consultant Name A",
      avatarInitials: "CA",
      practice: "Digital",
      channel: "call",
      actionTitle: "Appel",
      description: "Description commencez l'appel à clientts…",
      overdueLabel: "3 jours",
      status: "danger",
      aiSuccessPrediction: 0.72,
      aiRecommendedStep: "Relance par email + LinkedIn",
      company: "BNP Paribas",
      companyId: "bnp",
    },
    {
      id: "ac2",
      consultantName: "Consultant Practice B",
      avatarInitials: "PB",
      practice: "Cloud",
      channel: "meeting",
      actionTitle: "Réunion de Cadrage",
      description: "Description sic urins en re·m name de nis…",
      overdueLabel: "3 jours",
      status: "danger",
      aiSuccessPrediction: 0.58,
      aiRecommendedStep: "Proposer un créneau Teams",
      company: "AXA Group",
      companyId: "axa",
    },
    {
      id: "ac3",
      consultantName: "Consultant Senior C",
      avatarInitials: "SC",
      practice: "Data",
      channel: "email",
      actionTitle: "Envoi Étude Sectorielle",
      description: "Préparer et envoyer l'étude Assurance / IA au DSI…",
      overdueLabel: "5 jours",
      status: "danger",
      aiSuccessPrediction: 0.84,
      aiRecommendedStep: "Envoyer étude puis appeler J+2",
      company: "Generali",
      companyId: "generali",
    },
  ],

  // SEAM: moteur IA n8n → table `ai_recommendations` filtrée par secteur
  relancesIA: [
    {
      id: "ri1",
      company: "Expressions Parfumées",
      companyId: "expr-parf",
      avatarInitials: "EP",
      channel: "call",
      title: "Appel",
      description: "Description commerciale réunion de Cadrage…",
      sector: "Luxe & Cosmétique",
      aiSuccessPrediction: 0.79,
      aiRecommendedStep: "Planifier l'action",
    },
    {
      id: "ri2",
      company: "Expressions Parf.",
      companyId: "expr-parf-2",
      avatarInitials: "EP",
      channel: "email",
      title: "Email",
      description: "Description connects sivrequls réunion de Cadrage…",
      sector: "Luxe & Cosmétique",
      aiSuccessPrediction: 0.61,
      aiRecommendedStep: "Planifier l'action",
    },
    {
      id: "ri3",
      company: "Société Générale",
      companyId: "socgen",
      avatarInitials: "SG",
      channel: "linkedin",
      title: "LinkedIn",
      description: "Nouveau CTO détecté — fenêtre d'introduction optimale dans les 48h…",
      sector: "Finance & Banque",
      aiSuccessPrediction: 0.91,
      aiRecommendedStep: "Contacter le nouveau CTO",
    },
  ],

  // SEAM: `tasks` JOIN `interactions` ORDER BY priority — vue mobile flux
  fluxActions: [
    {
      id: "fa1",
      channel: "call",
      channelLabel: "Appeler",
      dateLabel: "3 jours 2021",
      company: "BNP Paribas",
      progress: 65,
      status: "danger",
    },
    {
      id: "fa2",
      channel: "meeting",
      channelLabel: "Planifier RDV",
      dateLabel: "3 jours 2021",
      company: "AXA Group",
      progress: 40,
      status: "warning",
    },
    {
      id: "fa3",
      channel: "task",
      channelLabel: "Consigner",
      dateLabel: "3 jours 2021",
      company: "L'Oréal",
      progress: 20,
      status: "neutral",
    },
  ],

  // SEAM: user_daily_goals + tasks urgentes du jour
  dashboardPersonnel: {
    actionsUrgentesCount: 3,
    actionsUrgentesTotal: 10,
    objectifJournalierPct: 60,
  },

  // SEAM: `ai_recommendations` WHERE urgency = 'high' ORDER BY score DESC
  prospectsUrgents: [
    { id: "pu1", company: "Generali", companyId: "generali", raison: "Score remonté après plan IT 2026", sector: "Assurance" },
    { id: "pu2", company: "L'Oréal", companyId: "loreal", raison: "Nouveau CTO — fenêtre d'intro", sector: "Luxe & Cosmétique" },
  ],

  // ── Legacy mock (rétrocompatibilité) ────────────────────────────────────────
  kpis: [
    { id: "k1", label: "Relances dues aujourd'hui", value: "5", status: "danger" },
    { id: "k2", label: "Réponses à traiter", value: "3", status: "warning" },
    { id: "k3", label: "Campagnes actives", value: "4", status: "success" },
    { id: "k4", label: "Comptes sans contact (30j)", value: "12", status: "warning" },
  ],
  deadlines: [],
  roadmap: [],
  campaigns: [],
  recommendations: [],
  interactions: [],
}

/**
 * Point d'accès unique des données Suivi des Actions (server-side).
 * Aujourd'hui : mock. Demain : requêtes Supabase parallélisées (Promise.all).
 */
export async function getSuiviData(): Promise<SuiviData> {
  return MOCK
}
