// ─────────────────────────────────────────────────────────────────────────────
//  Navigation — source unique de vérité
//
//  Règle : la sidebar liste les MODULES (2 niveaux : groupe → module).
//  Les sous-pages d'un module vivent dans `tabs` et sont affichées par la
//  barre d'onglets de section, PAS dans la sidebar.
//  La bottom nav mobile dérive des modules marqués `primary: true`.
// ─────────────────────────────────────────────────────────────────────────────

export type SectionTab = {
  label: string
  shortLabel?: string        // label abrégé pour le rail d'onglets mobile
  href: string
  disabled?: boolean
  comingSoon?: boolean
}

export type MainMenuItem = {
  label: string
  shortLabel?: string        // label court pour la bottom nav mobile
  href?: string
  icon?: string
  disabled?: boolean
  comingSoon?: boolean
  primary?: boolean          // affiché dans la bottom nav mobile
  items?: MainMenuItem[]     // enfants directs (groupe → modules) — sidebar uniquement
  tabs?: SectionTab[]        // onglets de section (navigation intra-module, hors sidebar)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaire — résolution des onglets de section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne les onglets d'un module par son href exact (ex. "/missions").
 * Utilisé par les layouts de module pour passer les tabs à SectionNavBar.
 */
export function getModuleTabs(moduleHref: string): SectionTab[] {
  for (const item of mainMenuItems) {
    if (item.href === moduleHref) return item.tabs ?? []
    if (item.items) {
      const found = item.items.find((sub) => sub.href === moduleHref)
      if (found) return found.tabs ?? []
    }
  }
  return []
}

/**
 * Retourne les onglets de section pour un chemin donné.
 * Permet aux composants intra-module (ex. MissionsTabbedShell) de rester
 * synchronisés avec cette config sans dupliquer les labels.
 */
export function getSectionTabsForPath(pathname: string): SectionTab[] {
  for (const item of mainMenuItems) {
    if (item.href && item.tabs) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return item.tabs
      }
    }
    if (item.items) {
      for (const subItem of item.items) {
        if (subItem.href && subItem.tabs) {
          if (pathname === subItem.href || pathname.startsWith(subItem.href + "/")) {
            return subItem.tabs
          }
        }
      }
    }
  }
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
//  Menu principal
// ─────────────────────────────────────────────────────────────────────────────

