// ─────────────────────────────────────────────────────────────────────────────
//  Suivi de prospection — couche données (action-first)
//
//  Suivi est le cockpit d'ACTION de la prospection : organisation des campagnes,
//  échéances, interactions, recommandations IA, et synchro inter-modules. L'analyse
//  « décisionnelle » reste à la charge de la Synthèse.
//
//  ⚠️ Données mockées pour le shell (Lot 1). Chaque bloc porte un repère // SEAM:
//  qui indique la source Supabase à brancher. `getSuiviData()` est le SEUL point
//  d'accès — quand le réel arrive, on remplace l'intérieur sans toucher les vues.
//
//  Modèle cible (à brancher, RLS workspace_id = current_workspace_id()) :
//   - campagnes      → table `sequences` (à créer, lot Suivi) ou `opportunities`
//   - échéances      → `tasks` (entity_type/entity_id polymorphe, déjà en base)
//   - interactions   → `interactions` (déjà en base, occurred_at, type, sentiment)
//   - roadmap        → résultats moteur 0007 phase 4 (`ai_intelligence_results`,
//                      phase = 4) projetés en items actionnables par compte
//   Index utiles côté DB : (workspace_id, due_at), (workspace_id, occurred_at desc).
// ─────────────────────────────────────────────────────────────────────────────

export type SuiviStatus = "danger" | "warning" | "success" | "neutral"

/** Une échéance actionnable — « ce que je fais aujourd'hui / cette semaine ». */
export type SuiviDeadline = {
  id: string
  title: string
  company: string
  /** Compte lié → deep-link vers le hub Client Intelligence. */
  companyId?: string
  channel: "email" | "linkedin" | "call" | "meeting" | "task"
  dueLabel: string
  /** true = en retard / aujourd'hui (remonte en tête). */
  overdue?: boolean
  status: SuiviStatus
}

/** Une campagne / séquence d'engagement multicanale. */
export type SuiviCampaign = {
  id: string
  name: string
  status: "active" | "paused" | "draft" | "done"
  channel: string
  targets: number
  /** Progression 0-100 pour la jauge pure HTML. */
  progress: number
  replyRate: number
  nextStepLabel: string
}

/**
 * Item de roadmap commerciale issu de la phase 4 du Client Intelligence,
 * synchronisé ici pour devenir une action concrète. C'est le pont inter-modules.
 */
export type SuiviRoadmapItem = {
  id: string
  company: string
  companyId: string
  /** Recommandation stratégique (issue phase 4). */
  move: string
  /** Horizon proposé par le moteur. */
  horizon: "court_terme" | "moyen_terme" | "long_terme"
  /** Déjà converti en tâche/campagne ? pilote le CTA « Planifier ». */
  scheduled: boolean
}

/** Recommandation IA d'action suivante (next-best-action). */
export type SuiviRecommendation = {
  id: string
  title: string
  rationale: string
  company?: string
  companyId?: string
}

/** Interaction passée — fil d'activité récent. */
export type SuiviInteraction = {
  id: string
  company: string
  companyId?: string
  type: string
  summary: string
  dateLabel: string
  sentiment?: "positive" | "neutral" | "negative"
}

export type SuiviKpi = {
  id: string
  label: string
  value: string
  status: SuiviStatus
}

export type SuiviData = {
  kpis: SuiviKpi[]
  deadlines: SuiviDeadline[]
  roadmap: SuiviRoadmapItem[]
  campaigns: SuiviCampaign[]
  recommendations: SuiviRecommendation[]
  interactions: SuiviInteraction[]
}

// ── Mock (shell Lot 1) ───────────────────────────────────────────────────────

