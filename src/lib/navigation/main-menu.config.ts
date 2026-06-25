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
  shortLabel?: string
  href: string
  disabled?: boolean
  comingSoon?: boolean
}

export type MainMenuItem = {
  label: string
  shortLabel?: string
  href?: string
  icon?: string
  disabled?: boolean
  comingSoon?: boolean
  primary?: boolean
  items?: MainMenuItem[]
  tabs?: SectionTab[]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaires — résolution du module actif et des onglets de section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le href du module actif pour un pathname donné (matching le plus
 * spécifique). Utilisé par la sidebar pour éviter le double-active quand
 * un module est imbriqué sous un autre (ex. /missions/opps vs /missions).
 */
export function getActiveModuleHref(pathname: string): string | null {
  let bestHref: string | null = null
  let bestLen = -1

  for (const item of mainMenuItems) {
    if (item.href) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (item.href.length > bestLen) {
          bestLen = item.href.length
          bestHref = item.href
        }
      }
    }
    if (item.items) {
      for (const sub of item.items) {
        if (sub.href) {
          if (pathname === sub.href || pathname.startsWith(sub.href + "/")) {
            if (sub.href.length > bestLen) {
              bestLen = sub.href.length
              bestHref = sub.href
            }
          }
        }
      }
    }
  }

  return bestHref
}

/**
 * Retourne les onglets d'un module par son href exact (ex. "/missions").
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
 *
 * Utilise le matching le plus spécifique : si le pathname matche à la fois
 * "/missions" et "/missions/opps", le href le plus long l'emporte.
 * Un module sans `tabs` qui matche renvoie `[]` — empêche le fall-through
 * vers un parent moins spécifique.
 */
export function getSectionTabsForPath(pathname: string): SectionTab[] {
  const candidates: MainMenuItem[] = []

  for (const item of mainMenuItems) {
    if (item.href) candidates.push(item)
    if (item.items) {
      for (const sub of item.items) {
        if (sub.href) candidates.push(sub)
      }
    }
  }

  let bestTabs: SectionTab[] = []
  let bestLen = -1

  for (const item of candidates) {
    const href = item.href!
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (href.length > bestLen) {
        bestLen = href.length
        bestTabs = item.tabs ?? []
      }
    }
  }

  return bestTabs
}

// ─────────────────────────────────────────────────────────────────────────────
//  Menu principal
// ─────────────────────────────────────────────────────────────────────────────

export const mainMenuItems: MainMenuItem[] = [
  // ── Général ─────────────────────────────────────────────────────────────
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

  // ── Commerce ────────────────────────────────────────────────────────────
  {
    label: "Commerce",
    items: [
      {
        label: "CRM & Prospection",
        shortLabel: "CRM",
        href: "/prospection",
        icon: "crm",
        primary: true,
        tabs: [
          { label: "Synthèse",              shortLabel: "Synthèse",     href: "/prospection" },
          { label: "Comptes & contacts",    shortLabel: "Comptes",      href: "/prospection/accounts" },
          { label: "Approche sectorielle",  shortLabel: "Secteurs",     href: "/prospection/approche-sectorielle" },
          { label: "Activité",              shortLabel: "Activité",     href: "/prospection/suivi" },
          { label: "Prospection",           shortLabel: "Prospection",  href: "/prospection/prospection" },
        ],
      },
      {
        label: "Opportunités",
        shortLabel: "Opps",
        href: "/missions/opps",
        icon: "sales",
        primary: true,
      },
      {
        label: "Staffing",
        href: "/staffing",
        icon: "staffing",
      },
      {
        label: "Engagements",
        shortLabel: "Missions",
        href: "/missions",
        icon: "engagements",
        tabs: [
          { label: "Synthèse",   shortLabel: "Synthèse",  href: "/missions" },
          { label: "Missions",   shortLabel: "Missions",  href: "/missions/actives" },
          { label: "Projets",    shortLabel: "Projets",    href: "/missions/projets" },
        ],
      },
    ],
  },

  // ── Intelligence ────────────────────────────────────────────────────────
  {
    label: "Intelligence",
    items: [
      {
        label: "Business Intelligence",
        shortLabel: "BI",
        href: "/intelligence",
        icon: "bi",
        comingSoon: true,
        disabled: true,
      },
      {
        label: "Rapports & Rédaction",
        shortLabel: "Rapports",
        href: "/reports",
        icon: "reports",
        comingSoon: true,
        disabled: true,
      },
      {
        label: "Veille & Actualités",
        shortLabel: "Veille",
        href: "/veille",
        icon: "veille",
        comingSoon: true,
        disabled: true,
      },
    ],
  },

  // ── Ressources ──────────────────────────────────────────────────────────
  {
    label: "Ressources",
    items: [
      {
        label: "Équipe",
        shortLabel: "Équipe",
        href: "/consultants",
        icon: "equipe",
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

  // ── Finance ─────────────────────────────────────────────────────────────
  {
    label: "Finance",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: "finance",
        primary: true,
      },
    ],
  },

  // ── Outils ──────────────────────────────────────────────────────────────
  {
    label: "Outils",
    items: [
      {
        label: "Knowledge Hub",
        href: "/knowledge",
        icon: "knowledge",
      },
      {
        label: "Automatisations",
        href: "/automations",
        icon: "automations",
      },
    ],
  },

  // ── Paramètres ──────────────────────────────────────────────────────────
  {
    label: "Paramètres",
    href: "/settings",
    icon: "settings",
  },
]
