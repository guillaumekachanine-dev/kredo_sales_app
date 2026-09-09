// ─────────────────────────────────────────────────────────────────────────────
//  Navigation — source unique de vérité
//
//  Règle : la sidebar liste les MODULES (2 niveaux : groupe → module).
//  Les sous-pages d'un module vivent dans `tabs` et sont affichées par la
//  barre d'onglets de section, PAS dans la sidebar.
//  La bottom nav mobile dérive des modules marqués `primary: true`.
// ─────────────────────────────────────────────────────────────────────────────

import { CONSULTANTS_SECTIONS } from "@/features/consultants/navigation/consultants-sections"

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

/**
 * Résout les onglets réellement navigables du shell mobile.
 *
 * Certains regroupements mobiles réunissent plusieurs modules desktop qui
 * disposent déjà de routes canoniques distinctes (Staffing/Recrutement et
 * Rapports/Veille). Les autres modules réutilisent directement leurs tabs de
 * section : le menu mobile ne maintient donc aucune copie locale de ces listes.
 */
export function getMobileTabsForPath(pathname: string): SectionTab[] {
  if (pathname.startsWith("/prospection")) {
    return getSectionTabsForPath(pathname)
  }

  if (pathname === "/consultants" || pathname.startsWith("/consultants/") || pathname.startsWith("/consultants?")) {
    return CONSULTANTS_SECTIONS.map((section) => ({
      label: section.label,
      href: section.href,
    }))
  }

  if (pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")) {
    return [
      { label: "Besoins & Staffing", shortLabel: "Besoins", href: "/missions/opps?section=besoins" },
      { label: "Recrutement", shortLabel: "Recrutement", href: "/consultants?section=candidats" },
    ]
  }

  // Engagements sur Mobile : le shell unique vit sur /missions et pilote ses
  // vues par `?vue=` (les routes /missions/actives · /projets redirigent vers
  // leurs vues canoniques — SHELL-0018 Lot 6.3).
  if (pathname === "/missions" || pathname.startsWith("/missions/actives") || pathname.startsWith("/missions/projets")) {
    return [
      { label: "Synthèse", shortLabel: "Synthèse", href: "/missions" },
      { label: "Missions", shortLabel: "Missions", href: "/missions?vue=missions-at" },
      { label: "Projets", shortLabel: "Projets", href: "/missions?vue=projets" },
    ]
  }

  if (pathname.startsWith("/reports") || pathname.startsWith("/veille")) {
    return [
      { label: "Rapports & Rédaction", shortLabel: "Rapports", href: "/reports" },
      { label: "Veille & Actualités", shortLabel: "Veille", href: "/veille" },
    ]
  }

  return getSectionTabsForPath(pathname).filter(
    (tab) => !tab.disabled && !tab.comingSoon,
  )
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

  // ── CRM ─────────────────────────────────────────────────────────────────
  {
    label: "CRM",
    items: [
      {
        label: "Comptes & contacts",
        shortLabel: "CRM",
        href: "/prospection/accounts",
        icon: "crm",
        primary: true,
      },
      {
        label: "Opportunités",
        shortLabel: "Opportunités",
        href: "/missions/opps",
        icon: "staffing",
        primary: true,
      },
      {
        label: "Engagements",
        shortLabel: "Missions",
        href: "/missions",
        icon: "engagements",
      },
      {
        label: "Consultants",
        shortLabel: "Consultants",
        href: "/consultants",
        icon: "equipe",
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
      },
      {
        label: "Prospection",
        shortLabel: "Prospection",
        href: "/prospection-intelligence",
        icon: "prospection",
      },
      {
        label: "Rapports & Rédaction",
        shortLabel: "Rapports",
        href: "/reports",
        icon: "reports",
      },
      {
        label: "Veille & Actualités",
        shortLabel: "Veille",
        href: "/veille",
        icon: "veille",
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