export const mainMenuItems: MainMenuItem[] = [
  // ── Accueil ─────────────────────────────────────────────────────────────
  {
    label: "Cockpit",
    href: "/cockpit",
    icon: "cockpit",
    primary: true,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: "calendar",
  },

  // ── Business ─────────────────────────────────────────────────────────────
  {
    label: "Business",
    items: [
      {
        label: "Missions & Opps",
        shortLabel: "Missions",
        href: "/missions",
        icon: "sales",
        primary: true,
        tabs: [
          { label: "Synthèse",         shortLabel: "Synthèse", href: "/missions" },
          { label: "Missions actives", shortLabel: "Actives",  href: "/missions/actives" },
          { label: "Opportunités",     shortLabel: "Opps",     href: "/missions/opps" },
          { label: "Planning",                                 href: "/missions/planning" },
          { label: "Documents",        href: "/missions/docs",   comingSoon: true, disabled: true },
          { label: "P&L",              href: "/missions/pnl",    comingSoon: true, disabled: true },
        ],
      },
      {
        label: "Prospection Intelligence",
        shortLabel: "Prospection",
        href: "/prospection",
        icon: "prospection",
        primary: true,
        // Nav rationalisée — 2 grains : portefeuille (ces onglets) vs compte (hub
        // Client Intelligence /accounts/[companyId]). Scoring, Atelier IA et la
        // veille par compte ont migré dans le hub ; le radar de signaux transverse
        // rejoint la Synthèse. Réglages = utilitaire de domaine (Sources + méthode
        // de scoring en lecture + params pitch), placé en dernier.
        tabs: [
          { label: "Synthèse",           shortLabel: "Synthèse", href: "/prospection" },
          { label: "Comptes & contacts", shortLabel: "Comptes",  href: "/prospection/accounts" },
          { label: "Approche sectorielle", shortLabel: "Secteurs",   href: "/prospection/approche-sectorielle" },
          { label: "Suivi des actions",     shortLabel: "Suivi",    href: "/prospection/suivi" },
          { label: "Réglages",           shortLabel: "Réglages", href: "/prospection/settings" },
        ],
      },
      {
        label: "Proposal Intelligence",
        shortLabel: "Proposals",
        href: "/proposals",
        icon: "proposal",
        primary: true,
        tabs: [
          { label: "Vue d'ensemble",      href: "/proposals" },
          { label: "Demandes client",     href: "/proposals/requests",          comingSoon: true, disabled: true },
          { label: "Atelier de réponse",  href: "/proposals/workbench",         comingSoon: true, disabled: true },
          { label: "Solution Design",     href: "/proposals/solution-design",   comingSoon: true, disabled: true },
          { label: "Chiffrage",           href: "/proposals/pricing",           comingSoon: true, disabled: true },
          { label: "Propositions",        href: "/proposals/documents",         comingSoon: true, disabled: true },
          { label: "Bibliothèque d'offres", href: "/proposals/library",         comingSoon: true, disabled: true },
          { label: "Références clients",  href: "/proposals/client-references", comingSoon: true, disabled: true },
          { label: "Insights & Analyse",  href: "/proposals/insights",          comingSoon: true, disabled: true },
          { label: "Templates",           href: "/proposals/templates",         comingSoon: true, disabled: true },
        ],
      },
    ],
  },

  // ── Ressources ───────────────────────────────────────────────────────────
  {
    label: "Ressources",
    items: [
      {
        label: "Staffing",
        href: "/staffing",
        icon: "staffing",
      },
      {
        label: "Consultants",
        href: "/consultants",
        icon: "consultants",
        tabs: [
          { label: "Synthèse",            shortLabel: "Synthèse",    href: "/consultants" },
          { label: "Pool de compétences", shortLabel: "Compétences", href: "/consultants/pool-competences" },
          { label: "Activité & congés",   shortLabel: "Activité",    href: "/consultants/activite-conges" },
          { label: "Suivi manager",       shortLabel: "Suivi mgr",   href: "/consultants/suivi-manager" },
        ],
      },
      {
        label: "Recrutement",
        href: "/recruitment",
        icon: "recrutement",
      },
    ],
  },

  // ── Pilotage ─────────────────────────────────────────────────────────────
  {
    label: "Pilotage",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: "finance",
        primary: true,
        tabs: [
          { label: "Vue d'ensemble",      href: "/finance" },
          { label: "P&L",                 href: "/finance/pnl",                  comingSoon: true, disabled: true },
          { label: "CA & Forecast",       href: "/finance/revenue-forecast",     comingSoon: true, disabled: true },
          { label: "Marge & Rentabilité", href: "/finance/margin-profitability", comingSoon: true, disabled: true },
          { label: "TJM / CJM",          href: "/finance/rates",                comingSoon: true, disabled: true },
          { label: "Facturation",         href: "/finance/invoicing",            comingSoon: true, disabled: true },
          { label: "Objectifs & Budget",  href: "/finance/targets-budget",       comingSoon: true, disabled: true },
          { label: "Alertes financières", href: "/finance/alerts",               comingSoon: true, disabled: true },
          { label: "Rapports",            href: "/finance/reports",              comingSoon: true, disabled: true },
        ],
      },
      {
        label: "Knowledge Hub",
        href: "/knowledge",
        icon: "knowledge",
        tabs: [
          { label: "Vue d'ensemble",       href: "/knowledge" },
          { label: "Documents",            href: "/knowledge/documents",    comingSoon: true, disabled: true },
          { label: "Recherche sémantique", href: "/knowledge/search",       comingSoon: true, disabled: true },
          { label: "Corpus RAG",           href: "/knowledge/rag",          comingSoon: true, disabled: true },
          { label: "Offres & livrables",   href: "/knowledge/deliverables", comingSoon: true, disabled: true },
          { label: "Référentiels métier",  href: "/knowledge/referentials", comingSoon: true, disabled: true },
          { label: "Prompts & playbooks",  href: "/knowledge/prompts",      comingSoon: true, disabled: true },
          { label: "Taxonomie & tags",     href: "/knowledge/taxonomy",     comingSoon: true, disabled: true },
          { label: "Qualité du corpus",    href: "/knowledge/quality",      comingSoon: true, disabled: true },
          { label: "Imports & sources",    href: "/knowledge/imports",      comingSoon: true, disabled: true },
        ],
      },
      {
        label: "Automations",
        href: "/automations",
        icon: "automations",
        tabs: [
          { label: "Vue d'ensemble",  href: "/automations" },
          { label: "Workflows",       href: "/automations/workflows",      comingSoon: true, disabled: true },
          { label: "Exécutions",      href: "/automations/runs",           comingSoon: true, disabled: true },
          { label: "Webhooks",        href: "/automations/webhooks",       comingSoon: true, disabled: true },
          { label: "Jobs planifiés",  href: "/automations/scheduled-jobs", comingSoon: true, disabled: true },
          { label: "Erreurs & incidents", href: "/automations/incidents",  comingSoon: true, disabled: true },
          { label: "Connecteurs",     href: "/automations/connectors",     comingSoon: true, disabled: true },
          { label: "Historique IA",   href: "/automations/ai-history",     comingSoon: true, disabled: true },
          { label: "Logs techniques", href: "/automations/logs",           comingSoon: true, disabled: true },
        ],
      },
    ],
  },

  // ── Paramètres ───────────────────────────────────────────────────────────
  {
    label: "Paramètres",
    href: "/settings",
    icon: "settings",
  },
]