const MOCK: SuiviData = {
  // SEAM: agrégats dérivés de `tasks` + `sequences` + `interactions`.
  kpis: [
    { id: "k1", label: "Relances dues aujourd'hui", value: "5", status: "danger" },
    { id: "k2", label: "Réponses à traiter", value: "3", status: "warning" },
    { id: "k3", label: "Campagnes actives", value: "4", status: "success" },
    { id: "k4", label: "Comptes sans contact (30j)", value: "12", status: "warning" },
  ],

  // SEAM: `tasks` WHERE status != 'done' ORDER BY due_at — entity_type in (company, opportunity, contact).
  deadlines: [
    { id: "d1", title: "Relancer le DSI — 4 contacts en attente", company: "BNP Paribas", companyId: "bnp", channel: "email", dueLabel: "Aujourd'hui", overdue: true, status: "danger" },
    { id: "d2", title: "Appel de qualification besoin Cloud", company: "AXA Group", companyId: "axa", channel: "call", dueLabel: "Aujourd'hui", overdue: true, status: "danger" },
    { id: "d3", title: "Message LinkedIn au nouveau CTO", company: "L'Oréal", companyId: "loreal", channel: "linkedin", dueLabel: "Demain", status: "warning" },
    { id: "d4", title: "Préparer le RDV de cadrage", company: "Société Générale", companyId: "socgen", channel: "meeting", dueLabel: "Jeu. 14h", status: "neutral" },
    { id: "d5", title: "Envoyer l'étude sectorielle Assurance", company: "Generali", companyId: "generali", channel: "email", dueLabel: "Ven.", status: "neutral" },
  ],

  // SEAM: `ai_intelligence_results` WHERE phase = 4 — projeté en items actionnables par compte.
  roadmap: [
    { id: "r1", company: "AXA Group", companyId: "axa", move: "Positionner une offre d'audit d'architecture avant leur refonte Q3", horizon: "court_terme", scheduled: false },
    { id: "r2", company: "BNP Paribas", companyId: "bnp", move: "Capitaliser sur la levée digitale 50M€ : proposer un centre de service React", horizon: "court_terme", scheduled: true },
    { id: "r3", company: "L'Oréal", companyId: "loreal", move: "Créer le lien avec le nouveau CTO via une note de cadrage data", horizon: "moyen_terme", scheduled: false },
  ],

  // SEAM: table `sequences` (à créer) — stats agrégées par campagne.
  campaigns: [
    { id: "c1", name: "ESN — Pôle Cloud & Architecture", status: "active", channel: "Email → LinkedIn", targets: 84, progress: 68, replyRate: 14.2, nextStepLabel: "Relance #2 prévue mer." },
    { id: "c2", name: "Sourcing IA — React / Next.js", status: "active", channel: "LinkedIn", targets: 64, progress: 41, replyRate: 23.4, nextStepLabel: "12 messages à valider" },
    { id: "c3", name: "Assurance — DSI & Direction métier", status: "paused", channel: "Email", targets: 38, progress: 12, replyRate: 0, nextStepLabel: "En pause — clé API à renouveler" },
    { id: "c4", name: "Renouvellement comptes dormants", status: "draft", channel: "Email", targets: 21, progress: 0, replyRate: 0, nextStepLabel: "Brouillon — à lancer" },
  ],

  // SEAM: moteur IA (n8n) — next-best-actions calculées sur signaux + scoring + roadmap.
  recommendations: [
    { id: "n1", title: "Lancer une séquence Assurance maintenant", rationale: "+15% d'offres React/Next.js détectées dans le secteur cette semaine.", company: "Secteur Assurance" },
    { id: "n2", title: "Contacter le nouveau DSI de L'Oréal sous 48h", rationale: "Nomination détectée — fenêtre d'introduction optimale.", company: "L'Oréal", companyId: "loreal" },
    { id: "n3", title: "Réactiver Generali (dormant)", rationale: "Score remonté à 7/10 après publication de leur plan IT 2026.", company: "Generali", companyId: "generali" },
  ],

  // SEAM: `interactions` ORDER BY occurred_at DESC LIMIT 8.
  interactions: [
    { id: "i1", company: "BNP Paribas", companyId: "bnp", type: "Email", summary: "Réponse positive du responsable achats — demande un créneau.", dateLabel: "Il y a 2h", sentiment: "positive" },
    { id: "i2", company: "AXA Group", companyId: "axa", type: "LinkedIn", summary: "Connexion acceptée par le DSI adjoint.", dateLabel: "Il y a 5h", sentiment: "positive" },
    { id: "i3", company: "Capgemini", type: "Call", summary: "Pas de besoin immédiat, recontacter en septembre.", dateLabel: "Hier", sentiment: "neutral" },
    { id: "i4", company: "Generali", companyId: "generali", type: "Email", summary: "Email ouvert 3 fois, pas de réponse.", dateLabel: "Hier", sentiment: "neutral" },
  ],
}

/**
 * Point d'accès unique des données Suivi (server-side).
 * Aujourd'hui : mock. Demain : requêtes Supabase parallélisées (Promise.all)
 * sur tasks / sequences / interactions / ai_intelligence_results(phase 4),
 * toutes filtrées par le RLS workspace.
 */
export async function getSuiviData(): Promise<SuiviData> {
  return MOCK
}
